import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import { internalMutation, internalQuery, httpAction } from './_generated/server';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';

declare const process: { env: Record<string, string | undefined> };

const creatorRef = makeFunctionReference<'mutation', { handle: string; name?: string }, Id<'users'>>('keiki:creator');
const statusRef = makeFunctionReference<'query', { handle: string }, { gigId: Id<'gigs'>; title: string; filled: number; slots: number; status: string }[]>('keiki:creatorStatus');
const normalizeRef = makeFunctionReference<'query', { gigId: string }, Id<'gigs'> | null>('keiki:normalizeGig');

export const creator = internalMutation({
  args: { handle: v.string(), name: v.optional(v.string()) }, returns: v.id('users'),
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_handle', q => q.eq('handle', args.handle)).unique();
    return user?._id ?? await ctx.db.insert('users', { handle: args.handle, name: args.name || 'Keiki creator', color: '#888', balanceCents: 0 });
  },
});
export const creatorStatus = internalQuery({
  args: { handle: v.string() },
  returns: v.array(v.object({ gigId: v.id('gigs'), title: v.string(), filled: v.number(), slots: v.number(), status: v.string() })),
  handler: async (ctx, { handle }) => {
    const user = await ctx.db.query('users').withIndex('by_handle', q => q.eq('handle', handle)).unique();
    if (!user) return [];
    const gigs = await ctx.db.query('gigs').withIndex('by_creatorId', q => q.eq('creatorId', user._id)).order('desc').take(10);
    return gigs.map(g => ({ gigId: g._id, title: g.title, filled: g.filled, slots: g.slots, status: g.status }));
  },
});
export const normalizeGig = internalQuery({
  args: { gigId: v.string() }, returns: v.union(v.id('gigs'), v.null()),
  handler: async (ctx, { gigId }) => ctx.db.normalizeId('gigs', gigId),
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
function authorized(req: Request) {
  // No typed env config exists in this app; match existing Convex env access.
  const secret = process.env.KEIKI_TOOL_SECRET;
  return !!secret && req.headers.get('x-real-secret') === secret;
}
function publicVideo(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !host.includes('.') ||
    /^[\d.]+$/.test(host) || host.includes(':') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) throw new Error('Use a public HTTPS video URL');
  return url.href;
}

export const createGig = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Expected an object' }, 400);
  const b = body as Record<string, unknown>;
  if (typeof b.handle !== 'string' || !b.handle.trim() || b.handle.length > 256 || typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200 || typeof b.videoUrl !== 'string' ||
    (b.name !== undefined && (typeof b.name !== 'string' || b.name.length > 100)) ||
    (b.question !== undefined && (typeof b.question !== 'string' || b.question.length > 1000))) return json({ error: 'Supply handle, title, videoUrl and optional name/question strings' }, 400);
  const slots = b.slots ?? 5; const priceCents = b.priceCents ?? 50;
  if (typeof slots !== 'number' || !Number.isInteger(slots) || slots < 3 || slots > 20 || typeof priceCents !== 'number' || !Number.isInteger(priceCents) || priceCents < 1 || priceCents > 10000) return json({ error: 'Use 3–20 slots and a positive integer priceCents (max 10000)' }, 400);
  let videoUrl: string;
  try { videoUrl = publicVideo(b.videoUrl); } catch { return json({ error: 'Use a public HTTPS video URL' }, 400); }
  let storageId: Id<'_storage'>;
  try {
    // Follow redirects (iMessage/Keiki attachment + share links redirect to a CDN), then re-validate the final host.
    const response = await fetch(videoUrl, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw new Error('Video unavailable');
    if (response.url) publicVideo(response.url);
    const rawType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    const okType = rawType.startsWith('video/') || rawType === 'application/octet-stream' || rawType === 'binary/octet-stream' || rawType === '';
    if (!okType) throw new Error('URL must return a video file');
    const type = rawType.startsWith('video/') ? rawType : 'video/mp4';
    const reader = response.body.getReader(); const chunks: Uint8Array<ArrayBuffer>[] = []; let bytes = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > 50 * 1024 * 1024) { await reader.cancel(); throw new Error('Video exceeds 50 MB'); }
      chunks.push(value);
    }
    if (!bytes) throw new Error('Empty video');
    storageId = await ctx.storage.store(new Blob(chunks, { type }));
  } catch { return json({ error: 'Could not fetch video. Send the video as an attachment or a public HTTPS video link, at most 50 MB.' }, 400); }
  const creatorId = await ctx.runMutation(creatorRef, { handle: b.handle.trim(), ...(typeof b.name === 'string' ? { name: b.name.trim() } : {}) });
  const gigId: Id<'gigs'> = await ctx.runMutation(api.gigs.create, { creatorId, title: b.title.trim(), videoStorageId: storageId, slots, priceCents,
    ...(typeof b.question === 'string' ? { question: b.question.trim() } : {}) });
  // Only a genuinely absent checkout function permits the free hackathon path.
  // Payment failures must never silently publish an unpaid gig.
  for (const path of ['payments:createCheckout', 'payments:checkout']) {
    try {
      const checkout = await ctx.runAction(makeFunctionReference<'action', { gigId: Id<'gigs'> }, { url?: string; payUrl?: string }>(path), { gigId });
      const payUrl = checkout.payUrl || checkout.url;
      if (!payUrl || !payUrl.startsWith('https://')) throw new Error('Checkout returned no HTTPS URL');
      return json({ gigId, payUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missing = message === `Couldn't resolve api.${path.replace(':', '.')}` ||
        ((message.includes('Could not find function') || message.includes('Could not find public function')) && message.includes(path));
      if (!missing) return json({ gigId, live: false, error: 'Checkout unavailable. Do not recreate this gig; try again later.' }, 502);
    }
  }
  await ctx.runMutation(api.gigs.publish, { gigId });
  return json({ gigId, live: true });
});

export const results = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  const raw = new URL(req.url).searchParams.get('gigId');
  if (!raw) return json({ error: 'gigId is required' }, 400);
  const gigId = await ctx.runQuery(normalizeRef, { gigId: raw });
  if (!gigId) return json({ error: 'Invalid gigId' }, 400);
  const gig = await ctx.runQuery(api.gigs.get, { gigId });
  if (!gig) return json({ error: 'Gig not found' }, 404);
  const data = await ctx.runQuery(api.reactions.results, { gigId });
  const time = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const peak = data.peakSec === null || data.laughedCount === 0 ? '' : ` · biggest laugh at ${time(data.peakSec)}`;
  const summary = data.count ? `${data.laughedCount} of ${data.count} actually laughed${peak}` : `No verified reactions yet · ${gig.filled} of ${gig.slots} spots filled`;
  // The current API has no time-based attention denominator: never invent a drop-off or edit recommendation.
  const report = 'report' in gig ? gig.report : null;
  const quotes = (await ctx.runQuery(api.voice.forGig, { gigId })).slice(0, 3).map(q => ({ name: q.name, quote: q.whyQuote, sentiment: q.sentiment ?? null }));
  return json({ gigId, summary, filled: gig.filled, slots: gig.slots, status: gig.status, ...data, report, quotes });
});
export const status = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  const handle = new URL(req.url).searchParams.get('handle')?.trim();
  if (!handle || handle.length > 256) return json({ error: 'handle is required' }, 400);
  return json({ gigs: await ctx.runQuery(statusRef, { handle }) });
});

// ---- UGC + inbox tools for the REAL agent (brands post UGC jobs, review submissions, and catch up by text) ----
type Pending = { claimId: Id<'ugcClaims'>; title: string; student: string; school: string | null; videoUrl: string | null };
const userByHandleRef = makeFunctionReference<'query', { handle: string }, Id<'users'> | null>('keiki:userByHandle');
const pendingRef = makeFunctionReference<'query', { handle: string }, Pending[]>('keiki:pendingUgc');
const inboxRef = makeFunctionReference<'mutation', { handle: string }, string[]>('keiki:readInbox');
const normalizeClaimRef = makeFunctionReference<'query', { claimId: string }, Id<'ugcClaims'> | null>('keiki:normalizeClaim');
const ugcCheckoutRef = makeFunctionReference<'action', { oppId: Id<'ugcOpps'> }, { url: string; totalCents: number }>('payments:createUgcCheckout');

export const userByHandle = internalQuery({
  args: { handle: v.string() }, returns: v.union(v.id('users'), v.null()),
  handler: async (ctx, { handle }) => (await ctx.db.query('users').withIndex('by_handle', q => q.eq('handle', handle)).unique())?._id ?? null,
});
export const normalizeClaim = internalQuery({
  args: { claimId: v.string() }, returns: v.union(v.id('ugcClaims'), v.null()),
  handler: async (ctx, { claimId }) => ctx.db.normalizeId('ugcClaims', claimId),
});
export const pendingUgc = internalQuery({
  args: { handle: v.string() },
  returns: v.array(v.object({ claimId: v.id('ugcClaims'), title: v.string(), student: v.string(), school: v.union(v.string(), v.null()), videoUrl: v.union(v.string(), v.null()) })),
  handler: async (ctx, { handle }) => {
    const user = await ctx.db.query('users').withIndex('by_handle', q => q.eq('handle', handle)).unique();
    if (!user) return [];
    const out: Pending[] = [];
    const opps = (await ctx.db.query('ugcOpps').withIndex('by_status', q => q.eq('status', 'open')).take(200))
      .concat(await ctx.db.query('ugcOpps').withIndex('by_status', q => q.eq('status', 'closed')).take(200))
      .filter(o => o.brandId === user._id);
    for (const o of opps) {
      for (const c of await ctx.db.query('ugcClaims').withIndex('by_oppId', q => q.eq('oppId', o._id)).take(50)) {
        if (c.status !== 'submitted') continue;
        const s = await ctx.db.get(c.userId);
        out.push({ claimId: c._id, title: o.title, student: s?.name ?? '?', school: s?.school ?? null, videoUrl: c.videoStorageId ? await ctx.storage.getUrl(c.videoStorageId) : null });
      }
    }
    return out;
  },
});
export const readInbox = internalMutation({
  args: { handle: v.string() }, returns: v.array(v.string()),
  handler: async (ctx, { handle }) => {
    const user = await ctx.db.query('users').withIndex('by_handle', q => q.eq('handle', handle)).unique();
    if (!user) return [];
    const unread = await ctx.db.query('notifications').withIndex('by_userId_and_read', q => q.eq('userId', user._id).eq('read', false)).take(20);
    for (const n of unread) await ctx.db.patch(n._id, { read: true });
    return unread.map(n => n.text);
  },
});

// POST /keiki/ugc {handle, brief, payoutCents?, spots?, gigId?} → creates a UGC job and returns the Whop pay link.
export const createUgc = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (typeof b.handle !== 'string' || !b.handle.trim() || typeof b.brief !== 'string' || !b.brief.trim() || b.brief.length > 1000) return json({ error: 'Supply handle and brief' }, 400);
  const payoutCents = b.payoutCents ?? 2500; const spots = b.spots ?? 3;
  if (typeof payoutCents !== 'number' || !Number.isInteger(payoutCents) || payoutCents < 100 || payoutCents > 100000 || typeof spots !== 'number' || !Number.isInteger(spots) || spots < 1 || spots > 50) return json({ error: 'Use payoutCents 100–100000 and 1–50 spots' }, 400);
  const gigId = typeof b.gigId === 'string' ? await ctx.runQuery(normalizeRef, { gigId: b.gigId }) : null;
  const brandId = await ctx.runMutation(creatorRef, { handle: b.handle.trim() });
  const gig = gigId ? await ctx.runQuery(api.gigs.get, { gigId }) : null;
  const oppId = await ctx.runMutation(api.ugc.create, { brandId, ...(gigId ? { gigId } : {}), title: gig ? `Make a video for ${gig.title}` : 'UGC video', brief: b.brief.trim(), payoutCents, spots });
  try {
    const { url, totalCents } = await ctx.runAction(ugcCheckoutRef, { oppId });
    return json({ oppId, payUrl: url, totalCents });
  } catch {
    return json({ oppId, live: false, error: 'Checkout unavailable. Do not recreate this job; try again later.' }, 502);
  }
});

// GET /keiki/ugc?handle=... → UGC videos waiting for this brand's review.
export const ugcPending = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  const handle = new URL(req.url).searchParams.get('handle')?.trim();
  if (!handle) return json({ error: 'handle is required' }, 400);
  return json({ pending: await ctx.runQuery(pendingRef, { handle }) });
});

// POST /keiki/ugc/review {handle, claimId, approve} → approve (pays the student) or pass.
export const ugcReview = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (typeof b.handle !== 'string' || typeof b.claimId !== 'string' || typeof b.approve !== 'boolean') return json({ error: 'Supply handle, claimId and approve' }, 400);
  const [brandId, claimId] = await Promise.all([ctx.runQuery(userByHandleRef, { handle: b.handle.trim() }), ctx.runQuery(normalizeClaimRef, { claimId: b.claimId })]);
  if (!brandId || !claimId) return json({ error: 'Unknown handle or claim' }, 404);
  try { await ctx.runMutation(api.ugc.review, { claimId, brandId, approve: b.approve }); }
  catch (e) { return json({ error: e instanceof Error ? e.message : 'Review failed' }, 400); }
  return json({ ok: true, approved: b.approve });
});

// GET /keiki/inbox?handle=... → unread updates (test finished, UGC submitted), marked read.
export const inbox = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  const handle = new URL(req.url).searchParams.get('handle')?.trim();
  if (!handle) return json({ error: 'handle is required' }, 400);
  return json({ updates: await ctx.runMutation(inboxRef, { handle }) });
});
