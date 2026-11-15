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
    const response = await fetch(videoUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw new Error('Video unavailable');
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!type.startsWith('video/') && type !== 'application/octet-stream') throw new Error('URL must return a video file');
    const reader = response.body.getReader(); const chunks: Uint8Array<ArrayBuffer>[] = []; let bytes = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > 50 * 1024 * 1024) { await reader.cancel(); throw new Error('Video exceeds 50 MB'); }
      chunks.push(value);
    }
    if (!bytes) throw new Error('Empty video');
    storageId = await ctx.storage.store(new Blob(chunks, { type }));
  } catch { return json({ error: 'Could not fetch video. Send a direct HTTPS video URL, no redirects, at most 50 MB.' }, 400); }
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
  return json({ gigId, summary, filled: gig.filled, slots: gig.slots, status: gig.status, ...data, report });
});
export const status = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);
  const handle = new URL(req.url).searchParams.get('handle')?.trim();
  if (!handle || handle.length > 256) return json({ error: 'handle is required' }, 400);
  return json({ gigs: await ctx.runQuery(statusRef, { handle }) });
});
