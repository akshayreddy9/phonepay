import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { BankLogo, Btn, Header, Screen, s } from '../components/ui';
import { Keypad, PinDots } from '../components/pay';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { goHome } from '../lib/nav';

// Modes: link (new account: card + new PIN), verify (existing PIN to link), change (old → new), reset (card → new).
export default function SetPin() {
  const { accountId, mode = 'link', bankName, last4, next, pinLength } = useLocalSearchParams();
  const { applyMe, accounts, toast } = useApp();
  const needsCard = mode === 'link' || mode === 'reset';
  const [step, setStep] = useState(needsCard ? 'card' : mode === 'verify' ? 'verify' : 'old');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pinLen, setPinLen] = useState(4);
  const [oldPin, setOldPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [errTick, setErrTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const account = accounts.find((a) => a.id === accountId);

  const finish = (msg) => {
    toast(msg);
    if (next === 'home') goHome();
    else router.back();
  };

  const submitFinal = async (newPin) => {
    setBusy(true);
    try {
      if (mode === 'change') await post(`/accounts/${accountId}/pin`, { oldPin, newPin });
      else if (mode === 'reset') await post(`/accounts/${accountId}/pin`, { newPin });
      else applyMe(await post(`/accounts/${accountId}/link`, { pin: newPin }));
      finish(mode === 'change' || mode === 'reset' ? 'UPI PIN changed successfully' : 'Bank account linked');
    } catch (e) {
      setError(e.message);
      setErrTick((x) => x + 1);
      if (mode === 'change') { setStep('old'); setOldPin(''); setPin(''); setConfirm(''); }
      if (mode === 'verify') setPin('');
    } finally { setBusy(false); }
  };

  const len = step === 'old' || step === 'verify' ? account?.pinLength || Number(pinLength) || 4 : pinLen;
  const value = step === 'old' ? oldPin : step === 'confirm' ? confirm : pin;
  const setValue = step === 'old' ? setOldPin : step === 'confirm' ? setConfirm : setPin;

  const onKey = (k) => {
    setError('');
    if (k === 'back') return setValue(value.slice(0, -1));
    if (k === 'ok') {
      if (value.length !== len) return;
      if (step === 'old') return setStep('new');
      if (step === 'verify') return submitFinal(value);
      if (step === 'new') return setStep('confirm');
      if (step === 'confirm') {
        if (confirm !== pin) { setError("PINs don't match. Try again."); setErrTick((x) => x + 1); setConfirm(''); setPin(''); setStep('new'); return; }
        return submitFinal(pin);
      }
      return;
    }
    if (value.length < len) setValue(value + k);
  };

  const titles = { old: 'Enter your current UPI PIN', verify: 'Enter your UPI PIN', new: `Set a new ${pinLen}-digit UPI PIN`, confirm: 'Re-enter your new UPI PIN' };

  if (step === 'card') {
    const ok = card.length === 6 && /^\d{2}\/\d{2}$/.test(expiry);
    return (
      <Screen>
        <Header title={mode === 'reset' ? 'Reset UPI PIN' : 'Set UPI PIN'} />
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <BankLogo account={account} bank={{ short: '', color: C.blue }} size={44} />
            <View><Text style={{ fontSize: 17, color: C.text }}>{bankName}</Text><Text style={{ color: C.muted }}>Savings ••{last4}</Text></View>
          </View>
          <Text style={{ fontSize: 15, color: C.muted, lineHeight: 22 }}>Enter the last 6 digits and expiry date of your debit card linked to this account.</Text>
          <Text style={s.label}>Last 6 digits of debit card</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18, color: C.faint, letterSpacing: 2 }}>XXXX XXXX XX</Text>
            <TextInput style={[s.input, { flex: 1, letterSpacing: 4, fontSize: 18 }]} value={card} onChangeText={(t) => setCard(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="123456" placeholderTextColor={C.faint} autoFocus />
          </View>
          <Text style={s.label}>Expiry date (MM/YY)</Text>
          <TextInput style={[s.input, { width: 140, fontSize: 18 }]} value={expiry} keyboardType="number-pad" placeholder="MM/YY" placeholderTextColor={C.faint}
            onChangeText={(t) => { const d = t.replace(/\D/g, '').slice(0, 4); setExpiry(d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d); }} />
          <Text style={s.label}>UPI PIN length</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[4, 6].map((n) => <Btn key={n} title={`${n} digits`} variant={pinLen === n ? 'tonal' : 'outline'} onPress={() => setPinLen(n)} style={{ flex: 1 }} />)}
          </View>
        </ScrollView>
        <View style={{ padding: 24 }}><Btn title="Continue" disabled={!ok} onPress={() => setStep('new')} /></View>
      </Screen>
    );
  }

  return (
    <Screen bg="#fff">
      <View style={{ backgroundColor: C.surface, paddingTop: 4 }}>
        <Header title={bankName} subtitle={`••${last4}`} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 28, textAlign: 'center' }}>{titles[step].toUpperCase()}</Text>
        <PinDots length={len} filled={value.length} value={value} error={errTick} />
        {!!error && <Text style={{ color: C.red, marginTop: 20, textAlign: 'center' }}>{error}</Text>}
        {busy && <Text style={{ color: C.muted, marginTop: 20 }}>Please wait…</Text>}
      </View>
      <Keypad dark onKey={onKey} confirmEnabled={value.length === len && !busy} />
    </Screen>
  );
}
