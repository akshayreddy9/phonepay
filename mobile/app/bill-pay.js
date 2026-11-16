import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useLocalSearchParams } from 'expo-router';
import { AccountSheet } from '../components/pay';
import { Avatar, Btn, Header, Screen, s } from '../components/ui';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { startPayment } from '../lib/payment';
import { C } from '../lib/theme';
import { BILL_CATEGORIES, inr, shortDate } from '../lib/format';

const LABELS = { electricity: 'Consumer number', dth: 'Subscriber ID', broadband: 'Account number', water: 'Connection number', gas: 'LPG ID / Consumer number', fastag: 'Vehicle number', creditcard: 'Card number (last 4) + mobile', insurance: 'Policy number' };

export default function BillPay() {
  const { billerId, name, category, color } = useLocalSearchParams();
  const { accounts, requestPin } = useApp();
  const [consumerNo, setConsumerNo] = useState('');
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [accountId, setAccountId] = useState((accounts.find((a) => a.primary) || accounts[0])?.id);
  const cat = BILL_CATEGORIES.find((c) => c.key === category);

  const fetchBill = async () => {
    setLoading(true);
    setError('');
    try { setBill((await post('/bills/fetch', { billerId, consumerNo })).bill); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const pay = () => {
    setSheet(false);
    startPayment(requestPin, {
      account: accounts.find((a) => a.id === accountId),
      amount: bill.amount,
      to: { name },
      payload: { type: 'bill', billerId, consumerNo, note: `${cat?.label || 'Bill'} bill` },
    });
  };

  return (
    <Screen>
      <Header title={name} subtitle={cat?.label} />
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Avatar name={name} color={color || C.blue} size={64} icon={cat?.icon} />
        </View>
        <Text style={s.label}>{LABELS[category] || 'Consumer number'}</Text>
        <TextInput style={s.input} value={consumerNo} onChangeText={(t) => { setConsumerNo(t.toUpperCase()); setBill(null); }} autoCapitalize="characters" placeholder="Enter number" placeholderTextColor={C.faint} />
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>You can find this on your latest bill</Text>
        {!!error && <Text style={{ color: C.red, marginTop: 10 }}>{error}</Text>}

        {bill && (
          <View style={[s.card, { marginTop: 24, padding: 18 }]}>
            <Text style={{ fontSize: 13, color: C.muted }}>Bill details</Text>
            {[['Customer name', bill.customerName], ['Bill number', bill.billNo], ['Due date', shortDate(bill.dueDate)], [LABELS[category] || 'Consumer no.', bill.consumerNo]].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <Text style={{ color: C.muted }}>{k}</Text><Text style={{ color: C.text }}>{v}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 14 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: C.text }}>Amount due</Text>
              <Text style={{ fontSize: 24, color: C.text, fontWeight: '500' }}>{inr(bill.amount, { decimals: true })}</Text>
            </View>
          </View>
        )}
      </ScrollView>
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: C.line }}>
        {bill ? <Btn title={`Pay ${inr(bill.amount, { decimals: true })}`} onPress={() => setSheet(true)} />
          : <Btn title="Fetch bill" onPress={fetchBill} loading={loading} disabled={consumerNo.length < 5} />}
      </View>
      {bill && <AccountSheet visible={sheet} onClose={() => setSheet(false)} accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} amount={bill.amount} onPay={pay} />}
    </Screen>
  );
}
