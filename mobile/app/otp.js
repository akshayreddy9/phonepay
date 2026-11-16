import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useLocalSearchParams } from 'expo-router';
import { Btn, Header, Screen } from '../components/ui';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { resetTo } from '../lib/nav';

export default function Otp() {
  const { phone, code: sentCode } = useLocalSearchParams();
  const { signIn, showBanner } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const input = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((x) => (x > 0 ? x - 1 : 0)), 1000);
    // Simulated SMS auto-read after a moment, like Android's SMS retriever.
    const auto = setTimeout(() => setCode((c) => c || String(sentCode || '')), 2500);
    return () => { clearInterval(t); clearTimeout(auto); };
  }, [sentCode]);

  useEffect(() => {
    if (code.length === 6) verify(code);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async (c) => {
    setLoading(true);
    setError('');
    try {
      const r = await post('/auth/verify-otp', { phone, code: c });
      await signIn(r.token, r.user);
      resetTo(r.isNew ? '/setup-profile' : '/');
    } catch (e) {
      setError(e.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setSeconds(30);
    try {
      const r = await post('/auth/send-otp', { phone });
      showBanner({ app: 'Messages', icon: 'message-text', title: 'VM-PLUMPAYS', body: `${r.code} is your PlumPay verification code.`, onPress: () => {}, duration: 8000 });
    } catch (e) { setError(e.message); }
  };

  return (
    <Screen>
      <Header />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 26, color: C.text, marginTop: 8 }}>Verify your number</Text>
        <Text style={{ fontSize: 15, color: C.muted, marginTop: 8 }}>Enter the 6-digit code sent to +91 {phone}</Text>
        <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: 46, height: 56, borderRadius: 10, borderWidth: i === code.length ? 2 : 1, borderColor: i === code.length ? C.blue : '#DADCE0', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24, color: C.text }}>{code[i] || ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput ref={input} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoFocus
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} textContentType="oneTimeCode" autoComplete="sms-otp" />
        {!!error && <Text style={{ color: C.red, marginTop: 14 }}>{error}</Text>}
        <View style={{ flexDirection: 'row', marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: C.muted }}>Didn't get the code? </Text>
          {seconds > 0 ? <Text style={{ color: C.muted }}>Resend in 0:{String(seconds).padStart(2, '0')}</Text>
            : <Pressable onPress={resend}><Text style={{ color: C.blue, fontWeight: '600' }}>Resend code</Text></Pressable>}
        </View>
      </View>
      <View style={{ padding: 24 }}>
        <Btn title="Verify" onPress={() => verify(code)} disabled={code.length !== 6} loading={loading} />
      </View>
    </Screen>
  );
}
