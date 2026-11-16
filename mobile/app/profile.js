import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { BankLogo, goBack, Sheet, Sym, s as ui } from '../components/ui';
import { BrandQr, DidYouKnow, QrBankLine, YellowAvatar } from '../components/phone';
import { post } from '../lib/api';
import { useApp } from '../lib/store';
import { C, z } from '../lib/theme';

// List row: coloured icon, title, grey sub text, chevron or a purple action word.
function Item({ icon, color = C.purple, title, sub, action, onPress, extra, outline }) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: '#eee' }} style={({ pressed }) => [{ flexDirection: 'row', paddingHorizontal: z(16), paddingVertical: z(14), gap: z(18) }, pressed && { backgroundColor: '#FAFAFA' }]}>
      <View style={{ width: z(30), alignItems: 'center', paddingTop: z(2) }}>
        {outline ? <Sym name={icon} size={26} color="#3A3A3A" /> : (
          <View style={{ width: z(28), height: z(28), borderRadius: z(7), backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Sym name={icon} size={18} color="#fff" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16.5, color: '#1D1D1D' }}>{title}</Text>
        {!!sub && <Text style={{ fontSize: 14, color: '#6B6B6B', marginTop: z(3), lineHeight: 19 }}>{sub}</Text>}
        {extra}
      </View>
      {action ? <Text style={{ fontSize: 15, color: C.purpleText, fontWeight: '700', alignSelf: 'center' }}>{action}</Text>
        : <View style={{ alignSelf: 'center' }}><Sym name="chevron_right" size={22} color="#8A8A8A" /></View>}
    </Pressable>
  );
}

const Heading = ({ children }) => <Text style={{ fontSize: 17, fontWeight: '700', color: '#1D1D1D', paddingHorizontal: z(16), paddingTop: z(22), paddingBottom: z(6) }}>{children}</Text>;
const Gap = () => <View style={{ height: z(1), backgroundColor: '#EEEEEE', marginTop: z(6) }} />;

function CardMarks() {
  return (
    <View style={{ flexDirection: 'row', gap: z(6), marginTop: z(8) }}>
      {[['RuPay', '#1B3C87'], ['VISA', '#1A1F71'], ['●●', '#EB001B']].map(([t, c]) => (
        <View key={t} style={{ borderWidth: 1, borderColor: '#E6E6E6', borderRadius: z(4), paddingHorizontal: z(6), paddingVertical: z(1) }}>
          <Text style={{ fontSize: 10, fontWeight: '700', fontStyle: 'italic', color: c }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

// Profile: phone number, receive-money nudge, My QR, payment methods and settings.
export default function Profile() {
  const { user, accounts, settings, home, toast, signOut, applyMe } = useApp();
  const insets = useSafeAreaInsets();
  const [bankSheet, setBankSheet] = useState(false);
  const [shake, setShake] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const primary = accounts.find((a) => a.primary) || accounts[0];
  const appName = settings?.appName || 'PlumPay';
  const soon = (w) => () => toast(`${w} is not part of this demo`);
  if (!user) return null;

  const setPrimary = async (a) => {
    setBankSheet(false);
    try { applyMe(await post(`/accounts/${a.id}/primary`)); toast(`Money will now be received in ${a.bankName} - ${a.last4}`); } catch (e) { toast(e.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: z(16), height: z(60) }}>
        <Pressable hitSlop={10} onPress={goBack}><Sym name="arrow_back" size={28} color="#1D1D1D" /></Pressable>
        <Pressable hitSlop={10} onPress={() => router.push('/help')}><Sym name="help" size={28} color="#1D1D1D" /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + z(30) }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), gap: z(16), paddingTop: z(6) }}>
          <Pressable onPress={() => router.push('/edit-profile')}><YellowAvatar user={user} size={54} plus /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: '600', color: '#1D1D1D' }}>+91 {user.phone}</Text>
            <Text style={{ fontSize: 16, color: '#6B6B6B', marginTop: z(2) }} numberOfLines={1}>{user.profileComplete && user.name ? user.name : 'Update profile details'}</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => router.push('/edit-profile')}><Text style={{ fontSize: 16, color: C.purpleText, fontWeight: '700' }}>Manage</Text></Pressable>
        </View>

        {!allowed && (
          <View style={{ marginHorizontal: z(16), marginTop: z(22), borderRadius: z(14), borderWidth: 1, borderColor: '#ECECEC', backgroundColor: '#fff', padding: z(14) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(6) }}>
              <Sym name="info" fill size={16} color="#3A4A6B" />
              <Text style={{ fontSize: 14.5, color: '#3A4A6B', fontWeight: '600' }}>Not receiving money on {appName}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), marginTop: z(12) }}>
              <View style={{ width: z(44), height: z(44), borderRadius: z(22), backgroundColor: '#EEF0FB', alignItems: 'center', justifyContent: 'center' }}>
                <Sym name="group" fill size={26} color="#4A63C9" />
                <View style={{ position: 'absolute', right: -z(2), bottom: z(0), width: z(16), height: z(16), borderRadius: z(8), backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>!</Text></View>
              </View>
              <Text style={{ flex: 1, fontSize: 16, color: '#1D1D1D', lineHeight: 22 }} numberOfLines={2}>Receive money from all UPI apps on {appName}</Text>
              <Pressable onPress={() => { setAllowed(true); toast('You can now receive money from all UPI apps'); }} style={{ backgroundColor: C.purple, borderRadius: z(8), paddingHorizontal: z(16), height: z(38), justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Allow</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ alignSelf: 'center', marginTop: z(26), borderRadius: z(16), borderWidth: 1, borderColor: '#ECECEC', backgroundColor: '#fff', paddingHorizontal: z(28), paddingTop: z(28), paddingBottom: z(18), alignItems: 'center' }}>
          <BrandQr user={user} size={218} />
          <QrBankLine account={primary} onPress={() => (accounts.length > 1 ? setBankSheet(true) : router.push('/bank-accounts'))} size={18} />
        </View>

        <View style={{ height: z(1), backgroundColor: '#EEEEEE', marginTop: z(30) }} />
        <Heading>Payment Methods</Heading>
        <Item icon="account_balance" color="#2F6FDE" title="Bank Accounts" sub="Set UPI PIN, Add Accounts & more" onPress={() => router.push('/bank-accounts')} />
        <Item icon="credit_card" color="#3B6FD8" title="RuPay Credit Card" sub="Pay with your credit card via UPI" onPress={soon('RuPay credit card on UPI')} />
        <Item icon="account_balance_wallet" color="#F08A24" title={`${appName} Wallet`} sub="Earn up to 2% cashback" action="Try Now" onPress={() => router.push('/upi-lite')} />
        <Item icon="credit_card" color="#2563EB" title="Credit Cards" sub="Add Cards, Pay Bills, Manage" extra={<CardMarks />} onPress={() => router.push({ pathname: '/bills', params: { category: 'creditcard' } })} />
        <Item icon="family_restroom" color="#E0567A" title="UPI Circle" sub="Send or receive pocket money" onPress={soon('UPI Circle')} />
        {settings?.features?.upiLite !== false && <Item icon="bolt" color="#1E9E4A" title="UPI Lite" sub={'Pin-less payments up to\n₹1,000'} action={user.upiLite ? 'Manage' : 'Activate'} onPress={() => router.push('/upi-lite')} />}
        <Item icon="add_card" color="#E8710A" title="Credit Line on UPI" sub="Avail Credit from your bank" onPress={soon('Credit line on UPI')} />
        <Item icon="payment" color="#1A9E8F" title="Debit Cards" sub="Manage your saved cards" onPress={soon('Saved debit cards')} />
        <Item icon="redeem" color="#8E44AD" title={`${appName} Gift Card`} sub="Gift for your loved ones" onPress={() => router.push('/rewards')} />

        <DidYouKnow banners={home?.banners?.slice(1)} full style={{ marginTop: z(10) }} />

        <Heading>Payment Settings</Heading>
        <Item icon="autorenew" color="#7B4FD6" title="AutoPay" sub="Manage your IPOs, SIPs & more" onPress={() => toast('No AutoPay mandates set up')} />
        <Item icon="fingerprint" color="#6A3FD0" title="Pay with Fingerprint" sub="Up to ₹10,000 without UPI PIN" onPress={() => router.push('/settings')} />
        <Item icon="public" color="#1E8E7E" title="International" sub="Scan & Pay at Global Merchants" onPress={soon('International UPI')} />
        <Item icon="alternate_email" color="#5B6B8C" title="UPI Settings" sub="Manage UPI IDs and UPI Number" onPress={() => router.push('/upi-settings')} />
        <Gap />
        <Item outline icon="tune" title="Preferences & Security" sub="Languages, reminders, notifications, permissions, themes, screen lock, etc" onPress={() => router.push('/settings')} />
        <Pressable onPress={() => setShake(!shake)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), paddingVertical: z(12), gap: z(18) }}>
          <View style={{ width: z(30), alignItems: 'center' }}><Sym name="vibration" size={26} color="#3A3A3A" /></View>
          <Text style={{ flex: 1, fontSize: 16.5, color: '#1D1D1D' }}>Shake to Scan</Text>
          <Switch value={shake} onValueChange={setShake} trackColor={{ true: '#C9B3EE', false: '#E3E3E3' }} thumbColor={shake ? C.purple : '#F4F4F4'} />
        </Pressable>
        <Gap />
        <Item outline icon="card_giftcard" title={`Refer & earn ₹${settings?.referralBonus ?? 1200}`} onPress={() => router.push('/refer')} />
        <Item outline icon="help" title="Help and support" onPress={() => router.push('/help')} />
        <Item outline icon="description" title={`About ${appName}`} onPress={() => toast(`${appName} ${settings?.appVersion || 'v1.0.0'} · college demo app, no real money`)} />
        <Pressable onPress={signOut} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), paddingVertical: z(16), gap: z(18) }}>
          <View style={{ width: z(30), alignItems: 'center' }}><Sym name="logout" size={24} color={C.red} /></View>
          <Text style={{ fontSize: 16.5, color: C.red }}>Log out</Text>
        </Pressable>
        <Text style={{ textAlign: 'center', fontSize: 12, color: '#9A9A9A', marginTop: z(10) }}>{settings?.appVersion || 'v1.0.0'} · Demo app, no real money</Text>
      </ScrollView>

      <Sheet visible={bankSheet} onClose={() => setBankSheet(false)} title="Receive money in">
        {accounts.map((a) => (
          <Pressable key={a.id} onPress={() => setPrimary(a)} style={[ui.row, { paddingVertical: z(12) }]}>
            <BankLogo account={a} size={36} />
            <Text style={{ flex: 1, fontSize: 16, color: C.text }}>{a.bankName} - {a.last4}</Text>
            <Sym name={a.primary ? 'radio_button_checked' : 'radio_button_unchecked'} size={24} color={a.primary ? C.purple : C.faint} />
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
