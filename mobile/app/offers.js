import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import * as Clipboard from 'expo-clipboard';
import { Empty, Header, Loading, MI, Screen, s } from '../components/ui';
import { get } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C } from '../lib/theme';

export default function Offers() {
  const { toast } = useApp();
  const [offers, setOffers] = useState(null);
  useLive(() => { get('/offers').then((r) => setOffers(r.offers)).catch(() => setOffers([])); });
  if (!offers) return <Screen><Header title="Offers" /><Loading /></Screen>;
  return (
    <Screen>
      <Header title="Offers" />
      <FlatList
        data={offers}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        ListEmptyComponent={<Empty icon="tag-outline" title="No offers right now" subtitle="Check back soon for new deals" />}
        renderItem={({ item }) => (
          <View style={[s.card, { overflow: 'hidden' }]}>
            <View style={{ backgroundColor: item.color, padding: 18, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: item.color }}>{item.brand?.[0]}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 14, flex: 1 }}>{item.brand}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 17, color: C.text, fontWeight: '500' }}>{item.title}</Text>
              <Text style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 20 }}>{item.description}</Text>
              {!!item.code && (
                <Pressable onPress={async () => { await Clipboard.setStringAsync(item.code); toast('Code copied'); }}
                  style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: C.blue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
                  <Text style={{ color: C.blue, fontWeight: '700', letterSpacing: 1 }}>{item.code}</Text>
                  <MI name="content-copy" size={16} color={C.blue} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
