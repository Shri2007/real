import { ConvexError, v } from "convex/values";
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

async function whopCheckout(title: string, cents: number, metadata: Record<string, string>) {
  const key = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  if (!key || !accountId) throw new Error("WHOP_API_KEY and WHOP_COMPANY_ID must be set in Convex env");
  const base = process.env.WHOP_API_BASE ?? "https://sandbox-api.whop.com/api/v1";
  const res = await fetch(`${base}/checkout_configurations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: accountId,
      mode: "payment",
      metadata,
      variant: { account_id: accountId, title: title.slice(0, 80), billing_type: "one_time", currency: "usd", initial_price: cents / 100 },
    }),
  });
  if (!res.ok) throw new Error(`Whop checkout failed: ${res.status} ${await res.text()}`);
  const checkout = (await res.json()) as { id?: string; purchase_url?: string };
  if (!checkout.purchase_url) throw new Error("Whop returned no purchase_url");
  return { id: checkout.id ?? "", url: checkout.purchase_url };
}

// Whop-hosted checkout for slots × price + platform fee. Also called by the Keiki agent (keiki.ts looks up payments:createCheckout).
export const createCheckout = internalAction({
  args: { gigId: v.id("gigs") },
  returns: v.object({ url: v.string(), totalCents: v.number() }),
  handler: async (ctx, { gigId }): Promise<{ url: string; totalCents: number }> => {
    const gig = await ctx.runQuery(internal.payments.gigForCheckout, { gigId });
    if (!gig) throw new Error("Gig not found");
    if (gig.paid) throw new Error("This test is already paid");
    const cents = totalCents(gig);
    const { id, url } = await whopCheckout(`REAL test: ${gig.title}`, cents, { gigId });
    await ctx.runMutation(internal.payments.recordCheckout, { gigId, whopCheckoutId: id });
    return { url, totalCents: cents };
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
  args: { gigId: v.optional(v.id("gigs")), oppId: v.optional(v.id("ugcOpps")), whopCheckoutId: v.string() },
  returns: v.null(),
  handler: async (ctx, { gigId, oppId, whopCheckoutId }) => {
    if (!whopCheckoutId) return null;
    if (gigId) await ctx.db.patch(gigId, { whopCheckoutId });
    if (oppId) await ctx.db.patch(oppId, { whopCheckoutId });
    return null;
  },
});

export const oppForCheckout = internalQuery({
  args: { oppId: v.id("ugcOpps") },
  returns: v.union(v.object({ title: v.string(), payoutCents: v.number(), spots: v.number(), funded: v.boolean() }), v.null()),
  handler: async (ctx, { oppId }) => {
    const o = await ctx.db.get(oppId);
    return o && { title: o.title, payoutCents: o.payoutCents, spots: o.spots, funded: o.funded ?? false };
  },
});

// UGC credits: a brand funds payout × spots + fee before students can pick the opportunity.
export const createUgcCheckout = internalAction({
  args: { oppId: v.id("ugcOpps") },
  returns: v.object({ url: v.string(), totalCents: v.number() }),
  handler: async (ctx, { oppId }): Promise<{ url: string; totalCents: number }> => {
    const opp = await ctx.runQuery(internal.payments.oppForCheckout, { oppId });
    if (!opp) throw new Error("Opportunity not found");
    if (opp.funded) throw new Error("This opportunity is already funded");
    const cents = totalCents({ slots: opp.spots, priceCents: opp.payoutCents });
    const { id, url } = await whopCheckout(`REAL UGC credits: ${opp.title}`, cents, { oppId });
    await ctx.runMutation(internal.payments.recordCheckout, { oppId, whopCheckoutId: id });
    return { url, totalCents: cents };
  },
});

export const checkoutUgc = action({
  args: { oppId: v.id("ugcOpps") },
  returns: v.object({ url: v.string(), totalCents: v.number() }),
  handler: async (ctx, args): Promise<{ url: string; totalCents: number }> =>
    ctx.runAction(internal.payments.createUgcCheckout, args),
});

export const markPaid = internalMutation({
  args: { gigId: v.optional(v.string()), oppId: v.optional(v.string()), whopPaymentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const oppId = args.oppId ? ctx.db.normalizeId("ugcOpps", args.oppId) : null;
    const opp = oppId && (await ctx.db.get(oppId));
    if (opp && !opp.funded) {
      await ctx.db.patch(opp._id, { funded: true, whopPaymentId: args.whopPaymentId, status: opp.status === "draft" ? "open" : opp.status });
    }
    const gigId = args.gigId ? ctx.db.normalizeId("gigs", args.gigId) : null;
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
  const sigOk = !!secret && (await verify(secret, id, ts, body, sig));
  let peek: { type?: string; metaKeys?: string[]; checkoutMeta?: string[] } = {};
  try {
    const e = JSON.parse(body);
    peek = { type: e?.type, metaKeys: Object.keys(e?.data?.metadata ?? {}), checkoutMeta: Object.keys(e?.data?.checkout_configuration?.metadata ?? e?.data?.plan?.metadata ?? {}) };
  } catch { /* not JSON */ }
  console.log("[whop/webhook] received", { hasSecret: !!secret, hasSigHeaders: !!(id && ts && sig), sigOk, ...peek });
  if (!sigOk) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(body) as { type?: string; data?: { id?: string; metadata?: Record<string, unknown> | null; checkout_configuration?: { metadata?: Record<string, unknown> | null } } };
  // Whop may put our metadata on the payment, or on the checkout configuration it came from.
  const meta = { ...(event.data?.checkout_configuration?.metadata ?? {}), ...(event.data?.metadata ?? {}) };
  const gigId = typeof meta.gigId === "string" ? meta.gigId : undefined;
  const oppId = typeof meta.oppId === "string" ? meta.oppId : undefined;
  console.log("[whop/webhook] event", { type: event.type, gigId: gigId ?? null, oppId: oppId ?? null });
  if ((event.type === "payment.succeeded" || event.type === "payment_succeeded") && (gigId || oppId)) {
    await ctx.runMutation(internal.payments.markPaid, { gigId, oppId, whopPaymentId: event.data?.id ?? "" });
  }
  return new Response("OK", { status: 200 });
});

// ---- Student cash-out: a Whop balance transfer from the REAL company to the student's linked Whop user,
// or a "pending" payout record when they haven't linked Whop (paid out manually later).

function whopEnv() {
  const key = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  if (!key || !accountId) throw new ConvexError("Whop isn't set up yet. Try again later.");
  return { key, accountId, base: process.env.WHOP_API_BASE ?? "https://sandbox-api.whop.com/api/v1" };
}

// Link a Whop account by username (or user_ id) so cash-outs go straight to it.
export const linkWhop = action({
  args: { userId: v.id("users"), username: v.string() },
  returns: v.object({ whopUsername: v.string() }),
  handler: async (ctx, { userId, username }): Promise<{ whopUsername: string }> => {
    const handle = username.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_.-]{2,64}$/.test(handle)) throw new ConvexError("Enter your Whop username");
    const { key, base } = whopEnv();
    const res = await fetch(`${base}/users/${encodeURIComponent(handle)}`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 404) throw new ConvexError("No Whop account with that username");
    if (!res.ok) throw new ConvexError("Couldn't reach Whop. Try again in a minute.");
    const user = (await res.json()) as { id?: string; username?: string };
    if (!user.id?.startsWith("user_")) throw new ConvexError("No Whop account with that username");
    const whopUsername = user.username ?? handle;
    await ctx.runMutation(internal.payments.saveWhopLink, { userId, whopUserId: user.id, whopUsername });
    return { whopUsername };
  },
});

export const saveWhopLink = internalMutation({
  args: { userId: v.id("users"), whopUserId: v.string(), whopUsername: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, ...link }) => {
    await ctx.db.patch(userId, link);
    return null;
  },
});

// Zero the balance and record the payout: "processing" when we'll transfer via Whop, "pending" otherwise.
export const requestPayout = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({ payoutId: v.id("payouts"), amountCents: v.number(), whopUserId: v.union(v.string(), v.null()) }),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.balanceCents <= 0) throw new ConvexError("Nothing to cash out yet");
    const whopUserId = user.whopUserId ?? null;
    const payoutId = await ctx.db.insert("payouts", { userId, amountCents: user.balanceCents, status: whopUserId ? "processing" : "pending" });
    await ctx.db.patch(userId, { balanceCents: 0 });
    return { payoutId, amountCents: user.balanceCents, whopUserId };
  },
});

export const userIdForPayoutIdentity = internalQuery({
  args: { subject: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { subject }) => ctx.db.normalizeId("users", subject),
});

// Record the transfer outcome. A failed transfer puts the money back on the student's balance.
export const settlePayout = internalMutation({
  args: {
    payoutId: v.id("payouts"),
    status: v.union(v.literal("processing"), v.literal("paid"), v.literal("failed")),
    whopTransferId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { payoutId, ...fields }) => {
    const payout = await ctx.db.get(payoutId);
    if (!payout || payout.status === "paid" || payout.status === "failed") return null;
    await ctx.db.patch(payoutId, fields);
    if (fields.status === "failed") {
      const user = await ctx.db.get(payout.userId);
      if (user) await ctx.db.patch(user._id, { balanceCents: user.balanceCents + payout.amountCents });
    }
    return null;
  },
});

type TransferResult = { id?: string; status?: string; failure_reason?: string | null };
const outcome = (t: TransferResult) =>
  t.status === "succeeded" ? ("paid" as const) : t.status === "failed" ? ("failed" as const) : ("processing" as const);

// Transfers usually settle within seconds; poll a few times while one is still processing.
export const checkTransfer = internalAction({
  args: { payoutId: v.id("payouts"), whopTransferId: v.string(), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { payoutId, whopTransferId, attempt }) => {
    const { key, base } = whopEnv();
    const res = await fetch(`${base}/transfers/${whopTransferId}`, { headers: { Authorization: `Bearer ${key}` } });
    const t = res.ok ? ((await res.json()) as TransferResult) : {};
    const status = outcome(t);
    await ctx.runMutation(internal.payments.settlePayout, { payoutId, status, ...(t.failure_reason ? { failureReason: t.failure_reason } : {}) });
    if (status === "processing" && attempt < 5) {
      await ctx.scheduler.runAfter(10_000 * (attempt + 1), internal.payments.checkTransfer, { payoutId, whopTransferId, attempt: attempt + 1 });
    }
    return null;
  },
});

export const cashout = action({
  args: {},
  returns: v.object({ amountCents: v.number(), status: v.union(v.literal("pending"), v.literal("processing"), v.literal("paid"), v.literal("failed")) }),
  handler: async (ctx): Promise<{ amountCents: number; status: "pending" | "processing" | "paid" | "failed" }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in before cashing out");
    const userId = await ctx.runQuery(internal.payments.userIdForPayoutIdentity, { subject: identity.subject });
    if (!userId) throw new ConvexError("Payout account not found");
    const { payoutId, amountCents, whopUserId } = await ctx.runMutation(internal.payments.requestPayout, { userId });
    if (!whopUserId) return { amountCents, status: "pending" };
    let t: TransferResult;
    try {
      const { key, accountId, base } = whopEnv();
      const res = await fetch(`${base}/transfers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "balance",
          origin_id: accountId,
          destination_id: whopUserId,
          amount: amountCents / 100,
          currency: "usd",
          idempotence_key: payoutId,
          notes: "REAL earnings cash-out",
          metadata: { payoutId },
        }),
      });
      if (!res.ok) throw new Error(`Whop transfer failed: ${res.status} ${await res.text()}`);
      t = (await res.json()) as TransferResult;
    } catch (e) {
      console.error(e);
      await ctx.runMutation(internal.payments.settlePayout, { payoutId, status: "failed", failureReason: "Whop transfer could not be created" });
      return { amountCents, status: "failed" };
    }
    const status = outcome(t);
    await ctx.runMutation(internal.payments.settlePayout, {
      payoutId, status, ...(t.id ? { whopTransferId: t.id } : {}), ...(t.failure_reason ? { failureReason: t.failure_reason } : {}),
    });
    if (status === "processing" && t.id) await ctx.scheduler.runAfter(5_000, internal.payments.checkTransfer, { payoutId, whopTransferId: t.id, attempt: 0 });
    return { amountCents, status };
  },
});
