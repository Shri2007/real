import { v } from "convex/values";
import { action, internalMutation, mutation, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseEduEmail } from "./users";

declare const process: { env: Record<string, string | undefined> };

// Student verification: we email a 6-digit code to the .edu address (email.ts), and only a correct code
// marks the account verified. One verified account per school email: verifying an email that already belongs to
// another account signs you back into that account instead (the code proves you own it).
// Expected failures are returned, not thrown, so they show inline without a dev error overlay.
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

// signInAs: the email already belonged to this account, so the client switches to it.
const verified = v.object({ ok: v.literal(true), school: v.union(v.string(), v.null()), signInAs: v.union(v.id("users"), v.null()), name: v.union(v.string(), v.null()) });
type Verified = { ok: true; school: string | null; signInAs: Id<"users"> | null; name: string | null };

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const fail = (error: string) => ({ ok: false as const, error });
const failure = v.object({ ok: v.literal(false), error: v.string() });

async function ownerOf(ctx: QueryCtx, email: string, userId: Id<"users">) {
  const taken = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).take(5);
  return taken.find((u) => u._id !== userId && u.verifiedStudent) ?? null;
}

export const saveCode = internalMutation({
  args: { userId: v.id("users"), email: v.string(), codeHash: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), existing: v.union(v.string(), v.null()) }), failure),
  handler: async (ctx, { userId, email, codeHash }) => {
    if (!(await ctx.db.get(userId))) return fail("Account not found");
    const prev = await ctx.db.query("emailCodes").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (prev && Date.now() - prev._creationTime < RESEND_COOLDOWN_MS) return fail("Wait 30 seconds before asking for another code");
    if (prev) await ctx.db.delete(prev._id);
    await ctx.db.insert("emailCodes", { userId, email, codeHash, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
    return { ok: true as const, existing: (await ownerOf(ctx, email, userId))?.name ?? null };
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

// Step 1: email a code to the student's .edu address.
// `existing` is the name on the account that already owns this email, if any: confirming signs you into it.
export const start = action({
  args: { userId: v.id("users"), email: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), email: v.string(), existing: v.union(v.string(), v.null()) }), failure),
  handler: async (ctx, { userId, email: raw }): Promise<{ ok: true; email: string; existing: string | null } | { ok: false; error: string }> => {
    const edu = parseEduEmail(raw);
    if (!edu.verifiedStudent || !edu.email) return fail("Use your school email ending in .edu");
    const digits = new Uint32Array(1);
    crypto.getRandomValues(digits);
    const code = String(digits[0] % 1_000_000).padStart(6, "0");
    const saved = await ctx.runMutation(internal.verify.saveCode, { userId, email: edu.email, codeHash: await sha256(`${userId}:${code}`) });
    if (!saved.ok) return saved;
    try {
      await ctx.runAction(internal.email.sendCode, { to: edu.email, code });
    } catch (e) {
      await ctx.runMutation(internal.verify.dropCode, { userId });
      console.error(e);
      return fail("Could not send the email. Try again in a minute.");
    }
    return { ok: true as const, email: edu.email, existing: saved.existing };
  },
});

export const checkCode = internalMutation({
  args: { userId: v.id("users"), codeHash: v.string() },
  returns: v.union(verified, failure),
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
    await ctx.db.delete(row._id);
    const owner = await ownerOf(ctx, row.email, userId);
    if (owner) return { ok: true as const, school: owner.school ?? null, signInAs: owner._id, name: owner.name };
    const edu = parseEduEmail(row.email);
    await ctx.db.patch(userId, { email: row.email, school: edu.school, verifiedStudent: true });
    return { ok: true as const, school: edu.school ?? null, signInAs: null, name: null };
  },
});

// Step 2: the student types the code from their inbox.
export const confirm = action({
  args: { userId: v.id("users"), code: v.string() },
  returns: v.union(verified, failure),
  handler: async (ctx, { userId, code }): Promise<Verified | { ok: false; error: string }> => {
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) return fail("Enter the 6-digit code");
    return await ctx.runMutation(internal.verify.checkCode, { userId, codeHash: await sha256(`${userId}:${clean}`) });
  },
});

// Demo pass for judges without a .edu: the right pass (DEMO_PASS, default "yc2026") marks the account verified.
export const demoPass = mutation({
  args: { userId: v.id("users"), pass: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), school: v.string() }), failure),
  handler: async (ctx, { userId, pass }) => {
    const user = await ctx.db.get(userId);
    if (!user) return fail("Account not found");
    const expected = (process.env.DEMO_PASS ?? "yc2026").trim().toLowerCase();
    if (pass.trim().toLowerCase() !== expected) return fail("That demo pass isn't right");
    await ctx.db.patch(userId, { verifiedStudent: true, school: "Demo pass", demoPass: true });
    return { ok: true as const, school: "Demo pass" };
  },
});
