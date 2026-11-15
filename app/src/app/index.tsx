import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LAUGH_THRESHOLD } from '@/laugh/detectorHtml';
import { LaughDetector, LaughDetectorHandle, LaughScore } from '@/laugh/LaughDetector';

const MEMES = [
  'POV: you said "quick sync"\nand it\'s been 2 hours 🫠',
  'my code works and I have no idea why.\nmy code doesn\'t work and I have no idea why.',
  'I asked my code to be self-documenting.\nIt wrote a resignation letter.',
  'parallel lines have so much in common.\nshame they\'ll never meet.',
];

type Verdict = 'real' | 'deadpan' | null;

export default function LaughTestScreen() {
  const det = useRef<LaughDetectorHandle>(null);
  const peak = useRef(0);
  const holdingRef = useRef(false);
  const [holding, setHolding] = useState(false);
  const [live, setLive] = useState<LaughScore>({ s: 0, smile: 0, eye: 0, jaw: 0, t: 0 });
  const [status, setStatus] = useState('loading…');
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [lastPeak, setLastPeak] = useState(0);
  const [i, setI] = useState(0);

  const onScore = (sc: LaughScore) => {
    setLive(sc);
    if (holdingRef.current) peak.current = Math.max(peak.current, sc.s);
  };

  const pressIn = () => {
    peak.current = 0;
    holdingRef.current = true;
    setVerdict(null);
    setHolding(true);
    det.current?.start();
  };
  const pressOut = () => {
    holdingRef.current = false;
    setHolding(false);
    det.current?.stop();
    setLastPeak(peak.current);
    setVerdict(peak.current >= LAUGH_THRESHOLD ? 'real' : 'deadpan');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OPEN MIC</Text>
          <Text style={styles.sub}>laugh test · {status}</Text>
        </View>
        <LaughDetector ref={det} onScore={onScore} onStatus={setStatus} style={styles.selfie} />
      </View>

      <View style={[styles.card, !holding && styles.cardHidden]}>
        <Text style={styles.meme}>{holding ? MEMES[i] : 'Hold to view 👀'}</Text>
      </View>

      <View style={styles.meters}>
        <Bar label="Smile" v={live.smile} />
        <Bar label="Eye squint" v={live.eye} />
        <Bar label="Laugh score" v={live.s} accent threshold={LAUGH_THRESHOLD} />
        {holding && live.noFace ? <Text style={styles.warn}>No face found, look at the phone</Text> : null}
      </View>

      <View style={styles.verdictBox}>
        {verdict === 'real' && <Text style={[styles.verdict, { color: '#3ddc84' }]}>😂 REAL LAUGH</Text>}
        {verdict === 'deadpan' && <Text style={[styles.verdict, { color: '#ff5c6c' }]}>😐 DEADPAN. no "lol" for you</Text>}
        {verdict && <Text style={styles.sub}>peak {lastPeak.toFixed(2)} (needs {LAUGH_THRESHOLD})</Text>}
      </View>

      <Pressable onPressIn={pressIn} onPressOut={pressOut} style={[styles.hold, holding && styles.holdOn]}>
        <Text style={styles.holdText}>{holding ? 'Viewing…' : 'Hold to view'}</Text>
      </Pressable>
      <Pressable onPress={() => { setI((i + 1) % MEMES.length); setVerdict(null); }} style={styles.next}>
        <Text style={styles.nextText}>Next meme</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Bar({ label, v, accent, threshold }: { label: string; v: number; accent?: boolean; threshold?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(v * 100)}%`, backgroundColor: accent ? '#ffb020' : '#f2f2f2' }]} />
        {threshold != null && <View style={[styles.thr, { left: `${threshold * 100}%` }]} />}
      </View>
      <Text style={styles.rowVal}>{v.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0e0e12', paddingHorizontal: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  sub: { color: '#8b8b98', fontSize: 13, marginTop: 2 },
  selfie: { width: 84, height: 112, borderRadius: 18 },
  card: { marginTop: 18, minHeight: 200, borderRadius: 22, backgroundColor: '#241d38', justifyContent: 'center', padding: 22 },
  cardHidden: { backgroundColor: '#17171f' },
  meme: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30 },
  meters: { marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  rowLabel: { color: '#8b8b98', width: 92, fontSize: 13 },
  track: { flex: 1, height: 10, borderRadius: 6, backgroundColor: '#26262f', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  thr: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', opacity: 0.6 },
  rowVal: { color: '#fff', width: 44, textAlign: 'right', fontSize: 13 },
  warn: { color: '#ffb020', fontSize: 13, marginTop: 4 },
  verdictBox: { minHeight: 70, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  verdict: { fontSize: 24, fontWeight: '900' },
  hold: { marginTop: 'auto', marginBottom: 10, height: 64, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  holdOn: { backgroundColor: '#3ddc84' },
  holdText: { color: '#000', fontSize: 18, fontWeight: '800' },
  next: { marginBottom: 100, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#ddd', fontSize: 15 },
});
