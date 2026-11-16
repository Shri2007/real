import { useMutation, useQuery } from 'convex/react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Badge, Body, Button, Card, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const styles = StyleSheet.create({ video: { height: 380, aspectRatio: 9 / 16, alignSelf: 'center', borderRadius: tokens.radiusSm, backgroundColor: tokens.cardBorder } });

function TakeVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView player={player} nativeControls contentFit="cover" style={styles.video} />;
}

// Student takes, one at a time. How long you stay on each one before tapping Next is the signal that ranks them.
export function TakeFeed({ userId }: { userId: Id<'users'> }) {
  const take = useQuery(api.ranking.peerTake, { userId });
  const view = useMutation(api.ranking.viewTake);
  const shownAt = useRef(Date.now());
  const takeId = take?.takeId;
  useEffect(() => { shownAt.current = Date.now(); }, [takeId]);
  if (!take) return null;
  return <Card style={{ gap: tokens.space.md }}>
    <Badge tone="muted">Student takes</Badge>
    <Muted>Watch as long as it holds you. The takes people stay on rank higher with brands.</Muted>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
      <Avatar name={take.name} color={take.color} size={28} />
      <Body style={{ fontWeight: '600' }}>{take.name}</Body>
      <Muted>{take.tag}</Muted>
    </View>
    <Muted>"{take.prompt}"</Muted>
    {take.videoUrl && <TakeVideo key={take.takeId} uri={take.videoUrl} />}
    <Button label="Next take" variant="secondary" onPress={() => view({ userId, takeId: take.takeId, watchMs: Date.now() - shownAt.current })} />
  </Card>;
}
