// Shared UI primitives. ALL screens use these, with no styling in feature files.
// Lane A (Cursor) owns this file and will restyle the whole app from here.
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const tokens = {
  bg: '#000', card: '#111', text: '#fff', muted: '#888', accent: '#fff', good: '#3ddc84', bad: '#ff5c6c',
  radius: 12, pad: 16,
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <SafeAreaView style={[{ flex: 1, backgroundColor: tokens.bg, padding: tokens.pad }, style]}>{children}</SafeAreaView>;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: tokens.card, borderRadius: tokens.radius, padding: tokens.pad }, style]}>{children}</View>;
}
export function Button({ label, onPress, onPressIn, onPressOut, disabled, style }: {
  label: string; onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}
      style={[{ backgroundColor: tokens.accent, borderRadius: tokens.radius, padding: tokens.pad, alignItems: 'center', opacity: disabled ? 0.4 : 1 }, style]}>
      <Text style={{ color: tokens.bg, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
export const Title = ({ children, style }: { children: ReactNode; style?: TextStyle }) => <Text style={[s.title, style]}>{children}</Text>;
export const Body = ({ children, style }: { children: ReactNode; style?: TextStyle }) => <Text style={[s.body, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: TextStyle }) => <Text style={[s.muted, style]}>{children}</Text>;

const s = StyleSheet.create({
  title: { color: tokens.text, fontSize: 24, fontWeight: '800' },
  body: { color: tokens.text, fontSize: 16 },
  muted: { color: tokens.muted, fontSize: 13 },
});
