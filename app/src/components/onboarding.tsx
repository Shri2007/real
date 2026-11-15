import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { useSession } from '@/lib/session';

const COLORS = ['#ffb020', '#3ddc84', '#c9b8ff', '#ff5c6c', '#5ac8fa', '#ff9f0a'];

// Step 1: name + color. Step 2: create a group or join with a code.
export function Onboarding() {
  const { userId, setUserId, setGroupId } = useSession();
  const createUser = useMutation(api.users.create);
  const createGroup = useMutation(api.groups.create);
  const joinGroup = useMutation(api.groups.join);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  if (!userId) {
    return (
      <SafeAreaView style={s.screen}>
        <Text style={s.brand}>OPEN <Text style={{ color: '#ffb020' }}>MIC</Text></Text>
        <Text style={s.tag}>Every "lol" you send is a lie.</Text>
        <TextInput style={s.input} placeholder="Your name" placeholderTextColor="#666" value={name} onChangeText={setName} />
        <View style={s.colors}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[s.dot, { backgroundColor: c }, color === c && s.dotOn]} />
          ))}
        </View>
        <Pressable
          style={[s.btn, !name.trim() && s.btnOff]}
          disabled={!name.trim()}
          onPress={async () => setUserId(await createUser({ name, color }))}>
          <Text style={s.btnText}>Continue</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <Text style={s.h}>Your group</Text>
      <TextInput style={s.input} placeholder="New group name" placeholderTextColor="#666" value={groupName} onChangeText={setGroupName} />
      <Pressable
        style={[s.btn, !groupName.trim() && s.btnOff]}
        disabled={!groupName.trim()}
        onPress={async () => {
          const r = await createGroup({ name: groupName, userId });
          setGroupId(r.groupId);
        }}>
        <Text style={s.btnText}>Create group</Text>
      </Pressable>
      <Text style={s.or}>or join with a code</Text>
      <TextInput style={s.input} placeholder="ABC123" placeholderTextColor="#666" autoCapitalize="characters" value={code} onChangeText={setCode} />
      <Pressable
        style={[s.btnAlt, !code.trim() && s.btnOff]}
        disabled={!code.trim()}
        onPress={async () => {
          try {
            setGroupId(await joinGroup({ code, userId }));
          } catch (e: any) {
            setErr(e?.message ?? 'Could not join');
          }
        }}>
        <Text style={s.btnText}>Join</Text>
      </Pressable>
      {err ? <Text style={s.err}>{err}</Text> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0e0e12', padding: 24, justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center' },
  tag: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 32 },
  h: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  input: { backgroundColor: '#1a1a22', color: '#fff', borderRadius: 14, padding: 16, fontSize: 18, marginBottom: 14 },
  colors: { flexDirection: 'row', gap: 12, marginBottom: 24, justifyContent: 'center' },
  dot: { width: 36, height: 36, borderRadius: 18 },
  dotOn: { borderWidth: 3, borderColor: '#fff' },
  btn: { backgroundColor: '#ffb020', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnAlt: { backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { color: '#000', fontWeight: '800', fontSize: 17 },
  or: { color: '#777', textAlign: 'center', marginVertical: 18 },
  err: { color: '#ff5c6c', marginTop: 12, textAlign: 'center' },
});
