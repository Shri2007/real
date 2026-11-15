import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Domain-only .edu check (no email code). "name@berkeley.edu" → { email, school: "Berkeley", verifiedStudent: true }. */
export function parseEduEmail(raw: string | undefined): {
  email?: string;
  school?: string;
  verifiedStudent?: boolean;
} {
  if (!raw) return {};
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return { email };
  const domain = email.slice(at + 1);
  if (!domain.endsWith(".edu")) return { email };
  const withoutEdu = domain.slice(0, -".edu".length);
  const label = withoutEdu.split(".").filter(Boolean).pop();
  if (!label) return { email };
  const school = label.length <= 4 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
  return { email, school, verifiedStudent: true };
}

// Name-only identity for the hackathon (no auth): the app stores userId on the device.
export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const edu = parseEduEmail(args.email);
    return ctx.db.insert("users", {
      name: args.name.trim(),
      color: args.color,
      balanceCents: 0,
      ...edu,
    });
  },
});

// Add or change a school email later (e.g. to unlock UGC jobs). Domain check only, same as onboarding.
export const verify = mutation({
  args: { userId: v.id("users"), email: v.string() },
  handler: async (ctx, { userId, email }) => {
    const edu = parseEduEmail(email);
    if (!edu.verifiedStudent) throw new Error("Use your school email ending in .edu");
    await ctx.db.patch(userId, edu);
    return edu.school ?? null;
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

// Reactor wallet: balance + recent reactions (+ optional .edu badge fields).
export const wallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const rs = await ctx.db
      .query("reactions")
      .withIndex("by_reactorId", (q) => q.eq("reactorId", args.userId))
      .order("desc")
      .take(30);
    const items = await Promise.all(
      rs.map(async (r) => {
        const gig = await ctx.db.get(r.gigId);
        return {
          reactionId: r._id,
          gigTitle: gig?.title ?? "?",
          earnedCents: r.earnedCents,
          valid: r.valid,
          at: r._creationTime,
        };
      }),
    );
    return {
      balanceCents: user?.balanceCents ?? 0,
      items,
      verifiedStudent: user?.verifiedStudent ?? false,
      school: user?.school,
    };
  },
});
