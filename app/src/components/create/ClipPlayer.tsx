import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { useEventListener } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Button, Muted, tokens } from '@/ui';
import { CurveSeries, ReactionCurve } from './ReactionCurve';
import { fmtTime } from './curve';

type Props = { uri: string; onDuration?: (seconds: number) => void; series?: CurveSeries[]; durationSec?: number; peakSec?: number | null; drops?: number[] };

export function ClipPlayer({ uri, onDuration, series, durationSec = 0, peakSec, drops = [] }: Props) {
  const player = useVideoPlayer(uri, (p) => { p.timeUpdateEventInterval = 0.1; });
  const [time, setTime] = useState(0);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(player.duration);
  useEventListener(player, 'timeUpdate', (e) => setTime(e.currentTime));
  useEventListener(player, 'sourceLoad', (e) => { setDuration(e.duration); onDuration?.(e.duration); });
  useEventListener(player, 'statusChange', (e) => {
    setError(e.status === 'error');
    if (e.status === 'error') onDuration?.(0);
    if (e.status === 'readyToPlay' && player.duration > 0) { setDuration(player.duration); onDuration?.(player.duration); }
  });
  useFocusEffect(useCallback(() => () => player.pause(), [player]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') player.pause(); });
    return () => subscription.remove();
  }, [player]);
  const seek = (sec: number) => {
    if (!duration || error) return;
    const target = Math.max(0, Math.min(duration, sec));
    player.seekBy(target - player.currentTime);
    setTime(target);
  };
  return <View style={{ gap: tokens.space.md }}>
    <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', aspectRatio: 16 / 9 }} />
    {error && <Muted>Video could not load. Check your connection or choose another clip.</Muted>}
    {series && <>
      <Muted>Tap the curve to seek · playhead {fmtTime(time)}</Muted>
      <ReactionCurve series={series} durationSec={duration || durationSec} playheadSec={time} onSeek={seek} peakSec={peakSec} dropOffs={drops} />
      {peakSec !== null && peakSec !== undefined && <Button variant="secondary" label={`Peak average score at ${fmtTime(peakSec)}`} onPress={() => seek(peakSec)} />}
      {drops.map((sec) => <Button key={sec} variant="secondary" label={`Laughter drop at ${fmtTime(sec)}`} onPress={() => seek(sec)} />)}
    </>}
  </View>;
}
