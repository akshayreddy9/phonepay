import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '../../components/Text';
import { useLocalSearchParams } from 'expo-router';
import { Header, Loading, MI, Screen } from '../../components/ui';
import { get, post } from '../../lib/api';
import { useApp, useLive } from '../../lib/store';
import { C } from '../../lib/theme';
import { fullDate } from '../../lib/format';

export default function Ticket() {
  const { id } = useLocalSearchParams();
  const { toast } = useApp();
  const [ticket, setTicket] = useState(null);
  const [text, setText] = useState('');
  const list = useRef(null);

  useLive(() => {
    get('/tickets').then((r) => setTicket(r.tickets.find((t) => t.id === id) || null)).catch(() => {});
  }, [id]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      const r = await post(`/tickets/${id}/reply`, { text });
      setTicket(r.ticket);
      setText('');
    } catch (e) { toast(e.message); }
  };

  if (!ticket) return <Screen><Header title="Support" /><Loading /></Screen>;
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Header title={ticket.subject} subtitle={ticket.status === 'open' ? 'Open · we usually reply within a few hours' : 'Resolved'} />
        <FlatList
          ref={list}
          data={ticket.replies}
          keyExtractor={(r, i) => String(i)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.from === 'user';
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                {!mine && <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{item.name || 'PhonePayy Support'}</Text>}
                <View style={{ backgroundColor: mine ? C.blue : C.surface, borderRadius: 18, padding: 12, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4 }}>
                  <Text style={{ color: mine ? '#fff' : C.text, fontSize: 15 }}>{item.text}</Text>
                </View>
                <Text style={{ fontSize: 11, color: C.faint, marginTop: 4, alignSelf: mine ? 'flex-end' : 'flex-start' }}>{fullDate(item.at)}</Text>
              </View>
            );
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.line }}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={C.faint}
            style={{ flex: 1, backgroundColor: C.surface, borderRadius: 24, paddingHorizontal: 16, height: 46, fontSize: 15, color: C.text }} />
          <Pressable onPress={send} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? C.blue : '#BDC1C6', alignItems: 'center', justifyContent: 'center' }}>
            <MI name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
