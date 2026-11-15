import { v } from "convex/values";
import { action, httpAction, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

export const PLATFORM_FEE_PCT = 20;

const totalCents = (gig: { slots: number; priceCents: number }) =>
  Math.round(gig.slots * gig.priceCents * (1 + PLATFORM_FEE_PCT / 100));

export const gigForCheckout = internalQuery({
  args: { gigId: v.id("gigs") },
  returns: v.union(
    v.object({ title: v.string(), slots: v.number(), priceCents: v.number(), status: v.string(), paid: v.boolean() }),
    v.null(),
  ),
  handler: async (ctx, { gigId }) => {
    const g = await ctx.db.get(gigId);
    return g && { title: g.title, slots: g.slots, priceCents: g.priceCents, status: g.status, paid: g.paid };
  },
});

// Whop-hosted checkout for slots × price + platform fee. Also called by the Keiki agent (keiki.ts looks up payments:createCheckout).
export const createCheckout = internalAction({
  args: { gigId: v.id("gigs") },
  returns: v.object({ url: v.string(), totalCents: v.number() }),
  handler: async (ctx, { gigId }): Promise<{ url: string; totalCents: number }> => {
    const key = process.env.WHOP_API_KEY;
    const accountId = process.env.WHOP_COMPANY_ID;
    if (!key || !accountId) throw new Error("WHOP_API_KEY and WHOP_COMPANY_ID must be set in Convex env");
    const gig = await ctx.runQuery(internal.payments.gigForCheckout, { gigId });
    if (!gig) throw new Error("Gig not found");
    if (gig.paid) throw new Error("This test is already paid");
    const cents = totalCents(gig);
    const base = process.env.WHOP_API_BASE ?? "https://sandbox-api.whop.com/api/v1";
    const res = await fetch(`${base}/checkout_configurations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        mode: "payment",
        metadata: { gigId },
        variant: {
          account_id: accountId,
          title: `REAL test: ${gig.title}`.slice(0, 80),
          billing_type: "one_time",
          currency: "usd",
          initial_price: cents / 100,
        },
      }),
    });
    if (!res.ok) throw new Error(`Whop checkout failed: ${res.status} ${await res.text()}`);
    const checkout = (await res.json()) as { id?: string; purchase_url?: string };
    if (!checkout.purchase_url) throw new Error("Whop returned no purchase_url");
    await ctx.runMutation(internal.payments.recordCheckout, { gigId, whopCheckoutId: checkout.id ?? "" });
    return { url: checkout.purchase_url, totalCents: cents };
  },
});

// App: creator taps "Pay with Whop" → open the returned URL. The gig goes live when the webhook lands.
export const checkout = action({
  args: { gigId: v.id("gigs") },
  returns: v.object({ url: v.string(), totalCents: v.number() }),
  handler: async (ctx, args): Promise<{ url: string; totalCents: number }> =>
    ctx.runAction(internal.payments.createCheckout, args),
});

export const recordCheckout = internalMutation({
  args: { gigId: v.id("gigs"), whopCheckoutId: v.string() },
  returns: v.null(),
  handler: async (ctx, { gigId, whopCheckoutId }) => {
    if (whopCheckoutId) await ctx.db.patch(gigId, { whopCheckoutId });
    return null;
  },
});

export const markPaid = internalMutation({
  args: { gigId: v.string(), whopPaymentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gigId = ctx.db.normalizeId("gigs", args.gigId);
    const gig = gigId && (await ctx.db.get(gigId));
    if (!gig || gig.paid) return null;
    await ctx.db.patch(gig._id, {
      paid: true,
      whopPaymentId: args.whopPaymentId,
      status: gig.status === "draft" ? "live" : gig.status,
    });
    return null;
  },
});

// Standard Webhooks: HMAC-SHA256 over "{id}.{timestamp}.{body}", header "v1,<base64>" (space-separated list).
async function verify(secret: string, id: string, timestamp: string, body: string, header: string) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const enc = new TextEncoder();
  const keys: Uint8Array<ArrayBuffer>[] = [enc.encode(secret)];
  const raw = secret.replace(/^(ws|whsec)_/, "");
  try { keys.push(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))); } catch { /* not base64 */ }
  const given = header.split(" ").map((s) => s.split(",")[1]).filter(Boolean);
  for (const k of keys) {
    const key = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${timestamp}.${body}`)));
    const expected = btoa(String.fromCharCode(...mac));
    for (const g of given) {
      if (g.length !== expected.length) continue;
      let diff = 0;
      for (let i = 0; i < g.length; i++) diff |= g.charCodeAt(i) ^ expected.charCodeAt(i);
      if (diff === 0) return true;
    }
  }
  return false;
}

export const webhook = httpAction(async (ctx, req) => {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const body = await req.text();
  const id = req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("webhook-timestamp") ?? "";
  const sig = req.headers.get("webhook-signature") ?? "";
  if (!secret || !(await verify(secret, id, ts, body, sig))) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(body) as { type?: string; data?: { id?: string; metadata?: Record<string, unknown> | null } };
  const gigId = event.data?.metadata?.gigId;
  if (event.type === "payment.succeeded" && typeof gigId === "string") {
    await ctx.runMutation(internal.payments.markPaid, { gigId, whopPaymentId: event.data?.id ?? "" });
  }
  return new Response("OK", { status: 200 });
});

// Reactor cash-out: record a pending Whop payout for the whole balance and zero it.
export const requestPayout = internalMutation({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.balanceCents <= 0) throw new Error("Nothing to cash out yet");
    await ctx.db.insert("payouts", { userId, amountCents: user.balanceCents, status: "pending" });
    await ctx.db.patch(userId, { balanceCents: 0 });
    return user.balanceCents;
  },
});

export const cashout = action({
  args: { userId: v.id("users") },
  returns: v.object({ amountCents: v.number() }),
  handler: async (ctx, args): Promise<{ amountCents: number }> => ({
    amountCents: await ctx.runMutation(internal.payments.requestPayout, args),
  }),
});
