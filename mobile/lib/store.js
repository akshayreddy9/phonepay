import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { router } from 'expo-router';
import { api, get, getServerUrl, getToken, initApi, onApiError, post, setToken } from './api';

const AppCtx = createContext(null);
const LOCK_KEY = 'pn_app_lock';

export function AppProvider({ children }) {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [home, setHome] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [banner, setBanner] = useState(null);
  const [snack, setSnack] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const pinRequest = useRef(null);
  const subscribers = useRef(new Set());
  const bannerTimer = useRef(null);
  const snackTimer = useRef(null);

  const applyMe = useCallback((me) => {
    setUser(me.user);
    setAccounts(me.accounts);
    if (me.settings) setSettings(me.settings);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getToken()) return null;
    const me = await get('/me');
    applyMe(me);
    return me;
  }, [applyMe]);

  const refreshHome = useCallback(async () => {
    if (!getToken()) return;
    try {
      const h = await get('/home');
      setHome(h);
      setSettings(h.settings);
    } catch {}
  }, []);

  const showBanner = useCallback((b) => {
    setBanner(b);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), b.duration || 4500);
  }, []);

  const toast = useCallback((message) => {
    setSnack(message);
    clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), 2600);
  }, []);

  const signOut = useCallback(async (silent) => {
    if (!silent) post('/auth/logout').catch(() => {});
    await setToken(null);
    setUser(null);
    setAccounts([]);
    setHome(null);
    setBlocked(null);
    router.replace('/welcome');
  }, []);

  const signIn = useCallback(async (token, u) => {
    await setToken(token);
    setUser(u);
    setBlocked(null);
    await refreshMe();
  }, [refreshMe]);

  // Boot: load saved server + session.
  useEffect(() => {
    (async () => {
      await initApi();
      const lock = (await AsyncStorage.getItem(LOCK_KEY)) === '1';
      setLockEnabled(lock);
      try {
        const cfg = await get('/config');
        setSettings(cfg.settings);
      } catch {}
      if (getToken()) {
        try {
          await refreshMe();
          await refreshHome();
          if (lock) setLocked(true);
        } catch (e) {
          if (e.code === 'UNAUTHORIZED') await setToken(null);
        }
      }
      setBooted(true);
    })();
  }, [refreshMe, refreshHome]);

  // Global API error handling.
  useEffect(() => onApiError((err) => {
    if (err.code === 'UNAUTHORIZED' && getToken()) signOut(true);
    if (err.code === 'BLOCKED') setBlocked(err.message);
    if (err.code === 'MAINTENANCE') setSettings((s) => ({ ...(s || {}), maintenanceMode: true, maintenanceMessage: err.message }));
  }), [signOut]);

  // Real-time channel: admin panel changes and incoming money arrive here.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !getToken()) return undefined;
    const socket = io(getServerUrl(), { auth: { token: getToken() }, transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('settings', (s) => setSettings(s));
    socket.on('refresh', (evt) => {
      refreshMe().catch(() => {});
      refreshHome();
      subscribers.current.forEach((fn) => fn(evt?.scope));
    });
    socket.on('notify', (n) => {
      showBanner({ title: n.title, body: n.body });
      refreshHome();
    });
    socket.on('blocked', (m) => setBlocked(m.message));
    socket.on('logout', (m) => {
      signOut(true);
      setTimeout(() => toast(m?.reason || 'You were signed out'), 400);
    });
    return () => socket.disconnect();
  }, [userId, refreshMe, refreshHome, showBanner, signOut, toast]);

  const subscribe = useCallback((fn) => {
    subscribers.current.add(fn);
    return () => subscribers.current.delete(fn);
  }, []);

  const requestPin = useCallback((req) => {
    pinRequest.current = req;
    router.push('/pin');
  }, []);

  const setAppLock = useCallback(async (on) => {
    setLockEnabled(on);
    await AsyncStorage.setItem(LOCK_KEY, on ? '1' : '0');
  }, []);

  const value = {
    booted, user, accounts, settings, home, blocked, banner, snack, connected, lockEnabled, locked,
    setLocked, setAppLock, setBanner, setSettings, applyMe, refreshMe, refreshHome, signIn, signOut,
    showBanner, toast, subscribe, requestPin, pinRequest, api,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  return useContext(AppCtx);
}

// Re-run `load` whenever the server says something changed (admin edits, incoming payments).
export function useLive(load, deps = []) {
  const { subscribe } = useApp();
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    ref.current();
    return subscribe(() => ref.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useFeature(key) {
  const { settings } = useApp();
  return !settings || !settings.features || settings.features[key] !== false;
}
