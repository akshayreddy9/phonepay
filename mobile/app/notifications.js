import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '../components/Text';
import { router } from 'expo-router';
import { Empty, Header, Loading, MCI, Row, Screen } from '../components/ui';
import { get, post } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C } from '../lib/theme';
import { shortDate, time } from '../lib/format';

export default function Notifications() {
  const { refreshHome } = useApp();
  const [list, setList] = useState(null);
  useLive(() => { get('/notifications').then((r) => setList(r.notifications)).catch(() => setList([])); });
  useEffect(() => () => { post('/notifications/read').then(refreshHome).catch(() => {}); }, [refreshHome]);

  if (!list) return <Screen><Header title="Notifications" /><Loading /></Screen>;
  return (
    <Screen>
      <Header title="Notifications" />
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={<Empty icon="bell-outline" title="You're all caught up" subtitle="Payment alerts and updates will appear here" />}
        renderItem={({ item }) => (
          <Row
            onPress={item.txnId ? () => router.push(`/txn/${item.txnId}`) : undefined}
            style={!item.read ? { backgroundColor: C.blueSoft } : null}
            left={(
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.userId ? C.blue : C.green, alignItems: 'center', justifyContent: 'center' }}>
                <MCI name={item.txnId ? 'cash' : item.userId ? 'bell' : 'bullhorn'} size={20} color="#fff" />
              </View>
            )}
            title={item.title}
            subtitle={item.body}
            right={<Text style={{ fontSize: 12, color: C.muted, alignSelf: 'flex-start' }}>{shortDate(item.createdAt) === 'Today' ? time(item.createdAt) : shortDate(item.createdAt)}</Text>}
          />
        )}
      />
    </Screen>
  );
}
