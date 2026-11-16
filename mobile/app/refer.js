import { Pressable, ScrollView, Share, View } from 'react-native';
import { Text } from '../components/Text';
import * as Clipboard from 'expo-clipboard';
import { Btn, Header, MCI, MI, Screen } from '../components/ui';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { inr } from '../lib/format';

export default function Refer() {
  const { user, settings, toast } = useApp();
  const bonus = inr(settings?.referralBonus || 0);
  const message = `Join me on PhonePayy — pay friends, recharge and pay bills with UPI. Use my code ${user?.referralCode} and we both get ${bonus}!`;
  return (
    <Screen>
      <Header title="Invite friends" />
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
          <MCI name="gift-open-outline" size={72} color={C.green} />
        </View>
        <Text style={{ fontSize: 26, color: C.text, marginTop: 24, textAlign: 'center' }}>Get {bonus} for every friend</Text>
        <Text style={{ fontSize: 15, color: C.muted, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
          Invite friends to PhonePayy. When they make their first payment, you both get {bonus}.
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, marginTop: 32 }}>Your referral code</Text>
        <Pressable onPress={async () => { await Clipboard.setStringAsync(user?.referralCode || ''); toast('Code copied'); }}
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ fontSize: 22, color: C.blue, fontWeight: '700', letterSpacing: 2 }}>{user?.referralCode}</Text>
          <MI name="content-copy" size={20} color={C.blue} />
        </Pressable>
        {[['Share your code', 'Send the invite to friends on any app'], ['Friend signs up', 'They join PhonePayy with your code'], ['Both get rewarded', `After their first payment, you both get ${bonus}`]].map(([t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 14, alignSelf: 'stretch', marginTop: i ? 16 : 36 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.blueDark, fontWeight: '700' }}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 15, color: C.text }}>{t}</Text><Text style={{ fontSize: 13, color: C.muted }}>{d}</Text></View>
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: 20 }}><Btn title="Invite friends" icon="share" onPress={() => Share.share({ message })} /></View>
    </Screen>
  );
}
