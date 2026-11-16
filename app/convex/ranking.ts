import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { notify } from "./notify";

declare const process: { env: Record<string, string | undefined> };

// Ranking creator takes. One AI score on its own is noisy, so every take gets an Elo rating within its topic that moves
// with head-to-heads: a brand picking one take over another (the ground truth), a peer watching one take longer than
// another, and, while there's little human signal, an AI call on which of two takes a brand would rather pay for.
const BASE = 1000;
const K = { brand: 32, ai: 16, peer: 12 } as const;
const FULL_WATCH_MS = 15000;

export const seedRating = (score: number) => Math.round(BASE + (score - 6.5) * 40);

async function play(ctx: MutationCtx, winnerId: Id<"creatorTakes">, loserId: Id<"creatorTakes">, kind: keyof typeof K, voterId?: Id<"users">) {
  const [w, l] = await Promise.all([ctx.db.get(winnerId), ctx.db.get(loserId)]);
  if (!w || !l) return;
  const rw = w.rating ?? BASE;
  const rl = l.rating ?? BASE;
  const d = K[kind] * (1 - 1 / (1 + 10 ** ((rl - rw) / 400)));
  await ctx.db.patch(winnerId, { rating: rw + d, ...(kind === "brand" ? { brandPicks: (w.brandPicks ?? 0) + 1 } : {}) });
  await ctx.db.patch(loserId, { rating: rl - d });
  await ctx.db.insert("takeVotes", { voterId, kind, winnerId, loserId, tag: w.tag });
}

const scoredTakes = (ctx: QueryCtx, tag?: string) =>
  ctx.db.query("creatorTakes").withIndex("by_status_and_tag", (q) => (tag ? q.eq("status", "scored").eq("tag", tag) : q.eq("status", "scored"))).take(200);

const takeCard = v.object({
  takeId: v.id("creatorTakes"), userId: v.id("users"), name: v.string(), color: v.string(), school: v.optional(v.string()),
  prompt: v.string(), tag: v.string(), style: v.optional(v.string()), videoUrl: v.union(v.string(), v.null()),
});

async function toCard(ctx: QueryCtx, t: Doc<"creatorTakes">) {
  const u = await ctx.db.get(t.userId);
  return {
    takeId: t._id, userId: t.userId, name: u?.name ?? "A student", color: u?.color ?? "#888", school: u?.school,
    prompt: t.prompt, tag: t.tag, style: t.style, videoUrl: await ctx.storage.getUrl(t.videoStorageId),
  };
}

async function brandTags(ctx: QueryCtx, brandId: Id<"users">) {
  const opps = await ctx.db.query("ugcOpps").withIndex("by_brandId", (q) => q.eq("brandId", brandId)).order("desc").take(50);
  return { opps, tags: new Set(opps.flatMap((o) => o.tags ?? [])) };
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Brand side: the next two takes on the same topic to choose between, closest in rating first (the most informative pick).
export const brandPair = query({
  args: { brandId: v.id("users") },
  returns: v.union(v.object({ tag: v.string(), a: takeCard, b: takeCard }), v.null()),
  handler: async (ctx, { brandId }) => {
    const { tags } = await brandTags(ctx, brandId);
    const voted = new Set((await ctx.db.query("takeVotes").withIndex("by_voterId", (q) => q.eq("voterId", brandId)).take(1000)).map((x) => pairKey(x.winnerId, x.loserId)));
    const takes = (await scoredTakes(ctx)).filter((t) => t.userId !== brandId);
    let best: [Doc<"creatorTakes">, Doc<"creatorTakes">, number] | null = null;
    for (const a of takes) for (const b of takes) {
      if (a._id >= b._id || a.tag !== b.tag || a.userId === b.userId || voted.has(pairKey(a._id, b._id))) continue;
      const cost = Math.abs((a.rating ?? BASE) - (b.rating ?? BASE)) - (tags.has(a.tag) ? 1000 : 0);
      if (!best || cost < best[2]) best = [a, b, cost];
    }
    if (!best) return null;
    const [a, b] = Math.random() < 0.5 ? [best[0], best[1]] : [best[1], best[0]];
    return { tag: a.tag, a: await toCard(ctx, a), b: await toCard(ctx, b) };
  },
});

export const pickTake = mutation({
  args: { brandId: v.id("users"), winnerId: v.id("creatorTakes"), loserId: v.id("creatorTakes") },
  returns: v.null(),
  handler: async (ctx, { brandId, winnerId, loserId }) => {
    const [w, l] = await Promise.all([ctx.db.get(winnerId), ctx.db.get(loserId)]);
    if (!w || !l || w.tag !== l.tag || w.status !== "scored" || l.status !== "scored") throw new ConvexError("Those takes can't be compared");
    const prior = await ctx.db.query("takeVotes").withIndex("by_voterId", (q) => q.eq("voterId", brandId)).take(1000);
    if (prior.some((x) => pairKey(x.winnerId, x.loserId) === pairKey(winnerId, loserId))) return null;
    await play(ctx, winnerId, loserId, "brand", brandId);
    return null;
  },
});

// Peer side (React tab): the next student take to watch, from topics this person likes, least-watched first.
export const peerTake = query({
  args: { userId: v.id("users") },
  returns: v.union(takeCard, v.null()),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const weight = new Map((user?.taste ?? []).map((t) => [t.tag, t.w]));
    const seen = new Set((await ctx.db.query("takeViews").withIndex("by_viewerId_and_tag", (q) => q.eq("viewerId", userId)).take(1000)).map((x) => x.takeId));
    const next = (await scoredTakes(ctx))
      .filter((t) => t.userId !== userId && !seen.has(t._id))
      .sort((a, b) => (weight.get(b.tag) ?? 0) - (weight.get(a.tag) ?? 0) || (a.views ?? 0) - (b.views ?? 0))[0];
    return next ? await toCard(ctx, next) : null;
  },
});

// Watch time is the real UGC metric: when someone stays clearly longer on one take than on the last take they saw on the
// same topic, that's a head-to-head win.
export const viewTake = mutation({
  args: { userId: v.id("users"), takeId: v.id("creatorTakes"), watchMs: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, takeId, watchMs }) => {
    const take = await ctx.db.get(takeId);
    if (!take || take.userId === userId) return null;
    const mine = await ctx.db.query("takeViews").withIndex("by_viewerId_and_tag", (q) => q.eq("viewerId", userId).eq("tag", take.tag)).order("desc").take(50);
    if (mine.some((x) => x.takeId === takeId)) return null;
    const ms = Math.max(0, Math.min(watchMs, 60000));
    await ctx.db.insert("takeViews", { takeId, viewerId: userId, tag: take.tag, watchMs: ms });
    await ctx.db.patch(takeId, { views: (take.views ?? 0) + 1 });
    const prev = mine[0];
    if (!prev) return null;
    const diff = Math.min(ms, FULL_WATCH_MS) - Math.min(prev.watchMs, FULL_WATCH_MS);
    if (Math.abs(diff) >= 1500) await (diff > 0 ? play(ctx, takeId, prev.takeId, "peer", userId) : play(ctx, prev.takeId, takeId, "peer", userId));
    return null;
  },
});

// Brand side: the best-ranked students on the topics this brand hires for, with one-tap invites to its open jobs.
export const topCreators = query({
  args: { brandId: v.id("users") },
  returns: v.object({
    hasOpenJob: v.boolean(),
    creators: v.array(v.object({
      userId: v.id("users"), name: v.string(), color: v.string(), school: v.optional(v.string()), tag: v.string(), style: v.optional(v.string()),
      rank: v.number(), of: v.number(), brandPicks: v.number(), views: v.number(),
      oppId: v.optional(v.id("ugcOpps")), oppTitle: v.optional(v.string()), invited: v.boolean(),
    })),
  }),
  handler: async (ctx, { brandId }) => {
    const { opps, tags } = await brandTags(ctx, brandId);
    const open = opps.filter((o) => o.status === "open");
    const invites = new Set((await ctx.db.query("ugcInvites").withIndex("by_brandId", (q) => q.eq("brandId", brandId)).take(500)).map((i) => `${i.userId}|${i.oppId}`));
    const all = (await scoredTakes(ctx)).filter((t) => t.userId !== brandId);
    const pool = all.filter((t) => !tags.size || tags.has(t.tag));
    const rating = (t: Doc<"creatorTakes">) => t.rating ?? BASE;
    const best = new Map<Id<"users">, Doc<"creatorTakes">>();
    for (const t of pool) if (!best.has(t.userId) || rating(t) > rating(best.get(t.userId)!)) best.set(t.userId, t);
    const ranked = [...best.values()].sort((a, b) => rating(b) - rating(a)).slice(0, 10);
    const creators = await Promise.all(ranked.map(async (t) => {
      const u = await ctx.db.get(t.userId);
      const sameTag = all.filter((x) => x.tag === t.tag);
      const opp = open.find((o) => o.tags?.includes(t.tag)) ?? open[0];
      return {
        userId: t.userId, name: u?.name ?? "A student", color: u?.color ?? "#888", school: u?.school, tag: t.tag, style: t.style,
        rank: sameTag.filter((x) => rating(x) > rating(t)).length + 1, of: sameTag.length, brandPicks: t.brandPicks ?? 0, views: t.views ?? 0,
        oppId: opp?._id, oppTitle: opp?.title, invited: !!opp && invites.has(`${t.userId}|${opp._id}`),
      };
    }));
    return { hasOpenJob: open.length > 0, creators };
  },
});

export const invite = mutation({
  args: { brandId: v.id("users"), userId: v.id("users"), oppId: v.id("ugcOpps") },
  returns: v.null(),
  handler: async (ctx, { brandId, userId, oppId }) => {
    const opp = await ctx.db.get(oppId);
    if (!opp || opp.brandId !== brandId) throw new ConvexError("Not your job");
    if (opp.status !== "open") throw new ConvexError("Open the job before inviting creators");
    const mine = await ctx.db.query("ugcInvites").withIndex("by_userId", (q) => q.eq("userId", userId)).take(200);
    if (mine.some((i) => i.oppId === oppId)) return null;
    await ctx.db.insert("ugcInvites", { oppId, userId, brandId });
    const brand = await ctx.db.get(brandId);
    await notify(ctx, userId, `${brand?.name ?? "A brand"} liked your creator take and invited you to "${opp.title}". It's at the top of your deck.`);
    return null;
  },
});

// Student side: where the student's best take stands on its topic.
export const myStanding = query({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ tag: v.string(), rank: v.number(), of: v.number(), brandPicks: v.number(), views: v.number(), invites: v.number() }), v.null()),
  handler: async (ctx, { userId }) => {
    const mine = (await ctx.db.query("creatorTakes").withIndex("by_userId", (q) => q.eq("userId", userId)).take(50)).filter((t) => t.status === "scored");
    const best = mine.sort((a, b) => (b.rating ?? BASE) - (a.rating ?? BASE))[0];
    if (!best) return null;
    const sameTag = await scoredTakes(ctx, best.tag);
    const invites = await ctx.db.query("ugcInvites").withIndex("by_userId", (q) => q.eq("userId", userId)).take(100);
    return {
      tag: best.tag, rank: sameTag.filter((x) => (x.rating ?? BASE) > (best.rating ?? BASE)).length + 1, of: sameTag.length,
      brandPicks: mine.reduce((n, t) => n + (t.brandPicks ?? 0), 0), views: mine.reduce((n, t) => n + (t.views ?? 0), 0), invites: invites.length,
    };
  },
});

// AI head-to-heads for a freshly scored take, against the closest-rated takes on its topic. Takes brands already picked
// are given as examples, so the model judges toward what brands actually chose.
export const aiContext = internalQuery({
  args: { takeId: v.id("creatorTakes") },
  returns: v.union(v.object({
    take: v.object({ id: v.id("creatorTakes"), prompt: v.string(), transcript: v.string() }),
    rivals: v.array(v.object({ id: v.id("creatorTakes"), prompt: v.string(), transcript: v.string() })),
    examples: v.array(v.string()),
  }), v.null()),
  handler: async (ctx, { takeId }) => {
    const take = await ctx.db.get(takeId);
    if (!take?.transcript) return null;
    const others = (await scoredTakes(ctx, take.tag)).filter((t) => t._id !== takeId && t.userId !== take.userId && t.transcript);
    const near = [...others].sort((a, b) => Math.abs((a.rating ?? BASE) - (take.rating ?? BASE)) - Math.abs((b.rating ?? BASE) - (take.rating ?? BASE))).slice(0, 2);
    const examples = others.filter((t) => (t.brandPicks ?? 0) > 0 && !near.includes(t)).sort((a, b) => (b.brandPicks ?? 0) - (a.brandPicks ?? 0)).slice(0, 2);
    const view = (t: Doc<"creatorTakes">) => ({ id: t._id, prompt: t.prompt, transcript: t.transcript! });
    return { take: view(take), rivals: near.map(view), examples: examples.map((t) => t.transcript!) };
  },
});

export const aiResult = internalMutation({
  args: { winnerId: v.id("creatorTakes"), loserId: v.id("creatorTakes") },
  returns: v.null(),
  handler: async (ctx, { winnerId, loserId }) => {
    await play(ctx, winnerId, loserId, "ai");
    return null;
  },
});

export const aiCompare = internalAction({
  args: { takeId: v.id("creatorTakes") },
  returns: v.null(),
  handler: async (ctx, { takeId }) => {
    const key = process.env.OPENAI_API_KEY;
    const c = await ctx.runQuery(internal.ranking.aiContext, { takeId });
    if (!key || !c) return null;
    for (const rival of c.rivals) {
      const [a, b] = Math.random() < 0.5 ? [c.take, rival] : [rival, c.take];
      try {
        const res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-6-luna",
            input: [
              {
                role: "system",
                content: `Brands hire students to make short UGC videos. Compare two takes on the same topic and pick the one a brand would rather pay for: a hook that stops the scroll in the first words, sounds like a real person, easy to follow. Ignore length and filler words.${c.examples.length ? ` Takes brands picked before on this topic, for calibration:\n${c.examples.map((e) => `- "${e}"`).join("\n")}` : ""}`,
              },
              { role: "user", content: `Take A (prompt "${a.prompt}"): "${a.transcript}"\nTake B (prompt "${b.prompt}"): "${b.transcript}"` },
            ],
            text: { format: { type: "json_schema", name: "pick", strict: true, schema: { type: "object", additionalProperties: false, required: ["winner"], properties: { winner: { type: "string", enum: ["A", "B"] } } } } },
          }),
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
        const text = data.output?.flatMap((o) => o.content ?? []).find((x) => x.type === "output_text")?.text;
        if (!text) continue;
        const winA = (JSON.parse(text) as { winner: "A" | "B" }).winner === "A";
        await ctx.runMutation(internal.ranking.aiResult, { winnerId: winA ? a.id : b.id, loserId: winA ? b.id : a.id });
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  },
});
