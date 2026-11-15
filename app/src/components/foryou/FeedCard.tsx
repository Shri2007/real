import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { FunctionReturnType } from 'convex/server';
import { Badge, Body, Button, Card, Money, Muted, Title, VideoFrame, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';

type Item = FunctionReturnType<typeof api.prefs.feed>[number];

const mediaLayout = StyleSheet.create({
  video: { width: '100%', aspectRatio: 9 / 12 },
  videoWrap: { width: '100%', aspectRatio: 9 / 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
});

const SWIPE_PX = 110;

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.muted = true; p.loop = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={mediaLayout.video} />;
}

// One card at a time: drag right (want it) or left (not for me), or use the buttons.
export function FeedCard({ item, onLeft, onRight, onPrimary, locked, onLocked }: { item: Item; onLeft: () => void; onRight: () => void; onPrimary: () => void; locked?: boolean; onLocked?: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const fly = (dir: 1 | -1, done: () => void) => Animated.timing(x, { toValue: dir * 600, duration: 180, useNativeDriver: true }).start(done);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_PX) fly(1, onRight);
      else if (g.dx < -SWIPE_PX) fly(-1, onLeft);
      else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-12deg', '0deg', '12deg'] });
  const ugc = item.kind === 'ugc';

  return <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }, { rotate }] }}>
    <Card style={{ gap: tokens.space.md, padding: tokens.space.md }}>
      <View style={mediaLayout.row}>
        <Badge tone={ugc ? 'live' : 'good'}>{ugc ? 'PAID CREATOR BRIEF' : 'PAID REACTION'}</Badge>
        {item.matchPct !== null && <Badge tone="muted">{item.matchPct}% match</Badge>}
      </View>
      {item.videoUrl && <VideoFrame style={mediaLayout.videoWrap}><Preview uri={item.videoUrl} /></VideoFrame>}
      <View style={{ gap: tokens.space.xs }}>
        <Title>{item.title}</Title>
        <Muted>by {item.byName}</Muted>
      </View>
      <Muted>{item.reason}</Muted>
      {!!item.body && <Body>{item.body}</Body>}
      {item.tags.length > 0 && <View style={mediaLayout.row}>{item.tags.map((t) => <Badge key={t} tone="muted">{t}</Badge>)}</View>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: tokens.space.md }}>
        <View style={{ gap: 2 }}>
          <Muted>{ugc ? 'PAYOUT PER VIDEO' : 'PAYOUT FOR YOUR ATTENTION'}</Muted>
          <Money cents={item.cents} size="lg" />
        </View>
        <Muted style={{ textAlign: 'right' }}>{item.spotsLeft} spots left</Muted>
      </View>
      {locked
        ? <Button label="Verify your .edu to pick this" onPress={onLocked} />
        : <Button label={ugc ? 'Pick this: I\'ll make it' : `Watch & earn $${(item.cents / 100).toFixed(2)}`} onPress={() => fly(1, onPrimary)} />}
      {!ugc && <Muted>Swipe to decide · tap to watch</Muted>}
      <View style={mediaLayout.actions}>
        <Button label="✕ Not for me" variant="secondary" onPress={() => fly(-1, onLeft)} style={{ flex: 1 }} />
        <Button label="♥ More like this" variant="secondary" onPress={() => fly(1, onRight)} style={{ flex: 1 }} />
      </View>
    </Card>
  </Animated.View>;
}
