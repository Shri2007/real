import { useMutation, useQuery } from 'convex/react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Avatar, Badge, Body, Button, Card, Money, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

const mediaLayout = StyleSheet.create({
  video: { width: '100%', aspectRatio: 9 / 12 },
  input: { color: tokens.text, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' },
});

function Submission({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  return <VideoView player={player} nativeControls contentFit="contain" style={mediaLayout.video} />;
}

// Brand side: post a paid UGC brief on this test; students pick it from their For you feed.
export function UgcPanel({ gigId, brandId, gigTitle }: { gigId: Id<'gigs'>; brandId: Id<'users'>; gigTitle: string }) {
  const opps = useQuery(api.ugc.forGig, { gigId });
  const create = useMutation(api.ugc.create);
  const review = useMutation(api.ugc.review);
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [payout, setPayout] = useState('25');
  const [spots, setSpots] = useState('3');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setError('');
    setBusy(true);
    try {
      await create({ brandId, gigId, title: `Make a video for ${gigTitle}`, brief, payoutCents: Math.round(Number(payout) * 100), spots: Number(spots) });
      setOpen(false);
      setBrief('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not post. Try again.'); }
    finally { setBusy(false); }
  };

  return <Card style={{ gap: tokens.space.md }}>
    <Body>UGC from verified students</Body>
    <Muted>Post a paid brief. Students who are into this kind of content pick it from their feed, film it, and you approve before paying.</Muted>
    {opps?.map((o) => <View key={o.oppId} style={{ gap: tokens.space.sm }}>
      <View style={mediaLayout.row}><Badge tone="live">{o.claimed}/{o.spots} picked</Badge><Money cents={o.payoutCents} /><Muted>per video</Muted></View>
      <Body>{o.brief}</Body>
      {o.claims.map((c) => <View key={c.claimId} style={{ gap: tokens.space.sm }}>
        <View style={mediaLayout.row}>
          <Avatar name={c.name} color={c.color} size={28} /><Body>{c.name}</Body>
          <Badge tone={c.status === 'approved' ? 'good' : c.status === 'rejected' ? 'bad' : 'muted'}>{c.status === 'claimed' ? 'filming' : c.status}</Badge>
        </View>
        {c.videoUrl && <Submission uri={c.videoUrl} />}
        {c.status === 'submitted' && <View style={mediaLayout.row}>
          <Button label="Approve & pay" onPress={() => review({ claimId: c.claimId, brandId, approve: true })} style={{ flex: 1 }} />
          <Button label="Pass" variant="secondary" onPress={() => review({ claimId: c.claimId, brandId, approve: false })} style={{ flex: 1 }} />
        </View>}
      </View>)}
    </View>)}
    {open ? <>
      <TextInput accessibilityLabel="Brief" placeholder="Brief: e.g. 15s selfie video reacting to the ending, say what made you laugh" placeholderTextColor={tokens.muted} value={brief} onChangeText={setBrief} multiline style={mediaLayout.input} />
      <View style={mediaLayout.row}>
        <TextInput accessibilityLabel="Payout in dollars" value={payout} onChangeText={setPayout} keyboardType="number-pad" style={[mediaLayout.input, { flex: 1 }]} />
        <Muted>$ per video</Muted>
        <TextInput accessibilityLabel="Spots" value={spots} onChangeText={setSpots} keyboardType="number-pad" style={[mediaLayout.input, { flex: 1 }]} />
        <Muted>spots</Muted>
      </View>
      {!!error && <Body>{error}</Body>}
      <Button label={busy ? 'Posting…' : 'Post UGC opportunity'} disabled={busy || !brief.trim()} onPress={post} />
      <Button label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
    </> : <Button label="Post a UGC opportunity" variant="secondary" onPress={() => setOpen(true)} />}
  </Card>;
}
