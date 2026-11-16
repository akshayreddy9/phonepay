import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router } from 'expo-router';
import { Btn, Header, MCI, Screen, s } from '../components/ui';
import { defaultServerUrl, getServerUrl, setServerUrl } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

// Lets the phone point at the laptop running the PlumPay server (needed for APK builds).
export default function Server() {
  const { toast, setSettings } = useApp();
  const [url, setUrl] = useState(getServerUrl());
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const test = async (save) => {
    setBusy(true);
    setStatus(null);
    const clean = url.trim().replace(/\/+$/, '');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(clean + '/api/config', { signal: ctrl.signal });
      clearTimeout(t);
      const data = await res.json();
      setStatus({ ok: true, text: `Connected to ${data.settings.appName} server` });
      if (save) {
        await setServerUrl(clean);
        setSettings(data.settings);
        toast('Server saved');
        router.back();
      }
    } catch {
      setStatus({ ok: false, text: 'Could not connect. Make sure the server is running and the phone is on the same Wi-Fi.' });
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="Server address" />
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: C.muted, lineHeight: 20 }}>
          Enter the address shown when you start the PlumPay server on your laptop (the "Phone/LAN" line), for example http://192.168.1.8:4002
        </Text>
        <Text style={s.label}>Server URL</Text>
        <TextInput style={s.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Btn title="Use detected address" variant="text" onPress={() => setUrl(defaultServerUrl())} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        {status && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, backgroundColor: status.ok ? C.greenSoft : C.redSoft, marginTop: 8 }}>
            <MCI name={status.ok ? 'check-circle' : 'alert-circle'} size={20} color={status.ok ? C.green : C.red} />
            <Text style={{ flex: 1, color: status.ok ? C.green : C.red }}>{status.text}</Text>
          </View>
        )}
      </ScrollView>
      <View style={{ padding: 20, flexDirection: 'row', gap: 12 }}>
        <Btn title="Test" variant="outline" onPress={() => test(false)} loading={busy} style={{ flex: 1 }} />
        <Btn title="Save" onPress={() => test(true)} disabled={busy} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
