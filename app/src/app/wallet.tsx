import { useAction, useQuery } from 'convex/react';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, Money, Muted, Screen, Stat, Title, VerifiedStudentBadge, tokens } from '@/ui';

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

// Cash out via Whop once Lane D ships api.payments.cashout. Compiles either way.
const cashoutRef = (api as any).payments?.cashout;

export default function WalletScreen() {
  const { userId } = useSession();
  const wallet = useQuery(api.users.wallet, userId ? { userId } : 'skip');
  const taste = useQuery(api.prefs.taste, userId ? { userId } : 'skip');
  const cashout = cashoutRef ? useAction(cashoutRef) : null; // stable per build, so hook order never changes
  const [busy, setBusy] = useState(false);

  if (!wallet) {
    return (
      <Screen>
        <Title>Wallet</Title>
        <Muted>Loading wallet…</Muted>
      </Screen>
    );
  }

  const valid = wallet.items.filter((i) => i.valid);
  const { streak, reactedToday } = computeStreak(valid.map((i) => i.at));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 120 }}>
        <Title>Wallet</Title>
        {wallet.verifiedStudent ? <VerifiedStudentBadge school={wallet.school} /> : null}

        {taste ? (
          <Card style={{ gap: tokens.space.sm }}>
            <Body>Your taste</Body>
            <Muted>{tasteSummary(taste.liked, taste.disliked, taste.signals)}</Muted>
            {taste.liked.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                {taste.liked.map((t) => (
                  <Badge key={t.tag} tone="good">
                    {t.tag} · {t.w}
                  </Badge>
                ))}
              </View>
            ) : null}
            {taste.disliked.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                {taste.disliked.map((t) => (
                  <Badge key={t.tag} tone="bad">
                    not {t.tag} · {t.w}
                  </Badge>
                ))}
              </View>
            ) : null}
            {!taste.liked.length && !taste.disliked.length ? (
              <Muted>{taste.signals}/{taste.unlockAt} signals toward UGC unlock</Muted>
            ) : (
              <Muted>{taste.signals} swipes & reactions shaping this</Muted>
            )}
          </Card>
        ) : null}

        <Card style={{ gap: 10 }}>
          <Muted>Balance</Muted>
          <Money cents={wallet.balanceCents} size="lg" />
          <Badge tone="good">✓ {valid.length} verified reactions</Badge>
          <Button
            label={cashout ? (busy ? 'Cashing out…' : 'Cash out via Whop') : 'Cash out via Whop (coming soon)'}
            disabled={!cashout || busy || wallet.balanceCents <= 0}
            onPress={async () => {
              if (!cashout || !userId) return;
              setBusy(true);
              try {
                await cashout({ userId });
                Alert.alert('Cash out requested', 'Your payout is on its way via Whop.');
              } catch (e: any) {
                Alert.alert('Cash out failed', e?.message ?? 'Try again in a minute.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>

        <Card style={{ gap: 6 }}>
          <Stat value={streak > 0 ? `🔥 ${streak}` : '0'} label={streak === 1 ? 'day streak' : 'day streak'} />
          <Body>
            {streak === 0
              ? 'Start a streak: react to a clip today.'
              : reactedToday
                ? 'Nice, today counts. Come back tomorrow to keep it going.'
                : 'React today to keep your streak alive.'}
          </Body>
        </Card>

        <Title>History</Title>
        {wallet.items.length === 0 ? (
          <EmptyState title="No reactions yet" body="No earnings yet: watch a clip on React. You get paid for attention, laugh or not." />
        ) : (
          <View style={{ gap: 14 }}>
            {wallet.items.map((i, idx) => (
              <Card key={i.reactionId ?? `${i.at}-${idx}`} style={{ gap: 4 }}>
                <Body>{i.gigTitle}</Body>
                {i.valid ? (
                  <Badge tone="good">+${(i.earnedCents / 100).toFixed(2)}</Badge>
                ) : (
                  <Badge tone="bad">Not paid: face out of frame</Badge>
                )}
                <Muted>{ago(i.at)}</Muted>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
