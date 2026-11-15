import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

// Creator posts a clip. Starts as draft until paid (Whop) — or `publish` for demo/free tests.
export const create = mutation({
  args: {
    creatorId: v.id("users"),
    title: v.string(),
    question: v.optional(v.string()),
    videoStorageId: v.id("_storage"),
    durationMs: v.optional(v.number()),
    priceCents: v.number(),
    slots: v.number(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("gigs", { ...args, filled: 0, status: "draft", paid: false }),
});

// Make a gig visible to reactors. Lane D calls this after Whop payment succeeds;
// the app can call it directly for free hackathon tests.
export const publish = mutation({
  args: { gigId: v.id("gigs"), paid: v.optional(v.boolean()), whopCheckoutId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gigId, {
      status: "live",
      paid: args.paid ?? false,
      whopCheckoutId: args.whopCheckoutId,
    });
  },
});

// Reactor feed: live gigs this user hasn't reacted to and didn't create.
export const feed = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const live = await ctx.db.query("gigs").withIndex("by_status", (q) => q.eq("status", "live")).order("desc").take(50);
    const out = [];
    for (const g of live) {
      if (g.creatorId === args.userId) continue;
      const mine = await ctx.db
        .query("reactions")
        .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", g._id).eq("reactorId", args.userId))
        .unique();
      if (mine) continue;
      const creator = await ctx.db.get(g.creatorId);
      out.push({ ...g, creatorName: creator?.name ?? "?", slotsLeft: g.slots - g.filled });
    }
    return out;
  },
});

export const get = query({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const g = await ctx.db.get(args.gigId);
    if (!g) return null;
    const creator = await ctx.db.get(g.creatorId);
    return { ...g, videoUrl: await ctx.storage.getUrl(g.videoStorageId), creatorName: creator?.name ?? "?" };
  },
});

export const mine = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) =>
    ctx.db.query("gigs").withIndex("by_creatorId", (q) => q.eq("creatorId", args.creatorId)).order("desc").take(50),
});
