import { NativeTabs } from 'expo-router/native-tabs';

// Tabs: Drop (index) · Show (live show + contagion map) · You (humor graph).
// Each tab file is owned by one lane, see docs/TASKS.md.
export default function AppTabs() {
  return (
    <NativeTabs backgroundColor="#0e0e12" labelStyle={{ selected: { color: '#ffb020' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Drop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="show">
        <NativeTabs.Trigger.Label>Show</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="graph">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
