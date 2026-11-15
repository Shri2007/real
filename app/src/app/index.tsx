import { useQuery } from 'convex/react';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Watch } from '@/components/react/Watch';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, Screen, SectionHeader, Title, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export default function ReactorScreen() {
  const { userId } = useSession();
  const gigs = useQuery(api.gigs.feed, userId ? { userId } : 'skip');
  const [gigId, setGigId] = useState<Id<'gigs'> | null>(null);
  if (gigId && userId) return <Watch key={gigId} gigId={gigId} userId={userId} onBack={() => setGigId(null)} />;
  return <Screen>
    <ScrollView contentContainerStyle={{ gap: tokens.space.lg, paddingBottom: tokens.space.xxl }}>
      <View style={{ gap: tokens.space.xs }}>
        <Muted>REAL · PAID REACTIONS</Muted>
        <Title style={{ fontSize: 36 }}>React</Title>
        <Body>Watch with your camera on. Laugh or don’t. You still get paid.</Body>
      </View>
      <SectionHeader title="Available reactions" detail={gigs ? `${gigs.length} OPEN` : 'LIVE FEED'} />
      {gigs === undefined ? <Muted>Loading paid reactions…</Muted> : gigs.length === 0 ? <EmptyState title="No reactions right now" body="New paid clips land here as creators post them." />
        : gigs.map((gig) => <Card key={gig._id} style={{ gap: tokens.space.md }}>
          <Badge tone="good">PAID REACTION</Badge>
          <View style={{ gap: tokens.space.xs }}>
            <Title>{gig.title}</Title>
            <Muted>Posted by {gig.creatorName}</Muted>
          </View>
          {gig.question && <Body>{gig.question}</Body>}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.md }}>
            <View style={{ gap: 2 }}><Muted>PAID FOR WATCHING</Muted><Money cents={gig.priceCents} size="lg" /></View>
            <Muted>{Math.max(0, gig.slotsLeft)} spots left</Muted>
          </View>
          <Button label="Watch clip · earn" disabled={gig.slotsLeft <= 0} onPress={() => setGigId(gig._id)} />
        </Card>)}
    </ScrollView>
  </Screen>;
}
