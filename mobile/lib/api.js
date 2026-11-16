import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SERVER_KEY = 'pn_server_url';
const TOKEN_KEY = 'pn_token';

let baseUrl = '';
let token = null;
const errorListeners = new Set();

// In development the phone loads JS from the laptop, so the laptop's IP is known:
// the API server runs on the same machine on port 4002.
export function defaultServerUrl() {
  const online = Constants.expoConfig?.extra?.serverUrl;
  // Release builds (the APK) always use the online server.
  if (!__DEV__ && online) return online;
  if (Platform.OS === 'web') return `http://${window.location.hostname}:4002`;
  const host = (Constants.expoConfig?.hostUri || '').split(':')[0];
  if (host && !host.includes('exp.direct')) return `http://${host}:4002`;
  return online || 'http://192.168.1.8:4002';
}

// Loads the saved server address and session once; every request waits for it.
let initPromise = null;
export function initApi() {
  if (!initPromise) {
    initPromise = (async () => {
      const [savedUrl, savedToken] = await Promise.all([AsyncStorage.getItem(SERVER_KEY), AsyncStorage.getItem(TOKEN_KEY)]);
      baseUrl = savedUrl || defaultServerUrl();
      token = savedToken;
      return { baseUrl, token };
    })();
  }
  return initPromise;
}

export const getServerUrl = () => baseUrl;
export async function setServerUrl(url) {
  baseUrl = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(SERVER_KEY, baseUrl);
}

export const getToken = () => token;
export async function setToken(t) {
  token = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export function onApiError(fn) {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function api(method, path, body) {
  await initApi();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let res;
  try {
    res = await fetch(baseUrl + '/api' + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${baseUrl}. Check your Wi-Fi and server address.`, 'NETWORK', 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ApiError(data.error || 'Something went wrong', data.code, res.status);
    errorListeners.forEach((fn) => fn(err));
    throw err;
  }
  return data;
}

export const get = (p) => api('GET', p);
export const post = (p, b) => api('POST', p, b || {});
export const put = (p, b) => api('PUT', p, b || {});
export const del = (p) => api('DELETE', p);
