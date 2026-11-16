import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, MCI, MI } from '../components/ui';
import { get } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

// Parse upi://pay?pa=...&pn=...&am=...&tn=...
export function parseUpi(data) {
  const text = String(data || '').trim();
  if (/^[\w.-]+@[\w]+$/.test(text)) return { pa: text };
  if (!text.toLowerCase().startsWith('upi://')) return null;
  const query = text.split('?')[1] || '';
  const out = {};
  query.split('&').forEach((kv) => {
    const [k, v = ''] = kv.split('=');
    try { out[k.toLowerCase()] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { out[k.toLowerCase()] = v; }
  });
  return out.pa ? out : null;
}

const BOX = 250;

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(line, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(line, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [line]);

  useEffect(() => { if (permission && !permission.granted && permission.canAskAgain) requestPermission(); }, [permission, requestPermission]);

  const handle = async (data) => {
    if (busy.current) return;
    const upi = parseUpi(data);
    if (!upi) { setError('This is not a valid UPI QR code'); return; }
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const r = await get(`/users/resolve?upi=${encodeURIComponent(upi.pa.toLowerCase())}`);
      router.replace({ pathname: '/pay', params: { userId: r.user.id, amount: upi.am || '', note: upi.tn || '' } });
    } catch (e) {
      setError(e.message);
      setTimeout(() => { busy.current = false; }, 1500);
    }
  };

  const fromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    try {
      const found = await scanFromURLAsync(r.assets[0].uri, ['qr']);
      if (!found.length) { toast('No QR code found in this image'); return; }
      handle(found[0].data);
    } catch { toast('Could not read this image'); }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' }}>
        <MCI name="camera-outline" size={64} color={C.blue} />
        <Text style={{ fontSize: 20, marginTop: 16, textAlign: 'center', color: C.text }}>Allow camera access to scan QR codes</Text>
        <Btn title="Allow camera" onPress={requestPermission} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        <Btn title="Upload QR from gallery" variant="text" onPress={fromGallery} style={{ marginTop: 8 }} />
        <Btn title="Go back" variant="text" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {focused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(r) => handle(r.data)}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <View style={{ width: BOX, height: BOX }}>
          {[[0, 0, 'Top', 'Left'], [0, 1, 'Top', 'Right'], [1, 0, 'Bottom', 'Left'], [1, 1, 'Bottom', 'Right']].map(([b, r, v, h]) => (
            <View key={v + h} style={{ position: 'absolute', width: 44, height: 44, [b ? 'bottom' : 'top']: 0, [r ? 'right' : 'left']: 0, borderColor: '#fff', [`border${v}Width`]: 4, [`border${h}Width`]: 4, [`border${v}${h}Radius`]: 18 }} />
          ))}
          <Animated.View style={{ position: 'absolute', left: 16, right: 16, height: 2, backgroundColor: C.gBlue, transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [20, BOX - 20] }) }] }} />
        </View>
        <Text style={{ color: '#fff', fontSize: 15, marginTop: 28 }}>Scan any UPI QR code to pay</Text>
        {!!error && <View style={{ marginTop: 16, backgroundColor: 'rgba(217,48,37,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}><Text style={{ color: '#fff' }}>{error}</Text></View>}
      </View>

      <View style={{ position: 'absolute', top: insets.top + 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} style={st.round}><MI name="close" size={24} color="#fff" /></Pressable>
        <Pressable onPress={() => setTorch(!torch)} style={st.round}><MI name={torch ? 'flash-on' : 'flash-off'} size={24} color="#fff" /></Pressable>
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + 28, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <Pressable onPress={fromGallery} style={st.pill}><MI name="image" size={20} color="#fff" /><Text style={st.pillText}>Upload from gallery</Text></Pressable>
        <Pressable onPress={() => router.replace('/my-qr')} style={st.pill}><MCI name="qrcode" size={20} color="#fff" /><Text style={st.pillText}>Show my QR</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, height: 44, borderRadius: 22 },
  pillText: { color: '#fff', fontSize: 14 },
});
