import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { Text } from './Text';
import { BankLogo, goBack, Sym } from './ui';
import { Logo } from './Logo';
import { upiLink } from '../app/my-qr';
import { C, screenWidth, z } from '../lib/theme';

// Yellow round avatar used in the home header and profile (photo if the user has one).
export function YellowAvatar({ user, size = 44, plus, qrBadge }) {
  const d = z(size);
  return (
    <View>
      {user?.photo ? <Image source={{ uri: user.photo }} style={{ width: d, height: d, borderRadius: d / 2 }} /> : (
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: '#FDB515', alignItems: 'center', justifyContent: 'center' }}>
          {plus ? <Text style={{ color: '#fff', fontSize: size * 0.5, fontWeight: '500', lineHeight: size * 0.6 }}>+</Text> : <Sym name="person" size={size * 0.52} color="#fff" />}
        </View>
      )}
      {qrBadge && (
        <View style={{ position: 'absolute', right: -z(4), bottom: -z(2), width: z(18), height: z(18), borderRadius: z(5), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E6E6E6' }}>
          <Sym name="qr_code_2" size={13} color="#1D1D1D" />
        </View>
      )}
    </View>
  );
}

// QR with the round app mark in the middle.
export function BrandQr({ user, size = 220 }) {
  const d = z(size);
  if (!user) return <View style={{ width: d, height: d }} />;
  return (
    <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <QRCode value={upiLink(user)} size={d} color="#000" ecl="H" />
      <View style={{ position: 'absolute', width: d * 0.22, height: d * 0.22, borderRadius: d * 0.11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={size * 0.18} color="#000" />
      </View>
    </View>
  );
}

// "DBS Bank - 8063 >" line under a QR.
export function QrBankLine({ account, onPress, size = 17 }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(8), marginTop: z(14) }}>
      {account ? <BankLogo account={account} size={22} /> : <Sym name="account_balance" size={20} color={C.purple} />}
      <Text style={{ fontSize: size, color: '#1D1D1D' }} numberOfLines={1}>{account ? `${account.bankName} - ${account.last4}` : 'Add bank account'}</Text>
      {!!onPress && <Sym name="chevron_right" size={22} color="#1D1D1D" />}
    </Pressable>
  );
}

// Dark purple "Did you know?" carousel (admin-managed banners).
export function DidYouKnow({ banners, style, full }) {
  const w = full ? screenWidth() : screenWidth() - z(32);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const list = banners || [];
  useEffect(() => {
    if (list.length < 2) return undefined;
    const t = setInterval(() => setI((k) => { const n = (k + 1) % list.length; ref.current?.scrollTo({ x: n * w, animated: true }); return n; }), 4000);
    return () => clearInterval(t);
  }, [list.length, w]);
  if (!list.length) return null;
  return (
    <View style={[{ width: w, alignSelf: 'center' }, style]}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: full ? 0 : z(4) }}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}>
        {list.map((b) => (
          <Pressable key={b.id} onPress={() => router.push('/offers')} style={{ width: w, height: z(64), backgroundColor: b.color || '#2B1745', flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16) }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#CFC3E3' }}>{b.subtitle || 'Did you know?'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(8), marginTop: z(2) }}>
                <Text style={{ fontSize: 15, color: '#fff', fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{b.title}</Text>
                <View style={{ width: z(20), height: z(20), borderRadius: z(10), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Sym name="arrow_forward" size={14} color="#2B1745" />
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 40 }}>{b.emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {list.length > 1 && (
        <View style={{ position: 'absolute', bottom: z(5), left: z(16), flexDirection: 'row', gap: z(4) }}>
          {list.map((b, k) => <View key={b.id} style={{ width: k === i ? z(14) : z(4), height: z(3), borderRadius: z(2), backgroundColor: k === i ? '#fff' : 'rgba(255,255,255,0.4)' }} />)}
        </View>
      )}
    </View>
  );
}

// White title bar: back arrow, bold title, help icon.
export function TitleBar({ title, onBack }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: z(60), paddingHorizontal: z(16), gap: z(22), backgroundColor: '#fff' }}>
      <Pressable hitSlop={10} onPress={onBack || goBack}><Sym name="arrow_back" size={26} color="#1D1D1D" /></Pressable>
      <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#1D1D1D' }} numberOfLines={1}>{title}</Text>
      <Pressable hitSlop={10} onPress={() => router.push('/help')}><Sym name="help" size={26} color="#1D1D1D" /></Pressable>
    </View>
  );
}
