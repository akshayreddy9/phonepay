import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import { router } from 'expo-router';
import { BankLogo, Dots, MI, Screen } from '../components/ui';
import { Keypad, PinDots } from '../components/pay';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { inr } from '../lib/format';

// UPI PIN entry, styled like the bank's secure PIN pad.
export default function Pin() {
  const { pinRequest, toast } = useApp();
  const req = useRef(pinRequest.current).current;
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const len = req?.account?.pinLength || 4;

  useEffect(() => { if (!req) router.back(); }, [req]);
  if (!req) return null;

  const submit = async () => {
    setProcessing(true);
    try {
      const [r] = await Promise.all([req.submit(pin), new Promise((res) => setTimeout(res, 1400))]);
      if (req.onDone) { req.onDone(r); return; }
      router.replace({ pathname: '/result', params: { txnId: r.transaction.id, rewardId: r.reward?.id || '' } });
    } catch (e) {
      setProcessing(false);
      setPin('');
      if (e.code === 'INCORRECT_PIN') setError('Incorrect UPI PIN. Please try again.');
      else { toast(e.message); router.back(); }
    }
  };

  const onKey = (k) => {
    setError('');
    if (k === 'back') setPin((p) => p.slice(0, -1));
    else if (k === 'ok') { if (pin.length === len) submit(); }
    else if (pin.length < len) setPin((p) => p + k);
  };

  if (processing) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Dots />
          <Text style={{ fontSize: 20, color: C.text, marginTop: 28 }}>{req.processingText || 'Processing payment'}</Text>
          <Text style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Please don't press back or close the app</Text>
          <Text style={{ fontSize: 12, color: C.faint, position: 'absolute', bottom: 32 }}>Secured by UPI</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="#fff">
      <View style={{ backgroundColor: C.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 12 }}>
          <Pressable hitSlop={10} onPress={() => router.back()} style={{ padding: 6 }}><MI name="close" size={24} color={C.text} /></Pressable>
          <BankLogo account={req.account} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: C.text }} numberOfLines={1}>{req.account?.bankName}</Text>
            <Text style={{ fontSize: 12, color: C.muted }}>XXXX{req.account?.last4}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.blueDark, letterSpacing: 1 }}>UPI</Text>
        </View>
        <View style={{ padding: 16, paddingTop: 12, gap: 4 }}>
          {req.to && (
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ width: 70, color: C.muted, fontSize: 13 }}>To:</Text>
              <Text style={{ flex: 1, color: C.text, fontSize: 13 }} numberOfLines={1}>{req.to.name}</Text>
            </View>
          )}
          {req.amount != null && (
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ width: 70, color: C.muted, fontSize: 13 }}>Sending:</Text>
              <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: '600' }}>{inr(req.amount, { decimals: true })}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 28 }}>ENTER {len}-DIGIT UPI PIN</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PinDots length={len} filled={pin.length} show={show} value={pin} error={error} />
          <Pressable hitSlop={10} onPress={() => setShow(!show)}>
            <MI name={show ? 'visibility-off' : 'visibility'} size={20} color={C.blue} />
          </Pressable>
        </View>
        {!!error && <Text style={{ color: C.red, marginTop: 18 }}>{error}</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.amberSoft, padding: 12 }}>
        <MI name="info-outline" size={18} color={C.amber} />
        <Text style={{ flex: 1, fontSize: 12, color: C.text }}>
          {req.amount != null ? `You are transferring ${inr(req.amount)} from your account${req.to ? ` to ${req.to.name}` : ''}` : 'UPI PIN is required to check your balance'}
        </Text>
      </View>
      <Keypad dark onKey={onKey} confirmEnabled={pin.length === len} />
    </Screen>
  );
}
