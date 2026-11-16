import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { Text } from '../components/Text';
import { Btn, Loading, Screen, Sym } from '../components/ui';
import { SuccessTick } from '../components/pay';
import { PoweredBy } from '../components/Logo';
import { Receipt, ReceiptHeader } from '../components/receipt';
import { get } from '../lib/api';
import { goHome, resetTo } from '../lib/nav';
import { inrShort } from '../lib/format';
import { C, z } from '../lib/theme';

// After the UPI PIN: success/failure animation, then the full receipt.
export default function Result() {
  const { txnId, rewardId } = useLocalSearchParams();
  const [t, setT] = useState(null);
  const [intro, setIntro] = useState(true);
  const player = useAudioPlayer(require('../assets/sounds/success.wav'));
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => { get(`/transactions/${txnId}`).then((r) => setT(r.transaction)).catch(() => goHome()); }, [txnId]);

  useEffect(() => {
    if (!t) return undefined;
    if (t.status === 'success') {
      try { player.seekTo(0); player.play(); } catch {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const timer = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setIntro(false)), 2000);
    return () => clearTimeout(timer);
  }, [t, player, fade]);

  const done = () => {
    const other = t?.counterparty?.user;
    if (t?.type === 'p2p' && other) { resetTo('/home'); router.push(`/chat/${other.id}`); } else goHome();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { done(); return true; });
    return () => sub.remove();
  });

  if (!t) return <Screen><Loading /></Screen>;
  const ok = t.status === 'success';
  const pending = t.status === 'pending';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <ReceiptHeader t={t} onBack={done} />
      <ScrollView contentContainerStyle={{ paddingTop: z(4), paddingBottom: z(20) }}>
        {!!rewardId && ok && (
          <Pressable onPress={() => router.push('/rewards')} style={{ marginHorizontal: z(16), marginBottom: z(14), flexDirection: 'row', alignItems: 'center', gap: z(14), padding: z(14), borderRadius: z(18), backgroundColor: '#FFF5D6' }}>
            <Text style={{ fontSize: 34 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: C.text, fontWeight: '700' }}>You won a cashback card!</Text>
              <Text style={{ fontSize: 13, color: C.muted, marginTop: z(2) }}>Tap to scratch and reveal your reward</Text>
            </View>
            <Sym name="chevron_right" size={24} color={C.text} />
          </Pressable>
        )}
        <Receipt t={t} />
        <View style={{ paddingHorizontal: z(16), marginTop: z(16) }}><Btn title="Done" onPress={done} /></View>
        <PoweredBy bank={t.fromAccount?.bankShort ? `${t.fromAccount.bankShort} BANK` : ''} style={{ marginTop: z(8) }} />
      </ScrollView>

      {intro && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ok ? C.okGreen : pending ? '#8A5A00' : '#B3261E', alignItems: 'center', justifyContent: 'center', opacity: fade, paddingHorizontal: z(24) }]}>
          <SuccessTick size={z(120)} failed={!ok && !pending} color={ok ? '#fff' : C.amber} ink={ok ? C.okGreen : '#fff'} />
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '700', marginTop: z(8) }}>{inrShort(t.amount)}</Text>
          <Text style={{ color: '#fff', fontSize: 19, marginTop: z(10), textAlign: 'center' }}>
            {ok ? (t.type === 'self' ? 'Transferred Successfully' : `Paid Successfully to ${t.counterparty?.name}`) : pending ? 'Payment Pending' : 'Payment Failed'}
          </Text>
          {!ok && !!t.failureReason && <Text style={{ color: '#FFDAD6', fontSize: 15, marginTop: z(8), textAlign: 'center' }}>{t.failureReason}</Text>}
        </Animated.View>
      )}
    </View>
  );
}
