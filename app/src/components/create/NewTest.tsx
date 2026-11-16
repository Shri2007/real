import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Platform, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAction, useMutation } from 'convex/react';
import { openBrowserAsync } from 'expo-web-browser';
import { Badge, Body, Button, Card, Money, Muted, PrimaryCTA, SectionHeader, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ClipPlayer } from './ClipPlayer';
import { positiveInteger, validDuration } from './curve';

export function NewTest({ userId, onDone, onCancel }: { userId: Id<'users'>; onDone: (id: Id<'gigs'>) => void; onCancel: () => void }) {
  const uploadUrl = useMutation(api.gigs.generateUploadUrl);
  const create = useMutation(api.gigs.create);
  const publish = useMutation(api.gigs.publish);
  const checkout = useAction(api.payments.checkout);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [slots, setSlots] = useState('5');
  const [price, setPrice] = useState('200');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const inputs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
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
  const submit = async (mode: 'pay' | 'free') => {
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
      if (mode === 'pay') {
        setStep('Opening Whop checkout…');
        const { url } = await checkout({ gigId });
        await openBrowserAsync(url);
      } else {
        setStep('Publishing test…');
        await publish({ gigId });
      }
      onDone(gigId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not publish. Please retry.'); }
    finally { lock.current = false; setBusy(false); setStep(''); }
  };
  return <Card style={{ gap: tokens.space.lg }}>
    <View style={{ gap: tokens.space.xs }}>
      <Badge tone="good">New reaction test</Badge>
      <SectionHeader title="One video. One question." />
      <Muted>Find the moment your audience responds to.</Muted>
    </View>
    <Button label={asset ? 'Choose another video' : '＋  Choose video · up to 30s'} variant={asset ? 'secondary' : 'primary'} onPress={pick} disabled={busy || !!draft} />
    {asset && <>
      <ClipPlayer key={asset.uri} uri={asset.uri} onDuration={setDuration} />
      <Muted>{duration === 0 ? 'Checking video duration…' : validDuration(duration) ? `${duration.toFixed(1)}s · duration verified` : 'Video exceeds 30 seconds. Choose a shorter clip.'}</Muted>
    </>}
    <View style={{ gap: tokens.space.md }}>
    {([
      ['Title', title, setTitle, false], ['Question (optional)', question, setQuestion, false], ['Reaction slots', slots, setSlots, true], ['Cents per reaction', price, setPrice, true],
    ] as const).map(([label, value, change, numeric]) => <View key={label} style={{ gap: tokens.space.xs }}>
      <Body>{label}</Body>
      <View style={{ flexDirection: 'row', gap: tokens.space.xs, alignItems: 'center' }}>
        {numeric && <Button label="−" variant="secondary" disabled={busy || !!draft || Number(value) <= 1} onPress={() => change(String(Math.max(1, Number(value || 1) - (label === 'Reaction slots' ? 1 : 25))))} style={{ minWidth: 48 }} />}
        <TextInput ref={(ref) => { inputs.current[label] = ref; }} returnKeyType="done" onSubmitEditing={() => inputs.current[label]?.blur()} accessibilityLabel={label} value={value} onChangeText={change} editable={!busy && !draft} keyboardType={numeric ? 'number-pad' : 'default'} placeholderTextColor={tokens.muted} style={{ flex: 1, color: tokens.text, backgroundColor: tokens.cardRaised, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body }} />
        {numeric && <Button label="+" variant="secondary" disabled={busy || !!draft} onPress={() => change(String(Number(value || 0) + (label === 'Reaction slots' ? 1 : 25)))} style={{ minWidth: 48 }} />}
      </View>
    </View>)}
    </View>
    {draft && <Muted>Draft saved. Retry publishes this same test without uploading or creating another. You can also return to My tests and open this draft.</Muted>}
    {!!error && <Body>{error}</Body>}
    {positiveInteger(slots) && positiveInteger(price) && <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md, backgroundColor: tokens.cardRaised }}>
      <View style={{ flex: 1, gap: 2 }}><Muted>Your test budget · 20% fee included</Muted><Body>{slots} reactions × ${(Number(price) / 100).toFixed(2)}</Body></View>
      <Money cents={Number(slots) * Number(price) * 1.2} />
    </Card>}
    <PrimaryCTA label={busy ? step || 'Choosing video…' : `Pay with Whop · ${positiveInteger(slots) && positiveInteger(price) ? `$${(Number(slots) * Number(price) * 1.2 / 100).toFixed(2)}` : ''}`} onPress={() => submit('pay')} disabled={busy || (!draft && (!validDuration(duration) || !title.trim() || !positiveInteger(slots) || !positiveInteger(price)))} />
    {!busy && <Muted>The test goes live as soon as Whop confirms payment.</Muted>}
    <Button label={draft ? 'Retry publishing saved draft (free demo)' : 'Publish free demo test'} variant="secondary" onPress={() => submit('free')} disabled={busy || (!draft && (!validDuration(duration) || !title.trim() || !positiveInteger(slots) || !positiveInteger(price)))} />
    <Button label="Back to My tests" variant="secondary" onPress={onCancel} disabled={busy} />
  </Card>;
}
