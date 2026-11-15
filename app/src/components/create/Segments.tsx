import { useQuery } from 'convex/react';
import { View } from 'react-native';
import { Badge, Body, Card, Muted, tokens } from '@/ui';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

// Brand insights: the same results split by verification, school and taste group.
export function Segments({ gigId }: { gigId: Id<'gigs'> }) {
  const data = useQuery(api.insights.forGig, { gigId });
  if (!data || !data.verified.length) return null;
  const groups = [['Verified', data.verified], ['By school', data.schools], ['By taste', data.tastes]] as const;
  return <Card style={{ gap: tokens.space.sm }}>
    <Body>Who it landed with</Body>
    {groups.map(([title, rows]) => rows.length > 0 && <View key={title} style={{ gap: tokens.space.xs }}>
      <Muted>{title}</Muted>
      {rows.map((s) => <View key={s.label} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space.sm }}>
        <Body style={{ flex: 1 }}>{s.label}</Body>
        <Badge tone="muted">{s.reacted} reacted</Badge>
        <Badge tone={s.laughedPct >= 50 ? 'good' : 'muted'}>{s.laughedPct}% laughed</Badge>
        {s.positivePct !== null && <Badge tone={s.positivePct >= 50 ? 'good' : 'bad'}>{s.positivePct}% liked it</Badge>}
      </View>)}
    </View>)}
    <Muted>Small groups swing a lot. Treat these as directional.</Muted>
  </Card>;
}
