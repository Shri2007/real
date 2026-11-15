// Shared UI primitives. ALL screens use these — restyle here to restyle the app.
// Design: REAL — trustworthy, human, playful. Dark mode. Money-green for earnings.
import { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const tokens = {
  bg: '#090B0A',
  card: '#121613',
  cardRaised: '#191E1A',
  cardBorder: '#29312B',
  text: '#F3F4EF',
  muted: '#9AA39B',
  accent: '#B4F34A',
  accentDim: 'rgba(180, 243, 74, 0.12)',
  live: '#B4F34A',
  good: '#B4F34A',
  bad: '#D89283',
  radius: 20,
  radiusSm: 13,
  pad: 18,
  padLg: 26,
  space: { xs: 5, sm: 9, md: 13, lg: 18, xl: 26, xxl: 36 },
  type: {
    title: 30,
    subtitle: 19,
    body: 16,
    muted: 13,
    stat: 40,
    badge: 12,
  },
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {/* Tap anywhere outside a text field to close the keyboard (iOS number/text pads have no Done key). */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
          {children}
        </Pressable>
      </KeyboardAvoidingView>
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

/** Editorial section heading with an optional quiet trailing label. */
export function SectionHeader({ title, detail, style }: { title: string; detail?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

/** Compact metadata/payout chip that follows the app's restrained surface palette. */
export function Chip({ children, tone = 'muted', style }: { children: ReactNode; tone?: 'good' | 'live' | 'muted' | 'bad'; style?: ViewStyle }) {
  const toneStyle = tone === 'good' ? styles.chipGood : tone === 'bad' ? styles.chipBad : tone === 'live' ? styles.chipLive : styles.chipMuted;
  const textStyle = tone === 'good' ? styles.chipTextGood : tone === 'bad' ? styles.chipTextBad : tone === 'live' ? styles.chipTextLive : styles.chipTextMuted;
  return <View style={[styles.chip, toneStyle, style]}><Text style={[styles.chipText, textStyle]}>{children}</Text></View>;
}

/** Keeps video and other edge-to-edge media aligned to the shared frame treatment. */
export function VideoFrame({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.videoFrame, style]}>{children}</View>;
}

export function ProgressBar({ value, style }: { value: number; style?: ViewStyle }) {
  const progress = Math.max(0, Math.min(1, value));
  return <View style={[styles.progressTrack, style]}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>;
}

/** Primary action alias for screens where the main action needs explicit hierarchy. */
export function PrimaryCTA(props: Omit<Parameters<typeof Button>[0], 'variant'>) {
  return <Button {...props} variant="primary" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
    paddingHorizontal: tokens.pad,
    paddingTop: tokens.pad,
  },
  card: {
    backgroundColor: tokens.card,
    borderRadius: tokens.radius,
    padding: tokens.pad,
    borderWidth: 1,
    borderColor: tokens.cardBorder,
  },
  button: {
    borderRadius: tokens.radius,
    paddingVertical: 15,
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
    letterSpacing: -0.15,
  },
  buttonLabelSecondary: {
    color: tokens.text,
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title,
    fontWeight: '800',
    letterSpacing: -0.8,
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
    backgroundColor: tokens.accentDim,
  },
  badgeMuted: {
    backgroundColor: 'rgba(154, 163, 155, 0.12)',
  },
  badgeBad: {
    backgroundColor: 'rgba(216, 146, 131, 0.12)',
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
    color: tokens.bg,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.space.md,
  },
  sectionTitle: {
    color: tokens.text,
    fontSize: tokens.type.subtitle,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  sectionDetail: {
    color: tokens.muted,
    fontSize: tokens.type.muted,
    fontVariant: ['tabular-nums'],
  },
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  chipGood: { backgroundColor: tokens.accentDim },
  chipLive: { backgroundColor: tokens.accentDim },
  chipMuted: { backgroundColor: tokens.cardRaised },
  chipBad: { backgroundColor: 'rgba(216, 146, 131, 0.12)' },
  chipText: { fontSize: tokens.type.badge, fontWeight: '700', letterSpacing: 0.1 },
  chipTextGood: { color: tokens.good },
  chipTextLive: { color: tokens.live },
  chipTextMuted: { color: tokens.muted },
  chipTextBad: { color: tokens.bad },
  videoFrame: { overflow: 'hidden', borderRadius: tokens.radius, backgroundColor: '#050605', borderWidth: 1, borderColor: tokens.cardBorder },
  progressTrack: { height: 4, overflow: 'hidden', borderRadius: 999, backgroundColor: tokens.cardBorder },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: tokens.accent },
});
