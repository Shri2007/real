import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding';
import { SessionProvider, useSession } from '@/lib/session';
import { fontAssets, tokens } from '@/ui';

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });

function Gate() {
  const { ready, userId } = useSession();
  if (!ready) return null;
  if (!userId) return <Onboarding />;
  return <AppTabs />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>
        <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: tokens.bg, card: tokens.bg, text: tokens.text } }}>
          <StatusBar style="dark" />
          <AnimatedSplashOverlay />
          <Gate />
        </ThemeProvider>
      </SessionProvider>
    </ConvexProvider>
  );
}
