import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Body, Button, Card, ChoiceCard, Muted, ProgressBar, SectionHeader, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const SCORE_LABELS = [['hook', 'Hook'], ['clarity', 'Clarity'], ['energy', 'Energy'], ['authenticity', 'Authenticity']] as const;

// "Your UGC lane": what the deck learned you'd make best (dwell time + likes), plus a 15-second creator test
// that an AI scores to find your style. Your style then ranks matching UGC jobs higher in the deck.
export function CreatorLane({ userId }: { userId: Id<'users'> }) {
  const lane = useQuery(api.prefs.lane, { userId });
  const take = useQuery(api.creator.latest, { userId });
  const uploadUrl = useMutation(api.ugc.generateUploadUrl);
  const submitTake = useMutation(api.creator.submitTake);
  const [testing, setTesting] = useState(false);
  const [prompt, setPrompt] = useState<{ tag: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!lane) return null;
  const prompts = lane.lanes.flatMap((l) => l.prompts.map((text) => ({ tag: l.tag, text }))).slice(0, 3);

  const send = async (source: 'camera' | 'library') => {
    if (!prompt) return;
    setError('');
    setBusy(true);
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['videos'], videoMaxDuration: 15 };
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Allow camera access to record.');
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const file = asset.file ?? await (await fetch(asset.uri)).blob();
      const res = await fetch(await uploadUrl({}), { method: 'POST', headers: { 'Content-Type': asset.mimeType ?? 'video/mp4' }, body: file });
      if (!res.ok) throw new Error('Upload failed. Try again.');
      const { storageId } = await res.json();
      await submitTake({ userId, prompt: prompt.text, tag: prompt.tag, videoStorageId: storageId });
      setTesting(false);
      setPrompt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return <Card style={{ gap: tokens.space.md }}>
    <SectionHeader title="Your UGC lane" />
    {!lane.ready || !lane.lanes.length
      ? <Muted>Swipe a few more cards. We watch what you linger on to find the content you'd make best.</Muted>
      : lane.lanes.map((l) => <View key={l.tag} style={{ gap: 2 }}>
        <Body style={{ fontWeight: '600' }}>{l.lane}</Body>
        <Muted>{l.why}{l.jobs ? ` · ${l.jobs} ${l.jobs === 1 ? 'brand' : 'brands'} hiring` : ''}</Muted>
      </View>)}

    {lane.style && <View style={{ gap: tokens.space.xs }}>
      <Badge tone="good">{`Your style · ${lane.style.style} · ${lane.style.score}/10`}</Badge>
      <Muted>{lane.style.feedback} Jobs that fit your style now show up first.</Muted>
    </View>}

    {take?.status === 'scoring' && <Muted>Scoring your take on "{take.prompt}"…</Muted>}
    {take?.status === 'failed' && <Muted style={{ color: tokens.bad }}>{take.feedback}</Muted>}
    {take?.status === 'scored' && take.scores && <View style={{ gap: tokens.space.sm }}>
      <Muted>Last take: "{take.prompt}"</Muted>
      {SCORE_LABELS.map(([k, label]) => <View key={k} style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>{label}</Muted><Muted>{take.scores![k]}/10</Muted></View>
        <ProgressBar value={take.scores![k] / 10} />
      </View>)}
    </View>}

    {lane.ready && prompts.length > 0 && (!testing
      ? <Button label={lane.style ? 'Try another 15-second take' : 'Find your style: 15-second creator test'} variant="secondary" onPress={() => setTesting(true)} />
      : <View style={{ gap: tokens.space.sm }}>
        <Muted>Pick a prompt, then film a quick take. Talk to the camera. We score the hook, clarity, energy and how real it sounds.</Muted>
        {prompts.map((p) => <ChoiceCard key={p.text} title={p.text} body={p.tag} selected={prompt?.text === p.text} onPress={() => setPrompt(p)} />)}
        {prompt && <>
          <Button label={busy ? 'Uploading…' : 'Record 15 seconds'} disabled={busy} onPress={() => send('camera')} />
          <Button label="Upload a take" variant="secondary" disabled={busy} onPress={() => send('library')} />
        </>}
        <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => { setTesting(false); setPrompt(null); }} />
      </View>)}
    {!!error && <Body style={{ color: tokens.bad }}>{error}</Body>}
  </Card>;
}
