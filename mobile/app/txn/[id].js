import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack, Loading, Screen } from '../../components/ui';
import { PoweredBy } from '../../components/Logo';
import { Receipt, ReceiptHeader } from '../../components/receipt';
import { get } from '../../lib/api';
import { useApp, useLive } from '../../lib/store';
import { z } from '../../lib/theme';

// Full receipt for one payment (green "Transaction Successful" page).
export default function TxnDetail() {
  const { id } = useLocalSearchParams();
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  const [t, setT] = useState(null);
  useLive(() => { get(`/transactions/${id}`).then((r) => setT(r.transaction)).catch((e) => { toast(e.message); goBack(); }); }, [id]);
  if (!t) return <Screen><Loading /></Screen>;
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <ReceiptHeader t={t} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + z(10) }}>
        <Receipt t={t} />
        <PoweredBy bank={t.fromAccount?.bankShort ? `${t.fromAccount.bankShort} BANK` : ''} style={{ marginTop: z(12) }} />
      </ScrollView>
    </View>
  );
}
