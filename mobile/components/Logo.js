import { Image, View } from 'react-native';
import { Text } from './Text';
import { useApp } from '../lib/store';
import { C, SCALE, z } from '../lib/theme';

// Round app mark: purple circle, white "p" with a little leaf (brand mark).
// Uses the logo uploaded in the admin panel when there is one. `raw` skips screen scaling.
export function Logo({ size = 48, raw, color = C.purple, ink = '#fff' }) {
  const app = useApp();
  const d = raw ? size : z(size);
  const icon = app?.settings?.appIcon;
  if (icon) return <Image source={{ uri: icon }} style={{ width: d, height: d, borderRadius: d / 2 }} />;
  const fs = (raw ? size / SCALE : size) * 0.62;
  return (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: ink, fontWeight: '700', fontSize: fs, lineHeight: fs * 1.1, includeFontPadding: false, marginTop: -d * 0.06 }}>p</Text>
      <View style={{ position: 'absolute', top: d * 0.2, right: d * 0.27, width: d * 0.17, height: d * 0.09, borderTopLeftRadius: d * 0.12, borderBottomRightRadius: d * 0.12, backgroundColor: '#8EE07A', transform: [{ rotate: '-28deg' }] }} />
    </View>
  );
}

// Text wordmark in brand purple. Name comes from admin settings.
export function Wordmark({ size = 26, style, color = C.purple }) {
  const app = useApp();
  const name = app?.settings?.appName || 'PhonePayy';
  return <Text style={[{ fontSize: size, fontWeight: '700', color, letterSpacing: -size * 0.02, includeFontPadding: false }, style]}>{name}</Text>;
}

// Mark + name side by side (splash, hero banner).
export function Brand({ size = 18, color = C.purple, ink, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: z(size * 0.3) }, style]}>
      <Logo size={size * 1.15} color={ink ? '#fff' : C.purple} ink={ink ? C.purple : '#fff'} />
      <Wordmark size={size} color={color} />
    </View>
  );
}

// "UPI" mark drawn with text: italic, with the orange/green arrow ticks.
export function UpiMark({ size = 18, color = '#5A5A5A' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: size, fontWeight: '700', fontStyle: 'italic', color, letterSpacing: 0.5 }}>UPI</Text>
      <View style={{ marginLeft: 2, width: 0, height: 0, borderTopWidth: z(size * 0.32), borderBottomWidth: z(size * 0.32), borderLeftWidth: z(size * 0.38), borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#F37021' }} />
      <View style={{ marginLeft: -z(size * 0.12), width: 0, height: 0, borderTopWidth: z(size * 0.32), borderBottomWidth: z(size * 0.32), borderLeftWidth: z(size * 0.38), borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#0E8E46' }} />
    </View>
  );
}

export const BrandUpi = () => <Brand size={18} />;

// "Powered by  UPI | BANK" footer used at the bottom of receipts and bank screens.
export function PoweredBy({ bank, style }) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: z(12) }, style]}>
      <Text style={{ fontSize: 13, color: '#6B6B6B' }}>Powered by</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8), marginTop: z(4), opacity: 0.8 }}>
        <UpiMark size={12} />
        {!!bank && <Text style={{ fontSize: 11, fontWeight: '700', color: '#B0153A' }}>{bank}</Text>}
      </View>
    </View>
  );
}
