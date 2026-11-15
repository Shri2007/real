import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const LAUGH_THRESHOLD = 0.45;

// Called when the viewer releases "hold to view".
export const record = mutation({
  args: {
    dropId: v.id("drops"),
    viewerId: v.id("users"),
    peak: v.number(),
    onsetAt: v.optional(v.number()),
    reactionStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const drop = await ctx.db.get(args.dropId);
    if (!drop) throw new Error("Drop not found");
    const isReal = args.peak >= LAUGH_THRESHOLD;
    const prev = await ctx.db
      .query("laughs")
      .withIndex("by_dropId_and_viewerId", (q) => q.eq("dropId", args.dropId).eq("viewerId", args.viewerId))
      .unique();
    const doc = {
      dropId: args.dropId,
      groupId: drop.groupId,
      viewerId: args.viewerId,
      senderId: drop.userId,
      peak: args.peak,
      isReal,
      onsetAt: args.onsetAt,
      reactionStorageId: args.reactionStorageId,
    };
    if (prev) await ctx.db.patch(prev._id, doc);
    else await ctx.db.insert("laughs", doc);
    return { isReal };
  },
});

// Who looked at this drop and who really laughed (for the sender).
export const forDrop = query({
  args: { dropId: v.id("drops") },
  handler: async (ctx, args) => {
    const laughs = await ctx.db.query("laughs").withIndex("by_dropId", (q) => q.eq("dropId", args.dropId)).take(200);
    return Promise.all(
      laughs.map(async (l) => {
        const viewer = await ctx.db.get(l.viewerId);
        return {
          viewerName: viewer?.name ?? "?",
          isReal: l.isReal,
          peak: l.peak,
          reactionUrl: l.reactionStorageId ? await ctx.storage.getUrl(l.reactionStorageId) : null,
        };
      }),
    );
  },
});

// Humor graph: for a viewer, % of each sender's drops that made them actually laugh.
export const graph = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const mine = await ctx.db.query("laughs").withIndex("by_viewerId", (q) => q.eq("viewerId", args.userId)).take(1000);
    const bySender = new Map<string, { viewed: number; real: number }>();
    for (const l of mine) {
      const k = l.senderId as string;
      const cur = bySender.get(k) ?? { viewed: 0, real: 0 };
      cur.viewed++;
      if (l.isReal) cur.real++;
      bySender.set(k, cur);
    }
    const rows = await Promise.all(
      [...bySender.entries()].map(async ([senderId, s]) => {
        const u = await ctx.db.get(senderId as any);
        const name = u && "name" in u ? (u.name as string) : "?";
        return { senderId, name, viewed: s.viewed, real: s.real, pct: Math.round((100 * s.real) / s.viewed) };
      }),
    );
    return rows.sort((a, b) => b.pct - a.pct);
  },
});
