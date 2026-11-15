import { useAction } from 'convex/react';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Body, Button, Muted, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const input = { color: tokens.text, backgroundColor: tokens.bg, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body };

// .edu verification: email a 6-digit code, then confirm it. Used in onboarding and on locked UGC cards.
export function EduVerify({ userId, initialEmail = '', onVerified }: { userId: Id<'users'>; initialEmail?: string; onVerified: (school: string | null) => void }) {
  const start = useAction(api.verify.start);
  const confirm = useAction(api.verify.confirm);
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<string | null | undefined>(undefined);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /s, '').split('\n')[0] : 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  };
  const send = () => run(async () => { setSentTo((await start({ userId, email })).email); setCode(''); });

  if (school !== undefined) return <View style={{ gap: tokens.space.sm }}>
    <VerifiedStudentBadge school={school} />
    <Button label="Continue" onPress={() => onVerified(school)} />
  </View>;

  return <View style={{ gap: tokens.space.sm }}>
    {!sentTo ? <>
      <TextInput accessibilityLabel="School email" placeholder="you@school.edu" placeholderTextColor={tokens.muted} value={email} onChangeText={setEmail}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" style={input} />
      <Button label={busy ? 'Sending code…' : 'Email me a code'} disabled={busy || !email.trim()} onPress={send} />
      <Muted>We email a 6-digit code to your school address. Only verified students can pick paid UGC jobs.</Muted>
    </> : <>
      <Body>Enter the code we sent to {sentTo}</Body>
      <TextInput accessibilityLabel="Verification code" placeholder="123456" placeholderTextColor={tokens.muted} value={code} onChangeText={setCode}
        keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} style={[input, { fontSize: tokens.type.title, letterSpacing: 8, textAlign: 'center' }]} />
      <Button label={busy ? 'Checking…' : 'Verify'} disabled={busy || code.replace(/\D/g, '').length !== 6} onPress={() => run(async () => setSchool((await confirm({ userId, code })).school))} />
      <Button label="Send a new code" variant="secondary" disabled={busy} onPress={send} />
      <Button label="Use a different email" variant="secondary" disabled={busy} onPress={() => { setSentTo(null); setError(''); }} />
    </>}
    {!!error && <Body>{error}</Body>}
  </View>;
}
