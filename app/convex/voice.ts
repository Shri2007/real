import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { bumpTaste } from "./prefs";

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
  args: { gigId: v.id("gigs"), reactorId: v.id("users"), audioStorageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reaction = await ctx.db
      .query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId))
      .unique();
    if (!reaction) throw new Error("React to the clip before recording why");
    if (reaction.whyAudioStorageId && reaction.whyAudioStorageId !== args.audioStorageId) {
      await ctx.storage.delete(reaction.whyAudioStorageId);
    }
    await ctx.db.patch(reaction._id, {
      whyAudioStorageId: args.audioStorageId,
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
    v.object({ audioStorageId: v.id("_storage"), gigTitle: v.string(), question: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const reaction = await ctx.db.get(args.reactionId);
    if (!reaction?.whyAudioStorageId) return null;
    const gig = await ctx.db.get(reaction.gigId);
    return { audioStorageId: reaction.whyAudioStorageId, gigTitle: gig?.title ?? "", question: gig?.question };
  },
});

export const saveWhy = internalMutation({
  args: {
    reactionId: v.id("reactions"),
    audioStorageId: v.id("_storage"),
    whyText: v.string(),
    whyQuote: v.optional(v.string()),
    whyTags: v.optional(v.array(v.string())),
    whySentiment: v.optional(sentimentValidator),
  },
  returns: v.null(),
  handler: async (ctx, { reactionId, audioStorageId, ...fields }) => {
    const reaction = await ctx.db.get(reactionId);
    if (!reaction || reaction.whyAudioStorageId !== audioStorageId) return null;
    await ctx.db.patch(reactionId, fields);
    const gig = await ctx.db.get(reaction.gigId);
    await bumpTaste(ctx, reaction.reactorId, gig?.tags, fields.whySentiment === "pos" ? 1 : fields.whySentiment === "neg" ? -1 : 0);
    return null;
  },
});

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

export const transcribe = internalAction({
  args: { reactionId: v.id("reactions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set in Convex env");
    const info: { audioStorageId: Id<"_storage">; gigTitle: string; question?: string } | null = await ctx.runQuery(
      internal.voice.reactionForTranscribe,
      args,
    );
    if (!info) return null;
    const audio = await ctx.storage.get(info.audioStorageId);
    if (!audio) return null;

    const form = new FormData();
    form.append("file", audio, audio.type.includes("webm") ? "why.webm" : "why.m4a");
    form.append("model", "gpt-4o-mini-transcribe");
    const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!sttRes.ok) throw new Error(`Transcription failed: ${sttRes.status} ${await sttRes.text()}`);
    const whyText = ((await sttRes.json()) as { text?: string }).text?.trim() ?? "";
    if (!whyText) return null;

    let extracted: { quote: string; sentiment: Doc<"reactions">["whySentiment"]; tags: string[] } | null = null;
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
                `A viewer just watched a short clip and said, out loud, why they reacted the way they did. Extract: quote = the most useful verbatim phrase from the transcript, at most ${MAX_QUOTE_WORDS} words, copied exactly; sentiment = pos, neg, or mixed about the clip; tags = 1-3 short lowercase reasons (2-3 words each, like "slow intro", "great ending", "relatable"). Use only what the transcript says.`,
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
                required: ["quote", "sentiment", "tags"],
                properties: {
                  quote: { type: "string" },
                  sentiment: { type: "string", enum: ["pos", "neg", "mixed"] },
                  tags: { type: "array", items: { type: "string" } },
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

    // Never invent words: the quote must appear in the transcript, else fall back to its first words.
    const candidate = extracted?.quote?.trim() ?? "";
    const verbatim = candidate && normalize(whyText).includes(normalize(candidate)) && candidate.split(/\s+/).length <= MAX_QUOTE_WORDS;
    const words = whyText.split(/\s+/);
    const whyQuote = verbatim ? candidate : words.slice(0, MAX_QUOTE_WORDS).join(" ") + (words.length > MAX_QUOTE_WORDS ? "…" : "");
    const whyTags = extracted?.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 3);

    await ctx.runMutation(internal.voice.saveWhy, {
      reactionId: args.reactionId,
      audioStorageId: info.audioStorageId,
      whyText,
      whyQuote,
      ...(whyTags?.length ? { whyTags } : {}),
      ...(extracted?.sentiment ? { whySentiment: extracted.sentiment } : {}),
    });
    return null;
  },
});

const quoteValidator = v.object({
  name: v.string(),
  color: v.string(),
  laughed: v.boolean(),
  whyQuote: v.string(),
  sentiment: v.optional(sentimentValidator),
  tags: v.array(v.string()),
});

// Creator/brand results: what valid reactors said, newest first.
export const forGig = query({
  args: { gigId: v.id("gigs") },
  returns: v.array(quoteValidator),
  handler: async (ctx, args) => {
    const rs = await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", args.gigId)).order("desc").take(500);
    const out = [];
    for (const r of rs) {
      if (!r.valid || !r.whyQuote) continue;
      const u = await ctx.db.get(r.reactorId);
      out.push({
        name: u?.name ?? "?",
        color: u?.color ?? "#888",
        laughed: r.laughed,
        whyQuote: r.whyQuote,
        sentiment: r.whySentiment,
        tags: r.whyTags ?? [],
      });
    }
    return out;
  },
});

// The reactor's own "why" for one clip, so the app can show what was heard.
export const mine = query({
  args: { gigId: v.id("gigs"), reactorId: v.id("users") },
  returns: v.union(
    v.object({ recorded: v.boolean(), whyQuote: v.optional(v.string()), tags: v.array(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const r = await ctx.db
      .query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId))
      .unique();
    if (!r) return null;
    return { recorded: !!r.whyAudioStorageId, whyQuote: r.whyQuote, tags: r.whyTags ?? [] };
  },
});
