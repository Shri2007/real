import { useMutation, useQuery } from 'convex/react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Badge, Body, Button, Card, Muted, SectionHeader, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const styles = StyleSheet.create({
  video: { width: '100%', aspectRatio: 9 / 16, borderRadius: tokens.radiusSm, backgroundColor: tokens.cardBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' },
});

function TakeVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls contentFit="cover" style={styles.video} />;
}

// Brand side: pick between two student takes (the picks are what rank creators), then invite the top-ranked ones.
export function CreatorScout({ brandId }: { brandId: Id<'users'> }) {
  const pair = useQuery(api.ranking.brandPair, { brandId });
  const top = useQuery(api.ranking.topCreators, { brandId });
  const pick = useMutation(api.ranking.pickTake);
  const invite = useMutation(api.ranking.invite);
  const [error, setError] = useState('');

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message.replace(/^.*ConvexError: /, '').split('\n')[0] : 'Try again.'); }
  };

  return <>
    <SectionHeader title="Find creators" />
    <Card style={{ gap: tokens.space.md }}>
      <Body style={{ fontWeight: '600' }}>Which take would you hire?</Body>
      <Muted>Students film 15-second takes on starter prompts. Your picks train the ranking, so the creators you'd actually pay rise to the top.</Muted>
      {pair === undefined ? <Muted>Loading takes…</Muted> : !pair ? <Muted>You've rated every pair for now. New takes land here as students film them.</Muted> : <>
        <Badge tone="muted">{pair.tag}</Badge>
        <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
          {[pair.a, pair.b].map((t, i) => {
            const other = i === 0 ? pair.b : pair.a;
            return <View key={t.takeId} style={{ flex: 1, gap: tokens.space.xs }}>
              {t.videoUrl ? <TakeVideo uri={t.videoUrl} /> : <View style={styles.video} />}
              <Muted>"{t.prompt}"</Muted>
              <Button label="Hire this one" onPress={() => act(() => pick({ brandId, winnerId: t.takeId, loserId: other.takeId }))} />
            </View>;
          })}
        </View>
      </>}
    </Card>

    <Card style={{ gap: tokens.space.md }}>
      <Body style={{ fontWeight: '600' }}>Top creators for you</Body>
      <Muted>Ranked by brand picks and how long students keep watching their takes, on the topics you hire for.</Muted>
      {top === undefined ? <Muted>Loading…</Muted> : !top.creators.length ? <Muted>No ranked creators yet.</Muted> : top.creators.map((c, i) => <View key={c.userId} style={{ gap: tokens.space.xs, paddingTop: i ? tokens.space.sm : 0, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: tokens.cardBorder }}>
        <View style={styles.row}>
          <Avatar name={c.name} color={c.color} size={32} />
          <Body style={{ fontWeight: '600' }}>{c.name}</Body>
          {c.school && <Badge tone="good">{`✓ ${c.school}`}</Badge>}
        </View>
        <Muted>{`#${c.rank} of ${c.of} in ${c.tag}${c.style ? ` · ${c.style}` : ''}`}</Muted>
        <Muted>{`Brands picked them ${c.brandPicks}× · ${c.views} student ${c.views === 1 ? 'view' : 'views'}`}</Muted>
        {c.oppId ? <Button variant="secondary" disabled={c.invited} label={c.invited ? 'Invited' : `Invite to ${c.oppTitle}`} onPress={() => act(() => invite({ brandId, userId: c.userId, oppId: c.oppId! }))} />
          : <Muted>Open a UGC job to invite creators.</Muted>}
      </View>)}
      {!!error && <Body style={{ color: tokens.bad }}>{error}</Body>}
    </Card>
  </>;
}
