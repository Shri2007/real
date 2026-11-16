import { useAction, useMutation } from 'convex/react';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSession } from '@/lib/session';
import { Body, Button, Muted, VerifiedStudentBadge, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const input = { color: tokens.text, backgroundColor: tokens.bg, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body };

// .edu verification: email a 6-digit code, then confirm it. Used in onboarding and on locked UGC cards.
// If the email already belongs to another account, the same code signs you back into that account.
export function EduVerify({ userId, initialEmail = '', onVerified }: { userId: Id<'users'>; initialEmail?: string; onVerified: (school: string | null) => void }) {
  const start = useAction(api.verify.start);
  const confirm = useAction(api.verify.confirm);
  const demoPass = useMutation(api.verify.demoPass);
  const [judge, setJudge] = useState(false);
  const [pass, setPass] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<string | null | undefined>(undefined);
  const [existing, setExisting] = useState<string | null>(null);
  const [returning, setReturning] = useState<{ id: Id<'users'>; name: string } | null>(null);
  const { setUserId } = useSession();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch { setError('Something went wrong. Try again.'); }
    finally { setBusy(false); }
  };
  const send = () => run(async () => {
    const r = await start({ userId, email });
    if (!r.ok) return setError(r.error);
    setSentTo(r.email);
    setExisting(r.existing);
    setCode('');
  });
  const verify = () => run(async () => {
    const r = await confirm({ userId, code });
    if (!r.ok) return setError(r.error);
    if (r.signInAs) setReturning({ id: r.signInAs, name: r.name ?? 'your account' });
    else setSchool(r.school);
  });
  const unlock = () => run(async () => {
    const r = await demoPass({ userId, pass });
    if (!r.ok) return setError(r.error);
    setSchool(r.school);
  });

  if (returning) return <View style={{ gap: tokens.space.sm }}>
    <Body>{`Welcome back, ${returning.name}. That email is already on your account, so we'll sign you in there.`}</Body>
    <Button label={`Continue as ${returning.name}`} onPress={() => setUserId(returning.id)} />
  </View>;

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
      {existing && <Muted>{`This email is already verified as ${existing}. Enter the code to sign back in.`}</Muted>}
      <TextInput accessibilityLabel="Verification code" placeholder="123456" placeholderTextColor={tokens.faint} value={code} onChangeText={setCode}
        keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} style={[input, { fontSize: tokens.type.title, letterSpacing: 8, textAlign: 'center' }]} />
      <Button label={busy ? 'Checking…' : 'Verify'} disabled={busy || code.replace(/\D/g, '').length !== 6} onPress={verify} />
      <Button label="Send a new code" variant="secondary" disabled={busy} onPress={send} />
      <Button label="Use a different email" variant="secondary" disabled={busy} onPress={() => { setSentTo(null); setError(''); }} />
    </>}
    {!!error && <Body>{error}</Body>}
    {!judge ? <Button label="Judging the demo? No .edu needed" variant="secondary" disabled={busy} onPress={() => { setJudge(true); setError(''); }} /> : <>
      <Muted>Enter the demo pass to unlock everything a verified student sees.</Muted>
      <TextInput accessibilityLabel="Demo pass" placeholder="Demo pass" placeholderTextColor={tokens.muted} value={pass} onChangeText={setPass}
        autoCapitalize="none" autoCorrect={false} style={input} />
      <Button label={busy ? 'Checking…' : 'Unlock with demo pass'} disabled={busy || !pass.trim()} onPress={unlock} />
    </>}
  </View>;
}
