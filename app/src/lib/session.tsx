import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Id } from '../../convex/_generated/dataModel';

// Name-only "login": we remember the user's Convex userId on the device.
type Session = {
  ready: boolean;
  userId: Id<'users'> | null;
  setUserId: (id: Id<'users'> | null) => void;
};

const Ctx = createContext<Session | null>(null);
const K_USER = 'real.userId';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUser] = useState<Id<'users'> | null>(null);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem(K_USER);
      setUser(u as Id<'users'> | null);
      setReady(true);
    })();
  }, []);

  const setUserId = (id: Id<'users'> | null) => {
    setUser(id);
    id ? AsyncStorage.setItem(K_USER, id) : AsyncStorage.removeItem(K_USER);
  };

  return <Ctx.Provider value={{ ready, userId, setUserId }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be inside SessionProvider');
  return s;
}

// Local calendar day, used as the Drop "day" key.
export function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
