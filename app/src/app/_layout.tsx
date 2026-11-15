import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });

function Gate() {
  const { ready, userId } = useSession();
  if (!ready) return null;
  if (!userId) return <Onboarding />;
  return <AppTabs />;
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>
        <ThemeProvider value={DarkTheme}>
          <AnimatedSplashOverlay />
          <Gate />
        </ThemeProvider>
      </SessionProvider>
    </ConvexProvider>
  );
}
