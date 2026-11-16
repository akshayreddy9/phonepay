import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router } from 'expo-router';
import { BankLogo, Btn, Empty, Header, MI, Screen, s } from '../components/ui';
import { useApp } from '../lib/store';
import { startPayment } from '../lib/payment';
import { C } from '../lib/theme';

function AccountPick({ title, accounts, value, onChange, exclude }) {
  return (
    <>
      <Text style={[s.label, { marginTop: 20 }]}>{title}</Text>
      {accounts.filter((a) => a.id !== exclude).map((a) => (
        <Pressable key={a.id} onPress={() => onChange(a.id)} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderColor: value === a.id ? C.blue : C.line, borderWidth: value === a.id ? 2 : 1 }]}>
          <BankLogo account={a} size={36} />
          <Text style={{ flex: 1, fontSize: 15, color: C.text }}>{a.bankName} ••{a.last4}</Text>
          <MI name={value === a.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={value === a.id ? C.blue : C.faint} />
        </Pressable>
      ))}
    </>
  );
}

export default function SelfTransfer() {
  const { accounts, requestPin } = useApp();
  const [from, setFrom] = useState(accounts[0]?.id);
  const [to, setTo] = useState(accounts[1]?.id);
  const [amount, setAmount] = useState('');

  if (accounts.length < 2) {
    return (
      <Screen>
        <Header title="Self transfer" />
        <Empty icon="bank-plus" title="Add another bank account" subtitle="Self transfer moves money between your own bank accounts. Link at least two accounts to use it."
          action={<Btn title="Add bank account" onPress={() => router.push({ pathname: '/link-bank', params: { from: 'settings' } })} style={{ marginTop: 24 }} />} />
      </Screen>
    );
  }

  const value = Number(amount || 0);
  const fromAcc = accounts.find((a) => a.id === from);
  const toAcc = accounts.find((a) => a.id === to);

  return (
    <Screen>
      <Header title="Self transfer" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        <AccountPick title="FROM" accounts={accounts} value={from} onChange={(id) => { setFrom(id); if (id === to) setTo(accounts.find((a) => a.id !== id)?.id); }} />
        <View style={{ alignItems: 'center', marginVertical: 4 }}><MI name="arrow-downward" size={24} color={C.blue} /></View>
        <AccountPick title="TO" accounts={accounts} value={to} onChange={setTo} exclude={from} />
        <Text style={s.label}>Amount</Text>
        <TextInput style={[s.input, { fontSize: 24 }]} value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="₹0" placeholderTextColor={C.faint} />
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Btn title="Transfer" disabled={!value || !from || !to || from === to}
          onPress={() => startPayment(requestPin, { account: fromAcc, amount: value, to: { name: `${toAcc.bankName} ••${toAcc.last4}` }, payload: { type: 'self', toAccountId: to } })} />
      </View>
    </Screen>
  );
}
