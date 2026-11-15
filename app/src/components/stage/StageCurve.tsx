import { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Body, Card, Muted, tokens } from '@/ui';
import { Bin, clamp, curvePath, segments, timeLabel } from './geometry';

const mediaLayout = { chartHeight: 220, plotHeight: 200, card: { gap: tokens.space.sm } };

export function StageCurve({ curve, duration, time, peakSec, replay }: { curve: Bin[]; duration: number; time: number; peakSec: number | null; replay: number }) {
  const [display, setDisplay] = useState<Bin[]>([]);
  const current = useRef<Bin[]>([]);
  const lastReplay = useRef(replay);
  useEffect(() => {
    const reset = replay !== lastReplay.current;
    lastReplay.current = replay;
    const from = new Map((reset ? [] : current.current).map(p => [p.sec, p]));
    let start: number | undefined;
    let frame = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = clamp((now - start) / 650);
      const eased = 1 - Math.pow(1 - progress, 3);
      current.current = curve.map(p => {
        const previous = from.get(p.sec);
        return { sec: p.sec, avg: (previous?.avg ?? 0) + (p.avg - (previous?.avg ?? 0)) * eased, laughingPct: (previous?.laughingPct ?? 0) + (p.laughingPct - (previous?.laughingPct ?? 0)) * eased };
      });
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [curve, replay]);
  const end = Math.max(1, duration, ...curve.map(p => p.sec));
  const peak = peakSec === null ? undefined : display.find(p => p.sec === peakSec && Number.isFinite(p.avg));
  return <Card style={mediaLayout.card}>
    <Body>Live reaction curve</Body>
    <Muted>Average laugh score 0–1 (lime) · laughing samples % (gray)</Muted>
    {!curve.length ? <Body>Waiting for measured reactions…</Body> : <Svg width="100%" height={mediaLayout.chartHeight} viewBox={`-8 -8 1016 ${mediaLayout.plotHeight + 16}`} accessibilityLabel="Live average laugh score and laughing sample percentage over the clip">
      {segments(display).map((group) => {
        const path = curvePath(group, end, 'avg', mediaLayout.plotHeight);
        const first = group[0], last = group[group.length - 1];
        return <Path key={`area-${first.sec}-${last.sec}`} d={`${path} L ${last.sec / end * 1000} ${mediaLayout.plotHeight} L ${first.sec / end * 1000} ${mediaLayout.plotHeight} Z`} fill={tokens.accentDim} stroke={tokens.accent} strokeWidth={2} />;
      })}
      {segments(display).map((group) => <Path key={`pct-${group[0].sec}-${group[group.length - 1].sec}`} d={curvePath(group, end, 'laughingPct', mediaLayout.plotHeight)} fill="none" stroke={tokens.muted} strokeWidth={1} />)}
      {display.map(p => <Circle key={p.sec} cx={p.sec / end * 1000} cy={(1 - clamp(p.avg)) * mediaLayout.plotHeight} r={2} fill={tokens.accent} />)}
      <Line x1={clamp(time / end) * 1000} x2={clamp(time / end) * 1000} y1={0} y2={mediaLayout.plotHeight} stroke={tokens.text} strokeWidth={2} />
      {peak && <Circle cx={peak.sec / end * 1000} cy={(1 - clamp(peak.avg)) * mediaLayout.plotHeight} r={5} fill={tokens.good} />}
    </Svg>}
    <Muted>{timeLabel(time)} / {timeLabel(end)} · Missing seconds are gaps, not zero.</Muted>
    {peak && <Body>Biggest laugh at {timeLabel(peak.sec)}</Body>}
  </Card>;
}
