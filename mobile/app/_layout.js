import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import { FONTS } from '../components/Text';
import { SYMBOL_FONTS } from '../components/Sym';
import { useOtaUpdates } from '../lib/updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../lib/store';
import { Blocked, LockScreen, Maintenance, Snackbar, TopBanner } from '../components/overlays';

function Shell() {
  const { user, settings, blocked, locked } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="home" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="pin" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="history" options={{ animation: 'fade' }} />
      </Stack>
      {user && settings?.maintenanceMode && <Maintenance />}
      {user && blocked && <Blocked />}
      {user && locked && <LockScreen />}
      <TopBanner />
      <Snackbar />
    </View>
  );
}

// Browser preview: show the app inside a phone-sized frame.
function Frame({ children }) {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={{ flex: 1, backgroundColor: '#E8EAED', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '100%', maxWidth: 412, height: '100%', maxHeight: 900, backgroundColor: '#fff', overflow: 'hidden', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  useOtaUpdates();
  const [fontsLoaded, fontError] = useFonts({ ...FONTS, ...SYMBOL_FONTS });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  return (
    <Frame>
      <SafeAreaProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </Frame>
  );
}
