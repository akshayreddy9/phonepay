import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { AccountSheet } from '../components/pay';
import { Btn, Header, MCI, Screen, s } from '../components/ui';
import { useApp } from '../lib/store';
import { startPayment } from '../lib/payment';
import { C } from '../lib/theme';

export default function BankTransfer() {
  const { accounts, requestPin, settings } = useApp();
  const [accNo, setAccNo] = useState('');
  const [accNo2, setAccNo2] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [accountId, setAccountId] = useState((accounts.find((a) => a.primary) || accounts[0])?.id);

  const mismatch = accNo2.length > 0 && accNo !== accNo2;
  const ifscOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  const value = Number(amount || 0);
  const valid = accNo.length >= 9 && accNo === accNo2 && ifscOk && name.trim().length > 1 && value > 0 && value <= (settings?.perTxLimit || 1e9);

  const pay = () => {
    setSheet(false);
    startPayment(requestPin, {
      account: accounts.find((a) => a.id === accountId),
      amount: value,
      to: { name: name.trim(), sub: `A/c ••${accNo.slice(-4)}` },
      payload: { type: 'bank_transfer', accountNo: accNo, ifsc, name: name.trim(), note },
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title="Bank transfer" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: C.blueSoft, padding: 14, borderRadius: 12 }}>
            <MCI name="bank-transfer" size={22} color={C.blueDark} />
            <Text style={{ flex: 1, color: C.text, fontSize: 13, lineHeight: 19 }}>Send money to any bank account using account number and IFSC. Money reaches instantly via UPI.</Text>
          </View>
          <Text style={s.label}>Account number</Text>
          <TextInput style={s.input} value={accNo} onChangeText={(t) => setAccNo(t.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" secureTextEntry placeholder="Enter account number" placeholderTextColor={C.faint} />
          <Text style={s.label}>Re-enter account number</Text>
          <TextInput style={[s.input, mismatch && { borderColor: C.red }]} value={accNo2} onChangeText={(t) => setAccNo2(t.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" placeholder="Confirm account number" placeholderTextColor={C.faint} />
          {mismatch && <Text style={{ color: C.red, marginTop: 4, fontSize: 12 }}>Account numbers don't match</Text>}
          <Text style={s.label}>IFSC</Text>
          <TextInput style={[s.input, ifsc.length === 11 && !ifscOk && { borderColor: C.red }]} value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" placeholder="e.g. SBIN0001234" placeholderTextColor={C.faint} />
          <Text style={s.label}>Account holder's name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Name as per bank records" placeholderTextColor={C.faint} autoCapitalize="words" />
          <Text style={s.label}>Amount (₹)</Text>
          <TextInput style={[s.input, { fontSize: 22 }]} value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.faint} />
          <Text style={s.label}>Note (optional)</Text>
          <TextInput style={s.input} value={note} onChangeText={setNote} maxLength={50} placeholder="What's this for?" placeholderTextColor={C.faint} />
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderColor: C.line }}>
          <Btn title="Proceed to pay" disabled={!valid || !accounts.length} onPress={() => setSheet(true)} />
        </View>
      </KeyboardAvoidingView>
      <AccountSheet visible={sheet} onClose={() => setSheet(false)} accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} amount={value} onPay={pay} />
    </Screen>
  );
}
