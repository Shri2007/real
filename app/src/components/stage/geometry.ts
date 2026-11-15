export type Bin = { sec: number; avg: number; laughingPct: number };

export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const timeLabel = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function segments(curve: Bin[]) {
  const groups: Bin[][] = [];
  for (const point of [...curve].sort((a, b) => a.sec - b.sec)) {
    if (!Number.isFinite(point.sec) || point.sec < 0 || !Number.isFinite(point.avg) || !Number.isFinite(point.laughingPct)) continue;
    const previous = groups[groups.length - 1];
    if (previous && point.sec === previous[previous.length - 1].sec + 1) previous.push(point);
    else groups.push([point]);
  }
  return groups;
}

export function curvePath(points: Bin[], duration: number, field: 'avg' | 'laughingPct', height: number) {
  const xy = points.map(p => ({ x: p.sec / duration * 1000, y: height * (1 - clamp(field === 'avg' ? p.avg : p.laughingPct / 100)) }));
  if (!xy.length) return '';
  let path = `M ${xy[0].x} ${xy[0].y}`;
  for (let i = 1; i < xy.length; i++) {
    const a = xy[i - 1], b = xy[i];
    const middle = (a.x + b.x) / 2;
    path += ` C ${middle} ${a.y}, ${middle} ${b.y}, ${b.x} ${b.y}`;
  }
  return path;
}
