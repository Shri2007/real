import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const STATUS = {
  claimed: { label: 'Picked: record your video', tone: 'live' },
  submitted: { label: 'Submitted: brand is reviewing', tone: 'muted' },
  approved: { label: 'Approved: paid to your wallet', tone: 'good' },
  rejected: { label: 'Not approved: try another take', tone: 'bad' },
} as const;

// The UGC opportunities this student picked: record or upload, submit, get paid on approval.
export function MyUgc({ userId }: { userId: Id<'users'> }) {
  const claims = useQuery(api.ugc.mine, { userId });
  const uploadUrl = useMutation(api.ugc.generateUploadUrl);
  const submit = useMutation(api.ugc.submit);
  const [busy, setBusy] = useState<Id<'ugcClaims'> | null>(null);
  const [error, setError] = useState('');

  const send = async (claimId: Id<'ugcClaims'>, source: 'camera' | 'library') => {
    setError('');
    setBusy(claimId);
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['videos'], videoMaxDuration: 60 };
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Allow camera access to record.');
      }
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const file = asset.file ?? await (await fetch(asset.uri)).blob();
      const response = await fetch(await uploadUrl({}), { method: 'POST', headers: { 'Content-Type': asset.mimeType ?? 'video/mp4' }, body: file });
      if (!response.ok) throw new Error('Upload failed. Try again.');
      const { storageId } = await response.json();
      await submit({ claimId, userId, videoStorageId: storageId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit. Try again.');
    } finally {
      setBusy(null);
    }
  };

  if (claims === undefined) return <Muted>Loading your UGC…</Muted>;
  if (!claims.length) return <EmptyState title="No UGC picked yet" body="Paid UGC opportunities show up in your feed. Pick the ones that fit you." />;
  return <>
    {!!error && <Body>{error}</Body>}
    {claims.map((c) => <Card key={c.claimId} style={{ gap: tokens.space.sm }}>
      <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
      <Body>{c.title}</Body>
      <Muted>for {c.brandName}</Muted>
      <Body>{c.brief}</Body>
      <Money cents={c.payoutCents} />
      {c.status !== 'approved' && c.status !== 'submitted' && <>
        <Button label={busy === c.claimId ? 'Uploading…' : 'Record video'} disabled={!!busy} onPress={() => send(c.claimId, 'camera')} />
        <Button label="Upload from camera roll" variant="secondary" disabled={!!busy} onPress={() => send(c.claimId, 'library')} />
      </>}
    </Card>)}
  </>;
}
