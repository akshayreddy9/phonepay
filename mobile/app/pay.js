import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { AccountSheet } from '../components/pay';
import { Avatar, BankLogo, Btn, Loading, MI, Screen, Seal } from '../components/ui';
import { get, post } from '../lib/api';
import { useApp } from '../lib/store';
import { startPayment } from '../lib/payment';
import { C, z } from '../lib/theme';
import { inr, rupeesInWords } from '../lib/format';

export default function Pay() {
  const params = useLocalSearchParams();
  const { userId, requestId, mode = 'pay' } = params;
  const { accounts, settings, requestPin, toast } = useApp();
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState(params.amount ? String(params.amount) : '');
  const [note, setNote] = useState(params.note || '');
  const [noteOpen, setNoteOpen] = useState(!!params.note);
  const [sheet, setSheet] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);
  const isRequest = mode === 'request';

  useEffect(() => { get(`/users/${userId}`).then((r) => setTo(r.user)).catch((e) => toast(e.message)); }, [userId, toast]);
  useEffect(() => { if (!accountId && accounts.length) setAccountId((accounts.find((a) => a.primary) || accounts[0]).id); }, [accounts, accountId]);

  const value = Number(amount || 0);
  const limit = settings?.perTxLimit || 100000;
  const tooMuch = value > limit;
  const account = accounts.find((a) => a.id === accountId);

  const onAmount = (t) => {
    let v = t.replace(/[^\d.]/g, '');
    const [i, d] = v.split('.');
    v = d !== undefined ? `${i.slice(0, 6)}.${d.slice(0, 2)}` : i.slice(0, 6);
    setAmount(v.replace(/^0+(?=\d)/, ''));
  };

  const proceed = async () => {
    if (isRequest) {
      setBusy(true);
      try {
        await post('/requests', { toUserId: userId, amount: value, note });
        toast(`Requested ${inr(value)} from ${to.name}`);
        router.back();
      } catch (e) { toast(e.message); } finally { setBusy(false); }
      return;
    }
    if (!accounts.length) { router.push({ pathname: '/link-bank', params: { from: 'settings' } }); return; }
    pay();
  };

  const pay = () => {
    setSheet(false);
    startPayment(requestPin, {
      account, amount: value, to: { name: to.name, sub: to.upiId },
      payload: { type: 'p2p', toUserId: to.id, note, requestId },
    });
  };

  if (!to) return <Screen><Loading /></Screen>;

  return (
    <Screen bg={C.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 72, gap: 12 }}>
          <Pressable hitSlop={10} onPress={() => router.back()}><MI name="arrow-back" size={28} color={C.text} /></Pressable>
          <Avatar user={to} size={46} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, flexShrink: 1 }} numberOfLines={1}>{to.name}</Text>
              <Seal size={18} color="#1DA1F2" />
            </View>
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 1 }} numberOfLines={1}>UPI ID: {to.upiId}</Text>
          </View>
        </View>
        <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => amountRef.current?.focus()}>
          <Text style={{ fontSize: 15, color: C.muted, marginBottom: 6 }}>{isRequest ? `Requesting from ${to.name.split(' ')[0]}` : `Paying ${to.name.split(' ')[0]}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 40, color: amount ? C.text : C.faint, marginRight: 4, fontWeight: '600' }}>₹</Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={onAmount}
              keyboardType="decimal-pad"
              autoFocus
              placeholder="0"
              placeholderTextColor={C.faint}
              style={{ fontSize: 52, color: C.text, width: z(Math.max(1, amount.length) * 34 + 8), padding: 0, fontWeight: '700', outlineStyle: 'none', borderWidth: 0 }}
            />
          </View>
          {!!value && <Text style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{rupeesInWords(value)}</Text>}
          {tooMuch && <Text style={{ color: C.red, marginTop: 6 }}>Amount exceeds the limit of {inr(limit)} per payment</Text>}
          {noteOpen ? (
            <TextInput value={note} onChangeText={setNote} autoFocus={!params.note} maxLength={50} placeholder="Add Message (Optional)" placeholderTextColor={C.faint}
              style={{ marginTop: 22, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 18, height: 44, minWidth: 200, textAlign: 'center', fontSize: 15, color: C.text }} />
          ) : (
            <Pressable onPress={() => setNoteOpen(true)} style={{ marginTop: 22, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 18, height: 44, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MI name="chat-bubble-outline" size={18} color={C.link} />
              <Text style={{ color: C.link, fontSize: 15, fontWeight: '500' }}>Add Message</Text>
            </Pressable>
          )}
        </Pressable>

        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 }}>
          {!isRequest && (
            <Pressable onPress={() => setSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {account ? <BankLogo account={account} size={28} /> : <MI name="account-balance" size={26} color={C.muted} />}
              <Text style={{ flex: 1, fontSize: 15, color: C.text }} numberOfLines={1}>{account ? `${account.bankName} - ${account.last4}` : 'Add bank account'}</Text>
              <Text style={{ fontSize: 14, color: C.link, fontWeight: '600' }}>Change</Text>
            </Pressable>
          )}
          <Btn title={isRequest ? 'Request' : value ? `Pay ${inr(value)}` : 'Pay'} onPress={proceed} disabled={!value || tooMuch} loading={busy} style={{ borderRadius: 14 }} />
        </View>
      </KeyboardAvoidingView>
      <AccountSheet visible={sheet} onClose={() => setSheet(false)} accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} amount={value} onPay={pay} />
    </Screen>
  );
}
