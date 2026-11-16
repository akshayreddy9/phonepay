import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Sym } from './ui';
import { useApp } from '../lib/store';
import { C, shadow, z } from '../lib/theme';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home', path: '/home' },
  { key: 'search', label: 'Search', icon: 'search', path: '/search?mode=all' },
  { key: 'scan' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications', path: '/notifications' },
  { key: 'history', label: 'History', icon: 'history', fillIcon: 'schedule', path: '/history' },
];

// Bottom bar: Home · Search · (purple Scan button) · Alerts · History.
export function BottomNav({ active }) {
  const insets = useSafeAreaInsets();
  const { home, settings } = useApp();
  const go = (t) => {
    if (t.key === active) return;
    if (t.key === 'home') router.replace('/home');
    else if (t.key === 'history') router.replace('/history');
    else router.push(t.path);
  };
  return (
    <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#EFEFEF', paddingBottom: insets.bottom, flexDirection: 'row', height: z(76) + insets.bottom }}>
      {TABS.map((t) => {
        if (t.key === 'scan') {
          return (
            <View key="scan" style={{ flex: 1, alignItems: 'center' }}>
              <Pressable onPress={() => (settings?.features?.scan === false ? null : router.push('/scan'))}
                style={({ pressed }) => [{ marginTop: z(6), width: z(64), height: z(64), borderRadius: z(32), backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 4 }, pressed && { opacity: 0.85 }]}>
                <Sym name="qr_code_scanner" size={32} color="#fff" />
              </Pressable>
            </View>
          );
        }
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => go(t)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View>
              <Sym name={on && t.fillIcon ? t.fillIcon : t.icon} fill={on} size={28} color={on ? '#1D1D1D' : '#4A4A4A'} />
              {t.key === 'alerts' && !!home?.unreadNotifications && <View style={{ position: 'absolute', right: -z(2), top: z(1), width: z(9), height: z(9), borderRadius: z(5), backgroundColor: C.red }} />}
            </View>
            <Text style={{ fontSize: 14, marginTop: z(3), color: on ? '#1D1D1D' : '#5A5A5A', fontWeight: on ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
