import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { Body, Button, Card, Muted } from '@/ui';
import { todayKey } from '@/lib/session';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export function Composer({ userId, groupId }: { userId: Id<'users'>; groupId: Id<'groups'> }) {
  const uploadUrl = useMutation(api.drops.generateUploadUrl);
  const send = useMutation(api.drops.send);
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const uploaded = useRef<{ uri: string; storageId: Id<'_storage'> } | null>(null);
  async function pickImage() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled) { setImage(result.assets[0]); uploaded.current = null; }
    } catch { setError('Could not open your photos. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function submit() {
    if (lock.current || (!image && !text.trim())) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      let storageId: Id<'_storage'> | undefined;
      if (image) {
        if (uploaded.current?.uri === image.uri) storageId = uploaded.current.storageId;
        else {
          const blob = await (await fetch(image.uri)).blob();
          const response = await fetch(await uploadUrl({}), { method: 'POST',
            headers: { 'Content-Type': image.mimeType || blob.type || 'image/jpeg' }, body: blob });
          if (!response.ok) throw new Error('Upload failed');
          const result: unknown = await response.json();
          if (!result || typeof result !== 'object' || !('storageId' in result) || typeof result.storageId !== 'string') throw new Error('Invalid upload response');
          storageId = result.storageId as Id<'_storage'>;
          uploaded.current = { uri: image.uri, storageId };
        }
      }
      await send({ groupId, userId, day: todayKey(), kind: image ? 'image' : 'text',
        ...(text.trim() ? { text: text.trim() } : {}), ...(storageId ? { storageId } : {}) });
      setText(''); setImage(null); uploaded.current = null;
    } catch { setError('Your drop was not sent. Your draft is saved here; try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Card>
    <Body>Drop something funny</Body>
    <TextInput accessibilityLabel="Drop text" placeholder="Write a drop or image caption" multiline value={text} onChangeText={setText} editable={!busy} />
    {image && <Muted>Image selected: {image.fileName || 'photo'}</Muted>}
    <Button label={image ? 'Change image' : 'Choose image'} onPress={pickImage} disabled={busy} />
    {image && <Button label="Remove image" disabled={busy} onPress={() => { setImage(null); uploaded.current = null; }} />}
    <Button label={busy ? 'Please wait…' : 'Send drop'} onPress={submit} disabled={busy || (!image && !text.trim())} />
    {error && <Body>{error}</Body>}
  </Card>;
}
