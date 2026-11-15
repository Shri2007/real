import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Avatar, Badge, Body, Button, Card, Muted, SectionHeader, Title, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ClipPlayer } from './ClipPlayer';
import { ReactionCurve } from './ReactionCurve';
import { abVerdict, dropOffs, laughOnset, validDuration } from './curve';
import { PresentButton } from '../stage';
import { UgcPanel } from './UgcPanel';
import { Segments } from './Segments';

export function Results({ gigId, label }: { gigId: Id<'gigs'>; label?: string }) {
  return <PresentButton gigId={gigId}><ResultsContent gigId={gigId} label={label} /></PresentButton>;
}

function ResultsContent({ gigId, label }: { gigId: Id<'gigs'>; label?: string }) {
  const gig = useQuery(api.gigs.get, { gigId });
  const results = useQuery(api.reactions.results, { gigId });
  const publish = useMutation(api.gigs.publish);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  if (gig === undefined || results === undefined) return <Muted>Loading test…</Muted>;
  if (!gig) return <Muted>Test not found.</Muted>;
  const series = [{ key: gigId, color: label === 'B' ? tokens.muted : tokens.accent, points: results.curve }];
  const drops = dropOffs(results.curve);
  const publishDraft = async () => {
    if (lock.current || !validDuration(duration)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try { await publish({ gigId }); }
    catch { setError('Could not publish this draft. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Card style={{ gap: tokens.space.lg }}>
    <View style={{ gap: tokens.space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.space.sm }}>
        <Badge tone={gig.status === 'live' ? 'live' : 'muted'}>{gig.status.toUpperCase()} · {gig.filled}/{gig.slots}</Badge>
        {label && <Muted>CUT {label}</Muted>}
      </View>
      <Title>{gig.title}</Title>
      {!!gig.question && <Body>{gig.question}</Body>}
    </View>
    <Card style={{ flexDirection: 'row', gap: tokens.space.sm, padding: tokens.space.md, backgroundColor: tokens.cardRaised }}>
      <View style={{ flex: 1, gap: 3 }}><Title style={{ fontSize: 27 }}>{results.laughedCount}<Muted>/{results.count}</Muted></Title><Muted>ACTUALLY LAUGHED</Muted></View>
      <View style={{ flex: 1, gap: 3 }}><Title style={{ fontSize: 27 }}>{results.count ? Math.round(results.laughedCount / results.count * 100) : 0}%</Title><Muted>LAUGH RATE</Muted></View>
      <View style={{ flex: 1, gap: 3 }}><Title style={{ fontSize: 27 }}>{results.verifiedStudentCount}</Title><Muted>VERIFIED</Muted></View>
    </Card>
    <Muted>Only valid completed reactions are included. This is not attention or retention data.</Muted>
    {!results.count && <Body>Waiting for reactions. No measured curve yet.</Body>}
    {gig.videoUrl ? <ClipPlayer key={gig.videoUrl} uri={gig.videoUrl} onDuration={setDuration} series={series} durationSec={(gig.durationMs ?? 0) / 1000} peakSec={results.peakSec} drops={drops} /> : <>
      <Muted>Video unavailable. Results are still shown below.</Muted>
      <ReactionCurve series={series} durationSec={(gig.durationMs ?? 0) / 1000} peakSec={results.peakSec} dropOffs={drops} />
    </>}
    <Muted>Red markers show laughter drops: the average falls by at least 0.15 after a second at or above 0.45. They do not show attention loss. Timing is whole-second; missing bins are not zero.</Muted>
    {results.reactors.map((reactor) => <View key={reactor.reactionId} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' }}>
      <Avatar name={reactor.name} color={reactor.color} /><Body>{reactor.name}</Body>
      {reactor.verifiedStudent ? <VerifiedStudentBadge school={reactor.school} /> : null}
      <Badge tone={reactor.laughed ? 'good' : 'muted'}>{reactor.laughed ? 'Laughed' : 'Stayed deadpan'}</Badge>
    </View>)}
    <WhatPeopleSaid gigId={gigId} />
    <Segments gigId={gigId} />
    {results.count > 0 && <AiReport gigId={gigId} report={gig.report} />}
    <UgcPanel gigId={gigId} brandId={gig.creatorId} gigTitle={gig.title} />
    {gig.status === 'draft' && <>
      <Muted>Saved draft. Video duration must be verified at 30 seconds or less before publishing.</Muted>
      <Button label={busy ? 'Publishing…' : 'Publish saved draft (free test)'} disabled={busy || !validDuration(duration)} onPress={publishDraft} />
    </>}
    {!!error && <Body>{error}</Body>}
  </Card>;
}

function AiReport({ gigId, report }: { gigId: Id<'gigs'>; report?: string[] }) {
  const write = useAction(api.report.forGig);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Card style={{ gap: tokens.space.md, borderColor: tokens.accent, borderWidth: 1 }}>
    <Badge tone="good">CREATOR TAKEAWAY</Badge>
    <SectionHeader title="What to fix" />
    {report?.length ? report.map((b) => <Body key={b}>• {b}</Body>) : <Muted>No AI report yet. It's written automatically when every slot fills.</Muted>}
    {!!error && <Body>{error}</Body>}
    <Button label={busy ? 'Writing report…' : report?.length ? 'Rewrite AI report' : 'Write AI report now'} variant="secondary" disabled={busy} onPress={async () => {
      setBusy(true);
      setError('');
      try { await write({ gigId }); } catch { setError('Could not write the report. Try again.'); } finally { setBusy(false); }
    }} />
  </Card>;
}

function WhatPeopleSaid({ gigId }: { gigId: Id<'gigs'> }) {
  const quotes = useQuery(api.voice.forGig, { gigId });
  if (!quotes?.length) return null;
  const counts = new Map<string, number>();
  for (const q of quotes) for (const t of q.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return <View style={{ gap: tokens.space.md }}>
    <SectionHeader title="What people said" detail={`${quotes.length} VOICE NOTES`} />
    {topTags.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
      {topTags.map(([tag, n]) => <Badge key={tag} tone="live">{tag} ×{n}</Badge>)}
    </View>}
    {quotes.map((q) => <Card key={q.reactionId} style={{ gap: tokens.space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
        <Avatar name={q.name} color={q.color} size={36} />
        <Body>{q.name}</Body>
        {q.sentiment && <Badge tone={q.sentiment === 'pos' ? 'good' : q.sentiment === 'neg' ? 'bad' : 'muted'}>{q.sentiment === 'pos' ? 'Liked it' : q.sentiment === 'neg' ? 'Not for them' : 'Mixed'}</Badge>}
      </View>
      <Body>“{q.whyQuote}”</Body>
    </Card>)}
  </View>;
}

export function Comparison({ a, b }: { a: Id<'gigs'>; b: Id<'gigs'> }) {
  const ra = useQuery(api.reactions.results, { gigId: a });
  const rb = useQuery(api.reactions.results, { gigId: b });
  const ga = useQuery(api.gigs.get, { gigId: a });
  const gb = useQuery(api.gigs.get, { gigId: b });
  if (!ra || !rb || ga === undefined || gb === undefined) return <Muted>Loading comparison…</Muted>;
  if (!ga || !gb) return <Muted>One selected test is no longer available.</Muted>;
  const verdict = abVerdict({ ...ra, onset: laughOnset(ra.curve) }, { ...rb, onset: laughOnset(rb.curve) });
  return <>
    <Card style={{ gap: tokens.space.md }}>
      <Title>A/B comparison</Title><Body>{verdict.headline}</Body><Muted>{verdict.detail}</Muted>
      <Body style={{ color: tokens.accent }}>A · {ga.title}</Body><Body style={{ color: tokens.muted }}>B · {gb.title}</Body>
      <ReactionCurve series={[{ key: a, color: tokens.accent, points: ra.curve }, { key: b, color: tokens.muted, points: rb.curve }]} durationSec={Math.max(ga.durationMs ?? 0, gb.durationMs ?? 0) / 1000} />
      <Muted>Provisional comparison of separate tests, not randomized audiences. The first whole-second average at or above 0.45 is aggregate onset, not the first person’s laugh. Sample weighting, different audiences, and small counts can change the result. Use each cut’s curve below to seek its video.</Muted>
    </Card>
    <Results key={a} gigId={a} label="A" /><Results key={b} gigId={b} label="B" />
  </>;
}
