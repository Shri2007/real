import { ComponentRef, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery } from 'convex/react';
import { Avatar, Badge, Body, Button, Card, Money, Muted, Screen, Stat, Title, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { StageCurve } from './StageCurve';

const mediaLayout = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.md, alignItems: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.lg },
  column: { flex: 1, minWidth: 0, gap: tokens.space.md },
  stack: { gap: tokens.space.md },
  video: { width: '100%', aspectRatio: 16 / 9 },
});

export function PresentButton({ gigId, children }: { gigId: Id<'gigs'>; children?: ReactNode }) {
  const [presenting, setPresenting] = useState(false);
  const close = useCallback(() => setPresenting(false), []);
  return presenting ? <Stage gigId={gigId} onClose={close} /> : <>
    <Button label="Present" onPress={() => setPresenting(true)} />
    {children}
  </>;
}

export function Stage({ gigId, onClose }: { gigId: Id<'gigs'>; onClose: () => void }) {
  const gig = useQuery(api.gigs.get, { gigId });
  const results = useQuery(api.reactions.results, { gigId });
  const { width } = useWindowDimensions();
  const root = useRef<ComponentRef<typeof View>>(null);
  const ownedFullscreen = useRef<Element | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [replay, setReplay] = useState(0);
  const [time, setTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const fullscreen = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const element = root.current as unknown as HTMLElement | null;
    if (!element?.requestFullscreen) {
      setFullscreenError('Browser fullscreen is unavailable. Stage mode still works here.');
      return;
    }
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else if (!document.fullscreenElement) {
        ownedFullscreen.current = element;
        await element.requestFullscreen();
      }
      setFullscreenError('');
    } catch {
      ownedFullscreen.current = null;
      setFullscreenError('Fullscreen was declined. You can keep presenting here.');
    }
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); void fullscreen(); }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); setReplay(n => n + 1); }
    };
    window.addEventListener('keydown', keydown);
    const fullscreenChange = () => {
      if (ownedFullscreen.current && !document.fullscreenElement) {
        ownedFullscreen.current = null;
        onClose();
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChange);
    return () => {
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('fullscreenchange', fullscreenChange);
      if (ownedFullscreen.current && document.fullscreenElement === ownedFullscreen.current) void document.exitFullscreen().catch(() => {});
      ownedFullscreen.current = null;
    };
  }, [fullscreen, onClose]);
  return <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
    <View ref={root} style={mediaLayout.root}>
      <Screen>
        <ScrollView contentContainerStyle={mediaLayout.content}>
          <View style={mediaLayout.row}>
            <Title>{gig?.title ?? 'REAL · Live reactions'}</Title>
            <Button label="Close" variant="secondary" onPress={onClose} />
            <Button label="Replay" variant="secondary" onPress={() => setReplay(n => n + 1)} />
            {Platform.OS === 'web' && <Button label="Fullscreen" variant="secondary" onPress={() => void fullscreen()} />}
          </View>
          {Platform.OS === 'web' && <Muted>F · fullscreen   R · replay   Esc · close</Muted>}
          {!!fullscreenError && <Muted>{fullscreenError}</Muted>}
          {gig === undefined || results === undefined ? <Muted>Loading live results…</Muted> : !gig ? <Body>Test not found.</Body> : <>
            <View style={width >= 900 ? mediaLayout.columns : mediaLayout.stack}>
              <View style={width >= 900 ? mediaLayout.column : mediaLayout.stack}>
                <StageMedia key={gig.videoUrl ?? gigId} uri={gig.videoUrl} replay={replay} onTime={setTime} onDuration={setLoadedDuration} />
              </View>
              <View style={width >= 900 ? mediaLayout.column : mediaLayout.stack}>
                <Card style={mediaLayout.stack}>
                  <Stat value={`${results.count}/${gig.slots}`} label="real humans reacted" />
                  <Stat value={results.laughedCount} label="actually laughed" />
                  <Stat value={results.verifiedStudentCount} label="verified students reacted" />
                  <Badge>✓ Verified real humans</Badge>
                  <Body>Face in frame ≥70% of the clip · watched to the end · paid the same either way.</Body>
                  <MoneyTicker cents={results.count * gig.priceCents} />
                  <Body>paid to {results.count} real people</Body>
                  <Muted>Earned by verified reactors · We pay for attention, not applause.</Muted>
                </Card>
                <StageCurve curve={results.curve} duration={loadedDuration || (gig.durationMs ?? 0) / 1000} time={time} peakSec={results.peakSec} replay={replay} />
                <Card style={mediaLayout.stack}>
                  <Title>The humans behind the curve</Title>
                  {!results.count && <Muted>Waiting for real humans. New reactions appear live.</Muted>}
                  {results.reactors.map((reactor) => <Reactor key={reactor.reactionId} name={reactor.name} color={reactor.color} laughed={reactor.laughed} verifiedStudent={reactor.verifiedStudent} school={reactor.school} />)}
                </Card>
              </View>
            </View>
          </>}
        </ScrollView>
      </Screen>
    </View>
  </Modal>;
}

function MoneyTicker({ cents }: { cents: number }) {
  const [value, setValue] = useState(cents);
  const current = useRef(cents);
  useEffect(() => {
    const startValue = current.current;
    let start: number | undefined;
    let frame = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / 650);
      current.current = Math.round(startValue + (cents - startValue) * (1 - Math.pow(1 - progress, 3)));
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [cents]);
  return <Money cents={value} size="lg" />;
}

function Reactor({ name, color, laughed, verifiedStudent, school }: { name: string; color: string; laughed: boolean; verifiedStudent?: boolean; school?: string }) {
  const [entrance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 7, tension: 65 });
    animation.start();
    return () => animation.stop();
  }, [entrance]);
  return <Animated.View style={[mediaLayout.row, { transform: [{ scale: entrance }] }]}>
    <Avatar name={name} color={color} />
    <Body>{name}</Body>
    {verifiedStudent ? <VerifiedStudentBadge school={school} /> : null}
    <Badge tone={laughed ? 'good' : 'muted'}>{laughed ? 'Laughed' : 'Stayed deadpan'}</Badge>
  </Animated.View>;
}

function StageMedia({ uri, replay, onTime, onDuration }: { uri: string | null; replay: number; onTime: (time: number) => void; onDuration: (duration: number) => void }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = Platform.OS === 'web';
    p.timeUpdateEventInterval = 0.1;
    p.staysActiveInBackground = false;
  });
  const [muted, setMuted] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const focused = useRef(false);
  useEventListener(player, 'timeUpdate', e => onTime(e.currentTime));
  useEventListener(player, 'sourceLoad', e => onDuration(e.duration));
  useEventListener(player, 'statusChange', e => setError(e.status === 'error'));
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (uri && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') player.play();
    return () => { focused.current = false; player.pause(); };
  }, [player, uri]));
  useEffect(() => {
    player.seekBy(-player.currentTime);
    onTime(0);
    if (uri && focused.current && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') player.play();
  }, [player, uri, replay, onTime]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    const pause = () => player.pause();
    const visibility = () => { if (document.hidden) player.pause(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.addEventListener('blur', pause);
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        window.removeEventListener('blur', pause);
        document.removeEventListener('visibilitychange', visibility);
      }
    };
  }, [player]);
  return <>
    {uri ? <VideoView player={player} nativeControls={false} contentFit="contain" style={mediaLayout.video} /> : <Muted>Video unavailable. Live results are still shown.</Muted>}
    {error && <Muted>Video could not load. Check the connection; live results remain available.</Muted>}
    {Platform.OS === 'web' && !!uri && <Button variant="secondary" label={muted ? 'Unmute video' : 'Mute video'} onPress={() => { player.muted = !muted; setMuted(!muted); player.play(); }} />}
  </>;
}
