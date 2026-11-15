import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from 'convex/react';
import { useSession } from '@/lib/session';
import { Body, Button, Card, Muted, Screen, Title, tokens } from '@/ui';
import { NewTest } from '@/components/create/NewTest';
import { Comparison, Results } from '@/components/create/Results';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export default function CreateScreen() {
  const { userId } = useSession();
  const gigs = useQuery(api.gigs.mine, userId ? { creatorId: userId } : 'skip');
  const [mode, setMode] = useState<'mine' | 'new' | 'results' | 'compare'>('mine');
  const [selected, setSelected] = useState<Id<'gigs'> | null>(null);
  const [a, setA] = useState<Id<'gigs'> | null>(null);
  const [b, setB] = useState<Id<'gigs'> | null>(null);
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: tokens.space.lg, paddingBottom: tokens.space.xxl }}>
    <Title>Create</Title>
    {!userId ? <Muted>Choose your name to create tests.</Muted> : mode === 'new' ? <NewTest userId={userId} onCancel={() => setMode('mine')} onDone={(id) => { setSelected(id); setMode('results'); }} /> : <>
      {mode !== 'mine' && <Button label="Back to My tests" variant="secondary" onPress={() => setMode('mine')} />}
      {mode === 'results' && selected ? <Results key={selected} gigId={selected} /> : mode === 'compare' && a && b ? <Comparison a={a} b={b} /> : <>
        <Button label="New test" onPress={() => setMode('new')} />
        <Title>My tests</Title>
        <Muted>Test two cuts: create each with New test, assign different tests to A and B, then compare.</Muted>
        <Body>A: {gigs?.find((g) => g._id === a)?.title ?? 'Choose a test'}</Body>
        <Body>B: {gigs?.find((g) => g._id === b)?.title ?? 'Choose a test'}</Body>
        <Button label="Compare A and B" disabled={!a || !b || a === b} onPress={() => setMode('compare')} />
        {gigs === undefined ? <Muted>Loading your tests…</Muted> : !gigs.length ? <Body>No tests yet. Post a clip to get real reactions.</Body> : gigs.map((gig) => <Card key={gig._id} style={{ gap: tokens.space.md }}>
          <Body>{gig.title}</Body><Muted>{gig.status} · {gig.filled}/{gig.slots} filled · ${(gig.priceCents / 100).toFixed(2)} per reaction</Muted>
          <Button label={`Open ${gig.title}`} onPress={() => { setSelected(gig._id); setMode('results'); }} />
          <Button variant="secondary" label={a === gig._id ? 'Selected as A' : 'Use as cut A'} disabled={b === gig._id} onPress={() => setA(gig._id)} />
          <Button variant="secondary" label={b === gig._id ? 'Selected as B' : 'Use as cut B'} disabled={a === gig._id} onPress={() => setB(gig._id)} />
        </Card>)}
        {(a || b) && <Button label="Clear A/B selection" variant="secondary" onPress={() => { setA(null); setB(null); }} />}
      </>}
    </>}
  </ScrollView></Screen>;
}
