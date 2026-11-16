import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { BankLogo, Btn, Header, MCI, MI, Screen, s } from '../components/ui';
import { get, post } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

export default function LinkBank() {
  const { from } = useLocalSearchParams();
  const { user, accounts } = useApp();
  const [banks, setBanks] = useState([]);
  const [q, setQ] = useState('');
  const [step, setStep] = useState('pick');
  const [bank, setBank] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => { get('/config').then((r) => setBanks(r.banks)).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (step !== 'verifying') return;
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })).start();
  }, [step, spin]);

  const choose = async (b) => {
    setBank(b);
    setStep('verifying');
    setError('');
    try {
      const [r] = await Promise.all([post('/accounts/discover', { bankId: b.id }), new Promise((res) => setTimeout(res, 2600))]);
      setAccount(r.account);
      setStep('found');
    } catch (e) {
      setError(e.message);
      setStep('pick');
    }
  };

  const proceed = () => {
    const next = from === 'settings' ? 'back' : 'home';
    if (account.hasPin) {
      router.push({ pathname: '/set-pin', params: { accountId: account.id, mode: 'verify', bankName: account.bankName, last4: account.last4, pinLength: account.pinLength, next } });
    } else {
      router.push({ pathname: '/set-pin', params: { accountId: account.id, mode: 'link', bankName: account.bankName, last4: account.last4, next } });
    }
  };

  if (step === 'verifying') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: C.blueSoft, borderTopColor: C.blue, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
            <BankLogo bank={bank} size={64} />
          </View>
          <Text style={{ fontSize: 22, color: C.text, marginTop: 32, textAlign: 'center' }}>Verifying your mobile number</Text>
          <Text style={{ fontSize: 15, color: C.muted, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
            Sending an SMS from +91 {user?.phone} to {bank?.name} to find your accounts. Standard SMS charges may apply.
          </Text>
        </View>
      </Screen>
    );
  }

  if (step === 'found') {
    return (
      <Screen>
        <Header title="Account found" onBack={() => setStep('pick')} />
        <View style={{ flex: 1, padding: 24 }}>
          <Text style={{ fontSize: 15, color: C.muted, marginBottom: 20 }}>We found this account linked to +91 {user?.phone}</Text>
          <View style={[s.card, { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, borderColor: C.blue, borderWidth: 2 }]}>
            <BankLogo account={account} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, color: C.text }}>{account.bankName}</Text>
              <Text style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>{account.type} account ••{account.last4}</Text>
            </View>
            <MI name="check-circle" size={26} color={C.blue} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, backgroundColor: C.surface, padding: 14, borderRadius: 12 }}>
            <MCI name="shield-check" size={22} color={C.green} />
            <Text style={{ flex: 1, color: C.muted, fontSize: 13, lineHeight: 19 }}>
              {account.hasPin ? 'Enter your existing UPI PIN to link this account.' : "You'll set a UPI PIN for this account using your debit card details."}
            </Text>
          </View>
        </View>
        <View style={{ padding: 24 }}><Btn title="Continue" onPress={proceed} /></View>
      </Screen>
    );
  }

  const list = banks.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()) || b.short.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Header title="Add bank account" back={from === 'settings' || accounts.length > 0} />
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 15, color: C.muted, marginBottom: 14 }}>Select the bank where your mobile number is registered</Text>
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', borderRadius: 28, backgroundColor: C.surface, borderWidth: 0, height: 48 }]}>
          <MI name="search" size={22} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search for your bank" placeholderTextColor={C.faint} style={{ flex: 1, marginLeft: 10, fontSize: 16 }} />
        </View>
        {!!error && <Text style={{ color: C.red, marginTop: 10 }}>{error}</Text>}
      </View>
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => choose(item)} android_ripple={{ color: '#eee' }} style={[s.row, { paddingVertical: 12 }]}>
            <BankLogo bank={item} size={44} />
            <Text style={{ flex: 1, fontSize: 16, color: C.text }}>{item.name}</Text>
            <MI name="chevron-right" size={22} color={C.faint} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
