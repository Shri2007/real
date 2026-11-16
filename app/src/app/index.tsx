import { useQuery } from 'convex/react';
import { useState } from 'react';
import { View } from 'react-native';
import { TakeFeed } from '@/components/react/TakeFeed';
import { Watch } from '@/components/react/Watch';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, Screen, SectionHeader, Title, tokens, LargeTitle } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export default function ReactorScreen() {
  const { userId } = useSession();
  const gigs = useQuery(api.gigs.feed, userId ? { userId } : 'skip');
  const [gigId, setGigId] = useState<Id<'gigs'> | null>(null);
  if (gigId && userId) return <Watch key={gigId} gigId={gigId} userId={userId} onBack={() => setGigId(null)} />;
  return <Screen style={{ gap: tokens.space.lg }}>
      <LargeTitle subtitle="Watch with your camera on. Laugh or don’t, you still get paid.">React</LargeTitle>
      {userId && <TakeFeed userId={userId} />}
      <SectionHeader title="Available reactions" detail={gigs ? `${gigs.length} open` : undefined} />
      {gigs === undefined ? <Muted>Loading paid reactions…</Muted> : gigs.length === 0 ? <EmptyState title="No reactions right now" body="New paid clips land here as creators post them." />
        : gigs.map((gig) => <Card key={gig._id} style={{ gap: tokens.space.md }}>
          <Badge tone="good">Paid reaction</Badge>
          <View style={{ gap: tokens.space.xs }}>
            <Title>{gig.title}</Title>
            <Muted>Posted by {gig.creatorName}</Muted>
          </View>
          {gig.question && <Body>{gig.question}</Body>}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.md }}>
            <View style={{ gap: 2 }}><Muted>Paid for watching</Muted><Money cents={gig.priceCents} size="lg" /></View>
            <Muted>{Math.max(0, gig.slotsLeft)} spots left</Muted>
          </View>
          <Button label="Watch clip · earn" disabled={gig.slotsLeft <= 0} onPress={() => setGigId(gig._id)} />
        </Card>)}
  </Screen>;
}
