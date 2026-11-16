import { ScrollView, Switch, View } from 'react-native';
import { Text } from '../components/Text';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Header, Row, Screen } from '../components/ui';
import { getServerUrl } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

function Group({ title, children }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ paddingHorizontal: 20, color: C.blue, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function Settings() {
  const { user, lockEnabled, setAppLock, connected, toast, signOut } = useApp();

  const toggleLock = async (on) => {
    if (on) {
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (!enrolled) { toast('Set up a screen lock on your phone first'); return; }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to enable app lock' });
      if (!r.success) return;
    }
    setAppLock(on);
    toast(on ? 'App lock enabled' : 'App lock disabled');
  };

  return (
    <Screen>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Group title="Account">
          <Row icon="account-outline" title="Personal info" subtitle={`${user?.name} · ${user?.email || 'No email'}`} chevron onPress={() => router.push('/edit-profile')} />
          <Row icon="bank-outline" title="Bank accounts & UPI PIN" chevron onPress={() => router.push('/bank-accounts')} />
        </Group>
        <Group title="Security">
          <Row icon="fingerprint" title="Use screen lock" subtitle="Unlock PhonePayy with fingerprint, face or PIN" right={<Switch value={lockEnabled} onValueChange={toggleLock} trackColor={{ true: C.blueTint }} thumbColor={lockEnabled ? C.blue : '#f4f3f4'} />} />
          <Row icon="shield-lock-outline" title="Privacy" subtitle="Your data is only shared with your bank to process payments" />
        </Group>
        <Group title="Connection">
          <Row icon="server-network" title="Server address" subtitle={`${getServerUrl()} · ${connected ? 'Live ✓' : 'Offline'}`} chevron onPress={() => router.push('/server')} />
        </Group>
        <Group title="About">
          <Row icon="help-circle-outline" title="Help & feedback" chevron onPress={() => router.push('/help')} />
          <Row icon="information-outline" title="About PhonePayy" subtitle="Version 1.0.0 · College project. No real money is moved." />
          <Row icon="logout" title="Sign out" iconColor={C.red} titleStyle={{ color: C.red }} onPress={() => signOut()} />
        </Group>
      </ScrollView>
    </Screen>
  );
}
