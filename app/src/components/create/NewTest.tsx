import { useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { Body, Button, Card, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ClipPlayer } from './ClipPlayer';
import { positiveInteger, validDuration } from './curve';

export function NewTest({ userId, onDone, onCancel }: { userId: Id<'users'>; onDone: (id: Id<'gigs'>) => void; onCancel: () => void }) {
  const uploadUrl = useMutation(api.gigs.generateUploadUrl);
  const create = useMutation(api.gigs.create);
  const publish = useMutation(api.gigs.publish);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [slots, setSlots] = useState('5');
  const [price, setPrice] = useState('50');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [draft, setDraft] = useState<Id<'gigs'> | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');
  const pick = async () => {
    if (lock.current || draft) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (Platform.OS === 'ios') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error('Allow media library access to choose a video.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, videoMaxDuration: 30 });
      if (!result.canceled) {
        const selected = result.assets[0];
        if (selected.duration != null && selected.duration > 30000) throw new Error('Choose a video no longer than 30 seconds.');
        setDuration(0);
        setAsset(selected);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not choose a video. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (lock.current) return;
    if (!draft && (!asset || !validDuration(duration) || !title.trim() || !positiveInteger(slots) || !positiveInteger(price))) {
      setError('Add a title, a verified video of 30 seconds or less, and positive whole numbers for slots and cents.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let gigId = draft;
      if (!gigId && asset) {
        setStep('Uploading video…');
        const url = await uploadUrl({});
        const file = asset.file ?? await (await fetch(asset.uri)).blob();
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': asset.mimeType ?? 'application/octet-stream' }, body: file });
        if (!response.ok) throw new Error('Upload failed. Please try again.');
        const uploaded = await response.json();
        if (typeof uploaded.storageId !== 'string') throw new Error('Upload returned no file. Please try again.');
        setStep('Saving draft…');
        gigId = await create({ creatorId: userId, title: title.trim(), question: question.trim() || undefined, videoStorageId: uploaded.storageId as Id<'_storage'>, durationMs: Math.round(duration * 1000), slots: Number(slots), priceCents: Number(price) });
        setDraft(gigId);
      }
      if (!gigId) throw new Error('No draft to publish.');
      setStep('Publishing test…');
      await publish({ gigId });
      onDone(gigId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not publish. Please retry.'); }
    finally { lock.current = false; setBusy(false); setStep(''); }
  };
  return <Card style={{ gap: tokens.space.md }}>
    <Body>New test · one cut</Body>
    <Muted>Create a second test for your other cut, then select A and B in My tests. Free hackathon publishing; no checkout is charged here.</Muted>
    <Button label={asset ? 'Choose another video' : 'Choose video (up to 30s)'} onPress={pick} disabled={busy || !!draft} />
    {asset && <>
      <ClipPlayer key={asset.uri} uri={asset.uri} onDuration={setDuration} />
      <Muted>{duration === 0 ? 'Checking video duration…' : validDuration(duration) ? `${duration.toFixed(1)}s · duration verified` : 'Video exceeds 30 seconds. Choose a shorter clip.'}</Muted>
    </>}
    {([
      ['Title', title, setTitle, false], ['Question (optional)', question, setQuestion, false], ['Reaction slots', slots, setSlots, true], ['Cents per reaction', price, setPrice, true],
    ] as const).map(([label, value, change, numeric]) => <View key={label} style={{ gap: tokens.space.xs }}>
      <Body>{label}</Body>
      <TextInput accessibilityLabel={label} value={value} onChangeText={change} editable={!busy && !draft} keyboardType={numeric ? 'number-pad' : 'default'} placeholderTextColor={tokens.muted} style={{ color: tokens.text, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body }} />
    </View>)}
    {draft && <Muted>Draft saved. Retry publishes this same test without uploading or creating another. You can also return to My tests and open this draft.</Muted>}
    {!!error && <Body>{error}</Body>}
    <Button label={busy ? step || 'Choosing video…' : draft ? 'Retry publishing saved draft' : 'Publish free test'} onPress={submit} disabled={busy || (!draft && (!validDuration(duration) || !title.trim() || !positiveInteger(slots) || !positiveInteger(price)))} />
    <Button label="Back to My tests" variant="secondary" onPress={onCancel} disabled={busy} />
  </Card>;
}
