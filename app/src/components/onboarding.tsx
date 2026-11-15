import { useMutation } from 'convex/react';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { InterestPicker } from '@/components/InterestPicker';
import { Id } from '../../convex/_generated/dataModel';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Muted,
  Screen,
  Title,
  VerifiedStudentBadge,
  tokens,
} from '@/ui';

const COLORS = ['#2EE59A', '#5B8CFF', '#FFB020', '#FF6B7A', '#C9B8FF', '#5AC8FA'];

/** Mirror of Convex parseEduEmail for live preview (domain check only). */
function previewEdu(raw: string) {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1);
  if (!domain.endsWith('.edu')) return null;
  const withoutEdu = domain.slice(0, -'.edu'.length);
  const label = withoutEdu.split('.').filter(Boolean).pop();
  if (!label) return null;
  return label.length <= 4 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
}

// Name + color (+ optional .edu). Same account can post gigs and react.
export function Onboarding() {
  const { setUserId } = useSession();
  const createUser = useMutation(api.users.create);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Id<'users'> | null>(null);

  const schoolPreview = useMemo(() => previewEdu(email), [email]);
  const canContinue = name.trim().length > 0 && !busy;

  if (created) return <InterestPicker userId={created} onDone={() => setUserId(created)} />;

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

        <View style={{ gap: tokens.space.sm }}>
          <TextInput
            placeholder="School email (optional)"
            placeholderTextColor={tokens.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={{
              backgroundColor: tokens.bg,
              color: tokens.text,
              borderRadius: tokens.radiusSm,
              borderWidth: 1,
              borderColor: tokens.cardBorder,
              padding: tokens.pad,
              fontSize: tokens.type.body,
            }}
          />
          {schoolPreview ? (
            <VerifiedStudentBadge school={schoolPreview} />
          ) : email.trim() ? (
            <Muted>Use a .edu address to get a verified student badge.</Muted>
          ) : (
            <Muted>Optional: add your .edu so brands know you're Gen Z verified.</Muted>
          )}
        </View>

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
              const trimmedEmail = email.trim();
              const userId = await createUser({
                name: name.trim(),
                color,
                ...(trimmedEmail ? { email: trimmedEmail } : {}),
              });
              setCreated(userId);
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
