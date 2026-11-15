import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { Muted, tokens } from '@/ui';
import { CurvePoint, fmtTime, LAUGH_THRESHOLD } from './curve';

export type CurveSeries = { key: string; color: string; points: CurvePoint[] };
type Props = { series: CurveSeries[]; durationSec: number; playheadSec?: number; onSeek?: (sec: number) => void; peakSec?: number | null; dropOffs?: number[] };

function useMorph(series: CurveSeries[]) {
  const target = JSON.stringify(series);
  const [drawn, setDrawn] = useState(series);
  const current = useRef(drawn);
  useEffect(() => {
    const to: CurveSeries[] = JSON.parse(target);
    const from = current.current;
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / 450);
      const ease = 1 - (1 - p) ** 3;
      const next = to.map((s) => ({ ...s, points: s.points.map((point) => {
        const previous = from.find((f) => f.key === s.key)?.points.find((f) => f.sec === point.sec) ?? point;
        return { ...point, avg: previous.avg + (point.avg - previous.avg) * ease, laughingPct: previous.laughingPct + (point.laughingPct - previous.laughingPct) * ease };
      }) }));
      current.current = next;
      setDrawn(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return drawn;
}

export function ReactionCurve({ series, durationSec, playheadSec, onSeek, peakSec, dropOffs = [] }: Props) {
  const [width, setWidth] = useState(0);
  const drawn = useMorph(series);
  const duration = Math.max(1, durationSec, ...series.flatMap((s) => s.points.map((p) => p.sec + 1)));
  const x = (sec: number) => 8 + (Math.max(0, Math.min(duration, sec)) / duration) * (width - 16);
  const y = (value: number) => 16 + (1 - Math.min(1, Math.max(0, value))) * 140;
  const path = (points: CurvePoint[], pct: boolean) => points.map((p, i) => `${i && points[i - 1].sec === p.sec - 1 ? 'L' : 'M'} ${x(p.sec)} ${y(pct ? p.laughingPct / 100 : p.avg)}`).join(' ');
  return <View style={{ gap: tokens.space.sm }}>
    <Muted>1.0 / 100% at top · 0 at bottom · dashed line: 0.45</Muted>
    <Pressable accessibilityLabel="Reaction timeline. Use the time buttons below to seek." onLayout={(e) => setWidth(e.nativeEvent.layout.width)} onPress={(e) => { if (width > 16) onSeek?.(Math.max(0, Math.min(duration, (e.nativeEvent.locationX - 8) / (width - 16) * duration))); }} style={{ height: 172, width: '100%' }}>
      {width > 16 && <Svg width={width} height={172}>
        {[0, 0.5, 1].map((value) => <Line key={value} x1={8} x2={width - 8} y1={y(value)} y2={y(value)} stroke={tokens.cardBorder} />)}
        <Line x1={8} x2={width - 8} y1={y(LAUGH_THRESHOLD)} y2={y(LAUGH_THRESHOLD)} stroke={tokens.muted} strokeDasharray="4 4" />
        {drawn.map((s) => <G key={s.key}>
          <Path d={path(s.points, false)} stroke={s.color} strokeWidth={3} fill="none" />
          <Path d={path(s.points, true)} stroke={s.color} strokeWidth={1} strokeDasharray="2 3" fill="none" />
          {s.points.map((p) => <Circle key={p.sec} cx={x(p.sec)} cy={y(p.avg)} r={p.sec === peakSec ? 5 : 2} fill={s.color} />)}
        </G>)}
        {dropOffs.map((sec) => <Line key={sec} x1={x(sec)} x2={x(sec)} y1={16} y2={156} stroke={tokens.bad} strokeDasharray="3 3" />)}
        {playheadSec !== undefined && <Line x1={x(playheadSec)} x2={x(playheadSec)} y1={8} y2={164} stroke={tokens.text} strokeWidth={2} />}
      </Svg>}
    </Pressable>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>0:00</Muted><Muted>{fmtTime(duration)}</Muted></View>
    <Muted>Solid: sample-weighted average score. Dotted: % of samples above 0.45, not % of people. Missing seconds are gaps. Lines between seconds are visual guides.</Muted>
  </View>;
}
