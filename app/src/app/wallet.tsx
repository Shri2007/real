import { useAction, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, Screen, SectionHeader, Stat, Title, VerifiedStudentBadge, tokens, LargeTitle } from '@/ui';

const PAYOUT = {
  paid: { label: 'Paid to your Whop', tone: 'good' },
  processing: { label: 'Sending to your Whop…', tone: 'live' },
  pending: { label: 'Pending: link Whop to get it instantly', tone: 'muted' },
  failed: { label: 'Failed: returned to your balance', tone: 'bad' },
} as const;

const errorText = (e: unknown, fallback: string) => (e instanceof ConvexError && typeof e.data === 'string' ? e.data : fallback);

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// Consecutive calendar days (ending today, or yesterday if nothing yet today) with ≥1 valid reaction.
function computeStreak(times: number[]) {
  const days = new Set(times.map(dayKey));
  const now = Date.now();
  let cursor = days.has(dayKey(now)) ? now : now - DAY;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor -= DAY;
  }
  return { streak, reactedToday: days.has(dayKey(now)) };
}

function ago(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function tasteSummary(liked: { tag: string; w: number }[], disliked: { tag: string; w: number }[], signals: number) {
  if (!liked.length && !disliked.length) {
    return signals === 0
      ? 'Swipe and react — your taste builds as you go.'
      : 'Still calibrating. Keep swiping right on what fits.';
  }
  const into = liked.slice(0, 3).map((t) => t.tag).join(', ');
  const skip = disliked.slice(0, 2).map((t) => t.tag).join(', ');
  if (into && skip) return `Into ${into}; less so ${skip}.`;
  if (into) return `Into ${into}.`;
  return `You've been skipping ${skip}.`;
}


export default function WalletScreen() {
  const { userId, setUserId } = useSession();
  const wallet = useQuery(api.users.wallet, userId ? { userId } : 'skip');
  const taste = useQuery(api.prefs.taste, userId ? { userId } : 'skip');
  const cashout = useAction(api.payments.cashout);
  const linkWhop = useAction(api.payments.linkWhop);
  const [busy, setBusy] = useState(false);
  const [whopName, setWhopName] = useState('');
  const [linking, setLinking] = useState(false);
  const whopInput = useRef<ComponentRef<typeof TextInput> | null>(null);

  if (!wallet) {
    return (
      <Screen>
        <Title>Wallet</Title>
        <Muted>Loading wallet…</Muted>
      </Screen>
    );
  }

  const valid = wallet.items.filter((i) => i.valid && i.kind === 'reaction');
  const { streak, reactedToday } = computeStreak(valid.map((i) => i.at));

  return (
    <Screen style={{ gap: tokens.space.xl }}>
        <LargeTitle subtitle="Your earnings">Wallet</LargeTitle>
        {wallet.verifiedStudent ? <VerifiedStudentBadge school={wallet.school} /> : null}

        <Card style={{ gap: tokens.space.md, paddingVertical: tokens.space.xl }}>
          <SectionHeader title="Earnings" detail={`${valid.length} VERIFIED REACTIONS`} />
          <Money cents={wallet.balanceCents} size="lg" />
          <Body>Pending ${(wallet.pendingCents / 100).toFixed(2)} · Available ${(wallet.balanceCents / 100).toFixed(2)}</Body>
          {wallet.whopUsername ? <Muted>Cash-outs go to Whop @{wallet.whopUsername}</Muted> : <>
            <Muted>Link your Whop account to get cash-outs instantly. Without it, cash-outs wait as pending.</Muted>
            <TextInput ref={whopInput} returnKeyType="done" onSubmitEditing={() => whopInput.current?.blur()} accessibilityLabel="Whop username" placeholder="Whop username" placeholderTextColor={tokens.muted} value={whopName} onChangeText={setWhopName}
              autoCapitalize="none" autoCorrect={false}
              style={{ color: tokens.text, backgroundColor: tokens.cardRaised, borderColor: tokens.cardBorder, borderWidth: 1, borderRadius: tokens.radiusSm, padding: tokens.space.md, fontSize: tokens.type.body }} />
            <Button label={linking ? 'Linking…' : 'Link Whop account'} variant="secondary" disabled={linking || !whopName.trim() || !userId} onPress={async () => {
              if (!userId) return;
              setLinking(true);
              try { await linkWhop({ userId, username: whopName }); setWhopName(''); }
              catch (e) { Alert.alert('Could not link Whop', errorText(e, 'Try again in a minute.')); }
              finally { setLinking(false); }
            }} />
          </>}
          <Button
            label={busy ? 'Cashing out…' : 'Cash out via Whop'}
            disabled={busy || wallet.balanceCents <= 0 || !userId}
            onPress={async () => {
              if (!userId) return;
              setBusy(true);
              try {
                const { status } = await cashout({});
                if (status === 'failed') Alert.alert('Cash out failed', 'Whop could not send it. The money is back on your balance.');
                else if (status === 'pending') Alert.alert('Cash out requested', 'Recorded as pending. Link your Whop account to get paid instantly next time.');
                else Alert.alert('Cash out sent', 'Your money is on its way to your Whop balance.');
              } catch (e) {
                Alert.alert('Cash out failed', errorText(e, 'Try again in a minute.'));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>

        <Card style={{ gap: tokens.space.sm }}>
          <SectionHeader title="Reviewer score" detail={`${wallet.trust}/100`} />
          <Body>{wallet.trust < 30 ? 'Your reviews are under review.' : wallet.trust < 70 ? 'Specific, original feedback raises your score.' : 'Strong detailed reviews build trust and unlock bonuses.'}</Body>
        </Card>

        <Card style={{ gap: tokens.space.sm }}>
          <SectionHeader title="Today’s earnings" detail={`$${(wallet.todayEarnedCents / 100).toFixed(2)} / $${(wallet.dailyCapCents / 100).toFixed(2)}`} />
          <Muted>{wallet.nextPaidInSeconds > 0 ? `Next paid reaction in ${Math.floor(wallet.nextPaidInSeconds / 60)}:${String(wallet.nextPaidInSeconds % 60).padStart(2, '0')}` : 'You can submit another paid reaction.'}</Muted>
        </Card>

        {taste ? (
          <Card style={{ gap: tokens.space.md }}>
            <SectionHeader title="Your taste" detail={`${taste.signals} SIGNALS`} />
            <Body>{tasteSummary(taste.liked, taste.disliked, taste.signals)}</Body>
            {taste.liked.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>{taste.liked.map((t) => <Badge key={t.tag} tone="good">{t.tag} · {t.w}</Badge>)}</View>}
            {taste.disliked.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>{taste.disliked.map((t) => <Badge key={t.tag} tone="bad">not {t.tag} · {t.w}</Badge>)}</View>}
            {!taste.liked.length && !taste.disliked.length ? <Muted>{taste.signals}/{taste.unlockAt} signals toward UGC unlock</Muted> : <Muted>Your reactions shape the clips and paid UGC you see.</Muted>}
          </Card>
        ) : null}

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.lg }}>
          <Stat value={streak > 0 ? String(streak) : '0'} label="DAY STREAK" />
          <View style={{ flex: 1, gap: tokens.space.xs }}>
          <Body>
            {streak === 0
              ? 'Start a streak: react to a clip today.'
              : reactedToday
                ? 'Nice, today counts. Come back tomorrow to keep it going.'
                : 'React today to keep your streak alive.'}
          </Body>
          </View>
        </Card>

        <SectionHeader title="Activity" detail={`${wallet.items.length} RECENT`} />
        {wallet.items.length === 0 ? (
          <EmptyState title="No reactions yet" body="No earnings yet: watch a clip on React. You get paid for attention, laugh or not." />
        ) : (
          <View style={{ gap: tokens.space.md }}>
            {wallet.items.map((i, idx) => (
              <Card key={i.id ?? `${i.at}-${idx}`} style={{ gap: tokens.space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.md, alignItems: 'flex-start' }}><Body style={{ flex: 1 }}>{i.gigTitle}</Body><Muted>{ago(i.at)}</Muted></View>
                {i.flags.length > 0 && <Badge tone="bad">FLAGGED · {i.flags.join(', ')}</Badge>}
                {i.flags.length > 0 && !!i.reason && <Muted>{i.reason}</Muted>}
                {i.kind === 'payout' && i.payoutStatus ? (
                  <Badge tone={PAYOUT[i.payoutStatus].tone}>{`−${(-i.earnedCents / 100).toFixed(2)} · ${PAYOUT[i.payoutStatus].label}`}</Badge>
                ) : i.kind === 'ugc' ? (
                  <Badge tone="live">{`+$${(i.earnedCents / 100).toFixed(2)} · UGC approved`}</Badge>
                ) : i.valid ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                    <Badge tone="good">+${(i.earnedCents / 100).toFixed(2)}</Badge>
                    {i.bonusCents > 0 && <Badge tone="live">BONUS +${(i.bonusCents / 100).toFixed(2)}</Badge>}
                  </View>
                ) : (
                  <Badge tone="bad">{i.reason || 'Not paid'}</Badge>
                )}
              </Card>
            ))}
          </View>
        )}
        <Button label="Sign out / switch account" variant="secondary" onPress={() => setUserId(null)} />
    </Screen>
  );
}
