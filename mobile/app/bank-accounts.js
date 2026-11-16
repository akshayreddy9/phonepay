import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { BankLogo, Sym } from '../components/ui';
import { TitleBar } from '../components/phone';
import { useApp } from '../lib/store';
import { C, z } from '../lib/theme';

// Linked bank accounts with a "Primary" tag; tap one for its details.
export default function BankAccounts() {
  const { accounts } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7', paddingTop: insets.top }}>
      <TitleBar title="Bank Accounts" />
      <ScrollView contentContainerStyle={{ padding: z(10) }}>
        {accounts.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/bank/${a.id}`)} style={({ pressed }) => [{ backgroundColor: '#fff', borderRadius: z(10), flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(14), height: z(64), gap: z(14), marginBottom: z(8) }, pressed && { opacity: 0.8 }]}>
            <BankLogo account={a} size={34} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1D1D1D' }}>{a.bankName} - {a.last4}</Text>
            {a.primary && <View style={{ backgroundColor: '#1E8E3E', borderRadius: z(10), paddingHorizontal: z(8), paddingVertical: z(2) }}><Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>Primary</Text></View>}
            <View style={{ flex: 1 }} />
            <Sym name="chevron_right" size={24} color="#1D1D1D" />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => router.push({ pathname: '/link-bank', params: { from: 'settings' } })} style={({ pressed }) => [{ backgroundColor: C.purple, height: z(54) + insets.bottom, paddingBottom: insets.bottom, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.9 }]}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Add New Bank Account</Text>
      </Pressable>
    </View>
  );
}
