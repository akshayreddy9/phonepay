import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { AccountSheet } from '../components/pay';
import { Empty, Header, Loading, MI, Screen, s } from '../components/ui';
import { get } from '../lib/api';
import { useApp, useFeature } from '../lib/store';
import { startPayment } from '../lib/payment';
import { C } from '../lib/theme';
import { inr } from '../lib/format';

export default function Recharge() {
  const { user, accounts, requestPin } = useApp();
  const enabled = useFeature('recharge');
  const [mobile, setMobile] = useState(user?.phone || '');
  const [operators, setOperators] = useState([]);
  const [operator, setOperator] = useState(null);
  const [plans, setPlans] = useState(null);
  const [tab, setTab] = useState('All');
  const [plan, setPlan] = useState(null);
  const [accountId, setAccountId] = useState((accounts.find((a) => a.primary) || accounts[0])?.id);

  useEffect(() => { if (enabled) get('/recharge/operators').then((r) => setOperators(r.operators)).catch(() => {}); }, [enabled]);
  useEffect(() => {
    if (mobile.length !== 10 || !enabled) return;
    get(`/recharge/detect?mobile=${mobile}`).then((r) => r.operator && setOperator(r.operator)).catch(() => {});
  }, [mobile, enabled]);
  useEffect(() => {
    if (!operator) return;
    setPlans(null);
    get(`/recharge/plans?operatorId=${operator.id}`).then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  }, [operator]);

  const tabs = useMemo(() => ['All', ...new Set((plans || []).map((p) => p.tag).filter(Boolean))], [plans]);
  const shown = (plans || []).filter((p) => tab === 'All' || p.tag === tab);

  if (!enabled) return <Screen><Header title="Mobile recharge" /><Empty icon="cellphone" title="Recharge is unavailable" subtitle="Please try again later." /></Screen>;

  const pay = () => {
    const p = plan;
    setPlan(null);
    startPayment(requestPin, {
      account: accounts.find((a) => a.id === accountId),
      amount: p.price,
      to: { name: `${operator.name} Prepaid · ${mobile}` },
      payload: { type: 'recharge', operatorId: operator.id, planId: p.id, mobile, note: `${p.data} · ${p.validity}` },
    });
  };

  return (
    <Screen>
      <Header title="Mobile recharge" />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Text style={{ fontSize: 16, color: C.muted }}>+91</Text>
          <TextInput value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" style={{ flex: 1, fontSize: 18, color: C.text }} placeholder="Mobile number" placeholderTextColor={C.faint} />
          {mobile === user?.phone && <Text style={{ fontSize: 12, color: C.blue }}>My number</Text>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 14 }}>
          {operators.map((o) => (
            <Pressable key={o.id} onPress={() => setOperator(o)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 40, borderRadius: 20, borderWidth: operator?.id === o.id ? 2 : 1, borderColor: operator?.id === o.id ? C.blue : C.line }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: o.color }} />
              <Text style={{ color: C.text }}>{o.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!operator ? <Empty icon="cellphone-message" title="Enter a mobile number" subtitle="We'll detect the operator and show available plans" />
        : !plans ? <Loading /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderColor: C.line }} contentContainerStyle={{ paddingHorizontal: 12 }}>
              {tabs.map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderColor: tab === t ? C.blue : 'transparent' }}>
                  <Text style={{ color: tab === t ? C.blue : C.muted, fontWeight: '600' }}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <FlatList
              data={shown}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => setPlan(item)} style={[s.card, { padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, color: C.text, fontWeight: '500', flex: 1 }}>{inr(item.price)}</Text>
                    {!!item.tag && <View style={{ backgroundColor: C.blueSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: C.blueDark, fontSize: 12 }}>{item.tag}</Text></View>}
                    <MI name="chevron-right" size={22} color={C.faint} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 24, marginTop: 10 }}>
                    <View><Text style={{ fontSize: 12, color: C.muted }}>Validity</Text><Text style={{ color: C.text }}>{item.validity}</Text></View>
                    <View><Text style={{ fontSize: 12, color: C.muted }}>Data</Text><Text style={{ color: C.text }}>{item.data}</Text></View>
                  </View>
                  <Text style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>{item.description}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Empty icon="sim-off-outline" title="No plans available" />}
            />
          </>
        )}
      {plan && (
        <AccountSheet visible onClose={() => setPlan(null)} accounts={accounts} selectedId={accountId} onSelect={(a) => setAccountId(a.id)} amount={plan.price} onPay={pay}
          payLabel={`Recharge ${inr(plan.price)}`} />
      )}
    </Screen>
  );
}
