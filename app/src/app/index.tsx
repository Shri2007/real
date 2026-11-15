import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView } from 'react-native';
import { Composer } from '@/components/drop/Composer';
import { DropCard } from '@/components/drop/DropCard';
import { LaughDetector, LaughDetectorHandle, LaughScore } from '@/laugh/LaughDetector';
import { todayKey, useSession } from '@/lib/session';
import { Body, Muted, Screen, Title } from '@/ui';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export default function DailyDropScreen() {
  const { userId, groupId } = useSession();
  const [day, setDay] = useState(todayKey);
  const groups = useQuery(api.groups.mine, userId ? { userId } : 'skip');
  const drops = useQuery(api.drops.today, groupId ? { groupId, day } : 'skip');
  const record = useMutation(api.laughs.record);
  const detector = useRef<LaughDetectorHandle>(null);
  const active = useRef<{ dropId: Id<'drops'>; peak: number; frames: number } | null>(null);
  const [heldId, setHeldId] = useState<Id<'drops'> | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Loading detector…');
  const [ready, setReady] = useState(false);
  const pending = useRef(new Set<string>());
  const group = groups?.find((g) => g._id === groupId);
  const cancelHold = useCallback(() => {
    active.current = null; setHeldId(null); detector.current?.stop();
  }, []);
  useFocusEffect(useCallback(() => { setDay(todayKey()); return cancelHold; }, [cancelHold]));
  useEffect(() => {
    const timer = setInterval(() => setDay(todayKey()), 30_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') cancelHold(); else setDay(todayKey());
    });
    return () => { clearInterval(timer); listener.remove(); cancelHold(); };
  }, [cancelHold]);
  useEffect(() => { cancelHold(); }, [groupId, day, cancelHold]);
  function onScore(score: LaughScore) {
    if (active.current && !score.noFace && Number.isFinite(score.s)) {
      active.current.peak = Math.max(active.current.peak, Math.min(1, Math.max(0, score.s)));
      active.current.frames++;
    }
  }
  function start(dropId: Id<'drops'>) {
    if (!ready || active.current || pending.current.has(dropId)) return;
    active.current = { dropId, peak: 0, frames: 0 }; setHeldId(dropId);
    setResults((old) => ({ ...old, [dropId]: '' })); detector.current?.start();
  }
  async function finish(dropId: Id<'drops'>) {
    const hold = active.current;
    if (!hold || hold.dropId !== dropId || !userId) return;
    cancelHold();
    if (!hold.frames) {
      setResults((old) => ({ ...old, [dropId]: 'No face score captured. Hold again and look at the camera.' })); return;
    }
    pending.current.add(dropId); setResults((old) => ({ ...old, [dropId]: 'Saving reaction…' }));
    try {
      const { isReal } = await record({ dropId, viewerId: userId, peak: hold.peak });
      setResults((old) => ({ ...old, [dropId]: isReal ? 'REAL LAUGH' : 'DEADPAN' }));
    } catch { setResults((old) => ({ ...old, [dropId]: 'Reaction not saved. Hold again to retry.' })); }
    finally { pending.current.delete(dropId); }
  }
  return <Screen>
    <Title>Daily Drop</Title>
    <Body>{group?.name || (groups === undefined ? 'Loading group…' : 'Group unavailable')}</Body>
    {group && <Muted>Join code: {group.code}</Muted>}
    <Muted>{day} · {status}</Muted>
    <LaughDetector ref={detector} onScore={onScore} onStatus={(text) => {
      if (text === 'camera on' && !active.current) detector.current?.stop();
      setStatus(text); if (text === 'model ready') setReady(true); if (text.startsWith('model error')) setReady(false);
    }} />
    <Muted>Hold a drop to view it and measure your reaction. Release to hide it.</Muted>
    <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={!heldId}>
      {userId && groupId && <Composer key={`${userId}:${groupId}`} userId={userId} groupId={groupId} />}
      {drops === undefined ? <Muted>Loading today’s drops…</Muted>
        : drops.length === 0 ? <Body>No drops yet. Send the first one.</Body>
        : drops.map((drop) => <DropCard key={drop._id} drop={drop} own={drop.userId === userId}
          holding={heldId === drop._id} disabled={!ready || pending.current.has(drop._id) || (!!heldId && heldId !== drop._id)}
          result={results[drop._id]} onPressIn={() => start(drop._id)} onPressOut={() => { void finish(drop._id); }} />)}
    </ScrollView>
  </Screen>;
}
