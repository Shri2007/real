// Shared UI primitives. ALL screens use these — restyle here to restyle the app.
// Design: REAL — trustworthy, human, playful. Dark mode. Money-green for earnings.
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const tokens = {
  bg: '#0B0D12',
  card: '#151922',
  cardBorder: '#232A36',
  text: '#F2F4F7',
  muted: '#8A93A3',
  accent: '#2EE59A',
  accentDim: 'rgba(46, 229, 154, 0.14)',
  live: '#5B8CFF',
  good: '#2EE59A',
  bad: '#FF6B7A',
  radius: 16,
  radiusSm: 10,
  pad: 16,
  padLg: 24,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  type: {
    title: 28,
    subtitle: 18,
    body: 16,
    muted: 13,
    stat: 36,
    badge: 12,
  },
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  variant = 'primary',
}: {
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
}) {
  const isSecondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSecondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, isSecondary && styles.buttonLabelSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Badge({
  children = '✓ Verified real',
  tone = 'good',
  style,
}: {
  children?: ReactNode;
  tone?: 'good' | 'live' | 'muted' | 'bad';
  style?: ViewStyle;
}) {
  const toneStyle =
    tone === 'live'
      ? styles.badgeLive
      : tone === 'bad'
        ? styles.badgeBad
        : tone === 'muted'
          ? styles.badgeMuted
          : styles.badgeGood;
  const textStyle =
    tone === 'live'
      ? styles.badgeTextLive
      : tone === 'bad'
        ? styles.badgeTextBad
        : tone === 'muted'
          ? styles.badgeTextMuted
          : styles.badgeTextGood;
  return (
    <View style={[styles.badge, toneStyle, style]}>
      <Text style={[styles.badgeText, textStyle]}>{children}</Text>
    </View>
  );
}

/** "✓ Verified student · Berkeley" — only render when the user is .edu-verified. */
export function VerifiedStudentBadge({
  school,
  style,
}: {
  school?: string | null;
  style?: ViewStyle;
}) {
  return (
    <Badge tone="good" style={style}>
      {school ? `✓ Verified student · ${school}` : '✓ Verified student'}
    </Badge>
  );
}

export function Avatar({
  name,
  color,
  size = 40,
  style,
}: {
  name: string;
  color: string;
  size?: number;
  style?: ViewStyle;
}) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

export function Money({
  cents,
  style,
  size = 'md',
}: {
  cents: number;
  style?: TextStyle;
  size?: 'md' | 'lg';
}) {
  const dollars = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
  return (
    <Text style={[styles.money, size === 'lg' && styles.moneyLg, style]}>{dollars}</Text>
  );
}

export function Stat({
  value,
  label,
  style,
}: {
  value: ReactNode;
  label: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.stat, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  style,
}: {
  title: string;
  body: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.empty, style]}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
    padding: tokens.pad,
  },
  card: {
    backgroundColor: tokens.card,
    borderRadius: tokens.radius,
    padding: tokens.pad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.cardBorder,
  },
  button: {
    borderRadius: tokens.radius,
    paddingVertical: 14,
    paddingHorizontal: tokens.pad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: tokens.accent,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: tokens.cardBorder,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: tokens.bg,
    fontWeight: '700',
    fontSize: tokens.type.body,
    letterSpacing: 0.2,
  },
  buttonLabelSecondary: {
    color: tokens.text,
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  body: {
    color: tokens.text,
    fontSize: tokens.type.body,
    lineHeight: 22,
  },
  muted: {
    color: tokens.muted,
    fontSize: tokens.type.muted,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeGood: {
    backgroundColor: tokens.accentDim,
  },
  badgeLive: {
    backgroundColor: 'rgba(91, 140, 255, 0.16)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(138, 147, 163, 0.16)',
  },
  badgeBad: {
    backgroundColor: 'rgba(255, 107, 122, 0.16)',
  },
  badgeText: {
    fontSize: tokens.type.badge,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeTextGood: {
    color: tokens.good,
  },
  badgeTextLive: {
    color: tokens.live,
  },
  badgeTextMuted: {
    color: tokens.muted,
  },
  badgeTextBad: {
    color: tokens.bad,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0B0D12',
    fontWeight: '800',
  },
  money: {
    color: tokens.accent,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  moneyLg: {
    fontSize: tokens.type.stat,
    letterSpacing: -1,
  },
  stat: {
    gap: 4,
  },
  statValue: {
    color: tokens.text,
    fontSize: tokens.type.stat,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: tokens.muted,
    fontSize: tokens.type.muted,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.xxl,
    paddingHorizontal: tokens.pad,
    gap: tokens.space.sm,
  },
  emptyTitle: {
    color: tokens.text,
    fontSize: tokens.type.subtitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: tokens.muted,
    fontSize: tokens.type.muted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
