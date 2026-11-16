import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/Text';
import { Avatar, BankLogo, Header, Screen, Sym } from '../components/ui';
import { PoweredBy } from '../components/Logo';
import { TxnAvatar } from '../components/history';
import { get } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C, z } from '../lib/theme';

function Option({ icon, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), paddingVertical: z(16), borderBottomWidth: 1, borderColor: '#F0F0F0' }}>
      <View style={{ width: z(48), height: z(48), borderRadius: z(24), backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Sym name={icon} size={26} color={C.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16.5, fontWeight: '600', color: '#1D1D1D' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: '#6B6B6B', marginTop: z(3) }}>{sub}</Text>
      </View>
      <Sym name="chevron_right" size={24} color="#3A3A3A" />
    </Pressable>
  );
}

// "To Bank & Self A/c": pay to account number + IFSC, to UPI ID, or between own accounts.
export default function Transfer() {
  const { accounts } = useApp();
  const [recent, setRecent] = useState([]);
  useLive(() => {
    get('/transactions').then((r) => setRecent(r.transactions.filter((t) => t.direction === 'out' && ['bank_transfer', 'self'].includes(t.type)).slice(0, 5))).catch(() => {});
  }, []);

  return (
    <Screen bg={C.page}>
      <Header title="To Bank & Self A/c" />
      <ScrollView contentContainerStyle={{ paddingBottom: z(16) }}>
        <View style={{ backgroundColor: '#fff', borderRadius: z(20), marginHorizontal: z(14), paddingHorizontal: z(18) }}>
          <Option icon="account_balance" title="Enter Bank A/c Details" sub="Transfer to any bank account using A/c no. & IFSC" onPress={() => router.push('/bank-transfer')} />
          <Option icon="alternate_email" title="Enter UPI ID or Number" sub="Pay to any UPI ID or UPI number" onPress={() => router.push({ pathname: '/search', params: { mode: 'upi' } })} />
          <Option icon="sync_alt" title="To Self Account" sub="Transfer between your own bank accounts" onPress={() => router.push('/self-transfer')} />
        </View>

        <Text style={{ fontSize: 19, fontWeight: '700', color: '#1D1D1D', marginTop: z(22), marginHorizontal: z(18), marginBottom: z(10) }}>Your Accounts</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: z(20), marginHorizontal: z(14), paddingHorizontal: z(18) }}>
          {accounts.map((a, i) => (
            <Pressable key={a.id} onPress={() => router.push(`/bank/${a.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), paddingVertical: z(14), borderBottomWidth: i === accounts.length - 1 ? 0 : 1, borderColor: '#F0F0F0' }}>
              <BankLogo account={a} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: '#1D1D1D', fontWeight: '500' }}>{a.bankName} - {a.last4}</Text>
                <Text style={{ fontSize: 13, color: '#6B6B6B', marginTop: z(2) }}>{a.type} account{a.primary ? ' · Primary' : ''}</Text>
              </View>
              <Sym name="chevron_right" size={24} color="#3A3A3A" />
            </Pressable>
          ))}
        </View>

        {recent.length > 0 && (
          <>
            <Text style={{ fontSize: 19, fontWeight: '700', color: '#1D1D1D', marginTop: z(22), marginHorizontal: z(18), marginBottom: z(10) }}>Recent Transfers</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: z(20), marginHorizontal: z(14), paddingHorizontal: z(18) }}>
              {recent.map((t) => (
                <Pressable key={t.id} onPress={() => router.push(`/txn/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), paddingVertical: z(14) }}>
                  {t.counterparty?.user ? <Avatar user={t.counterparty.user} size={40} /> : <TxnAvatar t={t} size={40} />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15.5, color: '#1D1D1D' }} numberOfLines={1}>{t.counterparty?.name}</Text>
                    <Text style={{ fontSize: 13, color: '#6B6B6B', marginTop: z(2) }} numberOfLines={1}>{t.counterparty?.handle}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1D1D1D' }}>₹{t.amount.toLocaleString('en-IN')}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <PoweredBy style={{ marginTop: z(14) }} />
      </ScrollView>
    </Screen>
  );
}
