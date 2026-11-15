import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Name-only identity for the hackathon (no auth): the app stores userId on the device.
export const create = mutation({
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, args) =>
    ctx.db.insert("users", { name: args.name.trim(), color: args.color, balanceCents: 0 }),
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

// Reactor wallet: balance + recent reactions.
export const wallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const rs = await ctx.db
      .query("reactions")
      .withIndex("by_reactorId", (q) => q.eq("reactorId", args.userId))
      .order("desc")
      .take(30);
    const items = await Promise.all(
      rs.map(async (r) => {
        const gig = await ctx.db.get(r.gigId);
        return { reactionId: r._id, gigTitle: gig?.title ?? "?", earnedCents: r.earnedCents, valid: r.valid, at: r._creationTime };
      }),
    );
    return { balanceCents: user?.balanceCents ?? 0, items };
  },
});
