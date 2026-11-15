import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// REAL: a marketplace for verified human reactions.
// Creators post a clip ("gig") and pay per reaction. Reactors watch it with the
// front camera on; on-device face detection proves a real human watched and
// records a laugh/smile curve over the clip's timeline.
export default defineSchema({
  users: defineTable({
    name: v.string(),
    color: v.string(),
    handle: v.optional(v.string()), // Keiki conversation/sender identity
    balanceCents: v.number(), // reactor earnings (demo wallet; Whop handles real payouts)
    taste: v.optional(v.array(v.object({ tag: v.string(), w: v.number() }))), // preference engine weights
    // Optional .edu verification (Lane E) — all additive / optional
    email: v.optional(v.string()),
    school: v.optional(v.string()), // derived from domain, e.g. berkeley.edu → Berkeley
    verifiedStudent: v.optional(v.boolean()), // set only after the emailed code is confirmed (verify.ts)
    whopUserId: v.optional(v.string()), // linked Whop account for cash-outs (payments.linkWhop)
    whopUsername: v.optional(v.string()),
  })
    .index("by_handle", ["handle"])
    .index("by_email", ["email"]),

  // Pending .edu email codes (hashed), one per user.
  emailCodes: defineTable({
    userId: v.id("users"),
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
  }).index("by_userId", ["userId"]),

  gigs: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    question: v.optional(v.string()), // e.g. "Is the ending funny?"
    videoStorageId: v.id("_storage"),
    durationMs: v.optional(v.number()),
    priceCents: v.number(), // paid to each reactor
    slots: v.number(), // how many reactions the creator bought
    filled: v.number(),
    status: v.union(v.literal("draft"), v.literal("live"), v.literal("done")),
    paid: v.boolean(), // Whop checkout completed
    whopCheckoutId: v.optional(v.string()),
    whopPaymentId: v.optional(v.string()),
    report: v.optional(v.array(v.string())), // AI "what to fix" bullets
    tags: v.optional(v.array(v.string())), // AI tags for the For you feed
  })
    .index("by_status", ["status"])
    .index("by_creatorId", ["creatorId"]),

  reactions: defineTable({
    gigId: v.id("gigs"),
    reactorId: v.id("users"),
    // Sampled reaction curve: t = ms into the clip, s = laugh score 0..1 (null = no face)
    curve: v.array(v.object({ t: v.number(), s: v.union(v.number(), v.null()) })),
    peak: v.number(),
    laughed: v.boolean(), // peak >= threshold
    facePresentPct: v.number(), // 0..100
    watchedToEnd: v.boolean(),
    valid: v.boolean(), // face present enough + watched to end → paid
    earnedCents: v.number(),
    // Hold-to-talk "why" after the clip (Lane V): audio → transcript → verbatim quote + reason tags.
    whyAudioStorageId: v.optional(v.id("_storage")),
    whyText: v.optional(v.string()),
    whyQuote: v.optional(v.string()),
    whyTags: v.optional(v.array(v.string())),
    whySentiment: v.optional(v.union(v.literal("pos"), v.literal("neg"), v.literal("mixed"))),
  })
    .index("by_gigId", ["gigId"])
    .index("by_reactorId", ["reactorId"])
    .index("by_gigId_and_reactorId", ["gigId", "reactorId"]),

  // For you feed swipes (one per user per item).
  swipes: defineTable({
    userId: v.id("users"),
    gigId: v.optional(v.id("gigs")),
    oppId: v.optional(v.id("ugcOpps")),
    dir: v.union(v.literal("right"), v.literal("left")),
  }).index("by_userId_and_item", ["userId", "gigId", "oppId"]),

  // Paid UGC briefs brands post; students pick them from their feed.
  ugcOpps: defineTable({
    brandId: v.id("users"),
    gigId: v.optional(v.id("gigs")),
    title: v.string(),
    brief: v.string(),
    payoutCents: v.number(),
    spots: v.number(),
    claimed: v.number(),
    status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")), // draft until funded via Whop (UGC credits)
    tags: v.optional(v.array(v.string())),
    funded: v.optional(v.boolean()),
    whopCheckoutId: v.optional(v.string()),
    whopPaymentId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_gigId", ["gigId"]),

  ugcClaims: defineTable({
    oppId: v.id("ugcOpps"),
    userId: v.id("users"),
    status: v.union(v.literal("claimed"), v.literal("submitted"), v.literal("approved"), v.literal("rejected")),
    videoStorageId: v.optional(v.id("_storage")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_oppId", ["oppId"])
    .index("by_userId", ["userId"])
    .index("by_oppId_and_userId", ["oppId", "userId"]),

  // Updates for a creator/brand: shown in-app and readable by the Keiki agent (GET /keiki/inbox), pushed to Keiki when configured.
  notifications: defineTable({
    userId: v.id("users"),
    text: v.string(),
    read: v.boolean(),
  }).index("by_userId_and_read", ["userId", "read"]),

  // Reactor cash-out requests (paid out via Whop).
  payouts: defineTable({
    userId: v.id("users"),
    amountCents: v.number(),
    // pending = no Whop account linked (paid manually); processing/paid/failed = Whop balance transfer state
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("paid"), v.literal("failed")),
    whopTransferId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  }).index("by_userId", ["userId"]),
});
