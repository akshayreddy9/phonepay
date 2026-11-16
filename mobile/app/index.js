import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Text';
import { Sym } from '../components/ui';
import { Logo, Wordmark } from '../components/Logo';
import { useApp } from '../lib/store';
import { z } from '../lib/theme';

function Badge({ icon, color, label, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(4) }}>
      <Sym name={icon} fill size={22} color={color} />
      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
        {!!sub && <Text style={{ fontSize: 6.5, color: '#8A8A8A' }}>{sub}</Text>}
      </View>
    </View>
  );
}

// Splash: round purple mark and name, security badges at the bottom.
export default function Splash() {
  const { booted, user, accounts } = useApp();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, [fade]);

  useEffect(() => {
    if (!booted) return undefined;
    const t = setTimeout(() => {
      if (!user) router.replace('/welcome');
      else if (!user.profileComplete) router.replace('/setup-profile');
      else if (!accounts.length) router.replace('/link-bank');
      else router.replace('/home');
    }, 1100);
    return () => clearTimeout(t);
  }, [booted, user, accounts.length]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
        <Logo size={92} />
        <Wordmark size={38} style={{ marginTop: z(10) }} />
      </Animated.View>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: z(22), paddingBottom: z(48), opacity: fade }}>
        <Badge icon="check_circle" color="#2E9E5B" label="PCI DSS" sub="COMPLIANT" />
        <View style={{ width: z(46), height: z(50), backgroundColor: '#1E8E3E', borderRadius: z(8), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>100%</Text>
          <Text style={{ color: '#fff', fontSize: 7, fontWeight: '700' }}>SECURED</Text>
        </View>
        <Badge icon="verified" color="#2E9E5B" label="ISO 27001" sub="CERTIFIED" />
      </Animated.View>
    </View>
  );
}
