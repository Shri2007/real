import { v } from "convex/values";
import { action, ActionCtx, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export const save = internalMutation({
  args: { gigId: v.id("gigs"), report: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { gigId, report }) => {
    await ctx.db.patch(gigId, { report });
    return null;
  },
});

async function generate(ctx: ActionCtx, gigId: Id<"gigs">): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set in Convex env");
  const [gig, results, quotes] = await Promise.all([
    ctx.runQuery(api.gigs.get, { gigId }),
    ctx.runQuery(api.reactions.results, { gigId }),
    ctx.runQuery(api.voice.forGig, { gigId }),
  ]);
  if (!gig) throw new Error("Gig not found");
  if (!results.count) return [];
  const curve = results.curve.map((c) => `${fmt(c.sec)} avg ${c.avg.toFixed(2)}, ${c.laughingPct}% laughing`).join("\n");
  const said = quotes.map((q) => `- "${q.whyQuote}" (${q.sentiment ?? "?"}; ${q.tags.join(", ")})`).join("\n");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-6-luna",
      input: [
        {
          role: "system",
          content:
            "You write the 'what to fix' report for a short clip tested on verified students. Return exactly 3 bullets, each under 15 words, concrete edits with timestamps (m:ss). Base every claim on the data given: per-second laugh scores (0..1, laugh >= 0.45) and what viewers said. Never invent numbers or quotes.",
        },
        {
          role: "user",
          content: `Clip: "${gig.title}"${gig.question ? ` · creator asked: "${gig.question}"` : ""}\n${results.laughedCount} of ${results.count} verified viewers laughed. Peak at ${results.peakSec === null ? "n/a" : fmt(results.peakSec)}.\nPer second:\n${curve}\nWhat viewers said:\n${said || "(no voice notes)"}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["bullets"],
            properties: { bullets: { type: "array", items: { type: "string" } } },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Report failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
  const text = data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
  const bullets = text ? ((JSON.parse(text) as { bullets: string[] }).bullets ?? []).slice(0, 3) : [];
  if (bullets.length) await ctx.runMutation(internal.report.save, { gigId, report: bullets });
  return bullets;
}

// Scheduled when a gig fills its last slot.
export const generateForGig = internalAction({
  args: { gigId: v.id("gigs") },
  returns: v.null(),
  handler: async (ctx, { gigId }) => {
    await generate(ctx, gigId);
    return null;
  },
});

// Creator taps "Write AI report" (any time after the first reaction).
export const forGig = action({
  args: { gigId: v.id("gigs") },
  returns: v.array(v.string()),
  handler: async (ctx, { gigId }): Promise<string[]> => generate(ctx, gigId),
});
