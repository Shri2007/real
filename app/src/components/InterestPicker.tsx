import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Body, Button, Card, Muted, Screen, Title, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const MIN = 3;

// Onboarding step 2: pick what you're into so the For you feed starts with things you'd actually swipe right on.
export function InterestPicker({ userId, onDone }: { userId: Id<'users'>; onDone: () => void }) {
  const interests = useQuery(api.prefs.interests, {});
  const setInterests = useMutation(api.prefs.setInterests);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return <Screen style={{ justifyContent: 'center', gap: tokens.space.lg }}>
    <View style={{ gap: tokens.space.sm }}>
      <Title>What are you into?</Title>
      <Body>Pick at least {MIN}. Your feed starts here and learns from every swipe.</Body>
    </View>
    <Card style={{ gap: tokens.space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
        {(interests ?? []).map((t) => <Pressable key={t} onPress={() => toggle(t)} accessibilityRole="button" accessibilityState={{ selected: picked.includes(t) }}>
          <Badge tone={picked.includes(t) ? 'good' : 'muted'}>{picked.includes(t) ? `✓ ${t}` : t}</Badge>
        </Pressable>)}
      </View>
      <Button label={busy ? 'Building your feed…' : picked.length < MIN ? `Pick ${MIN - picked.length} more` : 'Continue'} disabled={busy || picked.length < MIN} onPress={async () => {
        setBusy(true);
        try { await setInterests({ userId, tags: picked }); onDone(); } finally { setBusy(false); }
      }} />
      <Button label="Skip for now" variant="secondary" disabled={busy} onPress={onDone} />
    </Card>
    <Muted>Brands only ever see your interests in aggregate.</Muted>
  </Screen>;
}
