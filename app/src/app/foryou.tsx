import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FeedCard } from '@/components/foryou/FeedCard';
import { MyUgc } from '@/components/foryou/MyUgc';
import { EduVerify } from '@/components/EduVerify';
import { Watch } from '@/components/react/Watch';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Muted, Screen, Title, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// For you: a preference-ranked feed of paid clips to react to and UGC opportunities to pick.
export default function ForYouScreen() {
  const { userId } = useSession();
  const feed = useQuery(api.prefs.feed, userId ? { userId } : 'skip');
  const taste = useQuery(api.prefs.taste, userId ? { userId } : 'skip');
  const swipe = useMutation(api.prefs.swipe);
  const claim = useMutation(api.ugc.claim);
  const me = useQuery(api.users.get, userId ? { userId } : 'skip');
  const [askVerify, setAskVerify] = useState(false);
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');
  const [watching, setWatching] = useState<Id<'gigs'> | null>(null);
  const [error, setError] = useState('');

  if (!userId) return <Screen><Muted>Choose your name first.</Muted></Screen>;
  if (watching) return <Watch key={watching} gigId={watching} userId={userId} onBack={() => setWatching(null)} />;

  const top = feed?.[0];
  const act = async (dir: 'right' | 'left', then?: () => Promise<void> | void) => {
    if (!top) return;
    setError('');
    try {
      await swipe({ userId, dir, gigId: top.kind === 'clip' ? top.gigId : undefined, oppId: top.kind === 'ugc' ? top.oppId : undefined });
      await then?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.'); }
  };

  return <Screen><ScrollView contentContainerStyle={{ gap: tokens.space.lg, paddingBottom: tokens.space.xxl }}>
    <Title>For you</Title>
    <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
      <Button label="Feed" variant={tab === 'feed' ? 'primary' : 'secondary'} onPress={() => setTab('feed')} style={{ flex: 1 }} />
      <Button label="My UGC" variant={tab === 'mine' ? 'primary' : 'secondary'} onPress={() => setTab('mine')} style={{ flex: 1 }} />
    </View>
    {tab === 'mine' ? <MyUgc userId={userId} /> : <>
      {taste && (taste.liked.length > 0 || taste.disliked.length > 0) ? <View style={{ gap: tokens.space.xs }}>
        <Muted>Your taste so far · {taste.signals} swipes & reactions</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
          {taste.liked.map((t) => <Badge key={t.tag} tone="good">{t.tag}</Badge>)}
          {taste.disliked.map((t) => <Badge key={t.tag} tone="bad">not {t.tag}</Badge>)}
        </View>
      </View> : <Body>Swipe right on what you'd watch or make, left on what you wouldn't. The feed learns as you go.</Body>}
      {taste && (taste.signals < taste.unlockAt
        ? <Muted>🔒 Swipe {taste.unlockAt - taste.signals} more to unlock paid UGC jobs picked for your taste</Muted>
        : taste.ugcMatches > 0
          ? <Badge tone="live">🎯 {taste.ugcMatches} paid UGC {taste.ugcMatches === 1 ? 'job' : 'jobs'} matched to your taste</Badge>
          : <Muted>No UGC jobs match your taste right now. Keep swiping.</Muted>)}
      {feed === undefined ? <Muted>Loading your feed…</Muted> : !top ? <EmptyState title="You're all caught up" body="New clips and UGC opportunities land here as brands post them." /> : <>
        <FeedCard
          key={top.id}
          item={top}
          onLeft={() => act('left')}
          onRight={() => act('right')}
          onPrimary={() => act('right', async () => {
            if (top.kind === 'clip' && top.gigId) setWatching(top.gigId);
            if (top.kind === 'ugc' && top.oppId) { await claim({ oppId: top.oppId, userId }); setTab('mine'); }
          })}
          locked={top.kind === 'ugc' && !me?.verifiedStudent}
          onLocked={() => setAskVerify(true)}
        />
        {askVerify && !me?.verifiedStudent && <Card style={{ gap: tokens.space.sm }}>
          <Body>UGC jobs are for verified students</Body>
          <EduVerify userId={userId} onVerified={() => setAskVerify(false)} />
        </Card>}
        {me?.verifiedStudent && top.kind === 'ugc' && <VerifiedStudentBadge school={me.school} />}
        <Muted>{feed.length - 1} more in your feed</Muted>
      </>}
      {!!error && <Body>{error}</Body>}
    </>}
  </ScrollView></Screen>;
}
