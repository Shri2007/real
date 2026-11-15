import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Domain-only .edu check (no email code). "name@berkeley.edu" → { email, school: "Berkeley", verifiedStudent: true }. */
export function parseEduEmail(raw: string | undefined): {
  email?: string;
  school?: string;
  verifiedStudent?: boolean;
} {
  if (!raw) return {};
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return { email };
  const domain = email.slice(at + 1);
  if (!domain.endsWith(".edu")) return { email };
  const withoutEdu = domain.slice(0, -".edu".length);
  const label = withoutEdu.split(".").filter(Boolean).pop();
  if (!label) return { email };
  const school = label.length <= 4 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
  return { email, school, verifiedStudent: true };
}

// Name-only identity for the hackathon (no auth): the app stores userId on the device.
export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("student"), v.literal("brand"))),
  },
  // email is accepted for compatibility but no longer verifies anything: the app runs verify.start/confirm (emailed code).
  handler: async (ctx, args) =>
    ctx.db.insert("users", { name: args.name.trim(), color: args.color, balanceCents: 0, role: args.role }),
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

type WalletItem = {
  id: string;
  kind: "reaction" | "ugc" | "payout";
  payoutStatus?: "pending" | "processing" | "paid" | "failed";
  gigTitle: string;
  earnedCents: number;
  valid: boolean;
  at: number;
};

// Student wallet: balance + history of reactions, approved UGC payouts and cash-outs (+ .edu badge, linked Whop).
export const wallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const rs = await ctx.db
      .query("reactions")
      .withIndex("by_reactorId", (q) => q.eq("reactorId", args.userId))
      .order("desc")
      .take(30);
    const items: WalletItem[] = await Promise.all(
      rs.map(async (r): Promise<WalletItem> => {
        const gig = await ctx.db.get(r.gigId);
        return {
          id: r._id,
          kind: "reaction",
          gigTitle: gig?.title ?? "?",
          earnedCents: r.earnedCents,
          valid: r.valid,
          at: r._creationTime,
        };
      }),
    );
    const claims = await ctx.db
      .query("ugcClaims")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
    for (const c of claims) {
      if (c.status !== "approved") continue;
      const opp = await ctx.db.get(c.oppId);
      const brand = opp && (await ctx.db.get(opp.brandId));
      items.push({
        id: c._id,
        kind: "ugc",
        gigTitle: `UGC video for ${brand?.name ?? "a brand"}`,
        earnedCents: opp?.payoutCents ?? 0,
        valid: true,
        at: c.approvedAt ?? c._creationTime,
      });
    }
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
    for (const p of payouts) {
      items.push({
        id: p._id,
        kind: "payout",
        payoutStatus: p.status,
        gigTitle: "Cash out",
        earnedCents: -p.amountCents,
        valid: p.status !== "failed",
        at: p._creationTime,
      });
    }
    items.sort((a, b) => b.at - a.at);
    return {
      balanceCents: user?.balanceCents ?? 0,
      items,
      verifiedStudent: user?.verifiedStudent ?? false,
      whopUsername: user?.whopUsername ?? null,
      school: user?.school,
    };
  },
});
