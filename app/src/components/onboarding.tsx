import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { Avatar, Badge, Body, Button, Card, Muted, Screen, Title, tokens } from '@/ui';

const COLORS = ['#2EE59A', '#5B8CFF', '#FFB020', '#FF6B7A', '#C9B8FF', '#5AC8FA'];

// Name + color. Same account can post gigs (creator) and react (reactor).
export function Onboarding() {
  const { setUserId } = useSession();
  const createUser = useMutation(api.users.create);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const canContinue = name.trim().length > 0 && !busy;

  return (
    <Screen style={{ justifyContent: 'center', gap: tokens.space.lg }}>
      <View style={{ gap: tokens.space.sm }}>
        <Badge>✓ Verified real</Badge>
        <Title>REAL</Title>
        <Body>Get paid for honest reactions. Know what lands before you post.</Body>
      </View>

      <Card style={{ gap: tokens.space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md }}>
          <Avatar name={name || 'You'} color={color} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Body>{name.trim() || 'Your face in the room'}</Body>
            <Muted>Pick a name and color — no password.</Muted>
          </View>
        </View>

        <TextInput
          placeholder="Your name"
          placeholderTextColor={tokens.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          style={{
            backgroundColor: tokens.bg,
            color: tokens.text,
            borderRadius: tokens.radiusSm,
            borderWidth: 1,
            borderColor: tokens.cardBorder,
            padding: tokens.pad,
            fontSize: tokens.type.subtitle,
          }}
        />

        <View style={{ flexDirection: 'row', gap: tokens.space.md, flexWrap: 'wrap' }}>
          {COLORS.map((c) => {
            const selected = color === c;
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: selected ? 3 : 0,
                  borderColor: tokens.text,
                }}
              />
            );
          })}
        </View>

        <Button
          label={busy ? 'Joining…' : 'Continue'}
          disabled={!canContinue}
          onPress={async () => {
            setBusy(true);
            try {
              const userId = await createUser({ name: name.trim(), color });
              setUserId(userId);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>

      <Muted>Your camera is only on while you watch a clip. We pay for attention, not applause.</Muted>
    </Screen>
  );
}
