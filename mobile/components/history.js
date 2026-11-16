import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './Text';
import { Avatar, BankLogo, Sym } from './ui';
import { inrShort, monthKey } from '../lib/format';
import { C, z } from '../lib/theme';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "02 Nov"
export const shortDay = (ts) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}`; };

const TYPE_ICON = { bill: 'receipt_long', recharge: 'smartphone', admin: 'request_quote', cashback: 'redeem', refund: 'currency_exchange', self: 'account_balance', bank_transfer: 'account_balance' };

// Money that left the user's accounts to someone else (self transfers don't count as spending).
export const isSpend = (t) => t.direction === 'out' && t.status === 'success' && t.type !== 'self';

// [{ key: 'November 2026', total, items: [...] }] in the order given (newest first).
export function groupByMonth(list) {
  const groups = [];
  for (const t of list) {
    const key = monthKey(t.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, total: 0, items: [] }; groups.push(g); }
    g.items.push(t);
    if (isSpend(t)) g.total += t.amount;
  }
  return groups;
}

export function categoryOf(t) {
  if (t.direction === 'in' && (t.category === 'Money Transfer' || !t.category) && t.type === 'p2p') return 'Money Received';
  return t.category || 'Others';
}

export function TxnAvatar({ t, size = 48 }) {
  const u = t.counterparty?.user;
  if (u) return <Avatar user={u} size={size} />;
  const icon = TYPE_ICON[t.type] || 'payments';
  return (
    <View style={{ width: z(size), height: z(size), borderRadius: z(size / 2), backgroundColor: '#F1E9FB', alignItems: 'center', justifyContent: 'center' }}>
      <Sym name={icon} size={size * 0.48} color={C.icon} />
    </View>
  );
}

// Grey month band: "November 2026" (total spent on the right when asked for).
export function MonthHeader({ month, total, onPress, showTotal }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3F7', paddingHorizontal: z(16), paddingVertical: z(14) }}>
      <Text style={{ flex: 1, fontSize: 16, color: '#4A4A4A' }}>{month}</Text>
      {showTotal && <Text style={{ fontSize: 13, color: '#6B6B6B' }}>Spent {inrShort(total)}</Text>}
    </Pressable>
  );
}

// "Received from / Paid to" label for a payment.
export function txnVerb(t) {
  if (t.status === 'failed') return 'Payment to';
  if (t.direction === 'in') return t.type === 'cashback' || t.type === 'refund' ? 'Credited from' : 'Received from';
  if (t.type === 'self') return 'Transferred to';
  if (t.type === 'bill' || t.type === 'recharge') return 'Bill paid to';
  return 'Paid to';
}

const ArrowBubble = ({ dir }) => (
  <View style={{ width: z(40), height: z(40), borderRadius: z(20), backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' }}>
    <Sym name={dir === 'in' ? 'south_west' : 'north_east'} size={22} color="#1D1D1D" />
  </View>
);

// One history row: arrow, "Received from" + name + date, amount and "Credited to [bank]".
export function TxnRow({ t, last }) {
  const out = t.direction === 'out';
  const failed = t.status === 'failed';
  const pending = t.status === 'pending';
  const acc = out ? t.fromAccount : t.toAccount;
  const u = t.counterparty?.user;
  return (
    <Pressable onPress={() => router.push(`/txn/${t.id}`)} android_ripple={{ color: '#eee' }} style={{ flexDirection: 'row', paddingLeft: z(16), paddingTop: z(16) }}>
      {u?.photo ? <Avatar user={u} size={40} /> : t.type === 'p2p' || t.type === 'self' || t.type === 'bank_transfer' ? <ArrowBubble dir={t.direction} /> : <TxnAvatar t={t} size={40} />}
      <View style={{ flex: 1, marginLeft: z(14), paddingRight: z(16), paddingBottom: z(16), borderBottomWidth: last ? 0 : 1, borderColor: '#EFEFEF' }}>
        <Text style={{ fontSize: 13, color: '#6B6B6B' }}>{txnVerb(t)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(10), marginTop: z(2) }}>
          <Text style={{ flex: 1, fontSize: 17, color: '#1D1D1D' }} numberOfLines={1}>{t.counterparty?.name}</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: failed ? '#1D1D1D' : out ? '#1D1D1D' : '#1E8E3E' }}>{!out && !failed && !pending ? '+ ' : ''}{inrShort(t.amount)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: z(6) }}>
          <Text style={{ flex: 1, fontSize: 13, color: '#9A9A9A' }}>{shortDay(t.createdAt)}</Text>
          {failed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(4) }}>
              <Text style={{ fontSize: 13, color: '#6B6B6B' }}>Failed</Text>
              <View style={{ width: z(8), height: z(8), borderRadius: z(4), backgroundColor: C.red }} />
            </View>
          ) : pending ? <Text style={{ fontSize: 13, color: C.amber }}>Pending</Text> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(5) }}>
              <Text style={{ fontSize: 13, color: '#9A9A9A' }}>{out ? 'Debited from' : 'Credited to'}</Text>
              {acc ? <BankLogo account={acc} size={14} /> : <Sym name="account_balance_wallet" size={14} color={C.icon} />}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
