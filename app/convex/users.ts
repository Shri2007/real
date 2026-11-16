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
  bonusCents: number;
  flags: string[];
  reason: string;
};

function pacificMidnight(now: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", timeZoneName: "shortOffset",
  }).formatToParts(new Date(now));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const offset = part("timeZoneName").match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const minutes = offset ? (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) : -480;
  return Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day"))) - minutes * 60_000;
}

// Student wallet: balance + history of reactions, approved UGC payouts and cash-outs (+ .edu badge, linked Whop).
export const wallet = query({
  args: { userId: v.id("users") },
  returns: v.object({
    balanceCents: v.number(), pendingCents: v.number(), todayEarnedCents: v.number(), dailyCapCents: v.number(),
    trust: v.number(), nextPaidInSeconds: v.number(), items: v.array(v.object({
      id: v.string(), kind: v.union(v.literal("reaction"), v.literal("ugc"), v.literal("payout")),
      payoutStatus: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("paid"), v.literal("failed"))),
      gigTitle: v.string(), earnedCents: v.number(), valid: v.boolean(), at: v.number(), bonusCents: v.number(),
      flags: v.array(v.string()), reason: v.string(),
    })),
    verifiedStudent: v.boolean(), whopUsername: v.union(v.string(), v.null()), school: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const rs = await ctx.db
      .query("reactions")
      .withIndex("by_reactorId", (q) => q.eq("reactorId", args.userId))
      .order("desc")
      .take(500);
    const todayStart = pacificMidnight(Date.now());
    const todayEarnedCents = rs.filter((r) => r._creationTime >= todayStart).reduce((sum, r) => sum + r.earnedCents, 0);
    const items: WalletItem[] = await Promise.all(
      rs.slice(0, 30).map(async (r): Promise<WalletItem> => {
        const gig = await ctx.db.get(r.gigId);
        return {
          id: r._id,
          kind: "reaction",
          gigTitle: gig?.title ?? "?",
          earnedCents: r.earnedCents,
          valid: r.valid,
          at: r._creationTime,
          bonusCents: r.bonusCents ?? 0,
          flags: r.flags ?? [],
          reason: r.reason ?? "",
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
        bonusCents: 0,
        flags: [],
        reason: "",
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
        bonusCents: 0,
        flags: [],
        reason: p.failureReason ?? "",
      });
    }
    items.sort((a, b) => b.at - a.at);
    const now = Date.now();
    return {
      balanceCents: user?.balanceCents ?? 0,
      pendingCents: user?.pendingCents ?? 0,
      todayEarnedCents,
      dailyCapCents: 2500,
      trust: Math.round((user?.trust ?? 0.5) * 100),
      nextPaidInSeconds: Math.max(0, Math.ceil(((user?.lastReactAt ?? now) + 180_000 - now) / 1000)),
      items,
      verifiedStudent: user?.verifiedStudent ?? false,
      whopUsername: user?.whopUsername ?? null,
      school: user?.school,
    };
  },
});
