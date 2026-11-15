import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { Avatar, Badge, Body, Button, Card, Muted, Title, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ClipPlayer } from './ClipPlayer';
import { ReactionCurve } from './ReactionCurve';
import { abVerdict, dropOffs, laughOnset, validDuration } from './curve';
import { PresentButton } from '../stage';

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
  const series = [{ key: gigId, color: label === 'B' ? tokens.live : tokens.accent, points: results.curve }];
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
  return <Card style={{ gap: tokens.space.md }}>
    <Title>{label ? `Cut ${label}: ` : ''}{gig.title}</Title>
    <Badge tone={gig.status === 'live' ? 'live' : 'muted'}>{gig.status} · {gig.filled}/{gig.slots} filled</Badge>
    {!!gig.question && <Body>{gig.question}</Body>}
    <Body>{results.laughedCount} of {results.count} valid reactors actually laughed</Body>
    <Body>{results.verifiedStudentCount} verified students reacted</Body>
    <Muted>Only valid completed reactions are included. This is not attention or retention data.</Muted>
    {!results.count && <Body>Waiting for reactions. No measured curve yet.</Body>}
    {gig.videoUrl ? <ClipPlayer key={gig.videoUrl} uri={gig.videoUrl} onDuration={setDuration} series={series} durationSec={(gig.durationMs ?? 0) / 1000} peakSec={results.peakSec} drops={drops} /> : <>
      <Muted>Video unavailable. Results are still shown below.</Muted>
      <ReactionCurve series={series} durationSec={(gig.durationMs ?? 0) / 1000} peakSec={results.peakSec} dropOffs={drops} />
    </>}
    <Muted>Red markers show laughter drops: the average falls by at least 0.15 after a second at or above 0.45. They do not show attention loss. Timing is whole-second; missing bins are not zero.</Muted>
    {results.reactors.map((reactor, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' }}>
      <Avatar name={reactor.name} color={reactor.color} /><Body>{reactor.name}</Body>
      {reactor.verifiedStudent ? <VerifiedStudentBadge school={reactor.school} /> : null}
      <Badge tone={reactor.laughed ? 'good' : 'muted'}>{reactor.laughed ? 'Laughed' : 'Stayed deadpan'}</Badge>
    </View>)}
    {gig.status === 'draft' && <>
      <Muted>Saved draft. Video duration must be verified at 30 seconds or less before publishing.</Muted>
      <Button label={busy ? 'Publishing…' : 'Publish saved draft (free test)'} disabled={busy || !validDuration(duration)} onPress={publishDraft} />
    </>}
    {!!error && <Body>{error}</Body>}
  </Card>;
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
      <Body>A (green): {ga.title}</Body><Body>B (blue): {gb.title}</Body>
      <ReactionCurve series={[{ key: a, color: tokens.accent, points: ra.curve }, { key: b, color: tokens.live, points: rb.curve }]} durationSec={Math.max(ga.durationMs ?? 0, gb.durationMs ?? 0) / 1000} />
      <Muted>Provisional comparison of separate tests, not randomized audiences. The first whole-second average at or above 0.45 is aggregate onset, not the first person’s laugh. Sample weighting, different audiences, and small counts can change the result. Use each cut’s curve below to seek its video.</Muted>
    </Card>
    <Results key={a} gigId={a} label="A" /><Results key={b} gigId={b} label="B" />
  </>;
}
