import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import * as Haptics from 'expo-haptics';
import { Empty, Header, Loading, MCI, MI, Screen } from '../components/ui';
import { ScratchCard } from '../components/pay';
import { get, post } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C, screenWidth } from '../lib/theme';
import { inr, shortDate } from '../lib/format';

const CARD = (screenWidth() - 48) / 2;

function Revealed({ r, big }) {
  const won = r.amount > 0;
  return (
    <View style={{ alignItems: 'center', padding: 12 }}>
      <MCI name={won ? 'trophy' : 'emoticon-happy-outline'} size={big ? 64 : 40} color={won ? '#E37400' : C.muted} />
      {won ? (
        <>
          <Text style={{ fontSize: big ? 14 : 12, color: C.muted, marginTop: 8 }}>You won</Text>
          <Text style={{ fontSize: big ? 40 : 26, color: C.text, fontWeight: '500' }}>{inr(r.amount)}</Text>
          <Text style={{ fontSize: big ? 13 : 11, color: C.muted, textAlign: 'center' }}>Cashback added to your bank account</Text>
        </>
      ) : <Text style={{ fontSize: big ? 18 : 13, color: C.muted, marginTop: 8, textAlign: 'center' }}>Better luck next time</Text>}
    </View>
  );
}

export default function Rewards() {
  const { toast } = useApp();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useLive(() => { get('/rewards').then(setData).catch((e) => toast(e.message)); });

  const reveal = async () => {
    setRevealed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const r = await post(`/rewards/${open.id}/scratch`);
      setOpen(r.reward);
      setData((d) => ({ ...d, rewards: d.rewards.map((x) => (x.id === r.reward.id ? r.reward : x)), total: d.total + r.reward.amount }));
    } catch (e) { toast(e.message); }
  };

  if (!data) return <Screen><Header title="Rewards" /><Loading /></Screen>;

  return (
    <Screen bg="#fff">
      <Header title="Rewards" />
      <FlatList
        data={data.rewards}
        numColumns={2}
        keyExtractor={(r) => r.id}
        columnWrapperStyle={{ gap: 16, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        ListHeaderComponent={(
          <View style={{ margin: 16, marginBottom: 0, borderRadius: 20, backgroundColor: '#FEF7E0', padding: 20, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: C.muted }}>Total rewards earned</Text>
              <Text style={{ fontSize: 34, color: C.text, marginTop: 4 }}>{inr(data.total)}</Text>
              <Text style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{data.rewards.filter((r) => !r.scratched).length} scratch cards to open</Text>
            </View>
            <MCI name="trophy-variant" size={64} color="#F9AB00" />
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => { setOpen(item); setRevealed(item.scratched); }} style={{ width: CARD, height: CARD, borderRadius: 20, overflow: 'hidden', backgroundColor: item.scratched ? '#fff' : C.gBlue, borderWidth: item.scratched ? 1 : 0, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            {item.scratched ? <Revealed r={item} /> : (
              <>
                <View style={{ position: 'absolute', width: CARD * 1.4, height: CARD * 1.4, borderRadius: CARD, backgroundColor: 'rgba(255,255,255,0.08)', top: -CARD * 0.6, left: -CARD * 0.4 }} />
                <MCI name="gift" size={56} color="#fff" />
                <Text style={{ color: '#fff', marginTop: 8, fontWeight: '600' }}>Scratch card</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>{shortDate(item.createdAt)}</Text>
              </>
            )}
          </Pressable>
        )}
        ListEmptyComponent={<Empty icon="gift-outline" title="No rewards yet" subtitle="Pay bills, recharge or pay merchants to win scratch cards" />}
      />

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => setOpen(null)} style={{ position: 'absolute', top: 48, right: 20, padding: 8 }}><MI name="close" size={28} color="#fff" /></Pressable>
          {open && (
            <>
              {open.scratched ? (
                <View style={{ width: 280, height: 280, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Revealed r={open} big /></View>
              ) : (
                <ScratchCard key={open.id} size={280} onRevealed={reveal}>
                  <Revealed r={open} big />
                </ScratchCard>
              )}
              <Text style={{ color: '#fff', marginTop: 24, fontSize: 15 }}>{open.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 13 }}>{revealed ? 'Tap outside to close' : 'Use your finger to scratch the card'}</Text>
            </>
          )}
        </View>
      </Modal>
    </Screen>
  );
}
