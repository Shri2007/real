// Shared UI primitives. ALL screens use these — restyle here to restyle the app.
// Design: REAL — a printed-zine feel. Warm paper, ink-black pills, hairline rules, a highlighter-lime tag for what's
// verified or picked for you, money in green. Instrument Serif headlines, Geist text, Geist Mono labels and numbers.
import { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const tokens = {
  bg: '#F2EFE7',
  card: '#FAF8F3',
  cardRaised: '#E8E4D9',
  cardBorder: 'rgba(23, 22, 19, 0.13)',
  text: '#171613',
  muted: '#6A665C',
  faint: '#BDB7A8',
  ink: '#171613',
  hot: '#DDF56B',
  accent: '#16784A',
  accentDim: 'rgba(22, 120, 74, 0.10)',
  live: '#16784A',
  good: '#16784A',
  bad: '#B8432F',
  radius: 18,
  radiusSm: 10,
  pad: 18,
  padLg: 26,
  space: { xs: 5, sm: 9, md: 13, lg: 18, xl: 26, xxl: 36 },
  type: {
    title: 32,
    subtitle: 22,
    body: 16,
    muted: 14.5,
    stat: 46,
    badge: 11.5,
  },
  // Loaded in app/_layout.tsx. Serif for headlines and big numbers, Geist for reading, Geist Mono for labels.
  font: {
    display: 'InstrumentSerif',
    displayItalic: 'InstrumentSerif-Italic',
    body: 'Geist',
    medium: 'Geist-Medium',
    semibold: 'Geist-SemiBold',
    mono: 'GeistMono',
    monoMedium: 'GeistMono-Medium',
  },
};

export const fontAssets = {
  [tokens.font.display]: require('@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf'),
  [tokens.font.displayItalic]: require('@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'),
  [tokens.font.body]: require('@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf'),
  [tokens.font.medium]: require('@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf'),
  [tokens.font.semibold]: require('@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf'),
  [tokens.font.mono]: require('@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf'),
  [tokens.font.monoMedium]: require('@expo-google-fonts/geist-mono/500Medium/GeistMono_500Medium.ttf'),
};

/** Every screen scrolls by default; `style` styles the content. Taps outside a field and drags close the keyboard.
 *  Don't nest a vertical ScrollView inside, and don't wrap content in a Pressable: it steals the scroll gesture. */
export function Screen({ children, style, scroll = true }: { children: ReactNode; style?: ViewStyle; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.screenContent, style]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <Pressable style={[styles.screenContent, { flex: 1 }, style]} onPress={Keyboard.dismiss} accessible={false}>
            {children}
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Big tappable option (e.g. student vs brand at sign-up). */
export function ChoiceCard({ title, body, selected, onPress }: { title: string; body: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.card, styles.choice, selected && styles.choiceSelected, pressed && styles.buttonPressed]}
    >
      <View style={[styles.choiceDot, selected && styles.choiceDotSelected]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.muted}>{body}</Text>
      </View>
    </Pressable>
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

/** Two-or-more way switch: ink pill on the selected option. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Round icon button, e.g. pass / like under a swipe card. */
export function RoundButton({ glyph, label, onPress, tone = 'muted', size = 64 }: { glyph: string; label: string; onPress: () => void; tone?: 'muted' | 'good'; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.buttonPressed]}
    >
      <Text style={{ fontSize: size * 0.36, color: tone === 'good' ? tokens.accent : tokens.ink }}>{glyph}</Text>
    </Pressable>
  );
}

/** Big serif title at the top of each tab. */
export function LargeTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.largeTitle}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
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

const F = tokens.font;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg },
  screenContent: { flexGrow: 1, paddingHorizontal: tokens.pad, paddingTop: tokens.pad, paddingBottom: 120 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  choiceSelected: { borderColor: tokens.ink, borderWidth: 1.5, backgroundColor: tokens.bg },
  choiceDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: tokens.faint },
  choiceDotSelected: { borderColor: tokens.ink, borderWidth: 6 },
  choiceTitle: { color: tokens.text, fontFamily: F.display, fontSize: 24, lineHeight: 27 },
  card: { backgroundColor: tokens.card, borderRadius: tokens.radius, padding: tokens.pad, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.cardBorder },
  button: { borderRadius: 999, paddingVertical: 15, paddingHorizontal: tokens.padLg, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: tokens.ink },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.ink },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { color: tokens.bg, fontFamily: F.semibold, fontSize: 15.5, letterSpacing: -0.1 },
  buttonLabelSecondary: { color: tokens.ink },
  segmented: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1, borderColor: tokens.ink },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  segmentOn: { backgroundColor: tokens.ink },
  segmentText: { color: tokens.ink, fontFamily: F.medium, fontSize: 14 },
  segmentTextOn: { color: tokens.bg },
  round: { alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.ink },
  largeTitle: { color: tokens.text, fontFamily: F.display, fontSize: 52, lineHeight: 54, letterSpacing: -0.8 },
  subtitle: { color: tokens.muted, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  title: { color: tokens.text, fontFamily: F.display, fontSize: tokens.type.title, lineHeight: tokens.type.title * 1.08, letterSpacing: -0.3 },
  body: { color: tokens.text, fontFamily: F.body, fontSize: tokens.type.body, lineHeight: 23 },
  muted: { color: tokens.muted, fontFamily: F.body, fontSize: tokens.type.muted, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeGood: { backgroundColor: tokens.hot },
  badgeLive: { backgroundColor: tokens.hot },
  badgeMuted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.cardBorder },
  badgeBad: { backgroundColor: 'rgba(184, 67, 47, 0.12)' },
  badgeText: { fontFamily: F.monoMedium, fontSize: tokens.type.badge, letterSpacing: 0.2 },
  badgeTextGood: { color: tokens.ink },
  badgeTextLive: { color: tokens.ink },
  badgeTextMuted: { color: tokens.muted },
  badgeTextBad: { color: tokens.bad },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: tokens.ink, fontFamily: F.display },
  money: { color: tokens.accent, fontFamily: F.monoMedium, fontSize: 18, fontVariant: ['tabular-nums'] },
  moneyLg: { fontFamily: F.display, fontSize: 56, lineHeight: 58, letterSpacing: -1 },
  stat: { gap: 4 },
  statValue: { color: tokens.text, fontFamily: F.display, fontSize: tokens.type.stat, lineHeight: tokens.type.stat * 1.05, fontVariant: ['tabular-nums'] },
  statLabel: { color: tokens.muted, fontFamily: F.mono, fontSize: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: tokens.space.xxl, paddingHorizontal: tokens.pad, gap: tokens.space.sm },
  emptyTitle: { color: tokens.text, fontFamily: F.displayItalic, fontSize: 28, textAlign: 'center' },
  emptyBody: { color: tokens.muted, fontFamily: F.body, fontSize: tokens.type.muted, lineHeight: 20, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.md, paddingBottom: 6, borderBottomWidth: 1, borderColor: tokens.ink },
  sectionTitle: { color: tokens.text, fontFamily: F.displayItalic, fontSize: tokens.type.subtitle + 4 },
  sectionDetail: { color: tokens.muted, fontFamily: F.mono, fontSize: 12, fontVariant: ['tabular-nums'] },
  chip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  chipGood: { backgroundColor: tokens.hot },
  chipLive: { backgroundColor: tokens.hot },
  chipMuted: { backgroundColor: tokens.cardRaised },
  chipBad: { backgroundColor: 'rgba(184, 67, 47, 0.12)' },
  chipText: { fontFamily: F.monoMedium, fontSize: tokens.type.badge },
  chipTextGood: { color: tokens.ink },
  chipTextLive: { color: tokens.ink },
  chipTextMuted: { color: tokens.muted },
  chipTextBad: { color: tokens.bad },
  videoFrame: { overflow: 'hidden', borderRadius: tokens.radius, backgroundColor: '#050605', borderWidth: 1, borderColor: tokens.ink },
  progressTrack: { height: 3, overflow: 'hidden', borderRadius: 999, backgroundColor: tokens.cardRaised },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: tokens.ink },
});
