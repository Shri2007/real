import { useMutation, useQuery } from 'convex/react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Badge, Body, Button, Card, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const MAX_MS = 15000;
const MIN_MS = 800;

type Phase = 'idle' | 'recording' | 'uploading' | 'sent' | 'skipped';

// After a reaction: hold the mic, say why in 3–15s, release. Creators and brands see the quote next to the curve.
export function WhyRecorder({ gigId, reactorId }: { gigId: Id<'gigs'>; reactorId: Id<'users'> }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const uploadUrl = useMutation(api.voice.generateUploadUrl);
  const submitWhy = useMutation(api.voice.submitWhy);
  const mine = useQuery(api.voice.mine, { gigId, reactorId });
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const held = useRef(false);
  const startedAt = useRef(0);
  const stopping = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.isRecording) void recorder.stop().catch(() => {});
  }, [recorder]);

  useEffect(() => {
    if (phase !== 'recording') { pulse.stopAnimation(); pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.07, duration: 460, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 460, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [phase, pulse]);

  async function start() {
    if (phase === 'uploading' || stopping.current) return;
    held.current = true;
    setError('');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Allow microphone access to say why.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!held.current) return;
      recorder.record();
      startedAt.current = Date.now();
      setPhase('recording');
      timer.current = setTimeout(() => { void stop(); }, MAX_MS);
    } catch (e) {
      held.current = false;
      setError(e instanceof Error ? e.message : 'Could not start the mic.');
      setPhase('idle');
    }
  }

  function stop() {
    held.current = false;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!startedAt.current || stopping.current) return stopping.current ?? Promise.resolve();
    stopping.current = (async () => {
      const elapsed = Date.now() - startedAt.current;
      startedAt.current = 0;
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (elapsed < MIN_MS) { setPhase('idle'); setError('Hold the button while you talk.'); return; }
        const uri = recorder.uri;
        if (!uri) throw new Error('Nothing was recorded. Try again.');
        setPhase('uploading');
        const audio = await (await fetch(uri)).blob();
        const type = audio.type || (uri.endsWith('.webm') ? 'audio/webm' : 'audio/mp4');
        const response = await fetch(await uploadUrl({}), { method: 'POST', headers: { 'Content-Type': type }, body: audio });
        if (!response.ok) throw new Error('Upload failed. Try again.');
        const { storageId } = await response.json();
        await submitWhy({ gigId, reactorId, audioStorageId: storageId });
        setPhase('sent');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send. Try again.');
        setPhase('idle');
      } finally {
        stopping.current = null;
      }
    })();
    return stopping.current;
  }

  if (phase === 'skipped') return null;

  if (phase === 'sent') return <Card style={{ gap: tokens.space.sm }}>
    <Badge>✓ Your why was sent</Badge>
    {mine?.whyQuote ? <>
      <Body>“{mine.whyQuote}”</Body>
      {mine.tags.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
        {mine.tags.map((t) => <Badge key={t} tone="muted">{t}</Badge>)}
      </View>}
      <Muted>This is what the creator sees, with your name and color.</Muted>
    </> : <Muted>Transcribing…</Muted>}
    <Button label="Record again" variant="secondary" onPress={() => setPhase('idle')} />
  </Card>;

  return <Card style={{ gap: tokens.space.md }}>
    <Body>What made you react?</Body>
    <Muted>Hold to share a quick voice note. Your mic is on only while you hold.</Muted>
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Button
        label={phase === 'recording' ? 'Listening · release to send' : phase === 'uploading' ? 'Sending your note…' : 'Hold to say why'}
        disabled={phase === 'uploading'}
        onPressIn={() => { void start(); }}
        onPressOut={() => { void stop(); }}
      />
    </Animated.View>
    {!!error && <Body>{error}</Body>}
    <Button label="Skip" variant="secondary" disabled={phase !== 'idle'} onPress={() => setPhase('skipped')} />
  </Card>;
}
