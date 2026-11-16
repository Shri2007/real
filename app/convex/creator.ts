import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { INTERESTS } from "./prefs";

declare const process: { env: Record<string, string | undefined> };

// Creator test: a student answers a starter prompt with a short video. We transcribe it and an AI scores the take
// (hook, clarity, energy, authenticity) and names the UGC style they're best at. That style then boosts matching jobs.
export const STYLES = ["Try-on and styling", "Honest review", "Comedy skit", "Storytime", "Day in the life", "Tutorial", "Reaction"];

const scores = v.object({ hook: v.number(), clarity: v.number(), energy: v.number(), authenticity: v.number() });
const takeView = v.object({
  _id: v.id("creatorTakes"), prompt: v.string(), status: v.union(v.literal("scoring"), v.literal("scored"), v.literal("failed")),
  scores: v.optional(scores), style: v.optional(v.string()), feedback: v.optional(v.string()),
});

export const submitTake = mutation({
  args: { userId: v.id("users"), prompt: v.string(), tag: v.string(), videoStorageId: v.id("_storage") },
  returns: v.id("creatorTakes"),
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.userId))) throw new ConvexError("Account not found");
    const id = await ctx.db.insert("creatorTakes", { ...args, status: "scoring" });
    await ctx.scheduler.runAfter(0, internal.creator.score, { takeId: id });
    return id;
  },
});

export const latest = query({
  args: { userId: v.id("users") },
  returns: v.union(takeView, v.null()),
  handler: async (ctx, { userId }) => {
    const t = await ctx.db.query("creatorTakes").withIndex("by_userId", (q) => q.eq("userId", userId)).order("desc").first();
    return t && { _id: t._id, prompt: t.prompt, status: t.status, scores: t.scores, style: t.style, feedback: t.feedback };
  },
});

export const takeForScore = internalQuery({
  args: { takeId: v.id("creatorTakes") },
  returns: v.union(v.object({ prompt: v.string(), tag: v.string(), videoStorageId: v.id("_storage") }), v.null()),
  handler: async (ctx, { takeId }) => {
    const t = await ctx.db.get(takeId);
    return t && { prompt: t.prompt, tag: t.tag, videoStorageId: t.videoStorageId };
  },
});

export const saveScore = internalMutation({
  args: {
    takeId: v.id("creatorTakes"),
    result: v.union(
      v.object({ ok: v.literal(true), transcript: v.string(), scores, style: v.string(), feedback: v.string(), bestFor: v.array(v.string()) }),
      v.object({ ok: v.literal(false), feedback: v.string() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { takeId, result }) => {
    const take = await ctx.db.get(takeId);
    if (!take) return null;
    if (!result.ok) {
      await ctx.db.patch(takeId, { status: "failed", feedback: result.feedback });
      return null;
    }
    const { transcript, scores: s, style, feedback, bestFor } = result;
    await ctx.db.patch(takeId, { status: "scored", transcript, scores: s, style, feedback });
    const score = Math.round(((s.hook + s.clarity + s.energy + s.authenticity) / 4) * 10) / 10;
    const user: Doc<"users"> | null = await ctx.db.get(take.userId);
    // Keep the best take as the student's style.
    if (user && (!user.creatorStyle || score >= user.creatorStyle.score)) {
      await ctx.db.patch(user._id, { creatorStyle: { style, bestFor: [...new Set([take.tag, ...bestFor])].slice(0, 3), feedback, score } });
    }
    return null;
  },
});

export const score = internalAction({
  args: { takeId: v.id("creatorTakes") },
  returns: v.null(),
  handler: async (ctx, { takeId }) => {
    const take = await ctx.runQuery(internal.creator.takeForScore, { takeId });
    if (!take) return null;
    const fail = (feedback: string) => ctx.runMutation(internal.creator.saveScore, { takeId, result: { ok: false as const, feedback } });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return void (await fail("Scoring isn't set up yet."));
    const video = await ctx.storage.get(take.videoStorageId);
    if (!video) return void (await fail("Couldn't find your video. Try again."));
    try {
      const form = new FormData();
      form.append("file", video, "take.mp4");
      form.append("model", "gpt-4o-mini-transcribe");
      const stt = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
      if (!stt.ok) throw new Error(`Transcription failed: ${stt.status} ${await stt.text()}`);
      const transcript = ((await stt.json()) as { text?: string }).text?.trim() ?? "";
      if (transcript.split(/\s+/).length < 4) return void (await fail("We couldn't hear much. Talk to the camera and try again."));

      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-6-luna",
          input: [
            {
              role: "system",
              content: `You coach student UGC creators. Score this short take from its transcript, 1-10 each: hook (do the first words grab attention), clarity (easy to follow), energy (lively delivery in the words), authenticity (sounds like a real person, not an ad). Pick the UGC style they'd be best at from: ${STYLES.join(", ")}. bestFor = up to 2 topics from: ${INTERESTS.join(", ")}. feedback = one encouraging, specific sentence under 20 words on what to do more of. Judge only the transcript; be fair, most first takes land 5-7.`,
            },
            { role: "user", content: `Prompt: "${take.prompt}" (topic: ${take.tag})\nTranscript: "${transcript}"` },
          ],
          text: {
            format: {
              type: "json_schema", name: "take", strict: true,
              schema: {
                type: "object", additionalProperties: false, required: ["hook", "clarity", "energy", "authenticity", "style", "bestFor", "feedback"],
                properties: {
                  hook: { type: "integer" }, clarity: { type: "integer" }, energy: { type: "integer" }, authenticity: { type: "integer" },
                  style: { type: "string", enum: STYLES }, bestFor: { type: "array", items: { type: "string", enum: INTERESTS } }, feedback: { type: "string" },
                },
              },
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`Scoring failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
      const text = data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
      if (!text) throw new Error("No scoring output");
      const r = JSON.parse(text) as { hook: number; clarity: number; energy: number; authenticity: number; style: string; bestFor: string[]; feedback: string };
      const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
      await ctx.runMutation(internal.creator.saveScore, {
        takeId,
        result: {
          ok: true, transcript, style: r.style, feedback: r.feedback, bestFor: r.bestFor.slice(0, 2),
          scores: { hook: clamp(r.hook), clarity: clamp(r.clarity), energy: clamp(r.energy), authenticity: clamp(r.authenticity) },
        },
      });
    } catch (e) {
      console.error(e);
      await fail("Scoring hit a snag. Try another take.");
    }
    return null;
  },
});
