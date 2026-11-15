import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

// The preference engine: every swipe, laugh and spoken "why" nudges per-tag weights on the student;
// the For you feed ranks clips and UGC opportunities by those weights, with some exploration mixed in.

// Shared tag vocabulary: onboarding interest tiles, seed content and the AI tagger all use it, so they line up.
export const INTERESTS = ["gym", "skincare", "food", "energy drinks", "comedy", "tech", "fashion", "music", "study", "gaming", "travel", "pets"];

const STOP = new Set(["the", "and", "for", "with", "this", "that", "your", "you", "our", "test", "clip", "video", "funny", "ending", "what", "does", "is", "it", "a", "an", "of", "to", "in", "on", "would", "could", "should", "will", "buy", "joke", "land", "make", "about", "from", "they", "have", "like"]);

function fallbackTags(text: string) {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(words)].slice(0, 3);
}

async function aiTags(text: string): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallbackTags(text);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          {
            role: "system",
            content:
              "Tag a short video or brand content brief for a Gen Z discovery feed. Return 2-4 lowercase tags, 1-2 words each, mixing format and topic (e.g. \"skit\", \"dry humor\", \"gym\", \"skincare\", \"product demo\", \"energy drink\"). Prefer common, reusable tags, and use these exact tags whenever they fit: " + INTERESTS.join(", ") + ".",
          },
          { role: "user", content: text },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tags",
            strict: true,
            schema: { type: "object", additionalProperties: false, required: ["tags"], properties: { tags: { type: "array", items: { type: "string" } } } },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
    const out = data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
    const tags = out ? (JSON.parse(out) as { tags: string[] }).tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 4) : [];
    return tags.length ? tags : fallbackTags(text);
  } catch (e) {
    console.error(e);
    return fallbackTags(text);
  }
}

export const tagGig = internalAction({
  args: { gigId: v.id("gigs"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { gigId, text }) => {
    await ctx.runMutation(internal.prefs.saveTags, { gigId, tags: await aiTags(text) });
    return null;
  },
});

export const tagOpp = internalAction({
  args: { oppId: v.id("ugcOpps"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { oppId, text }) => {
    await ctx.runMutation(internal.prefs.saveTags, { oppId, tags: await aiTags(text) });
    return null;
  },
});

export const saveTags = internalMutation({
  args: { gigId: v.optional(v.id("gigs")), oppId: v.optional(v.id("ugcOpps")), tags: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { gigId, oppId, tags }) => {
    if (gigId) await ctx.db.patch(gigId, { tags });
    if (oppId) await ctx.db.patch(oppId, { tags });
    return null;
  },
});

// Nudge a student's taste weights. Called from swipes, valid reactions (laughed) and voice "why" sentiment.
export async function bumpTaste(ctx: MutationCtx, userId: Id<"users">, tags: string[] | undefined, delta: number) {
  if (!tags?.length || !delta) return;
  const user = await ctx.db.get(userId);
  if (!user) return;
  const weights = new Map((user.taste ?? []).map((t) => [t.tag, t.w]));
  for (const tag of tags) weights.set(tag, Math.max(-5, Math.min(10, (weights.get(tag) ?? 0) + delta)));
  const taste = [...weights.entries()].map(([tag, w]) => ({ tag, w })).sort((a, b) => b.w - a.w).slice(0, 40);
  await ctx.db.patch(userId, { taste });
}

export const interests = query({
  args: {},
  returns: v.array(v.string()),
  handler: async () => INTERESTS,
});

// Cold start: the interest tiles a student picks at onboarding seed their taste so the first cards already fit.
export const setInterests = mutation({
  args: { userId: v.id("users"), tags: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { userId, tags }) => {
    await bumpTaste(ctx, userId, tags.filter((t) => INTERESTS.includes(t)).slice(0, 8), 2);
    return null;
  },
});

export const swipe = mutation({
  args: {
    userId: v.id("users"),
    gigId: v.optional(v.id("gigs")),
    oppId: v.optional(v.id("ugcOpps")),
    dir: v.union(v.literal("right"), v.literal("left")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = args.gigId ? await ctx.db.get(args.gigId) : args.oppId ? await ctx.db.get(args.oppId) : null;
    if (!item) throw new Error("Nothing to swipe");
    const prev = await ctx.db
      .query("swipes")
      .withIndex("by_userId_and_item", (q) => q.eq("userId", args.userId).eq("gigId", args.gigId).eq("oppId", args.oppId))
      .unique();
    if (prev) return null;
    await ctx.db.insert("swipes", { userId: args.userId, gigId: args.gigId, oppId: args.oppId, dir: args.dir });
    await bumpTaste(ctx, args.userId, item.tags, args.dir === "right" ? 1 : -1);
    return null;
  },
});

const feedItem = v.object({
  kind: v.union(v.literal("clip"), v.literal("ugc")),
  id: v.string(),
  gigId: v.optional(v.id("gigs")),
  oppId: v.optional(v.id("ugcOpps")),
  title: v.string(),
  byName: v.string(),
  body: v.optional(v.string()),
  tags: v.array(v.string()),
  cents: v.number(),
  spotsLeft: v.number(),
  videoUrl: v.union(v.string(), v.null()),
  matchPct: v.union(v.number(), v.null()),
  reason: v.string(),
});

// For you: clips to react to (paid) + UGC opportunities to claim, ranked by taste with every 4th card exploring.
export const feed = query({
  args: { userId: v.id("users") },
  returns: v.array(feedItem),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const weights = new Map((user?.taste ?? []).map((t) => [t.tag, t.w]));
    const swiped = await ctx.db.query("swipes").withIndex("by_userId_and_item", (q) => q.eq("userId", userId)).take(1000);
    const seenGigs = new Set(swiped.map((s) => s.gigId).filter(Boolean));
    const seenOpps = new Set(swiped.map((s) => s.oppId).filter(Boolean));
    const reacted = await ctx.db.query("reactions").withIndex("by_reactorId", (q) => q.eq("reactorId", userId)).take(1000);
    for (const r of reacted) seenGigs.add(r.gigId);
    const claims = await ctx.db.query("ugcClaims").withIndex("by_userId", (q) => q.eq("userId", userId)).take(200);
    for (const c of claims) seenOpps.add(c.oppId);

    const score = (tags: string[] = []) => {
      let s = 0;
      let best: { tag: string; w: number } | null = null;
      for (const tag of tags) {
        const w = weights.get(tag) ?? 0;
        s += w;
        if (w > 0 && (!best || w > best.w)) best = { tag, w };
      }
      return { s, best };
    };
    const name = async (id: Id<"users">) => (await ctx.db.get(id))?.name ?? "?";

    type Item = typeof feedItem.type & { s: number };
    const items: Item[] = [];
    const gigs = await ctx.db.query("gigs").withIndex("by_status", (q) => q.eq("status", "live")).order("desc").take(100);
    for (const g of gigs) {
      if (g.creatorId === userId || seenGigs.has(g._id) || g.filled >= g.slots) continue;
      const { s, best } = score(g.tags);
      items.push({
        kind: "clip", id: g._id, gigId: g._id, title: g.title, byName: await name(g.creatorId), body: g.question,
        tags: g.tags ?? [], cents: g.priceCents, spotsLeft: g.slots - g.filled,
        videoUrl: await ctx.storage.getUrl(g.videoStorageId),
        matchPct: weights.size ? Math.round(50 + 50 * Math.tanh(s / 3)) : null,
        reason: best ? `Because you liked ${best.tag}` : "New for you", s,
      });
    }
    const opps = await ctx.db.query("ugcOpps").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(50);
    for (const o of opps) {
      if (o.brandId === userId || seenOpps.has(o._id)) continue;
      const { s, best } = score(o.tags);
      const gig = o.gigId ? await ctx.db.get(o.gigId) : null;
      items.push({
        kind: "ugc", id: o._id, oppId: o._id, gigId: o.gigId, title: o.title, byName: await name(o.brandId), body: o.brief,
        tags: o.tags ?? [], cents: o.payoutCents, spotsLeft: o.spots - o.claimed,
        videoUrl: gig ? await ctx.storage.getUrl(gig.videoStorageId) : null,
        matchPct: weights.size ? Math.round(50 + 50 * Math.tanh(s / 3)) : null,
        reason: best ? `Make content about ${best.tag}, which you're into` : "Paid UGC: pick it if it's your thing", s: s + 0.5,
      });
    }
    const ranked = [...items].sort((a, b) => b.s - a.s);
    const explore = [...items].sort((a, b) => a.s - b.s);
    const out: Item[] = [];
    const used = new Set<string>();
    while (out.length < items.length) {
      const pool = out.length % 4 === 3 ? explore : ranked;
      const next = pool.find((i) => !used.has(i.id))!;
      used.add(next.id);
      out.push(out.length % 4 === 3 && weights.size ? { ...next, reason: "Something different" } : next);
    }
    return out.slice(0, 30).map(({ s: _s, ...rest }) => rest);
  },
});

export const taste = query({
  args: { userId: v.id("users") },
  returns: v.object({ liked: v.array(v.string()), disliked: v.array(v.string()), swipes: v.number() }),
  handler: async (ctx, { userId }) => {
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    const t = user?.taste ?? [];
    const swipes = await ctx.db.query("swipes").withIndex("by_userId_and_item", (q) => q.eq("userId", userId)).take(1000);
    return {
      liked: t.filter((x) => x.w > 0).slice(0, 5).map((x) => x.tag),
      disliked: t.filter((x) => x.w < 0).sort((a, b) => a.w - b.w).slice(0, 3).map((x) => x.tag),
      swipes: swipes.length,
    };
  },
});
