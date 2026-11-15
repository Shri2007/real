import { useQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';
import { Image } from 'react-native';
import { Body, Button, Card, Muted } from '@/ui';
import { api } from '../../../convex/_generated/api';
type Drop = FunctionReturnType<typeof api.drops.today>[number];
export function DropCard({ drop, own, holding, disabled, result, onPressIn, onPressOut }: {
  drop: Drop; own: boolean; holding: boolean; disabled: boolean; result?: string;
  onPressIn: () => void; onPressOut: () => void;
}) {
  const reactions = useQuery(api.laughs.forDrop, own ? { dropId: drop._id } : 'skip');
  return <Card>
    <Body>{drop.senderName}{own ? ' (you)' : ''}</Body>
    <Button label={holding ? 'Release to finish' : 'Hold to view'} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled} />
    {holding ? <>
      {drop.kind === 'image' && (drop.imageUrl
        ? <Image source={{ uri: drop.imageUrl }} width={280} height={280} resizeMode="contain" accessibilityLabel="Image drop" />
        : <Muted>Image unavailable.</Muted>)}
      {drop.text && <Body>{drop.text}</Body>}
    </> : <Muted>Hidden. Press and hold to view.</Muted>}
    {result && <Body>{result}</Body>}
    {own && <Muted>{reactions === undefined ? 'Loading reactions…' : `${reactions.filter((r) => r.isReal).length} of ${reactions.length} actually laughed`}</Muted>}
  </Card>;
}
