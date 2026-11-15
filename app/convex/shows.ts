import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Clock sync: client calls this, offset = serverNow - (sentAt + receivedAt) / 2.
// A mutation (not a query) so it's never cached.
export const now = mutation({
  args: {},
  handler: async () => Date.now(),
});

export const start = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => ctx.db.insert("shows", { groupId: args.groupId, status: "lobby" }),
});

// Host pushes a joke to every phone at once.
export const tellJoke = mutation({
  args: { showId: v.id("shows"), jokeText: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.showId, { status: "joke", jokeText: args.jokeText, jokeStartedAt: Date.now() });
  },
});

export const end = mutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => ctx.db.patch(args.showId, { status: "done" }),
});

export const current = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) =>
    ctx.db
      .query("shows")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .first(),
});

// Each phone reports the moment its owner started laughing (server-corrected).
export const laugh = mutation({
  args: { showId: v.id("shows"), userId: v.id("users"), onsetAt: v.number() },
  handler: async (ctx, args) => ctx.db.insert("showLaughs", args),
});

// Contagion map data: who laughed, in order, relative to the joke.
export const contagion = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;
    const rows = await ctx.db.query("showLaughs").withIndex("by_showId", (q) => q.eq("showId", args.showId)).take(500);
    const first = new Map<string, number>();
    for (const r of rows) {
      const k = r.userId as string;
      if (!first.has(k) || r.onsetAt < first.get(k)!) first.set(k, r.onsetAt);
    }
    const ordered = [...first.entries()].sort((a, b) => a[1] - b[1]);
    const people = await Promise.all(
      ordered.map(async ([userId, onsetAt]) => {
        const u = await ctx.db.get(userId as any);
        return { userId, name: u && "name" in u ? (u.name as string) : "?", onsetAt };
      }),
    );
    const t0 = people[0]?.onsetAt ?? null;
    return {
      jokeStartedAt: show.jokeStartedAt ?? null,
      starter: people[0] ?? null,
      people: people.map((p) => ({ ...p, msAfterStarter: t0 === null ? 0 : p.onsetAt - t0 })),
    };
  },
});
