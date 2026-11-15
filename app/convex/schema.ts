import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// OPEN MIC data model. Contract for all lanes: see docs/TASKS.md.
export default defineSchema({
  users: defineTable({
    name: v.string(),
    color: v.string(),
  }),

  groups: defineTable({
    name: v.string(),
    code: v.string(), // 6-char join code
    streak: v.number(),
    lastStreakDay: v.optional(v.string()), // YYYY-MM-DD
  }).index("by_code", ["code"]),

  members: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_groupId_and_userId", ["groupId", "userId"]),

  // The daily Drop prompt for a group (Vishnu: random-time scheduler fills this).
  dropPrompts: defineTable({
    groupId: v.id("groups"),
    day: v.string(), // YYYY-MM-DD
    firesAt: v.number(), // ms epoch
    closesAt: v.number(),
  }).index("by_groupId_and_day", ["groupId", "day"]),

  drops: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    day: v.string(),
    kind: v.union(v.literal("text"), v.literal("image")),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_groupId_and_day", ["groupId", "day"])
    .index("by_userId", ["userId"]),

  laughs: defineTable({
    dropId: v.id("drops"),
    groupId: v.id("groups"),
    viewerId: v.id("users"),
    senderId: v.id("users"),
    peak: v.number(),
    isReal: v.boolean(),
    onsetAt: v.optional(v.number()), // server-corrected ms
    reactionStorageId: v.optional(v.id("_storage")),
  })
    .index("by_dropId", ["dropId"])
    .index("by_dropId_and_viewerId", ["dropId", "viewerId"])
    .index("by_viewerId", ["viewerId"])
    .index("by_senderId", ["senderId"]),

  // Live show (the 9 PM show / on-stage finale) + contagion map.
  shows: defineTable({
    groupId: v.id("groups"),
    status: v.union(v.literal("lobby"), v.literal("joke"), v.literal("done")),
    jokeText: v.optional(v.string()),
    jokeStartedAt: v.optional(v.number()),
  }).index("by_groupId", ["groupId"]),

  showLaughs: defineTable({
    showId: v.id("shows"),
    userId: v.id("users"),
    onsetAt: v.number(), // server-corrected ms
  }).index("by_showId", ["showId"]),
});
