import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { BankLogo, Btn, Header, Screen, Sym } from '../components/ui';
import { PoweredBy } from '../components/Logo';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { inrShort } from '../lib/format';
import { C, z } from '../lib/theme';

// UPI Lite: keep up to ₹5,000 in a small wallet; add money from or withdraw to the bank.
export default function UpiLite() {
  const { user, accounts, requestPin, refreshMe, toast } = useApp();
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const account = accounts.find((a) => a.primary) || accounts[0];
  const lite = user?.upiLite || 0;
  const value = Number(amount || 0);

  const submit = () => {
    if (!account) return toast('Link a bank account first');
    requestPin({
      account, amount: value, to: { name: mode === 'add' ? 'UPI Lite' : `${account.bankName} - ${account.last4}` },
      processingText: mode === 'add' ? 'Adding money to UPI Lite' : 'Withdrawing from UPI Lite',
      submit: (pin) => post('/upi-lite', { accountId: account.id, amount: value, pin, action: mode === 'add' ? 'add' : 'withdraw' }),
      onDone: async (r) => {
        await refreshMe().catch(() => {});
        router.back();
        setAmount('');
        toast(mode === 'add' ? `${inrShort(value)} added to UPI Lite` : `${inrShort(value)} moved to your bank`);
        if (r?.transaction) router.push(`/txn/${r.transaction.id}`);
      },
    });
    return null;
  };

  return (
    <Screen bg={C.page}>
      <Header title="UPI Lite" />
      <ScrollView contentContainerStyle={{ paddingBottom: z(16) }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#00B5F0', '#0B3D86']} style={{ marginHorizontal: z(14), borderRadius: z(20), padding: z(20) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
            <Sym name="bolt" fill size={24} color="#FFD54A" />
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>UPI Lite Balance</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '700', marginTop: z(10) }}>{inrShort(lite)}</Text>
          <Text style={{ color: '#D7ECFF', fontSize: 13, marginTop: z(6) }}>Pay up to ₹1,000 instantly without UPI PIN · Max balance ₹5,000</Text>
        </LinearGradient>

        <View style={{ flexDirection: 'row', marginHorizontal: z(14), marginTop: z(16), backgroundColor: '#E9ECF1', borderRadius: z(24), padding: z(4) }}>
          {[['add', 'Add Money'], ['withdraw', 'Withdraw']].map(([k, l]) => (
            <Pressable key={k} onPress={() => setMode(k)} style={{ flex: 1, height: z(40), borderRadius: z(20), backgroundColor: mode === k ? '#fff' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: mode === k ? C.navy : '#5A5A5A' }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: z(20), marginHorizontal: z(14), marginTop: z(14), padding: z(18) }}>
          <Text style={{ fontSize: 14, color: '#6B6B6B' }}>Enter amount</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderColor: C.navy, marginTop: z(6) }}>
            <Text style={{ fontSize: 30, color: '#1D1D1D' }}>₹</Text>
            <TextInput value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0" placeholderTextColor="#BBB"
              style={{ flex: 1, fontSize: 30, color: '#1D1D1D', paddingVertical: z(6), marginLeft: z(4) }} />
          </View>
          {mode === 'add' && (
            <View style={{ flexDirection: 'row', gap: z(8), marginTop: z(14) }}>
              {[500, 1000, 2000].map((v) => (
                <Pressable key={v} onPress={() => setAmount(String(v))} style={{ borderWidth: 1, borderColor: '#D6DDE8', borderRadius: z(16), paddingHorizontal: z(12), paddingVertical: z(6) }}>
                  <Text style={{ fontSize: 14, color: '#3A3A3A' }}>+ ₹{v.toLocaleString('en-IN')}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!account && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(10), marginTop: z(18) }}>
              <BankLogo account={account} size={28} />
              <Text style={{ flex: 1, fontSize: 15, color: '#3A3A3A' }}>{mode === 'add' ? 'From' : 'To'} {account.bankName} - {account.last4}</Text>
            </View>
          )}
        </View>
        <View style={{ padding: z(14) }}>
          <Btn title={mode === 'add' ? `Add ${value ? inrShort(value) : 'Money'}` : `Withdraw ${value ? inrShort(value) : ''}`} onPress={submit}
            disabled={!value || (mode === 'withdraw' && value > lite) || (mode === 'add' && lite + value > 5000)} />
          {mode === 'add' && lite + value > 5000 && <Text style={{ color: C.red, marginTop: z(8), textAlign: 'center' }}>UPI Lite balance can be at most ₹5,000</Text>}
          {mode === 'withdraw' && value > lite && <Text style={{ color: C.red, marginTop: z(8), textAlign: 'center' }}>You only have {inrShort(lite)} in UPI Lite</Text>}
        </View>
        <PoweredBy />
      </ScrollView>
    </Screen>
  );
}
