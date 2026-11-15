import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const LAUGH_THRESHOLD = 0.45;
const MIN_FACE_PCT = 70; // must be watching (face visible) at least 70% of the clip to be paid

// Reactor finished watching: store the curve, validate, pay.
// We pay for ATTENTION, not applause: laughing or not earns the same.
export const submit = mutation({
  args: {
    gigId: v.id("gigs"),
    reactorId: v.id("users"),
    curve: v.array(v.object({ t: v.number(), s: v.union(v.number(), v.null()) })),
    watchedToEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig || gig.status !== "live") throw new Error("Gig not available");
    const dup = await ctx.db
      .query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId))
      .unique();
    if (dup) return { valid: dup.valid, earnedCents: dup.earnedCents, laughed: dup.laughed };

    const samples = args.curve.length || 1;
    const withFace = args.curve.filter((p) => p.s !== null);
    const facePresentPct = Math.round((100 * withFace.length) / samples);
    const peak = withFace.reduce((m, p) => Math.max(m, p.s ?? 0), 0);
    const laughed = peak >= LAUGH_THRESHOLD;
    const valid = args.watchedToEnd && facePresentPct >= MIN_FACE_PCT && gig.filled < gig.slots;
    const earnedCents = valid ? gig.priceCents : 0;

    await ctx.db.insert("reactions", {
      gigId: args.gigId,
      reactorId: args.reactorId,
      curve: args.curve,
      peak,
      laughed,
      facePresentPct,
      watchedToEnd: args.watchedToEnd,
      valid,
      earnedCents,
    });
    if (valid) {
      const filled = gig.filled + 1;
      await ctx.db.patch(gig._id, { filled, status: filled >= gig.slots ? "done" : gig.status });
      const reactor = await ctx.db.get(args.reactorId);
      if (reactor) await ctx.db.patch(reactor._id, { balanceCents: reactor.balanceCents + earnedCents });
    }
    return { valid, earnedCents, laughed };
  },
});

// Creator dashboard: aggregate reaction curve (per second) + counts. Live-updating.
export const results = query({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const rs = (await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", args.gigId)).take(500)).filter(
      (r) => r.valid,
    );
    const buckets = new Map<number, { sum: number; n: number; laughing: number }>();
    for (const r of rs) {
      for (const p of r.curve) {
        if (p.s === null) continue;
        const sec = Math.floor(p.t / 1000);
        const b = buckets.get(sec) ?? { sum: 0, n: 0, laughing: 0 };
        b.sum += p.s;
        b.n++;
        if (p.s >= LAUGH_THRESHOLD) b.laughing++;
        buckets.set(sec, b);
      }
    }
    const curve = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([sec, b]) => ({ sec, avg: b.sum / b.n, laughingPct: Math.round((100 * b.laughing) / b.n) }));
    const peakMoment = curve.reduce<{ sec: number; avg: number } | null>((m, c) => (!m || c.avg > m.avg ? c : m), null);
    const reactors = await Promise.all(
      rs.map(async (r) => {
        const u = await ctx.db.get(r.reactorId);
        return { name: u?.name ?? "?", color: u?.color ?? "#888", laughed: r.laughed, peak: r.peak };
      }),
    );
    return {
      count: rs.length,
      laughedCount: rs.filter((r) => r.laughed).length,
      curve,
      peakSec: peakMoment?.sec ?? null,
      reactors,
    };
  },
});
