import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { router } from 'expo-router';
import { Avatar, Btn, Header, MI, Screen, s } from '../components/ui';
import { put } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { pickPhoto } from './setup-profile';

export default function EditProfile() {
  const { user, applyMe, toast } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photo, setPhoto] = useState(user?.photo || null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      applyMe(await put('/me', { name, email, photo }));
      toast('Profile updated');
      router.back();
    } catch (e) { toast(e.message); } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title="Edit profile" />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={async () => { const p = await pickPhoto(); if (p) setPhoto(p); }} style={{ alignSelf: 'center' }}>
          <Avatar name={name} photo={photo} color={user?.color} size={104} />
          <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: C.blue, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
            <MI name="photo-camera" size={16} color="#fff" />
          </View>
        </Pressable>
        {!!photo && <Btn title="Remove photo" variant="text" onPress={() => setPhoto(null)} style={{ alignSelf: 'center' }} />}
        <Text style={s.label}>Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} autoCapitalize="words" />
        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={s.label}>Mobile number</Text>
        <TextInput style={[s.input, { color: C.muted, backgroundColor: C.surface }]} value={`+91 ${user?.phone}`} editable={false} />
        <Text style={s.label}>UPI ID</Text>
        <TextInput style={[s.input, { color: C.muted, backgroundColor: C.surface }]} value={user?.upiId} editable={false} />
      </ScrollView>
      <View style={{ padding: 20 }}><Btn title="Save" onPress={save} loading={loading} disabled={name.trim().length < 2} /></View>
    </Screen>
  );
}
