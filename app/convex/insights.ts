import { v } from "convex/values";
import { query } from "./_generated/server";

// Brand insights: who laughed and what they said, split by verification, school and taste group.
const segment = v.object({ label: v.string(), reacted: v.number(), laughedPct: v.number(), positivePct: v.union(v.number(), v.null()) });

export const forGig = query({
  args: { gigId: v.id("gigs") },
  returns: v.object({ verified: v.array(segment), schools: v.array(segment), tastes: v.array(segment) }),
  handler: async (ctx, { gigId }) => {
    const rs = (await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", gigId)).take(500)).filter((r) => r.valid);
    const groups = { verified: new Map<string, typeof rs>(), schools: new Map<string, typeof rs>(), tastes: new Map<string, typeof rs>() };
    const add = (m: Map<string, typeof rs>, k: string, r: (typeof rs)[number]) => m.set(k, [...(m.get(k) ?? []), r]);
    for (const r of rs) {
      const u = await ctx.db.get(r.reactorId);
      add(groups.verified, u?.verifiedStudent ? "Verified students" : "Not verified", r);
      if (u?.school) add(groups.schools, u.school, r);
      const top = u?.taste?.find((t) => t.w > 0)?.tag;
      add(groups.tastes, top ? `Into ${top}` : "No taste profile yet", r);
    }
    const summarize = (m: Map<string, typeof rs>) =>
      [...m.entries()]
        .map(([label, list]) => {
          const spoke = list.filter((r) => r.whySentiment);
          return {
            label,
            reacted: list.length,
            laughedPct: Math.round((100 * list.filter((r) => r.laughed).length) / list.length),
            positivePct: spoke.length ? Math.round((100 * spoke.filter((r) => r.whySentiment === "pos").length) / spoke.length) : null,
          };
        })
        .sort((a, b) => b.reacted - a.reacted)
        .slice(0, 5);
    return { verified: summarize(groups.verified), schools: summarize(groups.schools), tastes: summarize(groups.tastes) };
  },
});
