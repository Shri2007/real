import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { bumpTaste } from "./prefs";
import { notify } from "./notify";

// UGC opportunities: brands post a paid brief and fund it with Whop (UGC credits); verified STUDENTS pick the
// ones they want from their For you feed, record or upload a video, and get paid when the brand approves it.

export const create = mutation({
  args: {
    brandId: v.id("users"),
    gigId: v.optional(v.id("gigs")),
    title: v.string(),
    brief: v.string(),
    payoutCents: v.number(),
    spots: v.number(),
  },
  returns: v.id("ugcOpps"),
  handler: async (ctx, args) => {
    if (!args.title.trim() || !args.brief.trim()) throw new Error("Add a title and a brief");
    if (!Number.isInteger(args.payoutCents) || args.payoutCents < 100) throw new Error("Payout must be at least $1");
    if (!Number.isInteger(args.spots) || args.spots < 1 || args.spots > 50) throw new Error("Use 1–50 spots");
    const gig = args.gigId ? await ctx.db.get(args.gigId) : null;
    const oppId = await ctx.db.insert("ugcOpps", {
      ...args,
      title: args.title.trim(),
      brief: args.brief.trim(),
      claimed: 0,
      status: "draft",
      funded: false,
      tags: gig?.tags,
    });
    if (!gig?.tags?.length) {
      await ctx.scheduler.runAfter(0, internal.prefs.tagOpp, { oppId, text: `${args.title}\n${args.brief}${gig ? `\n${gig.title}` : ""}` });
    }
    return oppId;
  },
});

// Demo fallback when Whop isn't configured: open the opportunity without funding it.
export const publishFree = mutation({
  args: { oppId: v.id("ugcOpps"), brandId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { oppId, brandId }) => {
    const opp = await ctx.db.get(oppId);
    if (!opp || opp.brandId !== brandId) throw new Error("Not your opportunity");
    if (opp.status === "draft") await ctx.db.patch(oppId, { status: "open" });
    return null;
  },
});

export const claim = mutation({
  args: { oppId: v.id("ugcOpps"), userId: v.id("users") },
  returns: v.id("ugcClaims"),
  handler: async (ctx, { oppId, userId }) => {
    const opp = await ctx.db.get(oppId);
    if (!opp || opp.status !== "open") throw new Error("This opportunity is closed");
    if (opp.brandId === userId) throw new Error("You posted this one");
    const student = await ctx.db.get(userId);
    if (!student?.verifiedStudent) throw new Error("UGC jobs are for verified students. Add your .edu email first.");
    const existing = await ctx.db.query("ugcClaims").withIndex("by_oppId_and_userId", (q) => q.eq("oppId", oppId).eq("userId", userId)).unique();
    if (existing) return existing._id;
    const claimed = opp.claimed + 1;
    await ctx.db.patch(oppId, { claimed, status: claimed >= opp.spots ? "closed" : "open" });
    await bumpTaste(ctx, userId, opp.tags, 2);
    return ctx.db.insert("ugcClaims", { oppId, userId, status: "claimed" });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const submit = mutation({
  args: { claimId: v.id("ugcClaims"), userId: v.id("users"), videoStorageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { claimId, userId, videoStorageId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim || claim.userId !== userId) throw new Error("Claim not found");
    if (claim.status === "approved") throw new Error("Already approved");
    if (claim.videoStorageId && claim.videoStorageId !== videoStorageId) await ctx.storage.delete(claim.videoStorageId);
    await ctx.db.patch(claimId, { videoStorageId, status: "submitted" });
    const opp = await ctx.db.get(claim.oppId);
    const student = await ctx.db.get(userId);
    if (opp) {
      await notify(ctx, opp.brandId, `${student?.name ?? "A student"}${student?.school ? ` (${student.school})` : ""} submitted a video for "${opp.title}". Review it in REAL, or reply "approve" (claim ${claimId}).`);
    }
    return null;
  },
});

export const review = mutation({
  args: { claimId: v.id("ugcClaims"), brandId: v.id("users"), approve: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { claimId, brandId, approve }) => {
    const claim = await ctx.db.get(claimId);
    const opp = claim && (await ctx.db.get(claim.oppId));
    if (!claim || !opp || opp.brandId !== brandId) throw new Error("Not your opportunity");
    if (claim.status !== "submitted") throw new Error("Nothing to review yet");
    await ctx.db.patch(claimId, { status: approve ? "approved" : "rejected", ...(approve ? { approvedAt: Date.now() } : {}) });
    if (approve) {
      const student = await ctx.db.get(claim.userId);
      if (student) await ctx.db.patch(student._id, { balanceCents: student.balanceCents + opp.payoutCents });
    }
    return null;
  },
});

const claimStatus = v.union(v.literal("claimed"), v.literal("submitted"), v.literal("approved"), v.literal("rejected"));

// Brand view: opportunities posted on one test, with each student's claim and video.
export const forGig = query({
  args: { gigId: v.id("gigs") },
  returns: v.array(
    v.object({
      oppId: v.id("ugcOpps"),
      title: v.string(),
      brief: v.string(),
      payoutCents: v.number(),
      spots: v.number(),
      claimed: v.number(),
      status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")),
      funded: v.boolean(),
      claims: v.array(
        v.object({ claimId: v.id("ugcClaims"), name: v.string(), color: v.string(), school: v.optional(v.string()), status: claimStatus, videoUrl: v.union(v.string(), v.null()) }),
      ),
    }),
  ),
  handler: async (ctx, { gigId }) => {
    const opps = await ctx.db.query("ugcOpps").withIndex("by_gigId", (q) => q.eq("gigId", gigId)).order("desc").take(20);
    return Promise.all(
      opps.map(async (o) => {
        const claims = await ctx.db.query("ugcClaims").withIndex("by_oppId", (q) => q.eq("oppId", o._id)).take(50);
        return {
          oppId: o._id, title: o.title, brief: o.brief, payoutCents: o.payoutCents, spots: o.spots, claimed: o.claimed,
          status: o.status, funded: o.funded ?? false,
          claims: await Promise.all(
            claims.map(async (c) => {
              const u = await ctx.db.get(c.userId);
              return {
                claimId: c._id, name: u?.name ?? "?", color: u?.color ?? "#888", school: u?.school, status: c.status,
                videoUrl: c.videoStorageId ? await ctx.storage.getUrl(c.videoStorageId) : null,
              };
            }),
          ),
        };
      }),
    );
  },
});

// Student view: the opportunities I picked and where each one stands.
export const mine = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({ claimId: v.id("ugcClaims"), title: v.string(), brief: v.string(), brandName: v.string(), payoutCents: v.number(), status: claimStatus }),
  ),
  handler: async (ctx, { userId }) => {
    const claims = await ctx.db.query("ugcClaims").withIndex("by_userId", (q) => q.eq("userId", userId)).order("desc").take(50);
    const out = [];
    for (const c of claims) {
      const opp = await ctx.db.get(c.oppId);
      if (!opp) continue;
      const brand = await ctx.db.get(opp.brandId);
      out.push({ claimId: c._id, title: opp.title, brief: opp.brief, brandName: brand?.name ?? "?", payoutCents: opp.payoutCents, status: c.status });
    }
    return out;
  },
});
