import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/Text';
import { Loading, Sym } from '../components/ui';
import { BottomNav } from '../components/BottomNav';
import { groupByMonth, MonthHeader, TxnRow } from '../components/history';
import { get } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C, z } from '../lib/theme';

const FILTERS = [
  ['all', 'All'], ['out', 'Paid'], ['in', 'Received'], ['failed', 'Failed'], ['bills', 'Bills & Recharge'], ['30', 'Last 30 days'],
];

// History tab: search pill, Spend Insights card, month bands, Received/Paid rows.
export default function History() {
  const params = useLocalSearchParams();
  const { toast, settings } = useApp();
  const insets = useSafeAreaInsets();
  const [txns, setTxns] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(params.filter === '1');
  const appName = settings?.appName || 'PlumPay';

  useLive(() => { get('/transactions').then((r) => setTxns(r.transactions)).catch((e) => toast(e.message)); }, []);

  const sections = useMemo(() => {
    if (!txns) return [];
    const needle = q.trim().toLowerCase();
    const since = Date.now() - 30 * 86400000;
    const list = txns.filter((t) => {
      if (filter === 'out' && (t.direction !== 'out' || t.status !== 'success')) return false;
      if (filter === 'in' && (t.direction !== 'in' || t.status !== 'success')) return false;
      if (filter === 'failed' && t.status !== 'failed') return false;
      if (filter === 'bills' && !['bill', 'recharge'].includes(t.type)) return false;
      if (filter === '30' && t.createdAt < since) return false;
      if (needle && !`${t.counterparty?.name} ${t.note} ${t.upiRef} ${t.amount}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    let groups = groupByMonth(list);
    if (params.month && !needle && filter === 'all') {
      const i = groups.findIndex((g) => g.key === params.month);
      if (i > 0) groups = groups.slice(i);
    }
    return groups.map((g) => ({ title: g.key, total: g.total, data: g.items }));
  }, [txns, q, filter, params.month]);

  const top = (
    <View>
      <Pressable onPress={() => router.push('/balance')} style={{ marginHorizontal: z(16), marginTop: z(6), marginBottom: z(18), borderRadius: z(12), borderWidth: 1, borderColor: '#ECECEC', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), height: z(70) }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8) }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: '#1D1D1D' }}>Spend Insights</Text>
            <View style={{ width: z(26), height: z(16), borderRadius: z(8), backgroundColor: '#1D1D1D', alignItems: 'center', justifyContent: 'center' }}><Sym name="arrow_forward" size={12} color="#fff" /></View>
          </View>
          <Text style={{ fontSize: 14, color: '#6B6B6B', marginTop: z(3) }}>Ask {appName} AI</Text>
        </View>
        <View style={{ width: z(34), height: z(34), borderRadius: z(17), backgroundColor: '#FFD8C2', borderWidth: z(6), borderColor: '#FFEDE3' }} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: z(56), paddingHorizontal: z(16) }}>
        <Text style={{ flex: 1, fontSize: 21, fontWeight: '700', color: '#1D1D1D' }}>History</Text>
        <Pressable hitSlop={8} onPress={() => router.push('/help')}><Sym name="help" size={28} color="#1D1D1D" /></Pressable>
      </View>
      <View style={{ marginHorizontal: z(16), marginBottom: z(10), height: z(52), borderRadius: z(26), backgroundColor: C.lilac, flexDirection: 'row', alignItems: 'center', paddingLeft: z(16), paddingRight: z(6) }}>
        <Sym name="search" size={26} color="#1D1D1D" />
        <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor="#8A8A8A" style={{ flex: 1, fontSize: 17, color: C.text, marginLeft: z(12), paddingVertical: z(6), outlineStyle: 'none' }} />
        {!!q && <Pressable hitSlop={8} onPress={() => setQ('')} style={{ paddingHorizontal: z(6) }}><Sym name="close" size={22} color="#6B6B6B" /></Pressable>}
        <View style={{ width: 1, height: z(26), backgroundColor: '#D6CCE6' }} />
        <Pressable hitSlop={8} onPress={() => setShowFilters(!showFilters)} style={{ paddingHorizontal: z(12) }}>
          <Sym name="tune" size={26} color={filter !== 'all' ? C.purple : '#1D1D1D'} />
        </Pressable>
      </View>
      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: z(16), paddingBottom: z(10), gap: z(8) }}>
          {FILTERS.map(([k, l]) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={{ borderRadius: z(18), borderWidth: 1, borderColor: filter === k ? C.purple : '#DADADA', backgroundColor: filter === k ? C.lilac : '#fff', paddingHorizontal: z(14), height: z(34), justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: filter === k ? C.purple : '#3A3A3A', fontWeight: filter === k ? '600' : '400' }}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!txns ? <Loading /> : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled
          ListHeaderComponent={top}
          renderSectionHeader={({ section }) => <MonthHeader month={section.title} total={section.total} />}
          renderItem={({ item, index, section }) => <TxnRow t={item} last={index === section.data.length - 1} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: C.muted, marginTop: z(60) }}>No payments found</Text>}
          contentContainerStyle={{ paddingBottom: z(20) }}
        />
      )}
      <BottomNav active="history" />
    </View>
  );
}
