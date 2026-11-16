import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Empty, Header, Loading, MCI, MI, Screen } from '../components/ui';
import { get } from '../lib/api';
import { useFeature } from '../lib/store';
import { C } from '../lib/theme';
import { BILL_CATEGORIES } from '../lib/format';

export default function Bills() {
  const { category } = useLocalSearchParams();
  const enabled = useFeature('bills');
  const [billers, setBillers] = useState(null);
  const cat = BILL_CATEGORIES.find((c) => c.key === category);

  useEffect(() => {
    if (!category || !enabled) return;
    get(`/billers?category=${category}`).then((r) => setBillers(r.billers)).catch(() => setBillers([]));
  }, [category, enabled]);

  if (!enabled) return <Screen><Header title="Pay bills" /><Empty icon="receipt" title="Bill payments are unavailable" subtitle="Please try again later." /></Screen>;

  if (!category) {
    return (
      <Screen>
        <Header title="Pay bills" />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 16, color: C.text, fontWeight: '500', marginBottom: 12, marginLeft: 4 }}>Recharges & bills</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[{ key: 'recharge', label: 'Mobile recharge', icon: 'cellphone' }, ...BILL_CATEGORIES].map((c) => (
              <Pressable key={c.key} onPress={() => (c.key === 'recharge' ? router.push('/recharge') : router.push({ pathname: '/bills', params: { category: c.key } }))}
                style={{ width: '25%', alignItems: 'center', marginBottom: 22 }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <MCI name={c.icon} size={28} color={C.blueDark} />
                </View>
                <Text style={{ fontSize: 12.5, color: C.text, marginTop: 8, textAlign: 'center' }} numberOfLines={2}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, backgroundColor: C.greenSoft, borderRadius: 16, padding: 16, marginTop: 8 }}>
            <MCI name="gift-outline" size={26} color={C.green} />
            <Text style={{ flex: 1, color: C.text, lineHeight: 20 }}>Pay bills above ₹200 and get a scratch card with up to ₹150 cashback.</Text>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={cat?.label || 'Billers'} subtitle="Select your biller" />
      {!billers ? <Loading /> : (
        <FlatList
          data={billers}
          keyExtractor={(b) => b.id}
          ListEmptyComponent={<Empty icon={cat?.icon} title="No billers available" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/bill-pay', params: { billerId: item.id, name: item.name, category, color: item.color } })}
              android_ripple={{ color: '#eee' }} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 }}>
              <Avatar name={item.name} color={item.color} size={44} icon={cat?.icon} />
              <Text style={{ flex: 1, fontSize: 16, color: C.text }}>{item.name}</Text>
              <MI name="chevron-right" size={22} color={C.faint} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
