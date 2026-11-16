import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Download a published over-the-air update and restart into it, so screen changes
// reach the installed APK without a reinstall. Runs on launch and when the app returns
// to the foreground; does nothing in development or the web preview.
async function applyUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) await Updates.reloadAsync();
  } catch {
    // Offline or update server unreachable: keep running the current version.
  }
}

export function useOtaUpdates() {
  useEffect(() => {
    applyUpdate();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') applyUpdate(); });
    return () => sub.remove();
  }, []);
}
