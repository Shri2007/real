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
          <TabTrigger name="foryou" href="/foryou" asChild>
            <TabButton webSymbol="auto_awesome">For you</TabButton>
          </TabTrigger>
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
}: TabTriggerSlotProps & { webSymbol: 'auto_awesome' | 'sentiment_satisfied' | 'video_call' | 'attach_money' }) {
  // TabTrigger passes a mismatched ref type into asChild; drop it for Pressable.
  const { ref: _ref, ...rest } = props as TabTriggerSlotProps & { ref?: unknown };
  return (
    <Pressable {...rest} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonFocused]}>
        <SymbolView
          name={{ web: webSymbol }}
          size={14}
          tintColor={isFocused ? tokens.bg : tokens.ink}
        />
        <Body style={{ color: isFocused ? tokens.bg : tokens.ink, fontSize: 13, fontFamily: tokens.font.medium }}>
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
        <Muted style={styles.brandText}>real.</Muted>
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
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 2,
    maxWidth: 720,
    backgroundColor: tokens.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.cardBorder,
  },
  brandText: {
    marginRight: 'auto',
    fontFamily: tokens.font.displayItalic,
    fontSize: 24,
    color: tokens.ink,
    paddingRight: tokens.space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  tabButtonFocused: {
    backgroundColor: tokens.ink,
  },
});
