import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { bumpTaste } from "./prefs";
import { notify } from "./notify";

declare const process: { env: Record<string, string | undefined> };

export const LAUGH_THRESHOLD = 0.45;
const MIN_FACE_PCT = 70;
const MIN_LAUGH_MS = 1500;
const SMOOTH_WINDOW_MS = 500;
const MAX_SAMPLE_GAP_MS = 500;
const MIN_REVIEW_MS = 4000;
const MIN_WORDS = 8;
const MAX_DAILY_PAID = 50;
const DAILY_CAP_CENTS = 2500;
const COOLDOWN_MS = 3 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pointValidator = v.object({ t: v.number(), s: v.union(v.number(), v.null()) });
const runValidator = v.object({ startMs: v.number(), endMs: v.number() });
const curvePointValidator = v.object({ sec: v.number(), avg: v.number(), laughingPct: v.number(), sustainedPct: v.number() });
const insightValidator = v.object({ text: v.string(), count: v.number(), weight: v.number() });
const reactorValidator = v.object({
  reactionId: v.id("reactions"), name: v.string(), color: v.string(), laughed: v.boolean(), peak: v.number(),
  verifiedStudent: v.boolean(), school: v.optional(v.string()),
});

type Point = { t: number; s: number | null };
type LaughRun = { startMs: number; endMs: number };

function analyzeCurve(curve: Point[]) {
  const ordered = [...curve].sort((a, b) => a.t - b.t);
  const facePresentPct = Math.round(100 * ordered.filter((p) => p.s !== null).length / Math.max(1, ordered.length));
  const smoothed: Point[] = [];
  let segment: Point[] = [];
  const flush = () => {
    for (let i = 0; i < segment.length; i++) {
      const p = segment[i];
      const from = p.t - SMOOTH_WINDOW_MS;
      let sum = 0;
      let count = 0;
      for (let j = i; j >= 0 && segment[j].t >= from; j--) {
        sum += segment[j].s ?? 0;
        count++;
      }
      smoothed.push({ t: p.t, s: count ? sum / count : 0 });
    }
    segment = [];
  };
  for (const p of ordered) {
    if (p.s === null) {
      flush();
      smoothed.push({ t: p.t, s: null });
    } else {
      if (segment.length && p.t - segment[segment.length - 1].t > MAX_SAMPLE_GAP_MS) flush();
      segment.push(p);
    }
  }
  flush();

  let peak = 0;
  for (const p of smoothed) if (p.s !== null) peak = Math.max(peak, p.s);
  const runs: LaughRun[] = [];
  let start: number | null = null;
  let last: number | null = null;
  const finishRun = () => {
    if (start !== null && last !== null && last - start >= MIN_LAUGH_MS) runs.push({ startMs: start, endMs: last });
    start = null;
    last = null;
  };
  for (const p of smoothed) {
    if (p.s === null || p.s < LAUGH_THRESHOLD || (last !== null && p.t - last > MAX_SAMPLE_GAP_MS)) finishRun();
    if (p.s !== null && p.s >= LAUGH_THRESHOLD) {
      if (start === null) start = p.t;
      last = p.t;
    }
  }
  finishRun();
  const laughMs = runs.reduce((m, r) => Math.max(m, r.endMs - r.startMs), 0);
  return { facePresentPct, peak, laughed: runs.length > 0, laughMs, laughCount: runs.length, laughRuns: runs };
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function overlap(a: string, b: string) {
  const aa = new Set(normalize(a).split(" ").filter(Boolean));
  const bb = new Set(normalize(b).split(" ").filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  for (const token of aa) if (bb.has(token)) intersection++;
  return intersection / (aa.size + bb.size - intersection);
}

function pacificMidnight(now: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", timeZoneName: "shortOffset",
  }).formatToParts(new Date(now));
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const offset = value("timeZoneName").match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const minutes = offset ? (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) : -480;
  return Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day"))) - minutes * 60_000;
}

function fmtCountdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function aggregateFeedback(rows: { phrase: string; trust: number }[]) {
  const groups: { text: string; count: number; weight: number; normalized: string }[] = [];
  for (const row of rows) {
    const phrase = row.phrase.trim();
    if (!phrase) continue;
    const key = normalize(phrase);
    const group = groups.find((g) => overlap(g.normalized, key) >= 0.75);
    if (group) { group.count++; group.weight += row.trust; }
    else groups.push({ text: phrase, count: 1, weight: row.trust, normalized: key });
  }
  return groups.sort((a, b) => b.weight - a.weight || b.count - a.count).slice(0, 5)
    .map(({ text, count, weight }) => ({ text, count, weight }));
}

export const submit = mutation({
  args: {
    gigId: v.id("gigs"), reactorId: v.id("users"), curve: v.array(pointValidator), watchedToEnd: v.boolean(),
  },
  returns: v.object({
    valid: v.boolean(), watchValid: v.boolean(), earnedCents: v.number(), laughed: v.boolean(),
    laughMs: v.number(), laughCount: v.number(), reason: v.string(),
  }),
  handler: async (ctx, args) => {
    const [gig, reactor] = await Promise.all([ctx.db.get(args.gigId), ctx.db.get(args.reactorId)]);
    if (!gig || gig.status !== "live") throw new ConvexError("Gig not available");
    if (!reactor) throw new ConvexError("Reactor account not found");
    const dup = await ctx.db.query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", args.gigId).eq("reactorId", args.reactorId)).unique();
    if (dup) return {
      valid: dup.valid, watchValid: dup.watchedToEnd && dup.facePresentPct >= MIN_FACE_PCT,
      earnedCents: dup.earnedCents, laughed: dup.laughed, laughMs: dup.laughMs ?? 0, laughCount: dup.laughCount ?? Number(dup.laughed),
      reason: dup.reason ?? (dup.bonusCents === undefined ? "Add your spoken review to complete payment." : "Reaction already submitted."),
    };
    const result = analyzeCurve(args.curve);
    const watchValid = args.watchedToEnd && result.facePresentPct >= MIN_FACE_PCT && gig.filled < gig.slots;
    const reason = !args.watchedToEnd ? "Watch the full clip to qualify for payment."
      : result.facePresentPct < MIN_FACE_PCT ? "Keep your face in frame for at least 70% of the clip."
        : gig.filled >= gig.slots ? "All paid spots are filled." : "Add a specific voice review to complete payment.";
    await ctx.db.insert("reactions", {
      gigId: args.gigId, reactorId: args.reactorId, curve: args.curve, peak: result.peak, laughed: result.laughed,
      laughMs: result.laughMs, laughCount: result.laughCount, laughRuns: result.laughRuns,
      facePresentPct: result.facePresentPct, watchedToEnd: args.watchedToEnd,
      valid: false, earnedCents: 0, reason,
    });
    return { valid: false, watchValid, earnedCents: 0, laughed: result.laughed, laughMs: result.laughMs, laughCount: result.laughCount, reason };
  },
});

export const finalizeReaction = internalMutation({
  args: {
    reactionId: v.id("reactions"), audioStorageId: v.id("_storage"), whyDurationMs: v.number(), whyText: v.string(),
    whyQuote: v.optional(v.string()), whyTags: v.array(v.string()), whySentiment: v.optional(v.union(v.literal("pos"), v.literal("neg"), v.literal("mixed"))),
    worked: v.array(v.string()), sucked: v.array(v.string()), qualityScore: v.number(), generic: v.boolean(), citesSpecific: v.boolean(),
  },
  returns: v.object({ finalized: v.boolean(), valid: v.boolean(), earnedCents: v.number(), bonusCents: v.number(), reason: v.string() }),
  handler: async (ctx, args) => {
    const reaction = await ctx.db.get(args.reactionId);
    if (!reaction || reaction.whyAudioStorageId !== args.audioStorageId) return { finalized: false, valid: false, earnedCents: 0, bonusCents: 0, reason: "Review no longer available." };
    if (reaction.bonusCents !== undefined) return { finalized: true, valid: reaction.valid, earnedCents: reaction.earnedCents, bonusCents: reaction.bonusCents, reason: reaction.reason ?? "Review already finalized." };
    const [gig, user] = await Promise.all([ctx.db.get(reaction.gigId), ctx.db.get(reaction.reactorId)]);
    if (!gig || !user) throw new ConvexError("Reaction account not found");

    const flags = [...new Set(reaction.flags ?? [])];
    let trust = user.trust ?? 0.5;
    let flagCount = user.flagCount ?? 0;
    let qualityScore = Math.max(0, Math.min(1, args.qualityScore));
    if (args.generic) qualityScore = Math.min(qualityScore, 0.2);
    if (!args.citesSpecific) qualityScore = Math.min(qualityScore, 0.4);
    const normalizedWhy = normalize(args.whyText);
    const praises = /\b(funny|hilarious|loved it|love it|made me laugh|laughed)\b/.test(normalizedWhy);
    const mismatch = praises && !reaction.laughed && reaction.peak < 0.2;
    const honeypotFail = !!gig.isHoneypot && praises && reaction.facePresentPct < MIN_FACE_PCT;

    const [recentByUser, recentForGig] = await Promise.all([
      ctx.db.query("reactions").withIndex("by_reactorId", (q) => q.eq("reactorId", reaction.reactorId)).order("desc").take(500),
      ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", reaction.gigId)).order("desc").take(500),
    ]);
    const duplicate = [...recentByUser.filter((r) => r._id !== reaction._id).slice(0, 20), ...recentForGig.filter((r) => r.reactorId !== reaction.reactorId)]
      .some((r) => !!r.whyText && overlap(normalizedWhy, r.whyText) >= 0.85);
    const penalty = (flag: string, amount: number) => {
      if (flags.includes(flag)) return;
      flags.push(flag);
      flagCount++;
      trust = Math.max(0, trust - amount);
    };
    if (mismatch) { penalty("mismatch", 0.1); qualityScore = Math.max(0, qualityScore - 0.3); }
    if (duplicate) penalty("duplicate", 0.1);
    if (honeypotFail) penalty("honeypot_fail", 0.2);
    if (qualityScore >= 0.7) trust = Math.min(1, trust + 0.02);

    const wordCount = normalizedWhy ? normalizedWhy.split(" ").length : 0;
    const minReviewOk = args.whyDurationMs >= MIN_REVIEW_MS && wordCount >= MIN_WORDS;
    let reason = "";
    let baseCents = 0;
    let bonusCents = 0;
    let earnedCents = 0;
    const verified = !!user.verifiedStudent || !!user.demoPass;
    const watchValid = reaction.watchedToEnd && reaction.facePresentPct >= MIN_FACE_PCT;
    if (trust < 0.3) reason = "Your reviews are under review.";
    else if (!reaction.watchedToEnd) reason = "Watch the full clip to qualify for payment.";
    else if (reaction.facePresentPct < MIN_FACE_PCT) reason = "Keep your face in frame for at least 70% of the clip.";
    else if (!minReviewOk) reason = "Too short — tell us what worked or didn't (at least 4 seconds and 8 words).";
    else if (duplicate) reason = "Repeated review — add new, specific feedback to earn.";
    else if (honeypotFail) reason = "Your review did not match the verification check.";
    else if (qualityScore < 0.3) reason = "Too vague — point to a specific moment to earn.";
    else if (gig.filled >= gig.slots) reason = "All paid spots are filled.";
    else {
      const now = Date.now();
      const lastPaidAt = user.lastReactAt ?? 0;
      if (lastPaidAt && now - lastPaidAt < COOLDOWN_MS) reason = `Next paid reaction in ${fmtCountdown(COOLDOWN_MS - (now - lastPaidAt))}.`;
      else {
        const midnight = pacificMidnight(now);
        const paidToday = recentByUser.filter((r) => r._id !== reaction._id && r._creationTime >= midnight && r.earnedCents > 0);
        if (paidToday.length >= MAX_DAILY_PAID) reason = "Daily limit reached: 50 paid reactions.";
        else {
          const remaining = Math.max(0, DAILY_CAP_CENTS - paidToday.reduce((sum, r) => sum + r.earnedCents, 0));
          const fullBase = verified ? gig.priceCents : Math.round(gig.priceCents / 2);
          const fullBonus = verified && qualityScore >= 0.7 ? Math.round(gig.priceCents * 0.5 * qualityScore) : 0;
          if (remaining < fullBase) reason = "Daily earnings cap reached ($25).";
          else {
            baseCents = fullBase;
            bonusCents = Math.min(fullBonus, remaining - fullBase);
            earnedCents = baseCents + bonusCents;
          }
        }
      }
    }
    if (!reason && earnedCents === 0) reason = watchValid ? "No payment was available for this reaction." : "Reaction did not meet payment requirements.";
    const valid = earnedCents > 0;
    const holdMs = process.env.DEMO_INSTANT_RELEASE === "true" ? 0 : DAY_MS;
    const pendingUntil = valid && holdMs ? Date.now() + holdMs : undefined;
    const whyQuote = args.whyQuote?.trim() || args.whyText.trim().split(/\s+/).slice(0, 12).join(" ");
    await ctx.db.patch(reaction._id, {
      whyDurationMs: args.whyDurationMs, whyText: args.whyText, whyQuote, whyTags: args.whyTags, whySentiment: args.whySentiment,
      worked: args.worked.slice(0, 5), sucked: args.sucked.slice(0, 5), qualityScore, flags, bonusCents, valid, earnedCents,
      reason: valid ? (bonusCents > 0 ? "Detailed feedback bonus earned." : "Review accepted.") : reason,
      pendingUntil,
    });
    await ctx.db.patch(user._id, {
      trust, flagCount, ...(valid ? { lastReactAt: Date.now() } : {}),
      pendingCents: Math.max(0, user.pendingCents ?? 0) + (pendingUntil ? earnedCents : 0),
      balanceCents: user.balanceCents + (valid && !pendingUntil ? earnedCents : 0),
    });
    if (trust >= 0.3 && qualityScore >= 0.3) await bumpTaste(ctx, reaction.reactorId, gig.tags, reaction.laughed ? 1 : 0);
    if (valid) {
      const filled = gig.filled + 1;
      await ctx.db.patch(gig._id, { filled, status: filled >= gig.slots ? "done" : gig.status });
      if (pendingUntil) await ctx.scheduler.runAfter(holdMs, internal.reactions.releasePending, { reactionId: reaction._id });
      if (filled >= gig.slots) {
        await ctx.scheduler.runAfter(30000, internal.report.generateForGig, { gigId: gig._id });
        await notify(ctx, gig.creatorId, `"${gig.title}" is done: ${filled} paid reactions are in. Ask "how did it do?" for the results and what to fix.`);
      }
    }
    return { finalized: true, valid, earnedCents, bonusCents, reason: valid ? (bonusCents > 0 ? "Detailed feedback bonus earned." : "Review accepted.") : reason };
  },
});

export const releasePending = internalMutation({
  args: { reactionId: v.id("reactions") },
  returns: v.null(),
  handler: async (ctx, { reactionId }) => {
    const reaction = await ctx.db.get(reactionId);
    if (!reaction || !reaction.pendingUntil || reaction.pendingUntil > Date.now() || reaction.earnedCents <= 0) return null;
    const user = await ctx.db.get(reaction.reactorId);
    if (!user) return null;
    await ctx.db.patch(user._id, {
      pendingCents: Math.max(0, (user.pendingCents ?? 0) - reaction.earnedCents),
      balanceCents: user.balanceCents + reaction.earnedCents,
    });
    await ctx.db.patch(reaction._id, { pendingUntil: undefined });
    return null;
  },
});

export const brandReject = mutation({
  args: { reactionId: v.id("reactions"), brandId: v.id("users") },
  returns: v.object({ clawedBack: v.boolean(), reason: v.string() }),
  handler: async (ctx, { reactionId, brandId }) => {
    const reaction = await ctx.db.get(reactionId);
    if (!reaction) throw new ConvexError("Reaction not found");
    const gig = await ctx.db.get(reaction.gigId);
    if (!gig || gig.creatorId !== brandId) throw new ConvexError("Only the creator can flag this reaction");
    const flags = reaction.flags ?? [];
    if (flags.includes("brand_reject")) return { clawedBack: false, reason: "Already marked not helpful." };
    const rows = await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", reaction.gigId)).take(500);
    if (rows.filter((r) => (r.flags ?? []).includes("brand_reject")).length >= 3) throw new ConvexError("Only three reactions per test can be marked not helpful");
    const now = Date.now();
    const clawedBack = reaction.earnedCents > 0 && !!reaction.pendingUntil && reaction.pendingUntil > now;
    const user = await ctx.db.get(reaction.reactorId);
    await ctx.db.patch(reaction._id, {
      flags: [...flags, "brand_reject"],
      reason: "Brand marked this review not helpful.",
      ...(clawedBack ? { earnedCents: 0, valid: false, pendingUntil: undefined } : {}),
    });
    if (user) await ctx.db.patch(user._id, {
      trust: Math.max(0, (user.trust ?? 0.5) - 0.1), flagCount: (user.flagCount ?? 0) + 1,
      ...(clawedBack ? { pendingCents: Math.max(0, (user.pendingCents ?? 0) - reaction.earnedCents) } : {}),
    });
    return { clawedBack, reason: clawedBack ? "Pending earnings were returned." : "Already available earnings were not clawed back." };
  },
});

// Creator dashboard: aggregate the score curve and sustained laugh runs, plus trust-weighted review insights.
export const results = query({
  args: { gigId: v.id("gigs") },
  returns: v.object({
    count: v.number(), laughedCount: v.number(), verifiedStudentCount: v.number(), curve: v.array(curvePointValidator),
    peakSec: v.union(v.number(), v.null()), reactors: v.array(reactorValidator), topWorked: v.array(insightValidator),
    topSucked: v.array(insightValidator), avgQuality: v.number(), filteredCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", args.gigId)).take(500);
    const trustById = new Map<string, number>();
    const users = await Promise.all(rows.map((r) => ctx.db.get(r.reactorId)));
    rows.forEach((r, i) => trustById.set(r.reactorId, users[i]?.trust ?? 0.5));
    const visible = rows.filter((r) => r.valid && !(r.flags?.length) && (trustById.get(r.reactorId) ?? 0.5) >= 0.3);
    const buckets = new Map<number, { sum: number; n: number; laughing: number; sustained: number; sustainedTotal: number }>();
    for (const r of visible) {
      const runs = r.laughRuns ?? analyzeCurve(r.curve).laughRuns;
      for (const p of r.curve) {
        if (p.s === null) continue;
        const sec = Math.floor(p.t / 1000);
        const b = buckets.get(sec) ?? { sum: 0, n: 0, laughing: 0, sustained: 0, sustainedTotal: 0 };
        b.sum += p.s;
        b.n++;
        if (p.s >= LAUGH_THRESHOLD) b.laughing++;
        if (runs.some((run) => p.t >= run.startMs && p.t <= run.endMs)) b.sustained++;
        b.sustainedTotal++;
        buckets.set(sec, b);
      }
    }
    const curve = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([sec, b]) => ({
      sec, avg: b.sum / b.n, laughingPct: Math.round(100 * b.laughing / b.n), sustainedPct: Math.round(100 * b.sustained / b.sustainedTotal),
    }));
    const peakMoment = curve.reduce<{ sec: number; avg: number } | null>((m, c) => !m || c.avg > m.avg ? c : m, null);
    const reactors = await Promise.all(visible.map(async (r) => {
      const u = await ctx.db.get(r.reactorId);
      return { reactionId: r._id, name: u?.name ?? "?", color: u?.color ?? "#888", laughed: r.laughed,
        peak: r.peak, verifiedStudent: u?.verifiedStudent ?? false, ...(u?.school ? { school: u.school } : {}) };
    }));
    const feedbackRows = visible.filter((r) => (r.qualityScore ?? 0) >= 0.3);
    const worked = feedbackRows.flatMap((r) => (r.worked ?? []).map((phrase) => ({ phrase, trust: trustById.get(r.reactorId) ?? 0.5 })));
    const sucked = feedbackRows.flatMap((r) => (r.sucked ?? []).map((phrase) => ({ phrase, trust: trustById.get(r.reactorId) ?? 0.5 })));
    const scoredRows = rows.filter((r) => r.qualityScore !== undefined);
    const avgWeight = scoredRows.reduce((sum, r) => sum + (r.qualityScore ?? 0) * (trustById.get(r.reactorId) ?? 0.5), 0);
    const weightTotal = scoredRows.reduce((sum, r) => sum + (trustById.get(r.reactorId) ?? 0.5), 0);
    return {
      count: visible.length, laughedCount: visible.filter((r) => r.laughed).length,
      verifiedStudentCount: reactors.filter((r) => r.verifiedStudent).length, curve, peakSec: peakMoment?.sec ?? null, reactors,
      topWorked: aggregateFeedback(worked), topSucked: aggregateFeedback(sucked), avgQuality: weightTotal ? avgWeight / weightTotal : 0,
      filteredCount: rows.filter((r) => !r.valid || (r.flags?.length ?? 0) > 0 || (trustById.get(r.reactorId) ?? 0.5) < 0.3).length,
    };
  },
});

export const mine = query({
  args: { gigId: v.id("gigs"), reactorId: v.id("users") },
  returns: v.union(v.object({
    finalized: v.boolean(), valid: v.boolean(), earnedCents: v.number(), bonusCents: v.number(), qualityScore: v.number(),
    reason: v.string(), laughed: v.boolean(), laughMs: v.number(), laughCount: v.number(), flags: v.array(v.string()),
  }), v.null()),
  handler: async (ctx, { gigId, reactorId }) => {
    const reaction = await ctx.db.query("reactions")
      .withIndex("by_gigId_and_reactorId", (q) => q.eq("gigId", gigId).eq("reactorId", reactorId)).unique();
    if (!reaction) return null;
    return {
      finalized: reaction.bonusCents !== undefined, valid: reaction.valid, earnedCents: reaction.earnedCents,
      bonusCents: reaction.bonusCents ?? 0, qualityScore: reaction.qualityScore ?? 0, reason: reaction.reason ?? "Record a specific voice review to finalize payment.",
      laughed: reaction.laughed, laughMs: reaction.laughMs ?? 0, laughCount: reaction.laughCount ?? Number(reaction.laughed), flags: reaction.flags ?? [],
    };
  },
});
