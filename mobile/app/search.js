import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Header, MI, Screen } from '../components/ui';
import { get } from '../lib/api';
import { C } from '../lib/theme';

const TITLES = { contacts: 'Pay Anyone', phone: 'Pay Phone Number', upi: 'Pay to UPI ID or Number', all: 'Search', business: 'Businesses' };
const PLACEHOLDER = { contacts: 'Search for contacts to pay', phone: 'Enter mobile number', upi: 'Enter UPI ID or number (e.g. 98xxxxxx10@plum)', all: 'Search for contacts to pay', business: 'Search businesses' };

export default function Search() {
  const { mode = 'contacts' } = useLocalSearchParams();
  const [q, setQ] = useState('');
  const [people, setPeople] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'phone' || mode === 'upi') return undefined;
    const t = setTimeout(() => {
      const query = encodeURIComponent(q.trim());
      if (mode !== 'business') get(`/users/search?q=${query}`).then((r) => setPeople(r.users)).catch(() => {});
      if (mode === 'all' || mode === 'business') get(`/users/search?type=business&q=${query}`).then((r) => setBusinesses(r.users)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q, mode]);

  // Phone numbers and UPI IDs are looked up directly.
  useEffect(() => {
    setResolved(null);
    setError('');
    const digits = q.replace(/\D/g, '');
    const isPhone = /^\d{10}$/.test(q.replace(/[\s+]/g, '').slice(-10)) && digits.length >= 10;
    const isUpi = /^[\w.-]+@[\w]+$/.test(q.trim());
    if (!isPhone && !isUpi) return undefined;
    setResolving(true);
    const t = setTimeout(() => {
      get(isUpi ? `/users/resolve?upi=${encodeURIComponent(q.trim().toLowerCase())}` : `/users/resolve?phone=${digits.slice(-10)}`)
        .then((r) => setResolved(r.user))
        .catch((e) => setError(e.message))
        .finally(() => setResolving(false));
    }, 350);
    return () => { clearTimeout(t); setResolving(false); };
  }, [q]);

  const open = (u) => router.push(`/chat/${u.id}`);
  const rows = [
    ...(mode === 'phone' || mode === 'upi' ? [] : people.map((u) => ({ ...u, section: 'People' }))),
    ...businesses.map((u) => ({ ...u, section: 'Businesses' })),
  ];

  return (
    <Screen>
      <Header title={TITLES[mode]} />
      <View style={{ marginHorizontal: 16, height: 52, borderRadius: 26, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E3E3', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
        <MI name={mode === 'upi' ? 'alternate-email' : mode === 'phone' ? 'dialpad' : 'search'} size={22} color={C.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          autoFocus
          placeholder={PLACEHOLDER[mode]}
          placeholderTextColor={C.faint}
          keyboardType={mode === 'phone' ? 'phone-pad' : mode === 'upi' ? 'email-address' : 'default'}
          autoCapitalize="none"
          style={{ flex: 1, marginLeft: 12, fontSize: 16, color: C.text }}
        />
        {!!q && <Pressable onPress={() => setQ('')}><MI name="close" size={20} color={C.muted} /></Pressable>}
      </View>

      {(resolving || resolved || error) && (
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          {resolving && <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}><ActivityIndicator color={C.blue} /><Text style={{ color: C.muted }}>Verifying…</Text></View>}
          {!!error && !resolving && (
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, backgroundColor: C.redSoft, borderRadius: 12 }}>
              <MI name="error-outline" size={20} color={C.red} /><Text style={{ color: C.red, flex: 1 }}>{error}</Text>
            </View>
          )}
          {resolved && !resolving && (
            <Pressable onPress={() => open(resolved)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.blueTint, backgroundColor: C.blueSoft }}>
              <Avatar user={resolved} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: C.text }}>{resolved.name}</Text>
                <Text style={{ fontSize: 13, color: C.muted }}>Banking name: {resolved.name.toUpperCase()}</Text>
                <Text style={{ fontSize: 13, color: C.muted }}>{resolved.upiId}</Text>
              </View>
              <MI name="verified" size={22} color={C.green} />
            </Pressable>
          )}
        </View>
      )}

      {mode === 'phone' || mode === 'upi' ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: C.muted, lineHeight: 20 }}>
            {mode === 'upi' ? 'Enter the UPI ID of the person or business you want to pay. We will show their verified banking name before you pay.'
              : 'Enter a 10-digit mobile number registered with PlumPay.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item, index }) => (
            <>
              {(index === 0 || rows[index - 1].section !== item.section) && (
                <Text style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, color: C.muted, fontSize: 13, fontWeight: '600' }}>{item.section.toUpperCase()}</Text>
              )}
              <Pressable onPress={() => open(item)} android_ripple={{ color: '#eee' }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 16 }}>
                <Avatar user={item} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: C.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, color: C.muted }}>{item.isMerchant ? item.merchantCategory : `+91 ${item.phone}`}</Text>
                </View>
              </Pressable>
            </>
          )}
          ListEmptyComponent={!resolved && !resolving ? <Text style={{ textAlign: 'center', color: C.muted, marginTop: 40 }}>No matches</Text> : null}
        />
      )}
    </Screen>
  );
}
