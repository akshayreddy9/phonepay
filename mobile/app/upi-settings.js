import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { BankLogo, Dots, Header, Screen, Sym } from '../components/ui';
import { PoweredBy } from '../components/Logo';
import { useApp } from '../lib/store';
import { C, z } from '../lib/theme';

function Card({ title, children, style }) {
  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: z(20), marginHorizontal: z(14), marginTop: z(14), paddingHorizontal: z(18), paddingVertical: z(8) }, style]}>
      {!!title && <Text style={{ fontSize: 19, fontWeight: '700', color: '#1D1D1D', marginTop: z(10), marginBottom: z(6) }}>{title}</Text>}
      {children}
    </View>
  );
}

function Line({ icon, iconColor = '#3A3A3A', title, badge, sub, subNode, action, onAction, onPress, chevron, last }) {
  return (
    <Pressable onPress={onPress || onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), paddingVertical: z(14), borderBottomWidth: last ? 0 : 1, borderColor: '#F0F0F0' }}>
      {typeof icon === 'string' ? <Sym name={icon} size={26} color={iconColor} /> : icon}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
          <Text style={{ fontSize: 16, color: '#1D1D1D', fontWeight: '500' }}>{title}</Text>
          {badge}
        </View>
        {subNode || (!!sub && <Text style={{ fontSize: 13, color: '#6B6B6B', marginTop: z(3), lineHeight: 18 }}>{sub}</Text>)}
      </View>
      {!!action && <Pressable hitSlop={8} onPress={onAction}><Text style={{ color: C.link, fontSize: 15, fontWeight: '600' }}>{action}</Text></Pressable>}
      {chevron && <Sym name="chevron_right" size={24} color="#3A3A3A" />}
    </Pressable>
  );
}

const NewBadge = () => <View style={{ backgroundColor: C.badge, borderRadius: z(4), paddingHorizontal: z(5), paddingVertical: z(1) }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#3A2E00' }}>New</Text></View>;
const Inactive = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(3), backgroundColor: '#FFF3E0', borderRadius: z(8), paddingHorizontal: z(6), paddingVertical: z(1) }}>
    <View style={{ width: z(6), height: z(6), borderRadius: z(3), backgroundColor: '#F59E0B' }} />
    <Text style={{ fontSize: 10, color: '#B26A00' }}>Inactive</Text>
  </View>
);

function AddTile({ label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ width: z(104), height: z(112), marginRight: z(10), borderRadius: z(14), borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC3EA', overflow: 'hidden' }}>
      <LinearGradient colors={['#FFFFFF', '#D8EBFB']} style={{ flex: 1, alignItems: 'center', paddingTop: z(10) }}>
        <Sym name="add_circle" fill size={20} color={C.navy} />
        <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#1D1D1D', textAlign: 'center', marginTop: z(3), lineHeight: 15 }}>{label}</Text>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: z(6) }}><Sym name={icon} fill size={34} color={C.navy} /></View>
      </LinearGradient>
    </Pressable>
  );
}

export default function UpiSettings() {
  const { user, accounts, settings, toast } = useApp();
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 700); return () => clearTimeout(t); }, []);
  const soon = (w) => toast(`${w} is not part of this demo`);
  const appName = settings?.appName || 'PlumPay';
  const copy = async () => { await Clipboard.setStringAsync(user.upiId); toast('UPI ID copied'); };

  return (
    <Screen bg={C.page}>
      <Header title="UPI & Payment Settings" />
      {!ready ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Dots /></View> : (
        <ScrollView contentContainerStyle={{ paddingBottom: z(16) }}>
          <Card>
            <Line icon="fingerprint" title="Pay with Fingerprint" badge={<NewBadge />} sub="Super Secure UPI Payments" action="Activate" onAction={() => router.push('/settings')} />
            <Line icon={<Sym name="send" size={24} color="#F37021" />} title="UPI ID" action="View" onAction={copy}
              subNode={<Pressable onPress={copy} style={{ flexDirection: 'row', alignItems: 'center', gap: z(5), marginTop: z(3) }}>
                <Sym name="check_circle" fill size={15} color={C.green} />
                <Text style={{ fontSize: 13, color: '#3A3A3A' }}>{user?.upiId}</Text>
                <Sym name="content_copy" size={14} color="#3A3A3A" />
              </Pressable>} />
            <Line icon="dialpad" title="UPI Number" badge={<Inactive />} sub={user?.phone} action="Activate" onAction={() => toast(`UPI Number ${user?.phone} activated`)} last />
          </Card>

          <Card title="Payment Accounts">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: z(6) }}>
              <AddTile label={'Add Bank\nAccount'} icon="account_balance" onPress={() => router.push({ pathname: '/link-bank', params: { from: 'settings' } })} />
              <AddTile label={'Add Rupay\nCredit Card'} icon="credit_card" onPress={() => soon('RuPay credit card')} />
              <AddTile label={'Add\nCredit Line'} icon="credit_score" onPress={() => soon('Credit line')} />
              <AddTile label={`Add ${appName}\nPostpaid`} icon="account_balance_wallet" onPress={() => soon('Postpaid')} />
            </ScrollView>
            {accounts.map((a) => (
              <Line key={a.id} icon={<BankLogo account={a} size={26} />} title={`${a.bankName} - ${a.last4}`} chevron onPress={() => router.push(`/bank/${a.id}`)}
                subNode={a.primary ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(5), marginTop: z(3) }}>
                  <Sym name="check_circle" fill size={15} color={C.green} />
                  <Text style={{ fontSize: 12.5, color: C.green }}>Receiving money in this account</Text>
                </View> : null} />
            ))}
            {settings?.features?.upiLite !== false && <Line icon={<Sym name="bolt" fill size={26} color="#F5B400" />} title="UPI Lite" chevron onPress={() => router.push('/upi-lite')} last />}
          </Card>

          <Card title="UPI Settings">
            <Line icon="family_restroom" title="Pocket Money" sub="Setup or manage your pocket money account" chevron onPress={() => soon('Pocket Money')} />
            <Line icon="request_quote" title="Payment Requests" sub="View all requests received by you" chevron onPress={() => router.push('/notifications')} />
            <Line icon="autorenew" title="Automatic Payments" sub="Manage all your UPI Automatic Payments" chevron onPress={() => soon('Automatic payments')} />
            <Line icon="candlestick_chart" title="IPO & Trading Block Requests" sub="Manage payments related to your trading" chevron onPress={() => soon('IPO block requests')} />
            <Line icon="event_available" title="Reserve Pay" sub="View and manage all your UPI Reserve Pay requests" chevron onPress={() => soon('Reserve Pay')} />
            <Line icon="public" title="International UPI" sub="Make payments while traveling abroad from your UPI linked bank accounts" chevron onPress={() => soon('International UPI')} />
            <Line icon="verified_user" title="UPI Safety Tips" sub="Watch the video to learn how to make every UPI payment more secure." chevron onPress={() => router.push('/help')} last />
          </Card>

          <Card title={`Other Settings Powered by ${appName}`}>
            <Line icon="credit_card" title="Saved Cards" sub="Manage your saved cards or add new cards" chevron onPress={() => soon('Saved cards')} />
            <Line icon="bolt" title={`${appName} Assist`} sub="Enable automatic OTP submission at the time of making payments" chevron onPress={() => soon('OTP assist')} last />
          </Card>
          <PoweredBy style={{ marginTop: z(12) }} />
        </ScrollView>
      )}
    </Screen>
  );
}
