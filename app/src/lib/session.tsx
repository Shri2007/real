import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Id } from '../../convex/_generated/dataModel';

// Name-only "login": we remember the user's Convex userId + current groupId on the device.
type Session = {
  ready: boolean;
  userId: Id<'users'> | null;
  groupId: Id<'groups'> | null;
  setUserId: (id: Id<'users'> | null) => void;
  setGroupId: (id: Id<'groups'> | null) => void;
};

const Ctx = createContext<Session | null>(null);
const K_USER = 'openmic.userId';
const K_GROUP = 'openmic.groupId';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUser] = useState<Id<'users'> | null>(null);
  const [groupId, setGroup] = useState<Id<'groups'> | null>(null);

  useEffect(() => {
    (async () => {
      const [u, g] = await Promise.all([AsyncStorage.getItem(K_USER), AsyncStorage.getItem(K_GROUP)]);
      setUser(u as Id<'users'> | null);
      setGroup(g as Id<'groups'> | null);
      setReady(true);
    })();
  }, []);

  const setUserId = (id: Id<'users'> | null) => {
    setUser(id);
    id ? AsyncStorage.setItem(K_USER, id) : AsyncStorage.removeItem(K_USER);
  };
  const setGroupId = (id: Id<'groups'> | null) => {
    setGroup(id);
    id ? AsyncStorage.setItem(K_GROUP, id) : AsyncStorage.removeItem(K_GROUP);
  };

  return <Ctx.Provider value={{ ready, userId, groupId, setUserId, setGroupId }}>{children}</Ctx.Provider>;
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
