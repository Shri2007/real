import { Image } from 'expo-image';
import { FunctionReturnType } from 'convex/server';
import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Body, Muted, Title, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';

export type DeckItem = FunctionReturnType<typeof api.prefs.deck>[number];

const SWIPE_PX = 110;

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden', backgroundColor: tokens.bg, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: tokens.cardRaised },
  text: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 4 },
  stamp: { position: 'absolute', top: 18, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' },
  stampText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});

/** One swipeable card: drag right to like, left to pass. `behind` renders the next card, smaller, under the top one. */
export function DeckCard({ item, onSwipe, onPress, behind }: { item: DeckItem; onSwipe?: (dir: 'right' | 'left') => void; onPress?: () => void; behind?: boolean }) {
  const x = useRef(new Animated.Value(0)).current;
  const fly = (dir: 'right' | 'left') => Animated.timing(x, { toValue: dir === 'right' ? 600 : -600, duration: 200, useNativeDriver: true }).start(() => onSwipe?.(dir));
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) onPress?.();
      if (g.dx > SWIPE_PX) fly('right');
      else if (g.dx < -SWIPE_PX) fly('left');
      else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-10deg', '0deg', '10deg'] });
  const like = x.interpolate({ inputRange: [0, SWIPE_PX], outputRange: [0, 1], extrapolate: 'clamp' });
  const nope = x.interpolate({ inputRange: [-SWIPE_PX, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const body = <View style={styles.card}>
    {item.image ? <Image source={{ uri: item.image }} style={styles.photo} contentFit="cover" transition={150} /> : <View style={styles.photo} />}
    <View style={styles.text}>
      <Title style={{ fontSize: 24, letterSpacing: -0.5 }}>{item.title}</Title>
      <Body style={{ color: tokens.muted }}>{item.subtitle}</Body>
      {item.reason ? <Muted style={{ color: tokens.accent, fontSize: 14 }}>{item.reason}</Muted> : null}
    </View>
  </View>;

  if (behind) return <View pointerEvents="none" style={{ transform: [{ scale: 0.95 }, { translateY: 14 }], opacity: 0.9 }}>{body}</View>;
  return <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }, { rotate }] }}>
    {body}
    <Animated.View style={[styles.stamp, { left: 18, opacity: like }]}><Body style={{ ...styles.stampText, color: tokens.accent }}>Like</Body></Animated.View>
    <Animated.View style={[styles.stamp, { right: 18, opacity: nope }]}><Body style={{ ...styles.stampText, color: tokens.bad }}>Pass</Body></Animated.View>
  </Animated.View>;
}
