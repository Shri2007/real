import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const send = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
    day: v.string(), // YYYY-MM-DD in the sender's local time
    kind: v.union(v.literal("text"), v.literal("image")),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => ctx.db.insert("drops", args),
});

// Today's drops for a group, with image URL, sender, and real-laugh tally.
export const today = query({
  args: { groupId: v.id("groups"), day: v.string() },
  handler: async (ctx, args) => {
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_groupId_and_day", (q) => q.eq("groupId", args.groupId).eq("day", args.day))
      .take(100);
    return Promise.all(
      drops.map(async (d) => {
        const sender = await ctx.db.get(d.userId);
        const laughs = await ctx.db.query("laughs").withIndex("by_dropId", (q) => q.eq("dropId", d._id)).take(200);
        return {
          ...d,
          imageUrl: d.storageId ? await ctx.storage.getUrl(d.storageId) : null,
          senderName: sender?.name ?? "?",
          senderColor: sender?.color ?? "#888",
          views: laughs.length,
          realLaughs: laughs.filter((l) => l.isReal).length,
        };
      }),
    );
  },
});
