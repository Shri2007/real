import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { View } from 'react-native';
import { FeedCard } from '@/components/foryou/FeedCard';
import { MyUgc } from '@/components/foryou/MyUgc';
import { EduVerify } from '@/components/EduVerify';
import { Watch } from '@/components/react/Watch';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, Screen, SectionHeader, Title, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// For you: swipe through preference-ranked paid clips; UGC jobs matched to your taste sit in a small section below.
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
  const [allJobs, setAllJobs] = useState(false);

  if (!userId) return <Screen><Muted>Choose your name first.</Muted></Screen>;
  if (watching) return <Watch key={watching} gigId={watching} userId={userId} onBack={() => setWatching(null)} />;

  const clips = feed?.filter((i) => i.kind === 'clip') ?? [];
  const jobs = feed?.filter((i) => i.kind === 'ugc') ?? [];
  const top = clips[0];
  const run = async (fn: () => Promise<void>) => {
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.'); }
  };
  const act = (dir: 'right' | 'left', then?: () => void) => top && run(async () => {
    await swipe({ userId, dir, gigId: top.gigId });
    then?.();
  });
  const pickJob = (oppId: Id<'ugcOpps'>) => run(async () => {
    if (!me?.verifiedStudent) { setAskVerify(true); return; }
    await claim({ oppId, userId });
    setTab('mine');
  });

  return <Screen style={{ gap: tokens.space.xl }}>
    <View style={{ gap: tokens.space.xs }}>
      <Muted>REAL · YOUR REACTION FEED</Muted>
      <Title style={{ fontSize: 36 }}>For you</Title>
      <Body>Good clips. Real people. Paid attention.</Body>
    </View>
    <View style={{ flexDirection: 'row', gap: tokens.space.sm, padding: 4, borderRadius: tokens.radius, backgroundColor: tokens.card }}>
      <Button label="Feed" variant={tab === 'feed' ? 'primary' : 'secondary'} onPress={() => setTab('feed')} style={{ flex: 1 }} />
      <Button label="My UGC" variant={tab === 'mine' ? 'primary' : 'secondary'} onPress={() => setTab('mine')} style={{ flex: 1 }} />
    </View>
    {tab === 'mine' ? <MyUgc userId={userId} /> : <>
      {feed === undefined ? <Muted>Loading your feed…</Muted> : !top ? <EmptyState title="You're all caught up" body="New clips land here as brands post them." /> : <>
        <FeedCard
          key={top.id}
          item={top}
          onLeft={() => act('left')}
          onRight={() => act('right')}
          onPrimary={() => act('right', () => top.gigId && setWatching(top.gigId))}
        />
        <Muted>{clips.length - 1} more in your feed · swipes shape what comes next</Muted>
      </>}
      {!!error && <Body>{error}</Body>}

      <View style={{ gap: tokens.space.sm }}>
        <SectionHeader title="UGC jobs for you" detail={taste && taste.signals >= taste.unlockAt ? `${jobs.length} MATCHED` : 'LOCKED'} />
        {taste && taste.signals < taste.unlockAt
          ? <Muted>🔒 Swipe {taste.unlockAt - taste.signals} more to unlock paid UGC jobs picked for your taste.</Muted>
          : !jobs.length
            ? <Muted>No UGC jobs match your taste right now. Keep swiping.</Muted>
            : <>
              {(allJobs ? jobs : jobs.slice(0, 2)).map((job) => <Card key={job.id} style={{ gap: tokens.space.xs, padding: tokens.space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body style={{ fontWeight: '700' }}>{job.byName}</Body>
                    <Muted>{job.reason}</Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}><Money cents={job.cents} /><Muted>per video</Muted></View>
                </View>
                <Body>{job.body}</Body>
                <Button label={me?.verifiedStudent ? "Pick this job" : 'Verify your .edu to pick'} variant="secondary" onPress={() => job.oppId && pickJob(job.oppId)} />
              </Card>)}
              {jobs.length > 2 && <Button label={allJobs ? 'Show fewer' : `See all ${jobs.length} jobs`} variant="secondary" onPress={() => setAllJobs(!allJobs)} />}
            </>}
        {askVerify && !me?.verifiedStudent && <Card style={{ gap: tokens.space.sm }}>
          <Body>UGC jobs are for verified students</Body>
          <EduVerify userId={userId} onVerified={() => setAskVerify(false)} />
        </Card>}
      </View>

      {taste && (taste.liked.length > 0 || taste.disliked.length > 0) && <View style={{ gap: tokens.space.xs }}>
        <SectionHeader title="Your taste" detail={`${taste.signals} signals`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
          {taste.liked.map((t) => <Badge key={t.tag} tone="good">{t.tag}</Badge>)}
          {taste.disliked.map((t) => <Badge key={t.tag} tone="bad">not {t.tag}</Badge>)}
        </View>
      </View>}
    </>}
  </Screen>;
}
