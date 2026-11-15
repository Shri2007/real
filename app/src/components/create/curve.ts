export type CurvePoint = { sec: number; avg: number; laughingPct: number };
export const LAUGH_THRESHOLD = 0.45;

export function fmtTime(sec: number) {
  const whole = Math.max(0, Math.floor(sec));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function laughOnset(curve: CurvePoint[]): number | null {
  return [...curve].sort((a, b) => a.sec - b.sec).find((p) => p.avg >= LAUGH_THRESHOLD)?.sec ?? null;
}

export function dropOffs(curve: CurvePoint[], max = 3): number[] {
  const points = [...curve].sort((a, b) => a.sec - b.sec);
  return points.slice(1).map((p, i) => ({ sec: p.sec, size: points[i].sec === p.sec - 1 && points[i].avg >= LAUGH_THRESHOLD ? points[i].avg - p.avg : 0 }))
    .filter((p) => p.size >= 0.15).sort((a, b) => b.size - a.size).slice(0, max).map((p) => p.sec).sort((a, b) => a - b);
}

export type CutSummary = { count: number; laughedCount: number; onset: number | null };

export function abVerdict(a: CutSummary, b: CutSummary) {
  const counts = `A: ${a.laughedCount}/${a.count} laughed. B: ${b.laughedCount}/${b.count} laughed.`;
  if (!a.count || !b.count) return { headline: 'Waiting for both cuts', detail: `${counts} Each cut needs valid reactions before comparison.` };
  if (a.onset === null || b.onset === null) return { headline: 'No earlier-laugh verdict yet', detail: `${counts} ${a.onset === null && b.onset === null ? 'Neither aggregate has' : 'One aggregate has not'} crossed 0.45. This does not mean nobody laughed.` };
  if (a.onset === b.onset) return { headline: 'Same whole-second onset', detail: `${counts} Both aggregates first cross 0.45 at ${fmtTime(a.onset)}.` };
  const earlier = a.onset < b.onset ? 'A' : 'B';
  return { headline: `Provisional: cut ${earlier} crosses ${Math.abs(a.onset - b.onset)}s earlier`, detail: `${counts} Aggregate onset: A ${fmtTime(a.onset)}, B ${fmtTime(b.onset)}. Not individual laugh timing or a proven winner.` };
}

export function validDuration(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 30;
}

export function positiveInteger(text: string) {
  return /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text)) && Number(text) > 0;
}
