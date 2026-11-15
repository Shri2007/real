import { v } from "convex/values";
import { internalAction, internalQuery, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

// Record an update for a creator/brand. The Keiki agent reads unread ones via GET /keiki/inbox, and when
// KEIKI_API_KEY is set we also push it into the creator's Keiki conversation (x-conversation-id = handle).
export async function notify(ctx: MutationCtx, userId: Id<"users">, text: string) {
  await ctx.db.insert("notifications", { userId, text, read: false });
  await ctx.scheduler.runAfter(0, internal.notify.push, { userId, text });
}

export const handleFor = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.handle ?? null,
});

export const push = internalAction({
  args: { userId: v.id("users"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, text }) => {
    const key = process.env.KEIKI_API_KEY;
    const handle: string | null = await ctx.runQuery(internal.notify.handleFor, { userId });
    if (!key || !handle) return null;
    const base = process.env.KEIKI_API_BASE ?? "https://onkeiki.com/api/v1/openai";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-conversation-id": handle },
      body: JSON.stringify({
        model: process.env.KEIKI_AGENT ?? "REAL",
        reasoning_effort: "none",
        messages: [{ role: "user", content: `[REAL update for this creator; tell them in 1-2 short lines] ${text}` }],
      }),
    });
    if (!res.ok) console.error(`Keiki push failed: ${res.status} ${await res.text()}`);
    return null;
  },
});
