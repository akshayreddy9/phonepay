import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { hasSymbol, Sym } from './Sym';
import { router } from 'expo-router';
import { C, z } from '../lib/theme';
import { initials } from '../lib/format';

export { MaterialCommunityIcons as MCI, Sym };

// Material Icons names ("arrow-back") are drawn with Material Symbols ("arrow_back") when available.
export function MI({ name, ...props }) {
  const sym = name.replace(/-/g, '_');
  return hasSymbol(sym) ? <Sym name={sym} {...props} /> : <MaterialIcons name={name} {...props} />;
}

export function Screen({ children, style, edges = ['top', 'bottom'], bg = C.bg }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

// PhonePe-style header: back arrow, bold title, optional blue text actions on the right.
export function Header({ title, subtitle, right, onBack, color = C.text, bg = 'transparent', back = true, big }) {
  return (
    <View style={[s.header, { backgroundColor: bg }]}>
      {back ? (
        <Pressable hitSlop={12} onPress={onBack || goBack} style={s.headerBtn}>
          <MI name="arrow-back" size={26} color={color} />
        </Pressable>
      ) : <View style={{ width: 8 }} />}
      <View style={{ flex: 1 }}>
        {!!title && <Text style={[s.headerTitle, big && { fontSize: 22 }, { color }]} numberOfLines={1}>{title}</Text>}
        {!!subtitle && <Text style={[s.headerSub, { color: color === C.text ? C.muted : color }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

// Blue text button used in headers ("Share", "Help") and rows ("Check", "Change").
export function LinkBtn({ title, onPress, style, size = 15 }) {
  return (
    <Pressable hitSlop={8} onPress={onPress} style={style}>
      <Text style={{ color: C.link, fontSize: size, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

// Darker text colour for a pastel avatar background.
function ink(hex) {
  const n = parseInt(String(hex || '#B8F2E8').slice(1), 16);
  if (Number.isNaN(n)) return '#2A4A44';
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 150;
  if (!light) return '#fff';
  const k = 0.42;
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}

const MERCHANT_ICONS = { play: 'shop', bus: 'directions_bus', hotel: 'luggage', food: 'restaurant', fuel: 'local_gas_station', health: 'medication' };

export function Avatar({ user, name, color, photo, size = 48, icon, style }) {
  const n = user?.name ?? name;
  const p = user?.photo ?? photo;
  const bg = user?.color ?? color ?? C.mint;
  const d = z(size);
  const dim = { width: d, height: d, borderRadius: d / 2 };
  if (p) return <Image source={{ uri: p }} style={[dim, style]} />;
  const mIcon = icon || MERCHANT_ICONS[user?.merchantIcon];
  if (mIcon) {
    return (
      <View style={[dim, { backgroundColor: '#EEE8FB', alignItems: 'center', justifyContent: 'center' }, style]}>
        {hasSymbol(mIcon) ? <Sym name={mIcon} size={size * 0.5} color="#6B4FBB" /> : <MaterialCommunityIcons name={mIcon} size={z(size * 0.5)} color="#6B4FBB" />}
      </View>
    );
  }
  return (
    <View style={[dim, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: ink(bg), fontSize: size * 0.34, fontWeight: '600' }}>{initials(n)}</Text>
    </View>
  );
}

// Bank logo uploaded from the admin panel, or a small coloured tile with the bank's short name.
export function BankLogo({ account, bank, size = 36, round }) {
  const short = account?.bankShort ?? bank?.short ?? '';
  const color = account?.bankColor ?? bank?.color ?? C.navy;
  const logo = account?.bankLogo ?? bank?.logo;
  const d = z(size);
  const radius = round ? d / 2 : d * 0.22;
  if (logo) {
    return (
      <View style={{ width: d, height: d, borderRadius: radius, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image source={{ uri: logo }} style={{ width: d * 0.8, height: d * 0.8 }} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={{ width: d, height: d, borderRadius: radius, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {size >= 30 ? <Text style={{ color: '#fff', fontSize: Math.min(size * 0.3, (size * 1.5) / Math.max(short.length, 1)), fontWeight: '700' }} numberOfLines={1}>{short.slice(0, 5)}</Text>
        : <MaterialCommunityIcons name="bank" size={d * 0.62} color="#fff" />}
    </View>
  );
}

export function Btn({ title, onPress, variant = 'primary', disabled, loading, icon, style, textStyle }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
      style={({ pressed }) => [s.btn, v.box, (disabled || loading) && { opacity: 0.45 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : (
        <>
          {icon && <MI name={icon} size={20} color={v.text.color} style={{ marginRight: 8 }} />}
          <Text style={[s.btnText, v.text, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
const VARIANTS = {
  primary: { box: { backgroundColor: C.navy }, text: { color: '#fff' } },
  outline: { box: { borderWidth: 1.2, borderColor: C.navy, backgroundColor: '#fff' }, text: { color: C.navy } },
  tonal: { box: { backgroundColor: C.blueSoft }, text: { color: C.navy } },
  text: { box: { backgroundColor: 'transparent' }, text: { color: C.link } },
  danger: { box: { borderWidth: 1, borderColor: '#E0E0E0' }, text: { color: C.red } },
};

// Small outlined pill ("Pay Again", "View History").
export function PillBtn({ title, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ borderWidth: 1.2, borderColor: C.navy, borderRadius: z(22), paddingHorizontal: z(14), height: z(40), justifyContent: 'center' }, pressed && { backgroundColor: C.blueSoft }, style]}>
      <Text style={{ color: C.navy, fontSize: 15, fontWeight: '500' }}>{title}</Text>
    </Pressable>
  );
}

// White rounded card used everywhere on the grey page background.
export function Card({ children, style, onPress }) {
  const box = [{ backgroundColor: '#fff', borderRadius: z(18), marginHorizontal: z(16) }, style];
  if (onPress) return <Pressable onPress={onPress} style={box}>{children}</Pressable>;
  return <View style={box}>{children}</View>;
}

// Scalloped "verified" seal (blue on names, green next to amounts).
export function Seal({ size = 20, color = '#1DA1F2' }) {
  return <Sym name="verified" fill size={size} color={color} />;
}

// Category chip from history and receipts: "💵 Money Transfer".
const CAT_EMOJI = {
  'Money Transfer': '💵', 'Money Received': '💵', Shopping: '🛍️', Travel: '🧳', Food: '🍔', Groceries: '🛒', 'Bills & Recharge': '🧾',
  Fuel: '⛽', Health: '💊', Entertainment: '🎬', Investment: '📈', Education: '🎓', Rent: '🏠', Cashback: '🎁', Others: '📦',
};
export function CategoryChip({ category, big, style }) {
  const label = category || 'Others';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: big ? '#E3F3EA' : '#F2F2F2', borderRadius: z(big ? 20 : 6), paddingHorizontal: z(big ? 14 : 6), paddingVertical: z(big ? 7 : 2), gap: z(4) }, style]}>
      <Text style={{ fontSize: big ? 15 : 10 }}>{CAT_EMOJI[label] || '🏷️'}</Text>
      <Text style={{ fontSize: big ? 16 : 11, color: big ? '#1D3B2A' : C.muted, fontWeight: big ? '600' : '400' }}>{label}</Text>
    </View>
  );
}

// Grey shimmering placeholder blocks shown while a screen loads.
export function Skeleton({ style }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.5, duration: 600, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[{ backgroundColor: '#ECEEF2', borderRadius: z(12), opacity: o }, style]} />;
}

export function Row({ icon, iconColor = C.icon, left, title, subtitle, right, onPress, chevron, style, titleStyle }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} android_ripple={{ color: '#eee' }} style={({ pressed }) => [s.row, pressed && { backgroundColor: '#F8F9FA' }, style]}>
      {left || (icon ? <View style={s.rowIcon}>{hasSymbol(icon) ? <Sym name={icon} size={26} color={iconColor} /> : <MaterialCommunityIcons name={icon} size={z(24)} color={iconColor} />}</View> : null)}
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, titleStyle]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.rowSub} numberOfLines={3}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && <MI name="chevron-right" size={24} color={C.text} />}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.sheetBg} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.grabber} />
        {!!title && <Text style={s.sheetTitle}>{title}</Text>}
        {children}
      </View>
    </Modal>
  );
}

// PhonePe's loader: three blue dots pulsing.
export function Dots({ color = C.navy }) {
  const v = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const anims = v.map((x, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(x, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      Animated.delay((2 - i) * 150),
    ])));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: z(6), alignItems: 'center' }}>
      {v.map((x, i) => <Animated.View key={i} style={{ width: z(12), height: z(12), borderRadius: z(6), backgroundColor: color, opacity: x, transform: [{ scale: x }] }} />)}
    </View>
  );
}

export function Loading({ style }) {
  return <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }, style]}><Dots /></View>;
}

export function Empty({ icon = 'inbox-outline', title, subtitle, action }) {
  return (
    <View style={{ alignItems: 'center', padding: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <MaterialCommunityIcons name={icon} size={44} color={C.navy} />
      </View>
      <Text style={{ fontSize: 17, color: C.text, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 14, color: C.muted, marginTop: 6, textAlign: 'center' }}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function SectionTitle({ children, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 }, style]}>
      <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: C.text }}>{children}</Text>
      {right}
    </View>
  );
}

export function StatusPill({ status }) {
  const map = { success: [C.greenSoft, C.green, 'Completed'], failed: [C.redSoft, C.red, 'Failed'], pending: [C.amberSoft, C.amber, 'Pending'] };
  const [bg, fg, label] = map[status] || map.pending;
  return <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text></View>;
}

export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 60, gap: 8 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 13 },
  btn: { height: 50, borderRadius: 25, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnText: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 16 },
  rowIcon: { width: 32, alignItems: 'center' },
  rowTitle: { fontSize: 16, color: C.text, fontWeight: '500' },
  rowSub: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, maxHeight: '85%' },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DADCE0', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.text, paddingHorizontal: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 12, paddingHorizontal: 14, height: 54, fontSize: 16, color: C.text, backgroundColor: '#fff' },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, marginTop: 14 },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line },
});
