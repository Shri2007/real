import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';
import { Body, Button, Muted, Screen, Title, tokens } from '@/ui';

const COLORS = ['#ffb020', '#3ddc84', '#c9b8ff', '#ff5c6c', '#5ac8fa', '#ff9f0a'];

// Name + color. Same account can post gigs (creator) and react (reactor).
export function Onboarding() {
  const { setUserId } = useSession();
  const createUser = useMutation(api.users.create);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  return (
    <Screen style={{ justifyContent: 'center', gap: 16 }}>
      <Title>REAL</Title>
      <Body>Get paid for honest reactions. Know what lands before you post.</Body>
      <TextInput
        placeholder="Your name"
        placeholderTextColor={tokens.muted}
        value={name}
        onChangeText={setName}
        style={{ backgroundColor: tokens.card, color: tokens.text, borderRadius: tokens.radius, padding: tokens.pad, fontSize: 18 }}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {COLORS.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: tokens.text }} />
        ))}
      </View>
      <Button label="Continue" disabled={!name.trim()} onPress={async () => setUserId(await createUser({ name, color }))} />
      <Muted>No passwords. Your camera is only used while you watch a clip.</Muted>
    </Screen>
  );
}
