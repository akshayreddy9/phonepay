import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router } from 'expo-router';
import { Btn, Header, Screen, s } from '../components/ui';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

export default function Login() {
  const { showBanner } = useApp();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await post('/auth/send-otp', { phone });
      // Simulated SMS: shown like an incoming message notification.
      setTimeout(() => showBanner({ app: 'Messages', icon: 'message-text', title: 'VM-PLUMPAYS', body: `${r.code} is your PlumPay verification code. Do not share it with anyone.`, onPress: () => {}, duration: 8000 }), 900);
      router.push({ pathname: '/otp', params: { phone: r.phone, code: r.code } });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header />
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 26, color: C.text, marginTop: 8 }}>Enter your mobile number</Text>
          <Text style={{ fontSize: 15, color: C.muted, marginTop: 8, lineHeight: 22 }}>
            Use the number linked to your bank account. We'll send a one-time code to verify it.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 32 }}>
            <View style={[s.input, { justifyContent: 'center', width: 76 }]}><Text style={{ fontSize: 16 }}>🇮🇳 +91</Text></View>
            <TextInput
              style={[s.input, { flex: 1, fontSize: 18, letterSpacing: 1 }]}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              placeholder="Mobile number"
              placeholderTextColor={C.faint}
              autoFocus
              maxLength={10}
            />
          </View>
          {!!error && <Text style={{ color: C.red, marginTop: 10 }}>{error}</Text>}
          <Text style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Demo accounts: 9876543210 – 9876543219</Text>
        </View>
        <View style={{ padding: 24 }}>
          <Btn title="Next" onPress={send} disabled={phone.length !== 10} loading={loading} />
          <Text style={{ fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 14, lineHeight: 18 }}>
            By continuing you agree to the PlumPay Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
