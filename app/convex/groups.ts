import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export const create = mutation({
  args: { name: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    let code = makeCode();
    while (await ctx.db.query("groups").withIndex("by_code", (q) => q.eq("code", code)).unique()) code = makeCode();
    const groupId = await ctx.db.insert("groups", { name: args.name.trim(), code, streak: 0 });
    await ctx.db.insert("members", { groupId, userId: args.userId });
    return { groupId, code };
  },
});

export const join = mutation({
  args: { code: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!group) throw new Error("No group with that code");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_groupId_and_userId", (q) => q.eq("groupId", group._id).eq("userId", args.userId))
      .unique();
    if (!existing) await ctx.db.insert("members", { groupId: group._id, userId: args.userId });
    return group._id;
  },
});

export const mine = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const ms = await ctx.db.query("members").withIndex("by_userId", (q) => q.eq("userId", args.userId)).take(50);
    const groups = await Promise.all(ms.map((m) => ctx.db.get(m.groupId)));
    return groups.filter((g) => g !== null);
  },
});

export const members = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const ms = await ctx.db.query("members").withIndex("by_groupId", (q) => q.eq("groupId", args.groupId)).take(100);
    const users = await Promise.all(ms.map((m) => ctx.db.get(m.userId)));
    return users.filter((u) => u !== null);
  },
});
