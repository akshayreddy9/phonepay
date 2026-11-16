import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { BankLogo, goBack, Sym } from './ui';
import { TxnAvatar } from './history';
import { useApp } from '../lib/store';
import { inrShort } from '../lib/format';
import { C, z } from '../lib/theme';

const pad = (n) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "05:39 PM on 29 Sep 2026"
export function receiptTime(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'} on ${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

// App transaction ID built from the time and UPI reference: T2609291738…
export function txnCode(t) {
  const d = new Date(t.createdAt);
  return `T${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${String(t.upiRef || '').padStart(12, '0')}`;
}

export const receiptTitle = (t) => (t.status === 'failed' ? 'Transaction Failed' : t.status === 'pending' ? 'Transaction Pending' : 'Transaction Successful');
const headColor = (t) => (t.status === 'failed' ? '#C62828' : t.status === 'pending' ? '#B06000' : C.okGreen);

export function shareReceipt(t, appName) {
  return Share.share({
    message: `${receiptTitle(t)}: ${inrShort(t.amount)}\n${t.direction === 'out' ? 'Paid to' : 'Received from'}: ${t.counterparty?.name}\n${receiptTime(t.createdAt)}\nTransaction ID: ${txnCode(t)}\nUTR: ${t.upiRef}\n\n${appName || 'PlumPay'} demo receipt. No real money was moved.`,
  });
}

const maskPhone = (p) => (p ? `+91 ••••• •${String(p).slice(-4)}` : '');
const Copy = ({ onPress }) => <Pressable hitSlop={10} onPress={onPress}><Sym name="content_copy" size={22} color={C.purpleText} /></Pressable>;

function Action({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, alignItems: 'center' }, pressed && { opacity: 0.6 }]}>
      <View style={{ width: z(48), height: z(48), borderRadius: z(24), backgroundColor: C.lilac, alignItems: 'center', justifyContent: 'center' }}>
        <Sym name={icon} size={22} color={C.purple} />
      </View>
      <Text style={{ fontSize: 14, color: '#3A3A3A', textAlign: 'center', marginTop: z(8), lineHeight: 18 }}>{label}</Text>
    </Pressable>
  );
}

// Receipt card: who, amount, banking name, transfer details (ID, bank, UTR) and actions.
export function Receipt({ t }) {
  const { settings, toast } = useApp();
  const [open, setOpen] = useState(true);
  const out = t.direction === 'out';
  const failed = t.status === 'failed';
  const other = t.counterparty || {};
  const ou = other.user;
  const appName = settings?.appName || 'PlumPay';
  const myAcc = out ? t.fromAccount : t.toAccount;
  const copy = async (v, what) => { await Clipboard.setStringAsync(String(v)); toast(`${what} copied`); };
  const bankName = other.bankingName || other.name || '';
  const shortBankName = bankName.length > 22 ? `${bankName.slice(0, 10)}...${bankName.slice(-9)}` : bankName;
  const isP2p = t.type === 'p2p' && ou;

  return (
    <View>
      <View style={{ backgroundColor: '#fff', borderRadius: z(12), marginHorizontal: z(10), marginTop: z(10), padding: z(16) }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1D1D1D' }}>{out ? (t.type === 'self' ? 'Transferred to' : 'Paid to') : 'Received from'}</Text>
        <View style={{ flexDirection: 'row', gap: z(14), marginTop: z(14) }}>
          {ou || t.type === 'p2p' || t.type === 'self' ? (
            <View style={{ width: z(44), height: z(44), borderRadius: z(10), backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
              <Sym name={out ? 'person' : 'south_west'} size={26} color="#fff" />
            </View>
          ) : <TxnAvatar t={t} size={44} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, color: '#1D1D1D', lineHeight: 24 }}>{other.name}</Text>
            {!!(ou?.phone || other.handle) && <Text style={{ fontSize: 15, color: '#6B6B6B', marginTop: z(4) }}>{ou?.phone ? maskPhone(ou.phone) : other.handle}</Text>}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D1D1D' }}>{inrShort(t.amount)}</Text>
        </View>

        {failed && (
          <View style={{ flexDirection: 'row', gap: z(8), backgroundColor: C.redSoft, borderRadius: z(10), padding: z(10), marginTop: z(14) }}>
            <Sym name="info" size={18} color={C.red} />
            <Text style={{ flex: 1, color: '#8A1C1F', fontSize: 14 }}>{t.failureReason || 'Payment declined by bank'}. Any money debited will be refunded within 3-5 working days.</Text>
          </View>
        )}

        {!!bankName && (
          <>
            <View style={{ height: 1, backgroundColor: '#EEE', marginTop: z(16) }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: z(14), gap: z(6) }}>
              <Text style={{ fontSize: 14, color: '#6B6B6B' }}>Banking Name   :  {shortBankName}</Text>
              <Sym name="verified_user" fill size={15} color="#1E8E3E" />
            </View>
          </>
        )}

        <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: z(16), marginTop: z(20) }}>
          <Sym name="receipt_long" size={24} color="#3A3A3A" />
          <Text style={{ flex: 1, fontSize: 17, color: '#1D1D1D' }}>Transfer Details</Text>
          <Sym name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={26} color="#1D1D1D" />
        </Pressable>
        {open && (
          <View style={{ marginTop: z(12) }}>
            <Text style={{ fontSize: 14, color: '#6B6B6B' }}>{appName} Transaction ID</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: z(4) }}>
              <Text style={{ flex: 1, fontSize: 16, color: '#1D1D1D' }} numberOfLines={1}>{txnCode(t)}</Text>
              <Copy onPress={() => copy(txnCode(t), 'Transaction ID')} />
            </View>
            <Text style={{ fontSize: 14, color: '#6B6B6B', marginTop: z(14) }}>{out ? 'Debited from' : 'Credited to'}</Text>
            <View style={{ flexDirection: 'row', gap: z(14), marginTop: z(6) }}>
              {myAcc ? <View style={{ width: z(40), height: z(40), borderRadius: z(8), borderWidth: 1, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center' }}><BankLogo account={myAcc} size={30} /></View>
                : <Sym name="account_balance_wallet" size={30} color={C.purple} />}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 18, color: '#1D1D1D' }}>{myAcc ? `XXXXXX${myAcc.last6 || myAcc.last4}` : `${appName} Wallet`}</Text>
                  <Text style={{ fontSize: 18, color: '#1D1D1D' }}>{inrShort(t.amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: z(8) }}>
                  <Text style={{ flex: 1, fontSize: 16, color: '#6B6B6B' }}>UTR: {t.upiRef}</Text>
                  <Copy onPress={() => copy(t.upiRef, 'UTR')} />
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 1, backgroundColor: '#EEE', marginTop: z(18) }} />
        <View style={{ flexDirection: 'row', marginTop: z(18) }}>
          {out && isP2p && <Action icon="north_east" label={'Send\nAgain'} onPress={() => router.push({ pathname: '/pay', params: { userId: ou.id, amount: String(t.amount) } })} />}
          {!out && isP2p && <Action icon="north_east" label={'Pay\nBack'} onPress={() => router.push({ pathname: '/pay', params: { userId: ou.id } })} />}
          <Action icon="schedule" label={'View\nHistory'} onPress={() => (ou ? router.push(`/chat/${ou.id}`) : router.push('/history'))} />
          {out && <Action icon="call_split" label={'Split\nExpense'} onPress={() => toast(`Split ${inrShort(t.amount)}: ask friends from their chat`)} />}
          <Action icon="share" label={'Share\nReceipt'} onPress={() => shareReceipt(t, appName)} />
        </View>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/help', params: { txnId: t.id, subject: `Issue with payment of ${inrShort(t.amount)} (${t.upiRef})` } })}
        style={{ backgroundColor: '#fff', borderRadius: z(12), marginHorizontal: z(10), marginTop: z(10), flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), height: z(58), gap: z(18) }}>
        <Sym name="help" size={24} color="#3A3A3A" />
        <Text style={{ flex: 1, fontSize: 16.5, color: '#1D1D1D' }}>Contact {appName} Support</Text>
        <Sym name="chevron_right" size={24} color="#1D1D1D" />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(5), marginTop: z(14) }}>
        <Sym name="science" size={13} color="#9A9A9A" />
        <Text style={{ fontSize: 11.5, color: '#9A9A9A' }}>Demo transaction · {appName} college project, no real money moved</Text>
      </View>
    </View>
  );
}

// Coloured header: back arrow, "Transaction Successful", time.
export function ReceiptHeader({ t, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: headColor(t), paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: z(64), paddingHorizontal: z(16), gap: z(26) }}>
        <Pressable hitSlop={10} onPress={onBack || goBack}><Sym name="arrow_back" size={26} color="#fff" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#fff' }} numberOfLines={1}>{receiptTitle(t)}</Text>
          <Text style={{ fontSize: 14, color: '#fff', marginTop: z(1) }}>{receiptTime(t.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}
