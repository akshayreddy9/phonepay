import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../components/Text';
import { BankLogo, Sheet, Sym, s as ui, Btn } from '../../components/ui';
import { PoweredBy } from '../../components/Logo';
import { TitleBar } from '../../components/phone';
import { del, post } from '../../lib/api';
import { useApp } from '../../lib/store';
import { confirmAction } from '../../lib/confirm';
import { inrShort } from '../../lib/format';
import { C, z } from '../../lib/theme';

const Box = ({ children, style }) => <View style={[{ backgroundColor: '#fff', borderRadius: z(12), marginHorizontal: z(10), marginTop: z(10), padding: z(16) }, style]}>{children}</View>;
const Act = ({ title, onPress }) => <Pressable hitSlop={6} onPress={onPress}><Text style={{ fontSize: 15, color: C.purpleText, fontWeight: '700' }}>{title}</Text></Pressable>;

function Detail({ k, v }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: z(6) }}>
      <Text style={{ width: z(80), fontSize: 15, color: '#6B6B6B' }}>{k}</Text>
      <Text style={{ fontSize: 15, color: '#6B6B6B' }}>:  {v}</Text>
    </View>
  );
}

const HANDLES = ['ppy', 'ppyaxl', 'ppyybl'];

// Account Details: masked number, primary, PIN, balance, UPI IDs, nickname, unlink.
export default function BankDetail() {
  const { id } = useLocalSearchParams();
  const { user, accounts, requestPin, applyMe, toast } = useApp();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(null);
  const [active, setActive] = useState(HANDLES);
  const [nickSheet, setNickSheet] = useState(false);
  const [nick, setNick] = useState('');
  const a = accounts.find((x) => x.id === id);
  if (!a) return <View style={{ flex: 1, backgroundColor: '#F5F5F7' }} />;
  const phone = user?.phone || '';
  const idFor = (h, i) => (i === 0 && h === 'ppy' && a.primary ? user?.upiId : `${phone}-2@${h}`);

  const check = () => requestPin({
    account: a, amount: null, processingText: 'Fetching balance',
    submit: (pin) => post(`/accounts/${a.id}/balance`, { pin }),
    onDone: (r) => { setBalance(r.account.balance); router.back(); },
  });
  const pinRoute = (mode) => ({ pathname: '/set-pin', params: { accountId: a.id, mode, bankName: a.bankName, last4: a.last4 } });
  const makePrimary = async () => { if (a.primary) return; try { applyMe(await post(`/accounts/${a.id}/primary`)); toast('Primary bank account updated'); } catch (e) { toast(e.message); } };
  const unlink = () => confirmAction('Unlink bank account?', `${a.bankName} - ${a.last4} will be removed from this app.`, 'Unlink', async () => {
    try { applyMe(await del(`/accounts/${a.id}`)); router.back(); toast('Bank account unlinked'); } catch (e) { toast(e.message); }
  });
  const removeId = (h) => {
    if (active.length === 1) { toast('At least one UPI ID must stay active'); return; }
    confirmAction('Deactivate UPI ID?', `${idFor(h, HANDLES.indexOf(h))} will stop working for this account.`, 'Deactivate', () => { setActive(active.filter((x) => x !== h)); toast('UPI ID deactivated'); });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7', paddingTop: insets.top }}>
      <TitleBar title="Account Details" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + z(10) }}>
        <Box>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(16) }}>
            <View style={{ width: z(52), height: z(52), borderRadius: z(10), borderWidth: 1, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center' }}><BankLogo account={a} size={40} /></View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#1D1D1D', letterSpacing: 0.5 }}>******{a.last6 || a.last4}</Text>
              <Text style={{ fontSize: 14, color: '#6B6B6B' }}>{a.bankName}{nick ? ` · ${nick}` : ''}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: z(14) }} />
          <Pressable onPress={makePrimary} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 17, color: '#1D1D1D' }}>Set as Primary</Text>
            {a.primary ? <Sym name="check_circle" fill size={26} color="#1E8E3E" /> : <Sym name="radio_button_unchecked" size={26} color="#9A9A9A" />}
          </Pressable>
          <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: z(14) }} />
          <Detail k="Type" v={`${a.type === 'Current' ? 'Current' : 'Saving'} Account`} />
          <Detail k="Branch" v={a.branch || 'RTGS-HO'} />
          <Detail k="IFSC" v={a.ifsc} />
        </Box>

        <Box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#1D1D1D' }}>UPI PIN</Text>
            <Text style={{ fontSize: 15, color: '#6B6B6B', marginTop: z(4) }}>{a.hasPin ? `${a.pinLength || 4} digit UPI PIN exists` : 'UPI PIN not set'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: z(20) }}>
            <Act title="RESET" onPress={() => router.push(pinRoute('reset'))} />
            {a.hasPin && <Act title="CHANGE" onPress={() => router.push(pinRoute('change'))} />}
          </View>
        </Box>

        <Box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#1D1D1D' }}>Balance:  {balance != null ? inrShort(balance) : '₹----'}</Text>
          <Act title={balance != null ? 'REFRESH' : 'CHECK BALANCE'} onPress={check} />
        </Box>

        <Box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#1D1D1D' }}>International UPI is here</Text>
            <Text style={{ fontSize: 15, color: '#6B6B6B', marginTop: z(4), lineHeight: 20 }}>Scan and pay at select merchant stores abroad now</Text>
          </View>
          <Act title="ACTIVATE" onPress={() => toast('International UPI is not part of this demo')} />
        </Box>

        <Box style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#1D1D1D' }}>AutoPay</Text>
            <Text style={{ fontSize: 15, color: '#6B6B6B', marginTop: z(4), lineHeight: 20 }}>View your AutoPays set on this account</Text>
          </View>
          <Act title="MANAGE" onPress={() => toast('No AutoPays on this account')} />
        </Box>

        <Box style={{ paddingBottom: z(4) }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1D1D1D' }}>UPI IDs</Text>
          <Text style={{ fontSize: 14, color: '#6B6B6B', marginTop: z(4), lineHeight: 19 }}>Below UPI IDs can only be used with this account. To set a UPI ID as default, you can choose to de-activate the others.</Text>
          {HANDLES.filter((h) => active.includes(h)).map((h) => (
            <View key={h} style={{ flexDirection: 'row', alignItems: 'center', height: z(50) }}>
              <Text style={{ flex: 1, fontSize: 16, color: '#1D1D1D' }} numberOfLines={1}>{idFor(h, HANDLES.indexOf(h))}</Text>
              <Pressable hitSlop={8} onPress={() => removeId(h)}><Sym name="delete" size={22} color="#3A3A3A" /></Pressable>
            </View>
          ))}
          {HANDLES.filter((h) => !active.includes(h)).map((h) => (
            <View key={h} style={{ flexDirection: 'row', alignItems: 'center', height: z(50) }}>
              <Text style={{ flex: 1, fontSize: 16, color: '#9A9A9A' }}>@{h}</Text>
              <Pressable hitSlop={8} onPress={() => { setActive([...active, h]); toast('UPI ID activated'); }}><Sym name="add" size={24} color="#3A3A3A" /></Pressable>
            </View>
          ))}
        </Box>

        <Box style={{ paddingVertical: 0 }}>
          <Pressable onPress={() => setNickSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: z(18), height: z(54) }}>
            <Sym name="edit" size={22} color="#3A3A3A" />
            <Text style={{ fontSize: 16, color: '#1D1D1D' }}>{nick ? 'Edit Nickname' : 'Add Nickname'}</Text>
          </Pressable>
        </Box>
        <Box style={{ paddingVertical: 0 }}>
          <Pressable onPress={unlink} style={{ flexDirection: 'row', alignItems: 'center', gap: z(18), height: z(54) }}>
            <Sym name="delete" size={22} color={C.red} />
            <Text style={{ fontSize: 16, color: C.red }}>Unlink Bank Account</Text>
          </Pressable>
        </Box>
        <PoweredBy style={{ marginTop: z(10) }} />
      </ScrollView>

      <Sheet visible={nickSheet} onClose={() => setNickSheet(false)} title="Account nickname">
        <View style={{ paddingHorizontal: z(20), paddingBottom: z(8) }}>
          <TextInput value={nick} onChangeText={setNick} placeholder="e.g. Salary account" placeholderTextColor={C.faint} maxLength={24} style={ui.input} />
          <Btn title="Save" style={{ marginTop: z(14) }} onPress={() => { setNickSheet(false); toast('Nickname saved'); }} />
        </View>
      </Sheet>
    </View>
  );
}
