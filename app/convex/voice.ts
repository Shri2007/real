import { v } from "convex/values";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

const MAX_QUOTE_WORDS = 12;
const sentimentValidator = v.union(v.literal("pos"), v.literal("neg"), v.literal("mixed"));

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

// Reactor held the mic after a clip and said why. Store the audio, then transcribe + extract in the background.
export const submitWhy = mutation({
  args: { gigId: v.id("gigs"), reactorId: v.id("users"), audioStorageId: v.id("_storage"), durationMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reaction = await ctx.db
      .query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId))
      .unique();
    if (!reaction) throw new Error("React to the clip before recording why");
    if (reaction.bonusCents !== undefined) throw new Error("This review has already been finalized");
    if (args.durationMs < 4000) throw new Error("Too short — tell us what worked or didn't for at least 4 seconds.");
    if (reaction.whyAudioStorageId && reaction.whyAudioStorageId !== args.audioStorageId) {
      await ctx.storage.delete(reaction.whyAudioStorageId);
    }
    await ctx.db.patch(reaction._id, {
      whyAudioStorageId: args.audioStorageId,
      whyDurationMs: Math.min(15000, args.durationMs),
      whyText: undefined,
      whyQuote: undefined,
      whyTags: undefined,
      whySentiment: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.voice.transcribe, { reactionId: reaction._id });
    return null;
  },
});

export const reactionForTranscribe = internalQuery({
  args: { reactionId: v.id("reactions") },
  returns: v.union(
    v.object({ audioStorageId: v.id("_storage"), gigTitle: v.string(), question: v.optional(v.string()), durationMs: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const reaction = await ctx.db.get(args.reactionId);
    if (!reaction?.whyAudioStorageId) return null;
    const gig = await ctx.db.get(reaction.gigId);
    return { audioStorageId: reaction.whyAudioStorageId, gigTitle: gig?.title ?? "", question: gig?.question, durationMs: reaction.whyDurationMs ?? 0 };
  },
});

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

export const transcribe = internalAction({
  args: { reactionId: v.id("reactions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const info: { audioStorageId: Id<"_storage">; gigTitle: string; question?: string; durationMs: number } | null = await ctx.runQuery(
      internal.voice.reactionForTranscribe,
      args,
    );
    if (!info) return null;
    const finalizeEmpty = async () => ctx.runMutation(internal.reactions.finalizeReaction, {
      reactionId: args.reactionId, audioStorageId: info.audioStorageId, whyDurationMs: info.durationMs, whyText: "", whyTags: [],
      worked: [], sucked: [], qualityScore: 0, generic: true, citesSpecific: false,
    });
    // Our AI failed, not the student: score neutrally so base pay still goes through (no bonus).
    const finalizeFallback = async (whyText = "") => ctx.runMutation(internal.reactions.finalizeReaction, {
      reactionId: args.reactionId, audioStorageId: info.audioStorageId, whyDurationMs: info.durationMs, whyText, whyTags: [],
      worked: [], sucked: [], qualityScore: 0.5, generic: false, citesSpecific: true, aiUnavailable: true,
    });
    const key = process.env.OPENAI_API_KEY;
    if (!key) { await finalizeFallback(); return null; }
    const audio = await ctx.storage.get(info.audioStorageId);
    if (!audio) { await finalizeEmpty(); return null; }

    const form = new FormData();
    form.append("file", audio, audio.type.includes("webm") ? "why.webm" : "why.m4a");
    form.append("model", "gpt-4o-mini-transcribe");
    const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
    }).catch(async (error: unknown) => {
      console.error(error);
      await finalizeFallback();
      return null;
    });
    if (!sttRes) return null;
    if (!sttRes.ok) {
      console.error(`Transcription failed: ${sttRes.status}`);
      await finalizeFallback();
      return null;
    }
    const whyText = ((await sttRes.json()) as { text?: string }).text?.trim() ?? "";
    if (!whyText) { await finalizeEmpty(); return null; }

    let extracted: {
      quote: string; sentiment: Doc<"reactions">["whySentiment"]; tags: string[]; worked: string[]; sucked: string[];
      quality: number; generic: boolean; citesSpecific: boolean;
    } | null = null;
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
                `Grade a viewer's spoken review of a short clip. Return the exact quote (max ${MAX_QUOTE_WORDS} words), sentiment, 1-3 short lowercase tags, worked (specific positive points), sucked (specific negative points), quality from 0 to 1, generic, and citesSpecific. High quality names concrete moments ("the hook at 0:03 is slow", "the logo shows too late"). Low quality is vague ("good video", "it was fine", "idk"). Do not invent details or timestamps.`,
            },
            {
              role: "user",
              content: `Clip: "${info.gigTitle}"${info.question ? ` (creator asked: "${info.question}")` : ""}\nTranscript: "${whyText}"`,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "why",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["quote", "sentiment", "tags", "worked", "sucked", "quality", "generic", "citesSpecific"],
                properties: {
                  quote: { type: "string" },
                  sentiment: { type: "string", enum: ["pos", "neg", "mixed"] },
                  tags: { type: "array", items: { type: "string" } },
                  worked: { type: "array", items: { type: "string" } },
                  sucked: { type: "array", items: { type: "string" } },
                  quality: { type: "number", minimum: 0, maximum: 1 },
                  generic: { type: "boolean" },
                  citesSpecific: { type: "boolean" },
                },
              },
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`Extraction failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
      const text = data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
      if (text) extracted = JSON.parse(text);
    } catch (e) {
      console.error(e);
    }

    if (!extracted) { await finalizeFallback(whyText); return null; }

    // Never invent words: the quote must appear in the transcript, else fall back to its first words.
    const candidate = extracted?.quote?.trim() ?? "";
    const verbatim = candidate && normalize(whyText).includes(normalize(candidate)) && candidate.split(/\s+/).length <= MAX_QUOTE_WORDS;
    const words = whyText.split(/\s+/);
    const whyQuote = verbatim ? candidate : words.slice(0, MAX_QUOTE_WORDS).join(" ") + (words.length > MAX_QUOTE_WORDS ? "…" : "");
    const whyTags = extracted?.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 3) ?? [];

    await ctx.runMutation(internal.reactions.finalizeReaction, {
      reactionId: args.reactionId,
      audioStorageId: info.audioStorageId,
      whyText,
      whyQuote,
      whyTags,
      ...(extracted?.sentiment ? { whySentiment: extracted.sentiment } : {}),
      whyDurationMs: info.durationMs,
      worked: extracted?.worked?.map((s) => s.trim()).filter(Boolean).slice(0, 5) ?? [],
      sucked: extracted?.sucked?.map((s) => s.trim()).filter(Boolean).slice(0, 5) ?? [],
      qualityScore: extracted?.quality ?? 0,
      generic: extracted?.generic ?? true,
      citesSpecific: extracted?.citesSpecific ?? false,
    });
    return null;
  },
});

const quoteValidator = v.object({
  reactionId: v.id("reactions"),
  name: v.string(),
  color: v.string(),
  laughed: v.boolean(),
  whyQuote: v.string(),
  sentiment: v.optional(sentimentValidator),
  tags: v.array(v.string()),
  flags: v.array(v.string()),
  reason: v.string(),
  earnedCents: v.number(),
  bonusCents: v.number(),
  trust: v.number(),
});

// Creator/brand results: what valid reactors said, newest first.
export const forGig = query({
  args: { gigId: v.id("gigs") },
  returns: v.array(quoteValidator),
  handler: async (ctx, args) => {
    const rs = await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", args.gigId)).order("desc").take(500);
    const out = [];
    for (const r of rs) {
      const u = await ctx.db.get(r.reactorId);
      const trust = u?.trust ?? 0.5;
      if (trust < 0.3 || !r.whyQuote) continue;
      out.push({
        reactionId: r._id,
        name: u?.name ?? "?",
        color: u?.color ?? "#888",
        laughed: r.laughed,
        whyQuote: r.whyQuote,
        sentiment: r.whySentiment,
        tags: r.whyTags ?? [],
        flags: r.flags ?? [],
        reason: r.reason ?? "",
        earnedCents: r.earnedCents,
        bonusCents: r.bonusCents ?? 0,
        trust,
      });
    }
    return out;
  },
});

// The reactor's own "why" for one clip, so the app can show what was heard.
export const mine = query({
  args: { gigId: v.id("gigs"), reactorId: v.id("users") },
  returns: v.union(
    v.object({ recorded: v.boolean(), whyQuote: v.optional(v.string()), tags: v.array(v.string()), finalized: v.boolean() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const r = await ctx.db
      .query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId))
      .unique();
    if (!r) return null;
    return { recorded: !!r.whyAudioStorageId, whyQuote: r.whyQuote, tags: r.whyTags ?? [], finalized: r.bonusCents !== undefined };
  },
});
