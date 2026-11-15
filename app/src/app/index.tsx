import { useQuery } from 'convex/react';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Watch } from '@/components/react/Watch';
import { useSession } from '@/lib/session';
import { Body, Button, Card, Muted, Screen, Title } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export default function ReactorScreen() {
  const { userId } = useSession();
  const gigs = useQuery(api.gigs.feed, userId ? { userId } : 'skip');
  const [gigId, setGigId] = useState<Id<'gigs'> | null>(null);
  if (gigId && userId) return <Watch key={gigId} gigId={gigId} userId={userId} onBack={() => setGigId(null)} />;
  return <Screen>
    <Title>React</Title>
    <Body>Get paid to watch. Your honest reaction counts.</Body>
    <ScrollView>
      {gigs === undefined ? <Muted>Loading gigs…</Muted> : gigs.length === 0 ? <Muted>No gigs yet: check back soon.</Muted>
        : gigs.map((gig) => <Card key={gig._id}>
          <Title>{gig.title}</Title>
          <Body>{gig.creatorName}</Body>
          {gig.question && <Body>{gig.question}</Body>}
          <Muted>${(gig.priceCents / 100).toFixed(2)} · {Math.max(0, gig.slotsLeft)} spots left</Muted>
          <Button label="Watch clip" disabled={gig.slotsLeft <= 0} onPress={() => setGigId(gig._id)} />
        </Card>)}
    </ScrollView>
  </Screen>;
}
