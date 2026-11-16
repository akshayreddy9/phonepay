import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Text';
import { BankLogo, goBack, Screen, Skeleton, Sym } from '../components/ui';
import { PoweredBy } from '../components/Logo';
import { groupByMonth, MonthHeader, TxnRow } from '../components/history';
import { get, post } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { inrShort, monthKey } from '../lib/format';
import { C, z } from '../lib/theme';

export function exportStatement(list, name) {
  const rows = list.map((t) => [new Date(t.createdAt).toLocaleString('en-IN'), t.direction === 'out' ? 'Paid to' : 'Received from', t.counterparty?.name, t.amount, t.status, t.category, t.upiRef].join(', '));
  return Share.share({ title: 'Payment statement', message: `Payment statement for ${name}\n\nDate, Type, Name, Amount, Status, Category, UPI Ref\n${rows.join('\n')}` });
}

function AccountCard({ children, onPress, width = 150 }) {
  return (
    <Pressable onPress={onPress} style={{ width: z(width), minHeight: z(124), backgroundColor: '#fff', borderRadius: z(18), padding: z(14), marginRight: z(12) }}>
      {children}
    </Pressable>
  );
}

export default function Balance() {
  const { user, accounts, settings, requestPin, toast } = useApp();
  const [txns, setTxns] = useState(null);
  const [balances, setBalances] = useState({});
  const y = useRef(new Animated.Value(0)).current;

  useLive(() => { get('/transactions').then((r) => setTxns(r.transactions)).catch((e) => toast(e.message)); }, []);

  const check = (a) => requestPin({
    account: a, amount: null, processingText: 'Fetching balance',
    submit: (pin) => post(`/accounts/${a.id}/balance`, { pin }),
    onDone: (r) => { setBalances((b) => ({ ...b, [a.id]: r.account.balance })); router.back(); },
  });

  const bigOpacity = y.interpolate({ inputRange: [0, z(40)], outputRange: [1, 0], extrapolate: 'clamp' });
  const smallOpacity = y.interpolate({ inputRange: [z(30), z(60)], outputRange: [0, 1], extrapolate: 'clamp' });
  const groups = txns ? groupByMonth(txns) : [];

  return (
    <Screen bg={C.page}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: z(60), paddingHorizontal: z(12), gap: z(12) }}>
        <Pressable hitSlop={10} onPress={goBack}><Sym name="arrow_back" size={28} color="#1D1D1D" /></Pressable>
        <Animated.Text style={{ opacity: smallOpacity, fontSize: z(20), fontFamily: 'Inter-SemiBold', color: '#1D1D1D' }}>Balance & History</Animated.Text>
      </View>
      <Animated.ScrollView scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })} contentContainerStyle={{ paddingBottom: z(10) }}>
        <Animated.Text style={{ opacity: bigOpacity, fontSize: z(36), fontFamily: 'Inter-Bold', color: '#1D1D1D', paddingHorizontal: z(16), letterSpacing: -0.5 }}>Balance & History</Animated.Text>

        {!txns ? (
          <View style={{ padding: z(16), gap: z(14) }}>
            <Skeleton style={{ height: z(40), width: '70%' }} />
            <View style={{ flexDirection: 'row', gap: z(12) }}><Skeleton style={{ height: z(120), flex: 1 }} /><Skeleton style={{ height: z(120), flex: 1 }} /></View>
            <Skeleton style={{ height: z(60) }} />
            <Skeleton style={{ height: z(260) }} />
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 21, fontWeight: '700', color: '#1D1D1D', marginTop: z(20), marginHorizontal: z(18), marginBottom: z(12) }}>Accounts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: z(16) }}>
              {accounts.map((a) => (
                <AccountCard key={a.id} width={170} onPress={() => router.push(`/bank/${a.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(6) }}>
                    <Text style={{ fontSize: 18, color: '#1D1D1D', fontWeight: '500' }} numberOfLines={1}>{a.bankShort === 'SBI' ? 'SBI' : a.bankName}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B6B6B', marginTop: z(4) }}>Saving A/c: {a.last4}</Text>
                  <View style={{ flex: 1 }} />
                  {balances[a.id] != null ? (
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1D1D1D' }}>{inrShort(balances[a.id])}</Text>
                  ) : (
                    <Pressable onPress={() => check(a)} style={{ alignSelf: 'flex-start', backgroundColor: '#E5EDF8', borderRadius: z(8), paddingHorizontal: z(14), paddingVertical: z(8) }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#2B3A55' }}>Check Balance</Text>
                    </Pressable>
                  )}
                  <View style={{ position: 'absolute', right: z(12), top: z(16) }}><BankLogo account={a} size={14} /></View>
                </AccountCard>
              ))}
              {settings?.features?.upiLite !== false && (
                <AccountCard onPress={() => router.push('/upi-lite')}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, color: '#1D1D1D', fontWeight: '500' }}>UPI Lite</Text>
                    <Sym name="bolt" fill size={20} color="#F5B400" />
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 19, color: '#1D1D1D' }}>{inrShort(user?.upiLite || 0)}</Text>
                </AccountCard>
              )}
              <AccountCard onPress={() => toast('Postpaid is not part of this demo')}>
                <Text style={{ fontSize: 18, color: '#1D1D1D', fontWeight: '500' }}>Activate{'\n'}Postpaid</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontSize: 13, color: C.link, fontWeight: '600' }}>Get ₹1 Lakh credit →</Text>
              </AccountCard>
            </ScrollView>

            <Text style={{ fontSize: 21, fontWeight: '700', color: '#1D1D1D', marginTop: z(24), marginHorizontal: z(18), marginBottom: z(12) }}>Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: z(16) }}>
              <Pressable onPress={() => toast(`You have ${user?.goldCoins || 0} Gold Coins`)} style={{ width: z(220), height: z(80), backgroundColor: '#fff', borderRadius: z(18), padding: z(16), marginRight: z(12), flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, color: '#1D1D1D', fontWeight: '500' }}>Gold Coins</Text>
                  <Text style={{ fontSize: 16, color: '#3A3A3A', marginTop: z(4) }}>{user?.goldCoins || 0}</Text>
                </View>
                <View style={{ width: z(40), height: z(40), borderRadius: z(20), backgroundColor: '#F5B400', borderWidth: 3, borderColor: '#FFD966' }} />
              </Pressable>
              <Pressable onPress={() => toast('Digital gold is not part of this demo')} style={{ width: z(160), height: z(80), backgroundColor: '#fff', borderRadius: z(18), padding: z(16), flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 18, color: '#1D1D1D', fontWeight: '500' }}>Save in{'\n'}Gold</Text>
                <Text style={{ fontSize: 30 }}>🪙</Text>
              </Pressable>
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: z(28), marginHorizontal: z(18), marginBottom: z(12), gap: z(18) }}>
              <Text style={{ flex: 1, fontSize: 21, fontWeight: '700', color: '#1D1D1D' }}>Payment History</Text>
              <Pressable hitSlop={8} onPress={() => router.push({ pathname: '/history', params: { search: '1' } })}><Sym name="search" size={26} color="#1D1D1D" /></Pressable>
              <Pressable hitSlop={8} onPress={() => router.push({ pathname: '/history', params: { filter: '1' } })}><Sym name="tune" size={26} color="#1D1D1D" /></Pressable>
              <Pressable hitSlop={8} onPress={() => exportStatement(txns, user?.name)}><Sym name="download" size={26} color="#1D1D1D" /></Pressable>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: z(18), marginHorizontal: z(14), overflow: 'hidden' }}>
              {groups.length === 0 && <Text style={{ padding: z(24), textAlign: 'center', color: C.muted }}>No payments yet</Text>}
              {groups.slice(0, 3).map((g, i) => (
                <View key={g.key}>
                  <MonthHeader month={g.key} total={g.total} rounded={i === 0} onPress={() => router.push({ pathname: '/history', params: { month: g.key } })} />
                  {g.items.slice(0, 6).map((t) => <TxnRow key={t.id} t={t} />)}
                  {g.items.length > 6 && (
                    <Pressable onPress={() => router.push({ pathname: '/history', params: { month: g.key } })} style={{ padding: z(14), alignItems: 'center' }}>
                      <Text style={{ color: C.link, fontWeight: '600' }}>View all {g.items.length} payments</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              {groups.length > 3 && (
                <Pressable onPress={() => router.push('/history')} style={{ padding: z(16), alignItems: 'center', borderTopWidth: 1, borderColor: '#F0F0F0' }}>
                  <Text style={{ color: C.link, fontWeight: '600', fontSize: 15 }}>View older payments ({monthKey(groups[3].items[0].createdAt)} & before)</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
        <PoweredBy style={{ marginTop: z(8) }} />
      </Animated.ScrollView>
    </Screen>
  );
}
