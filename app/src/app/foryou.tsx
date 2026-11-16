import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DeckCard, DeckItem } from '@/components/foryou/DeckCard';
import { MyUgc } from '@/components/foryou/MyUgc';
import { EduVerify } from '@/components/EduVerify';
import { useSession } from '@/lib/session';
import { Badge, Body, Button, Card, EmptyState, LargeTitle, Money, Muted, RoundButton, Screen, Segmented, tokens } from '@/ui';
import { api } from '../../convex/_generated/api';

// For you: a Tinder-style deck of everyday things. Swipes teach REAL your taste; once it knows you, brands with
// matching UGC jobs show up in the deck with a small "UGC opportunity" link under the card.
export default function ForYouScreen() {
  const { userId } = useSession();
  const deck = useQuery(api.prefs.deck, userId ? { userId } : 'skip');
  const taste = useQuery(api.prefs.taste, userId ? { userId } : 'skip');
  const me = useQuery(api.users.get, userId ? { userId } : 'skip');
  const swipe = useMutation(api.prefs.swipe);
  const claim = useMutation(api.ugc.claim);
  const [tab, setTab] = useState<'deck' | 'mine'>('deck');
  const [gone, setGone] = useState<string[]>([]);
  const [openJob, setOpenJob] = useState(false);
  const [error, setError] = useState('');

  if (!userId) return <Screen><Muted>Choose your name first.</Muted></Screen>;

  const cards = (deck ?? []).filter((c) => !gone.includes(c.id));
  const [top, next] = cards;
  const decide = async (card: DeckItem, dir: 'right' | 'left') => {
    setGone((g) => [...g, card.id]);
    setOpenJob(false);
    setError('');
    try { await swipe({ userId, dir, itemKey: card.itemKey, oppId: card.oppId }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.'); }
  };
  const pick = async (card: DeckItem) => {
    if (!card.oppId || !me?.verifiedStudent) return;
    setError('');
    try {
      await claim({ oppId: card.oppId, userId });
      setGone((g) => [...g, card.id]);
      setOpenJob(false);
      setTab('mine');
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.'); }
  };
  const left = taste ? Math.max(0, taste.unlockAt - taste.signals) : null;

  return <Screen style={{ gap: tokens.space.lg }}>
    <LargeTitle subtitle="Swipe on what you're into. We'll find brands that want your take.">For you</LargeTitle>
    <Segmented options={[{ value: 'deck', label: 'Discover' }, { value: 'mine', label: 'My UGC' }]} value={tab} onChange={setTab} />

    {tab === 'mine' ? <MyUgc userId={userId} /> : deck === undefined ? <Muted>Loading…</Muted> : !top ? <EmptyState title="You're all caught up" body="Check back soon. New brands and drops land here." /> : <>
      <View>
        {next && <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }}><DeckCard key={next.id + ':behind'} item={next} behind /></View>}
        <DeckCard key={top.id} item={top} onSwipe={(dir) => decide(top, dir)} onPress={() => top.ugc && setOpenJob(!openJob)} />
      </View>

      {top.ugc && <Pressable onPress={() => setOpenJob(!openJob)} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: tokens.accentDim }, pressed && { opacity: 0.7 }]}>
        <Body style={{ color: tokens.accent, fontSize: 15, fontWeight: '600' }}>UGC opportunity · ${(top.ugc.cents / 100).toFixed(0)} per video {openJob ? '⌃' : '›'}</Body>
      </Pressable>}

      {top.ugc && openJob && <Card style={{ gap: tokens.space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '600' }}>{top.ugc.brand} is hiring</Body>
          <Money cents={top.ugc.cents} />
        </View>
        <Body>{top.ugc.brief}</Body>
        <Muted>{top.ugc.spotsLeft} {top.ugc.spotsLeft === 1 ? 'spot' : 'spots'} left · paid when the brand approves your video</Muted>
        {me?.verifiedStudent
          ? <Button label="Pick this job" onPress={() => pick(top)} />
          : <><Muted>UGC jobs are for verified students.</Muted><EduVerify userId={userId} onVerified={() => undefined} /></>}
      </Card>}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: tokens.space.xs }}>
        <RoundButton glyph="✕" label="Pass" onPress={() => decide(top, 'left')} />
        <RoundButton glyph="♥" label="Like" tone="good" onPress={() => decide(top, 'right')} />
      </View>

      <Muted style={{ textAlign: 'center' }}>
        {left === null ? ' ' : left > 0 ? `Swipe ${left} more to unlock UGC opportunities` : 'UGC opportunities picked for your taste show up as you swipe'}
      </Muted>
      {!!error && <Body style={{ color: tokens.bad, textAlign: 'center' }}>{error}</Body>}

      {taste && taste.liked.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, justifyContent: 'center' }}>
        {taste.liked.slice(0, 6).map((t) => <Badge key={t.tag} tone="muted">{t.tag}</Badge>)}
      </View>}
    </>}
  </Screen>;
}
