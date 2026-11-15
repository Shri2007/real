import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Demo content so the For you feed feels like a feed on stage: ~12 tagged clips from 8 brands, funded UGC
// opportunities, and one finished test with verified reactions + quotes. Run once:
//   npx convex run seed:demo
//   npx convex run seed:demo '{"ownerName":"Vishnu"}'   (brand content owned by that user, so their Create tab shows it)
//   npx convex run seed:demo '{"videoUrls":["https://…/our-clip.mp4"]}'   (use your own clips)

const SAMPLE_VIDEOS = [
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
  "https://download.samplelib.com/mp4/sample-5s.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
];

const BRANDS = [
  { handle: "seed:volt", name: "Volt Energy", color: "#FFB020" },
  { handle: "seed:glowlab", name: "GlowLab", color: "#FF6B7A" },
  { handle: "seed:campusbites", name: "Campus Bites", color: "#2EE59A" },
  { handle: "seed:studypal", name: "StudyPal", color: "#5B8CFF" },
  { handle: "seed:threadbare", name: "Threadbare", color: "#C9B8FF" },
  { handle: "seed:loopbeats", name: "LoopBeats", color: "#5AC8FA" },
  { handle: "seed:pawpals", name: "PawPals", color: "#FFB020" },
  { handle: "seed:pixelarcade", name: "Pixel Arcade", color: "#5B8CFF" },
];

const GIGS = [
  { brand: 0, title: "Volt: 5am gym ad", question: "Would this make you grab a can before a lift?", tags: ["energy drinks", "gym"], priceCents: 250 },
  { brand: 0, title: "Volt: finals-week skit", question: "Is the ending funny?", tags: ["energy drinks", "comedy", "study"], priceCents: 200 },
  { brand: 1, title: "GlowLab serum before/after", question: "Do you trust this result?", tags: ["skincare"], priceCents: 300 },
  { brand: 1, title: "GlowLab GRWM for a night out", question: "Would you try this routine?", tags: ["skincare", "fashion"], priceCents: 250 },
  { brand: 2, title: "Campus Bites: $6 dorm bowl", question: "Would you order this tonight?", tags: ["food"], priceCents: 150 },
  { brand: 2, title: "Campus Bites roommate prank", question: "Does the joke land?", tags: ["food", "comedy"], priceCents: 200 },
  { brand: 3, title: "StudyPal: cram with AI", question: "Would this actually help you study?", tags: ["study", "tech"], priceCents: 250 },
  { brand: 4, title: "Threadbare thrift haul", question: "Which fit would you wear?", tags: ["fashion"], priceCents: 200 },
  { brand: 5, title: "LoopBeats: make a beat in 30s", question: "Would you download this?", tags: ["music", "tech"], priceCents: 150 },
  { brand: 6, title: "PawPals: dog reacts to new toy", question: "Is this cute or cringe?", tags: ["pets", "comedy"], priceCents: 150 },
  { brand: 7, title: "Pixel Arcade launch trailer", question: "Would you play this?", tags: ["gaming", "tech"], priceCents: 300 },
  { brand: 0, title: "Volt: spring break road trip", question: "Does this feel like your trip?", tags: ["travel", "energy drinks"], priceCents: 200 },
];

const UGC = [
  { brand: 0, gig: 0, brief: "15s gym-bag check: show your pre-lift routine with a can of Volt. Natural, no script.", payoutCents: 9000, spots: 4 },
  { brand: 1, gig: 3, brief: "Get ready with me using the GlowLab serum. Say honestly how your skin feels after.", payoutCents: 15000, spots: 3 },
  { brand: 2, gig: 4, brief: "Order the $6 dorm bowl and give a 20s honest first-bite review.", payoutCents: 7500, spots: 5 },
  { brand: 3, gig: 6, brief: "Show your finals-week study setup and how you'd use StudyPal.", payoutCents: 10000, spots: 3 },
  { brand: 4, gig: 7, brief: "Style two Threadbare thrift pieces into one fit and show the try-on.", payoutCents: 12000, spots: 3 },
  { brand: 5, gig: 8, brief: "Make a 20s beat in LoopBeats and show the before/after.", payoutCents: 10000, spots: 3 },
  { brand: 6, gig: 9, brief: "Film your pet meeting a PawPals toy for the first time.", payoutCents: 8000, spots: 4 },
  { brand: 7, gig: 10, brief: "Play Pixel Arcade for 30s and react to your first win.", payoutCents: 10000, spots: 3 },
  { brand: 0, gig: 1, brief: "Finals-week skit: your 2am study crash, saved by a Volt.", payoutCents: 12500, spots: 2 },
  { brand: 1, gig: 2, brief: "Honest 7-day GlowLab check-in: day 1 vs day 7 skin.", payoutCents: 20000, spots: 2 },
  { brand: 2, gig: 5, brief: "Prank your roommate with a Campus Bites late-night delivery.", payoutCents: 9000, spots: 3 },
  { brand: 0, gig: 11, brief: "Road-trip GoPro moment with a Volt in the cupholder.", payoutCents: 15000, spots: 2 },
];

// Adds any UGC jobs from the list above that a seeded database doesn't have yet (safe to rerun).
export const moreUgc = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const brands = await Promise.all(BRANDS.map((b) => ctx.db.query("users").withIndex("by_handle", (q) => q.eq("handle", b.handle)).unique()));
    if (!brands[0]) throw new Error("Run seed:demo first");
    const gigs = await ctx.db.query("gigs").withIndex("by_status", (q) => q.eq("status", "live")).take(500);
    let added = 0;
    for (const u of UGC) {
      const gig = gigs.find((g) => g.title === GIGS[u.gig].title);
      const brandId = gig?.creatorId ?? brands[u.brand]?._id;
      if (!brandId) continue;
      const existing = await ctx.db.query("ugcOpps").withIndex("by_gigId", (q) => q.eq("gigId", gig?._id)).take(20);
      if (existing.some((o) => o.brief === u.brief)) continue;
      await ctx.db.insert("ugcOpps", {
        brandId, gigId: gig?._id, title: `Make a video for ${BRANDS[u.brand].name}`, brief: u.brief,
        payoutCents: u.payoutCents, spots: u.spots, claimed: 0, status: "open", funded: true, tags: GIGS[u.gig].tags,
      });
      added++;
    }
    return added;
  },
});

const REACTORS = [
  { name: "Maya", color: "#2EE59A", school: "Berkeley", taste: "gym", laugh: [3, 4, 5], why: "the alarm bit got me, I'd grab a can", sentiment: "pos" as const, tags: ["funny opening", "relatable"] },
  { name: "Jordan", color: "#5B8CFF", school: "Stanford", taste: "gym", laugh: [4, 5], why: "funny but the logo shows up way too late", sentiment: "mixed" as const, tags: ["late branding"] },
  { name: "Priya", color: "#FF6B7A", school: "Berkeley", taste: "skincare", laugh: [], why: "not really for me, too intense", sentiment: "neg" as const, tags: ["too intense"] },
  { name: "Leo", color: "#FFB020", school: "UCLA", taste: "gaming", laugh: [4], why: "lost me in the first two seconds, then it got good", sentiment: "mixed" as const, tags: ["slow intro"] },
  { name: "Ava", color: "#C9B8FF", school: "Stanford", taste: "gym", laugh: [3, 4, 5, 6], why: "this is literally me at 5am", sentiment: "pos" as const, tags: ["relatable"] },
];

export const insertAll = internalMutation({
  args: { ownerName: v.optional(v.string()), videos: v.array(v.id("_storage")) },
  returns: v.object({ gigs: v.number(), opps: v.number(), reactions: v.number() }),
  handler: async (ctx, { ownerName, videos }) => {
    const already = await ctx.db.query("users").withIndex("by_handle", (q) => q.eq("handle", BRANDS[0].handle)).unique();
    if (already) throw new Error("Demo data is already seeded");
    const owner = ownerName
      ? (await ctx.db.query("users").order("desc").take(200)).find((u) => u.name.toLowerCase() === ownerName.toLowerCase())
      : undefined;
    if (ownerName && !owner) throw new Error(`No user named ${ownerName}. Onboard on the phone first.`);
    const brandIds: Id<"users">[] = [];
    for (const b of BRANDS) brandIds.push(await ctx.db.insert("users", { ...b, balanceCents: 0 }));
    const brandFor = (i: number) => (owner && i === 0 ? owner._id : brandIds[i]);

    const gigIds: Id<"gigs">[] = [];
    for (const [i, g] of GIGS.entries()) {
      gigIds.push(
        await ctx.db.insert("gigs", {
          creatorId: brandFor(g.brand), title: g.title, question: g.question, tags: g.tags,
          videoStorageId: videos[i % videos.length], durationMs: 10000, priceCents: g.priceCents, slots: 25,
          filled: 0, status: "live", paid: true,
        }),
      );
    }
    for (const u of UGC) {
      await ctx.db.insert("ugcOpps", {
        brandId: brandFor(u.brand), gigId: gigIds[u.gig], title: `Make a video for ${BRANDS[u.brand].name}`, brief: u.brief,
        payoutCents: u.payoutCents, spots: u.spots, claimed: 0, status: "open", funded: true, tags: GIGS[u.gig].tags,
      });
    }

    // One test with results already in: verified reactors, a laugh curve, and quotes.
    const gig = gigIds[0];
    for (const r of REACTORS) {
      const reactorId = await ctx.db.insert("users", {
        name: r.name, color: r.color, balanceCents: GIGS[0].priceCents, school: r.school, verifiedStudent: true,
        email: `${r.name.toLowerCase()}@${r.school.toLowerCase()}.edu`, taste: [{ tag: r.taste, w: 4 }],
      });
      const curve = Array.from({ length: 100 }, (_, i) => {
        const sec = Math.floor(i / 10);
        const s = (r.laugh as number[]).includes(sec) ? 0.55 + 0.3 * Math.sin((i % 10) / 3) : 0.08 + 0.06 * Math.sin(i / 4);
        return { t: i * 100, s: Math.max(0, Math.min(1, s)) };
      });
      const peak = Math.max(...curve.map((p) => p.s));
      await ctx.db.insert("reactions", {
        gigId: gig, reactorId, curve, peak, laughed: peak >= 0.45, facePresentPct: 100, watchedToEnd: true, valid: true, earnedCents: GIGS[0].priceCents,
        whyText: r.why, whyQuote: r.why, whyTags: r.tags, whySentiment: r.sentiment,
      });
    }
    await ctx.db.patch(gig, { filled: REACTORS.length });
    return { gigs: gigIds.length, opps: UGC.length, reactions: REACTORS.length };
  },
});

// Moves an already-seeded database to the prices above (reactions $1.50–$3, UGC videos $75–$200). Safe to rerun:
//   npx convex run seed:realisticPrices
export const realisticPrices = internalMutation({
  args: {},
  returns: v.object({ gigs: v.number(), opps: v.number(), reactions: v.number() }),
  handler: async (ctx) => {
    const n = { gigs: 0, opps: 0, reactions: 0 };
    const gigs = await ctx.db.query("gigs").withIndex("by_status", (q) => q.eq("status", "live")).take(500);
    for (const g of GIGS) {
      for (const row of gigs.filter((x) => x.title === g.title && x.priceCents !== g.priceCents)) {
        await ctx.db.patch(row._id, { priceCents: g.priceCents, slots: Math.max(row.slots, 25) });
        n.gigs++;
        const reactions = await ctx.db.query("reactions").withIndex("by_gigId", (q) => q.eq("gigId", row._id)).take(200);
        for (const r of reactions) {
          const reactor = await ctx.db.get(r.reactorId);
          if (!r.valid || !reactor || !REACTORS.some((x) => x.name === reactor.name)) continue;
          await ctx.db.patch(r._id, { earnedCents: g.priceCents });
          await ctx.db.patch(reactor._id, { balanceCents: reactor.balanceCents - r.earnedCents + g.priceCents });
          n.reactions++;
        }
      }
    }
    const opps = await ctx.db.query("ugcOpps").take(1000);
    for (const u of UGC) {
      for (const o of opps.filter((x) => x.brief === u.brief && (x.payoutCents !== u.payoutCents || x.spots !== u.spots))) {
        await ctx.db.patch(o._id, { payoutCents: u.payoutCents, spots: Math.max(u.spots, o.claimed) });
        n.opps++;
      }
    }
    return n;
  },
});

export const demo = internalAction({
  args: { ownerName: v.optional(v.string()), videoUrls: v.optional(v.array(v.string())) },
  returns: v.object({ gigs: v.number(), opps: v.number(), reactions: v.number() }),
  handler: async (ctx, { ownerName, videoUrls }): Promise<{ gigs: number; opps: number; reactions: number }> => {
    const videos: Id<"_storage">[] = [];
    for (const url of videoUrls?.length ? videoUrls : SAMPLE_VIDEOS) {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) throw new Error(`${res.status}`);
        videos.push(await ctx.storage.store(new Blob([await res.arrayBuffer()], { type: "video/mp4" })));
      } catch (e) {
        console.error(`Skipping ${url}: ${e}`);
      }
    }
    if (!videos.length) throw new Error("Could not download any demo video");
    return ctx.runMutation(internal.seed.insertAll, { ownerName, videos });
  },
});
