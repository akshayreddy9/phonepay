import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Empty, Header, Loading, MCI, Row, Screen, Sheet, s } from '../components/ui';
import { get, post } from '../lib/api';
import { useApp, useLive } from '../lib/store';
import { C } from '../lib/theme';
import { shortDate } from '../lib/format';

const TOPICS = ['Money debited but payment failed', 'Payment pending for long', 'Wrong amount sent', 'Unable to link bank account', 'Cashback not received', 'Other issue'];

export default function Help() {
  const params = useLocalSearchParams();
  const { toast } = useApp();
  const [tickets, setTickets] = useState(null);
  const [compose, setCompose] = useState(!!params.subject);
  const [subject, setSubject] = useState(params.subject || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useLive(() => { get('/tickets').then((r) => setTickets(r.tickets)).catch(() => setTickets([])); });

  const submit = async () => {
    setBusy(true);
    try {
      const r = await post('/tickets', { subject, message, txnId: params.txnId });
      setCompose(false);
      setSubject('');
      setMessage('');
      toast('Request submitted. Our team will reply soon.');
      router.push(`/ticket/${r.ticket.id}`);
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="Help & support" />
      {!tickets ? <Loading /> : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={(
            <View style={{ padding: 20 }}>
              <View style={{ backgroundColor: C.blueSoft, borderRadius: 16, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <MCI name="face-agent" size={40} color={C.blueDark} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: C.text }}>How can we help?</Text>
                  <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Raise a request and our support team will reply here.</Text>
                </View>
              </View>
              <Btn title="Raise a new request" icon="add" onPress={() => setCompose(true)} style={{ marginTop: 16 }} />
              {tickets.length > 0 && <Text style={{ marginTop: 24, fontSize: 15, fontWeight: '600', color: C.text }}>Your requests</Text>}
            </View>
          )}
          renderItem={({ item }) => (
            <Row icon={item.status === 'open' ? 'message-processing-outline' : 'message-check-outline'} iconColor={item.status === 'open' ? C.amber : C.green}
              title={item.subject} subtitle={`${item.status === 'open' ? 'Open' : 'Resolved'} · ${shortDate(item.replies[item.replies.length - 1].at)} · ${item.replies.length} messages`}
              chevron onPress={() => router.push(`/ticket/${item.id}`)} />
          )}
          ListEmptyComponent={<Empty icon="lifebuoy" title="No support requests" subtitle="If anything goes wrong with a payment, raise a request here" />}
        />
      )}

      <Sheet visible={compose} onClose={() => setCompose(false)} title="New support request">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ paddingHorizontal: 20 }}>
          {!subject && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {TOPICS.map((t) => <Btn key={t} title={t} variant="outline" onPress={() => setSubject(t)} style={{ height: 34, paddingHorizontal: 12 }} textStyle={{ fontSize: 12, fontWeight: '500' }} />)}
            </View>
          )}
          <Text style={s.label}>Subject</Text>
          <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="What's the issue?" placeholderTextColor={C.faint} />
          <Text style={s.label}>Describe the problem</Text>
          <TextInput style={[s.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]} value={message} onChangeText={setMessage} multiline placeholder="Tell us what happened" placeholderTextColor={C.faint} />
          <Btn title="Submit" onPress={submit} loading={busy} disabled={!subject.trim() || !message.trim()} style={{ marginTop: 16 }} />
        </KeyboardAvoidingView>
      </Sheet>
    </Screen>
  );
}
