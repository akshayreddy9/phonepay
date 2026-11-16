import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, MI, Screen } from '../components/ui';
import { Wordmark } from '../components/Logo';
import { C } from '../lib/theme';

const LANGS = [['en', 'English', 'English'], ['hi', 'हिन्दी', 'Hindi'], ['te', 'తెలుగు', 'Telugu'], ['ta', 'தமிழ்', 'Tamil'], ['kn', 'ಕನ್ನಡ', 'Kannada'], ['ml', 'മലയാളം', 'Malayalam'], ['mr', 'मराठी', 'Marathi'], ['bn', 'বাংলা', 'Bengali']];

export default function Welcome() {
  const [lang, setLang] = useState('en');
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }}>
        <Pressable hitSlop={10} onPress={() => router.push('/server')} style={{ padding: 8 }}>
          <MI name="settings" size={22} color={C.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Wordmark size={52} />
          <Text style={{ fontSize: 28, color: C.text, marginTop: 20, textAlign: 'center' }}>Welcome to PlumPay</Text>
          <Text style={{ fontSize: 15, color: C.muted, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Pay friends, scan any QR code, recharge and pay bills — straight from your bank account with UPI.
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: C.text, marginTop: 32, marginBottom: 12, fontWeight: '500' }}>Choose your language</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {LANGS.map(([code, native, en]) => {
            const on = code === lang;
            return (
              <Pressable key={code} onPress={() => setLang(code)}
                style={{ width: '47.5%', borderWidth: on ? 2 : 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blueSoft : '#fff', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 17, color: C.text }}>{native}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{en}</Text>
                {on && <MI name="check-circle" size={18} color={C.blue} style={{ position: 'absolute', right: 10, top: 10 }} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 8 }}>
        <Btn title="Get started" onPress={async () => { await AsyncStorage.setItem('pn_lang', lang); router.push('/login'); }} />
        <Text style={{ fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 14 }}>College project demo · No real money is moved</Text>
      </View>
    </Screen>
  );
}
