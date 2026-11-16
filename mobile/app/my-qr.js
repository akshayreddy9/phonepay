import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { Text } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Avatar, Btn, Header, Loading, MCI, MI, Screen, s as ui } from '../components/ui';
import { get } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

export const upiLink = (u) => `upi://pay?pa=${u.upiId}&pn=${encodeURIComponent(u.name)}&cu=INR`;

// Shows the signed-in user's QR, or another user's profile card when userId is given.
export default function MyQr() {
  const { userId } = useLocalSearchParams();
  const { user: me, toast } = useApp();
  const [other, setOther] = useState(null);
  useEffect(() => { if (userId) get(`/users/${userId}`).then((r) => setOther(r.user)).catch(() => {}); }, [userId]);
  const u = userId ? other : me;
  if (!u) return <Screen><Header /><Loading /></Screen>;
  const mine = !userId;

  return (
    <Screen bg={C.surface}>
      <Header title={mine ? 'Your QR code' : u.name} />
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        <View style={[ui.card, { padding: 24, alignItems: 'center', width: '100%', borderRadius: 24 }]}>
          <Avatar user={u} size={64} style={{ marginTop: -56, borderWidth: 4, borderColor: '#fff' }} />
          <Text style={{ fontSize: 20, color: C.text, marginTop: 10 }}>{u.name}</Text>
          <Pressable onPress={async () => { await Clipboard.setStringAsync(u.upiId); toast('UPI ID copied'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ color: C.muted }}>UPI ID: {u.upiId}</Text>
            <MI name="content-copy" size={14} color={C.muted} />
          </Pressable>
          <View style={{ marginTop: 24, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line }}>
            <QRCode value={upiLink(u)} size={220} color="#202124" />
          </View>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 16, textAlign: 'center' }}>
            {mine ? 'Scan to pay with any UPI app' : `Scan this code to pay ${u.name.split(' ')[0]}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, alignItems: 'center' }}>
            <MCI name="shield-check" size={16} color={C.green} />
            <Text style={{ fontSize: 12, color: C.muted }}>UPI · BHIM compatible format</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
          <Btn title="Share" icon="share" variant="outline" style={{ flex: 1 }} onPress={() => Share.share({ message: `Pay ${u.name} on PlumPay\nUPI ID: ${u.upiId}\n${upiLink(u)}` })} />
          {mine ? <Btn title="Open scanner" icon="qr-code-scanner" style={{ flex: 1 }} onPress={() => router.replace('/scan')} />
            : <Btn title="Pay" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/pay', params: { userId: u.id } })} />}
        </View>
      </ScrollView>
    </Screen>
  );
}
