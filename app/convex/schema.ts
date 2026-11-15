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
    balanceCents: v.number(), // reactor earnings (demo wallet; Whop handles real payouts)
  }),

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
  })
    .index("by_gigId", ["gigId"])
    .index("by_reactorId", ["reactorId"])
    .index("by_gigId_and_reactorId", ["gigId", "reactorId"]),
});
