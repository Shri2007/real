import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseEduEmail } from "./users";

declare const process: { env: Record<string, string | undefined> };

// Student verification: we email a 6-digit code to the .edu address (Resend), and only a correct code
// marks the account verified. One verified account per school email.
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const saveCode = internalMutation({
  args: { userId: v.id("users"), email: v.string(), codeHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email, codeHash }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Account not found");
    const taken = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).take(5);
    if (taken.some((u) => u._id !== userId && u.verifiedStudent)) throw new Error("That school email is already verified on another account");
    const prev = await ctx.db.query("emailCodes").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (prev && Date.now() - prev._creationTime < RESEND_COOLDOWN_MS) throw new Error("Wait 30 seconds before asking for another code");
    if (prev) await ctx.db.delete(prev._id);
    await ctx.db.insert("emailCodes", { userId, email, codeHash, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
    return null;
  },
});

export const dropCode = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const row = await ctx.db.query("emailCodes").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

export const sendEmail = internalAction({
  args: { to: v.string(), code: v.string() },
  returns: v.null(),
  handler: async (_ctx, { to, code }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set in Convex env");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "REAL <onboarding@resend.dev>",
        to: [to],
        subject: `Your REAL student code: ${code}`,
        text: `Your REAL verification code is ${code}. It expires in 10 minutes. If you didn't ask for it, ignore this email.`,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
    return null;
  },
});

// Step 1: email a code to the student's .edu address.
export const start = action({
  args: { userId: v.id("users"), email: v.string() },
  returns: v.object({ email: v.string() }),
  handler: async (ctx, { userId, email: raw }): Promise<{ email: string }> => {
    const edu = parseEduEmail(raw);
    if (!edu.verifiedStudent || !edu.email) throw new Error("Use your school email ending in .edu");
    const digits = new Uint32Array(1);
    crypto.getRandomValues(digits);
    const code = String(digits[0] % 1_000_000).padStart(6, "0");
    await ctx.runMutation(internal.verify.saveCode, { userId, email: edu.email, codeHash: await sha256(`${userId}:${code}`) });
    try {
      await ctx.runAction(internal.verify.sendEmail, { to: edu.email, code });
    } catch (e) {
      await ctx.runMutation(internal.verify.dropCode, { userId });
      console.error(e);
      throw new Error("Could not send the email. Try again in a minute.");
    }
    return { email: edu.email };
  },
});

export const checkCode = internalMutation({
  args: { userId: v.id("users"), codeHash: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), school: v.union(v.string(), v.null()) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { userId, codeHash }) => {
    const row = await ctx.db.query("emailCodes").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!row) return { ok: false as const, error: "Ask for a new code first" };
    if (row.expiresAt < Date.now()) {
      await ctx.db.delete(row._id);
      return { ok: false as const, error: "That code expired. Send a new one." };
    }
    if (row.codeHash !== codeHash) {
      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        await ctx.db.delete(row._id);
        return { ok: false as const, error: "Too many wrong codes. Send a new one." };
      }
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return { ok: false as const, error: "Wrong code. Check your email and try again." };
    }
    const taken = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", row.email)).take(5);
    if (taken.some((u) => u._id !== userId && u.verifiedStudent)) {
      await ctx.db.delete(row._id);
      return { ok: false as const, error: "That school email is already verified on another account" };
    }
    const edu = parseEduEmail(row.email);
    await ctx.db.patch(userId, { email: row.email, school: edu.school, verifiedStudent: true });
    await ctx.db.delete(row._id);
    return { ok: true as const, school: edu.school ?? null };
  },
});

// Step 2: the student types the code from their inbox.
export const confirm = action({
  args: { userId: v.id("users"), code: v.string() },
  returns: v.object({ school: v.union(v.string(), v.null()) }),
  handler: async (ctx, { userId, code }): Promise<{ school: string | null }> => {
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) throw new Error("Enter the 6-digit code");
    const result: { ok: true; school: string | null } | { ok: false; error: string } = await ctx.runMutation(internal.verify.checkCode, {
      userId: userId as Id<"users">,
      codeHash: await sha256(`${userId}:${clean}`),
    });
    if (!result.ok) throw new Error(result.error);
    return { school: result.school };
  },
});
