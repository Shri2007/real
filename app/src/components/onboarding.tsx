import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { InterestPicker } from '@/components/InterestPicker';
import { EduVerify } from '@/components/EduVerify';
import { Id } from '../../convex/_generated/dataModel';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  ChoiceCard,
  Muted,
  Screen,
  SectionHeader,
  Title,
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

// Role → name + color → (students) .edu code or demo pass → interests. Brands go straight to Create.
export function Onboarding() {
  const { setUserId } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'brand' | null>(null);
  const [pick, setPick] = useState<'student' | 'brand' | null>(null);
  const createUser = useMutation(api.users.create);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Id<'users'> | null>(null);
  const [step, setStep] = useState<'verify' | 'interests'>('interests');
  const nameInput = useRef<ComponentRef<typeof TextInput> | null>(null);
  const emailInput = useRef<ComponentRef<typeof TextInput> | null>(null);

  const schoolPreview = useMemo(() => previewEdu(email), [email]);
  const canContinue = name.trim().length > 0 && !busy;

  if (!role) return <Screen style={{ justifyContent: 'center', gap: tokens.space.xl }}>
    <View style={{ gap: tokens.space.sm }}>
      <Badge tone="good">Verified Gen Z reactions</Badge>
      <Title style={{ fontSize: 44, letterSpacing: -1.2 }}>REAL</Title>
      <Body>Get paid for honest reactions. Know what lands before you post.</Body>
    </View>
    <View style={{ gap: tokens.space.md }}>
      <SectionHeader title="How will you use REAL?" />
      <ChoiceCard title="Student / creator" body="React to clips, get paid, and pick UGC jobs made for your taste. Verify with your .edu." selected={pick === 'student'} onPress={() => setPick('student')} />
      <ChoiceCard title="Business / brand" body="Test ads on verified Gen Z before you spend, and hire students to make UGC." selected={pick === 'brand'} onPress={() => setPick('brand')} />
    </View>
    <Button label={pick === 'brand' ? 'Continue as a business' : pick === 'student' ? 'Continue as a student' : 'Choose one to continue'} disabled={!pick} onPress={() => setRole(pick)} />
  </Screen>;
  if (created && step === 'verify') return <Screen style={{ justifyContent: 'center', gap: tokens.space.lg }}>
    <View style={{ gap: tokens.space.sm }}>
      <Title>Verify you're a student</Title>
      <Body>Brands pay for verified Gen Z. Confirm your school email to unlock paid UGC jobs.</Body>
    </View>
    <Card style={{ gap: tokens.space.md }}>
      <EduVerify userId={created} initialEmail={email.trim()} onVerified={() => setStep('interests')} />
      <Button label="Skip for now" variant="secondary" onPress={() => setStep('interests')} />
    </Card>
  </Screen>;
  if (created) return <InterestPicker userId={created} onDone={() => setUserId(created)} />;

  return (
    <Screen style={{ justifyContent: 'center', gap: tokens.space.lg }}>
      <View style={{ gap: tokens.space.sm }}>
        <Title style={{ fontSize: 34 }}>{role === 'brand' ? 'Set up your brand' : 'Set up your profile'}</Title>
        <Body>{role === 'brand' ? 'Your brand name is what students see on your jobs.' : 'Pick a name and color. Next, verify your school email.'}</Body>
      </View>

      <Card style={{ gap: tokens.space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md }}>
          <Avatar name={name || 'You'} color={color} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Body>{name.trim() || (role === 'brand' ? 'Your brand' : 'Your face in the room')}</Body>
            <Muted>Pick a name and color — no password.</Muted>
          </View>
        </View>

        <TextInput
          ref={nameInput}
          returnKeyType="done"
          onSubmitEditing={() => role === 'student' ? emailInput.current?.focus() : nameInput.current?.blur()}
          placeholder={role === 'brand' ? 'Brand name' : 'Your name'}
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

        {role === 'student' && <View style={{ gap: tokens.space.sm }}>
          <TextInput
            ref={emailInput}
            returnKeyType="done"
            onSubmitEditing={() => emailInput.current?.blur()}
            placeholder="School email (you@school.edu)"
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
            <Muted>Next, we'll email a code to verify you're a student at {schoolPreview}.</Muted>
          ) : email.trim() ? (
            <Muted>Use a .edu address to get a verified student badge.</Muted>
          ) : (
            <Muted>Add your .edu so brands know you're Gen Z verified. No .edu? You can use a demo pass next.</Muted>
          )}
        </View>}

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
              const userId = await createUser({ name: name.trim(), color, role });
              if (role === 'brand') {
                setUserId(userId);
                requestAnimationFrame(() => router.navigate('/create'));
                return;
              }
              setStep('verify');
              setCreated(userId);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>

      <Button label="Back" variant="secondary" onPress={() => { setRole(null); setPick(null); }} />
      {role === 'student' && <Muted>Your camera is only on while you watch a clip. We pay for attention, not applause.</Muted>}
    </Screen>
  );
}
