import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../lib/store';
import { C, shadow } from '../lib/theme';
import { Btn } from './ui';
import { Logo } from './Logo';

// Heads-up style notification that slides down from the top (incoming money, admin broadcasts, OTP SMS).
export function TopBanner() {
  const { banner, setBanner } = useApp();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-160)).current;
  useEffect(() => {
    Animated.spring(y, { toValue: banner ? 0 : -160, useNativeDriver: true, friction: 8 }).start();
  }, [banner, y]);
  return (
    <Animated.View pointerEvents={banner ? 'auto' : 'none'} style={[st.banner, { top: insets.top + 6, transform: [{ translateY: y }] }]}>
      <Pressable style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} onPress={() => { if (banner?.onPress) banner.onPress(); else router.push('/notifications'); setBanner(null); }}>
        <View style={st.bannerIcon}><MaterialCommunityIcons name={banner?.icon || 'bell-ring'} size={20} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: C.muted }}>{banner?.app || 'PhonePayy'} · now</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }} numberOfLines={1}>{banner?.title}</Text>
          {!!banner?.body && <Text style={{ fontSize: 14, color: C.muted }} numberOfLines={2}>{banner.body}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function Snackbar() {
  const { snack } = useApp();
  const insets = useSafeAreaInsets();
  if (!snack) return null;
  return (
    <View pointerEvents="none" style={[st.snack, { bottom: insets.bottom + 24 }]}>
      <Text style={{ color: '#fff', fontSize: 14 }}>{snack}</Text>
    </View>
  );
}

function FullScreen({ icon, color, title, message, children }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 50 }]}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: color + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <MaterialCommunityIcons name={icon} size={60} color={color} />
      </View>
      <Text style={{ fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 10 }}>{title}</Text>
      <Text style={{ fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22 }}>{message}</Text>
      <View style={{ marginTop: 32, alignSelf: 'stretch' }}>{children}</View>
    </View>
  );
}

export function Maintenance() {
  const { settings, refreshMe, refreshHome } = useApp();
  return (
    <FullScreen icon="wrench-clock" color={C.amber} title="We'll be back soon" message={settings?.maintenanceMessage || 'The app is under maintenance.'}>
      <Btn title="Try again" variant="outline" onPress={() => { refreshMe().catch(() => {}); refreshHome(); }} />
    </FullScreen>
  );
}

export function Blocked() {
  const { blocked, signOut } = useApp();
  return (
    <FullScreen icon="account-lock" color={C.red} title="Account blocked" message={blocked}>
      <Btn title="Contact support" variant="outline" onPress={() => router.push('/help')} style={{ marginBottom: 12 }} />
      <Btn title="Sign out" variant="text" onPress={() => signOut()} />
    </FullScreen>
  );
}

export function LockScreen() {
  const { setLocked } = useApp();
  const unlock = async () => {
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) return setLocked(false);
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PhonePayy' });
    if (r.success) setLocked(false);
  };
  useEffect(() => { unlock(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 60 }]}>
      <Logo size={72} />
      <Text style={{ fontSize: 20, marginTop: 24, color: C.text }}>PhonePayy is locked</Text>
      <Text style={{ fontSize: 14, marginTop: 6, color: C.muted }}>Use your screen lock to unlock</Text>
      <Btn title="Unlock" onPress={unlock} style={{ marginTop: 32, width: 200 }} />
    </View>
  );
}

const st = StyleSheet.create({
  banner: { position: 'absolute', left: 10, right: 10, backgroundColor: '#fff', borderRadius: 20, padding: 14, zIndex: 100, ...shadow, elevation: 8, shadowOpacity: 0.18 },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  snack: { position: 'absolute', left: 16, right: 16, backgroundColor: '#323232', borderRadius: 8, padding: 14, zIndex: 100 },
});
