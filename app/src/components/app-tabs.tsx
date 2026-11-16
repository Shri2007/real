import { NativeTabs } from 'expo-router/native-tabs';

import { tokens } from '@/ui';

// Tabs: React · Create · Wallet. SF Symbols via expo-symbols (Expo Go).
export default function AppTabs() {
  return (
    <NativeTabs
      tintColor={tokens.accent}
      labelStyle={{ fontSize: 11, fontFamily: tokens.font.medium }}
    >
      <NativeTabs.Trigger name="foryou">
        <NativeTabs.Trigger.Label>For you</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>React</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="face.smiling" md="sentiment_satisfied" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="video.badge.plus" md="video_call" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dollarsign.circle" md="attach_money" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
