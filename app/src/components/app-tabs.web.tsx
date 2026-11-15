import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View, StyleSheet } from 'react-native';

import { Body, Muted, tokens } from '@/ui';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton webSymbol="sentiment_satisfied">React</TabButton>
          </TabTrigger>
          <TabTrigger name="create" href="/create" asChild>
            <TabButton webSymbol="video_call">Create</TabButton>
          </TabTrigger>
          <TabTrigger name="wallet" href="/wallet" asChild>
            <TabButton webSymbol="attach_money">Wallet</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  webSymbol,
  ...props
}: TabTriggerSlotProps & { webSymbol: 'sentiment_satisfied' | 'video_call' | 'attach_money' }) {
  // TabTrigger passes a mismatched ref type into asChild; drop it for Pressable.
  const { ref: _ref, ...rest } = props as TabTriggerSlotProps & { ref?: unknown };
  return (
    <Pressable {...rest} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonFocused]}>
        <SymbolView
          name={{ web: webSymbol }}
          size={14}
          tintColor={isFocused ? tokens.accent : tokens.muted}
        />
        <Body style={{ color: isFocused ? tokens.text : tokens.muted, fontSize: 13, fontWeight: '600' }}>
          {children}
        </Body>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Muted style={styles.brandText}>REAL</Muted>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: tokens.space.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: tokens.space.sm,
    maxWidth: 720,
    backgroundColor: tokens.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.cardBorder,
  },
  brandText: {
    marginRight: 'auto',
    fontWeight: '800',
    color: tokens.accent,
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radiusSm,
  },
  tabButtonFocused: {
    backgroundColor: tokens.accentDim,
  },
});
