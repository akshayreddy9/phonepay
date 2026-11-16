import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Btn, Header, MI, Screen, s } from '../components/ui';
import { put } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { resetTo } from '../lib/nav';

export async function pickPhoto() {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.25, base64: true });
  if (r.canceled || !r.assets?.[0]?.base64) return null;
  return `data:${r.assets[0].mimeType || 'image/jpeg'};base64,${r.assets[0].base64}`;
}

export default function SetupProfile() {
  const { user, applyMe, accounts } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photo, setPhoto] = useState(user?.photo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await put('/me', { name, email, photo });
      applyMe(me);
      resetTo(accounts.length ? '/home' : '/link-bank');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header back={false} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 26, color: C.text }}>Set up your profile</Text>
          <Text style={{ fontSize: 15, color: C.muted, marginTop: 8 }}>This is how people will see you when you pay them.</Text>
          <Pressable onPress={async () => { const p = await pickPhoto(); if (p) setPhoto(p); }} style={{ alignSelf: 'center', marginTop: 28 }}>
            <Avatar name={name || '?'} photo={photo} color={user?.color} size={104} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: C.blue, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
              <MI name="photo-camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <Text style={s.label}>Full name (as in your bank account)</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" placeholderTextColor={C.faint} autoCapitalize="words" />
          <Text style={s.label}>Email (optional)</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={C.faint} keyboardType="email-address" autoCapitalize="none" />
          {!!error && <Text style={{ color: C.red, marginTop: 12 }}>{error}</Text>}
        </ScrollView>
        <View style={{ padding: 24 }}>
          <Btn title="Continue" onPress={save} disabled={name.trim().length < 2} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
