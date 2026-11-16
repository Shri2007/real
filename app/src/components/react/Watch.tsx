import { useEvent, useEventListener } from 'expo';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { LaughDetector, LaughDetectorHandle, LaughScore } from '@/laugh/LaughDetector';
import { WhyRecorder } from './WhyRecorder';
import { Badge, Body, Button, Card, Muted, PrimaryCTA, Screen, Title, VideoFrame, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

type Props = { gigId: Id<'gigs'>; userId: Id<'users'>; onBack: () => void };
type Result = FunctionReturnType<typeof api.reactions.submit>;
type Point = { t: number; s: number | null };

const mediaLayout = StyleSheet.create({
  page: { gap: tokens.space.lg },
  video: { width: '100%', aspectRatio: 16 / 9 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  selfie: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 2, borderColor: tokens.accent },
  detector: { width: 72, height: 72 },
  result: { gap: tokens.space.sm, paddingVertical: tokens.space.xl },
  countdown: { fontSize: 112, lineHeight: 120, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export function Watch(props: Props) {
  const gig = useQuery(api.gigs.get, { gigId: props.gigId });
  if (gig === undefined) return <Screen><Muted>Loading clip…</Muted><Button label="Back to feed" onPress={props.onBack} /></Screen>;
  if (!gig?.videoUrl) return <Screen><Body>Clip unavailable.</Body><Button label="Back to feed" onPress={props.onBack} /></Screen>;
  return <Playback {...props} title={gig.title} question={gig.question} videoUrl={gig.videoUrl} />;
}

function Playback({ gigId, userId, onBack, title, question, videoUrl }: Props & { title: string; question?: string; videoUrl: string }) {
  const submit = useMutation(api.reactions.submit);
  const player = useVideoPlayer(videoUrl, (p) => { p.loop = false; p.staysActiveInBackground = false; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const detector = useRef<LaughDetectorHandle>(null);
  const curve = useRef<Point[]>([]);
  const recording = useRef(false);
  const lastSample = useRef(-Infinity);
  const phaseRef = useRef<'idle' | 'countdown' | 'watching' | 'finished'>('idle');
  const [phase, setPhase] = useState(phaseRef.current);
  const [count, setCount] = useState(3);
  const [detectorReady, setDetectorReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Loading face detector…');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const payload = useRef<{ gigId: Id<'gigs'>; reactorId: Id<'users'>; curve: Point[]; watchedToEnd: boolean } | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);

  async function save() {
    if (!payload.current || saving.current) return;
    saving.current = true;
    if (mounted.current) setError(null);
    try {
      const response = await submit(payload.current);
      if (mounted.current) setResult(response);
    } catch {
      if (mounted.current) setError('Could not save your reaction. Retry to check your payment.');
    } finally { saving.current = false; }
  }
  function finish(watchedToEnd: boolean) {
    if (phaseRef.current === 'finished') return;
    phaseRef.current = 'finished';
    recording.current = false;
    detector.current?.stop();
    try { player.pause(); } catch { /* Player may already be released on unmount. */ }
    payload.current = { gigId, reactorId: userId, curve: [...curve.current], watchedToEnd };
    if (mounted.current) setPhase('finished');
    void save();
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEventListener(player, 'playToEnd', () => {
    if (phaseRef.current === 'watching') finishRef.current(true);
  });
  useFocusEffect(useCallback(() => {
    return () => { if (phaseRef.current !== 'idle') finishRef.current(false); };
  }, []));
  useEffect(() => {
    mounted.current = true;
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && phaseRef.current !== 'idle') finishRef.current(false);
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phaseRef.current === 'idle' || phaseRef.current === 'finished') onBack();
      else finishRef.current(false);
      return true;
    });
    return () => {
      mounted.current = false; app.remove(); back.remove();
      if (phaseRef.current !== 'idle') finishRef.current(false);
      detector.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timer = setInterval(() => {
      if (phaseRef.current !== 'countdown') return;
      setCount((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'countdown' || count !== 0 || phaseRef.current !== 'countdown') return;
    phaseRef.current = 'watching'; recording.current = true; setPhase('watching');
    detector.current?.start(); player.play();
  }, [count, phase, player]);
  useEffect(() => {
    if (status === 'error' && phaseRef.current === 'watching') finishRef.current(false);
  }, [status, phase]);
  function onScore(score: LaughScore) {
    if (!recording.current || !player.playing) return;
    const t = Math.round(player.currentTime * 1000);
    if (!Number.isFinite(t) || t - lastSample.current < 100) return;
    lastSample.current = t;
    curve.current.push({ t, s: score.noFace || !Number.isFinite(score.s) ? null : Math.min(1, Math.max(0, score.s)) });
    if (curve.current.length >= 8000) finishRef.current(false);
  }
  return <Screen style={mediaLayout.page}>
    <View style={{ gap: tokens.space.xs }}>
      <Muted>Paid reaction · camera on</Muted>
      <Title>{title}</Title>
      {question && <Body>{question}</Body>}
    </View>
    {phase !== 'finished' && <>
      <VideoFrame><VideoView player={player} nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false}
        contentFit="contain" style={mediaLayout.video} /></VideoFrame>
      <View style={mediaLayout.watchRow}>
        <View style={mediaLayout.selfie}><LaughDetector ref={detector} onScore={onScore} style={mediaLayout.detector} onStatus={(text) => {
        setCameraStatus(text);
        if (text === 'model ready') setDetectorReady(true);
        if (text === 'camera on' && phaseRef.current === 'idle') detector.current?.stop();
        if (text.startsWith('camera error') && recording.current) finishRef.current(false);
        }} /></View>
        <View style={{ flex: 1, gap: tokens.space.xs }}>
          <Badge tone={phase === 'watching' ? 'good' : 'muted'}>{phase === 'watching' ? '● VERIFIED WATCHING' : 'CAMERA CHECK'}</Badge>
          <Muted>{cameraStatus}</Muted>
        </View>
      </View>
      {phase === 'idle' && <>
        <Card style={{ gap: tokens.space.sm }}>
          <Body>Keep your face in frame while the clip plays.</Body>
          <Muted>Your camera runs only during this reaction. Laugh or stay deadpan; both count.</Muted>
        </Card>
        <PrimaryCTA label="Start reaction" disabled={!detectorReady || status !== 'readyToPlay'} onPress={() => {
          phaseRef.current = 'countdown'; setCount(3); setPhase('countdown');
          // Warm the camera up during the 3-2-1 so the first second of the clip has face data.
          detector.current?.start();
        }} />
        {status === 'error' && <Body>Video could not load. Return to the feed and try again.</Body>}
      </>}
      {phase === 'countdown' && <Card style={{ gap: tokens.space.xs }}><Muted style={{ textAlign: 'center' }}>Get ready</Muted><Title style={mediaLayout.countdown}>{count || 'GO'}</Title><Muted style={{ textAlign: 'center' }}>Your reaction is being verified</Muted></Card>}
      {phase === 'watching' && <Body>Watching · keep your face in frame.</Body>}
      <Button variant="secondary" label="Leave reaction" onPress={() => { if (phaseRef.current === 'idle') onBack(); else finish(false); }} />
    </>}
    {phase === 'finished' && (result ? <>
      <Card style={mediaLayout.result}>
        <Badge tone={result.valid ? 'good' : 'bad'}>{result.valid ? 'REACTION VERIFIED' : 'NOT VERIFIED'}</Badge>
        {result.valid ? <><Muted>You earned</Muted><Title style={{ color: tokens.accent, fontSize: 52, letterSpacing: -1.2 }}>+${(result.earnedCents / 100).toFixed(2)} ✓</Title></> : <Title>Not paid</Title>}
        <Body>{result.valid ? 'Your watch was verified.' : 'Keep your face in frame next time.'}</Body>
      </Card>
      <Title>{result.laughed ? 'You laughed' : 'You stayed deadpan'}</Title>
      <Body>Both count. We pay for attention, not applause.</Body>
      {result.valid && <WhyRecorder gigId={gigId} reactorId={userId} />}
      <PrimaryCTA label="Back to feed" onPress={onBack} />
    </> : <>
      <Body>{error || 'Saving your reaction…'}</Body>
      {error && <Button label="Retry saving reaction" onPress={() => { void save(); }} />}
      <Button label="Back to feed" onPress={onBack} />
    </>)}
  </Screen>;
}
