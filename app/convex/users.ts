import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, args) => ctx.db.insert("users", { name: args.name.trim(), color: args.color }),
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});
