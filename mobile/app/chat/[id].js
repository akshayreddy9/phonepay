import { useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/Text';
import { Avatar, Btn, goBack, Loading, Screen, Seal, Sheet, Row, Sym } from '../../components/ui';
import { Wordmark } from '../../components/Logo';
import { get, post } from '../../lib/api';
import { useApp, useFeature, useLive } from '../../lib/store';
import { dayMonYear, inrShort, maskPhone, time12 } from '../../lib/format';
import { C, z } from '../../lib/theme';

// "PAID" style round stamp in the corner of a payment bubble.
function Stamp() {
  return (
    <View style={{ position: 'absolute', right: z(10), top: z(16), width: z(46), height: z(46), borderRadius: z(23), borderWidth: 1.5, borderColor: '#E3E6EA', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] }}>
      <Wordmark size={10} style={{ opacity: 0.35 }} />
    </View>
  );
}

function TxnBubble({ item }) {
  const out = item.direction === 'out';
  const failed = item.status === 'failed';
  const pending = item.status === 'pending';
  return (
    <Pressable onPress={() => router.push(`/txn/${item.id}`)} style={{ alignSelf: out ? 'flex-end' : 'flex-start', width: '62%', marginVertical: z(8) }}>
      <View style={{ backgroundColor: '#fff', borderRadius: z(16), overflow: 'hidden' }}>
        <View style={{ padding: z(16), paddingBottom: z(10) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(6) }}>
            <Text style={{ fontSize: 32, fontWeight: '500', color: failed ? C.muted : '#1D1D1D', textDecorationLine: failed ? 'line-through' : 'none' }}>
              <Text style={{ fontSize: 22 }}>₹</Text>{inrShort(item.amount).replace('₹', '')}
            </Text>
            {failed ? <Sym name="error" fill size={24} color={C.red} /> : pending ? <Sym name="schedule" fill size={24} color={C.amber} /> : <Seal size={26} color={C.green} />}
          </View>
          <Text style={{ fontSize: 17, color: '#3A3A3A', marginTop: z(4) }}>{failed ? 'Failed' : pending ? 'Pending' : item.type === 'refund' ? 'Refunded' : out ? 'Paid' : 'Received'}</Text>
          {!!item.note && <Text style={{ fontSize: 14, color: C.muted, marginTop: z(2) }} numberOfLines={2}>{item.note}</Text>}
          <Text style={{ fontSize: 12, color: '#7A7A7A', alignSelf: 'flex-end', marginTop: z(4) }}>{time12(item.createdAt)}</Text>
          {!failed && <Stamp />}
        </View>
        <View style={{ height: z(5), backgroundColor: failed ? C.red : '#1E6FD9' }} />
      </View>
    </Pressable>
  );
}

function RequestBubble({ item, other, onPay, onDecline }) {
  const mine = item.mine;
  const pending = item.status === 'pending';
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', width: '68%', marginVertical: z(8) }}>
      <View style={{ backgroundColor: '#fff', borderRadius: z(16), padding: z(16), borderWidth: 1, borderColor: '#D6E6F8' }}>
        <Text style={{ fontSize: 13, color: C.muted }}>{mine ? `You requested from ${other.name.split(' ')[0]}` : `${other.name.split(' ')[0]} requested`}</Text>
        <Text style={{ fontSize: 30, fontWeight: '500', color: C.text, marginTop: z(4) }}>{inrShort(item.amount)}</Text>
        {!!item.note && <Text style={{ fontSize: 14, color: C.text }}>{item.note}</Text>}
        <Text style={{ fontSize: 12, color: C.muted, marginTop: z(6) }}>{pending ? 'Pending' : item.status[0].toUpperCase() + item.status.slice(1)} · {time12(item.createdAt)}</Text>
        {pending && (
          <View style={{ flexDirection: 'row', gap: z(8), marginTop: z(12) }}>
            {!mine && <Btn title="Pay" onPress={onPay} style={{ height: z(38), flex: 1 }} />}
            <Btn title={mine ? 'Cancel' : 'Decline'} variant="outline" onPress={onDecline} style={{ height: z(38), flex: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function Chat() {
  const { id } = useLocalSearchParams();
  const { toast } = useApp();
  const canRequest = useFeature('requests');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const list = useRef(null);

  useLive(() => { get(`/thread/${id}`).then(setData).catch((e) => toast(e.message)); }, [id]);

  if (!data) return <Screen bg={C.page}><Loading /></Screen>;
  const other = data.user;

  const items = [];
  let lastDay = '';
  data.items.forEach((it) => {
    const day = dayMonYear(it.at);
    if (day !== lastDay) { items.push({ kind: 'day', id: 'd' + it.at, label: day }); lastDay = day; }
    items.push(it);
  });

  return (
    <Screen bg={C.page}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: z(72), paddingHorizontal: z(12), gap: z(12), backgroundColor: C.page }}>
        <Pressable hitSlop={10} onPress={goBack}><Sym name="arrow_back" size={28} color="#1D1D1D" /></Pressable>
        <Pressable onPress={() => router.push({ pathname: '/my-qr', params: { userId: other.id } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: z(12) }}>
          <Avatar user={other} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1D1D1D' }} numberOfLines={1}>{other.name}</Text>
            <Text style={{ fontSize: 14, color: '#3A3A3A', marginTop: z(1) }}>{other.isMerchant ? other.merchantCategory : maskPhone(other.phone)}</Text>
          </View>
        </Pressable>
        <Pressable hitSlop={8} onPress={() => router.push('/history')}><Sym name="calendar_month" size={26} color="#1D1D1D" /></Pressable>
        <Pressable hitSlop={8} onPress={() => setMenu(true)}><Sym name="more_vert" size={26} color="#1D1D1D" /></Pressable>
      </View>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: z(16), flexGrow: 1 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={(
          <View style={{ alignItems: 'center', marginTop: z(60) }}>
            <Avatar user={other} size={72} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: C.text, marginTop: z(12) }}>{other.name}</Text>
            <Text style={{ fontSize: 14, color: C.muted, marginTop: z(12), textAlign: 'center' }}>Payments with {other.name.split(' ')[0]} will appear here.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            return <View style={{ alignSelf: 'center', backgroundColor: '#E6E8EC', borderRadius: z(8), paddingHorizontal: z(10), paddingVertical: z(4), marginVertical: z(8) }}><Text style={{ color: '#3A3A3A', fontSize: 13 }}>{item.label}</Text></View>;
          }
          if (item.kind === 'request') {
            return (
              <RequestBubble item={item} other={other}
                onPay={() => router.push({ pathname: '/pay', params: { userId: other.id, amount: String(item.amount), note: item.note, requestId: item.id } })}
                onDecline={() => post(`/requests/${item.id}/decline`).then(() => toast(item.mine ? 'Request cancelled' : 'Request declined')).catch((e) => toast(e.message))} />
            );
          }
          return <TxnBubble item={item} />;
        }}
      />
      <View style={{ padding: z(12), paddingTop: z(6), backgroundColor: C.page }}>
        <Pressable onPress={() => router.push({ pathname: '/pay', params: { userId: other.id } })} style={({ pressed }) => [{ height: z(54), borderRadius: z(14), backgroundColor: pressed ? '#0A3780' : '#0B3D96', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(10) }]}>
          <Sym name="verified_user" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '600' }}>Pay Securely</Text>
        </Pressable>
      </View>
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        {canRequest && !other.isMerchant && <Row icon="request_quote" title={`Request money from ${other.name.split(' ')[0]}`} onPress={() => { setMenu(false); router.push({ pathname: '/pay', params: { userId: other.id, mode: 'request' } }); }} />}
        <Row icon="qr_code_2" title="View UPI ID & QR" onPress={() => { setMenu(false); router.push({ pathname: '/my-qr', params: { userId: other.id } }); }} />
        <Row icon="support_agent" title="Report an issue" onPress={() => { setMenu(false); router.push('/help'); }} />
      </Sheet>
    </Screen>
  );
}
