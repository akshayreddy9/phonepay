import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, ScrollView, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { Sym } from '../components/ui';
import { Brand } from '../components/Logo';
import { BottomNav } from '../components/BottomNav';
import { BrandQr, DidYouKnow, QrBankLine, YellowAvatar } from '../components/phone';
import { useApp, useLive } from '../lib/store';
import { C, screenWidth, z } from '../lib/theme';

const bills = (category) => () => router.push({ pathname: '/bills', params: { category } });

// Grey rounded tile with a picture and a two-line label (Recharge & Bills, Loans, …).
function Tile({ emoji, label, badge, badgeColor = C.orange, onPress, width }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, alignItems: 'center' }, pressed && { opacity: 0.6 }]}>
      <View style={{ width: width - z(14), height: z(62), borderRadius: z(12), backgroundColor: C.tile, borderWidth: 1, borderColor: '#ECECEC', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 30 }}>{emoji}</Text>
        {!!badge && (
          <View style={{ position: 'absolute', top: -z(7), backgroundColor: badgeColor, borderRadius: z(4), paddingHorizontal: z(5), paddingVertical: z(1) }}>
            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 13.5, color: '#2B2B2B', textAlign: 'center', marginTop: z(6), lineHeight: 17 }} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

// Strip under a grid: "Recharge your FASTag easily 🚙" + "More →".
function Strip({ text, emoji, onPress, onMore }) {
  return (
    <View style={{ flexDirection: 'row', gap: z(10), marginTop: z(14), paddingHorizontal: z(16) }}>
      <Pressable onPress={onPress} style={{ flex: 1, height: z(48), borderRadius: z(10), backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8', flexDirection: 'row', alignItems: 'center', paddingLeft: z(14), overflow: 'hidden' }}>
        <View style={{ flex: 1 }}>{typeof text === 'string' ? <Text style={{ fontSize: 13.5, color: '#2B2B2B' }} numberOfLines={1}>{text}</Text> : text}</View>
        <Text style={{ fontSize: 26, marginRight: z(8) }}>{emoji}</Text>
      </Pressable>
      {onMore && (
        <Pressable onPress={onMore} style={{ width: z(96), height: z(48), borderRadius: z(10), backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: z(4) }}>
          <Text style={{ fontSize: 15, color: C.purpleText, fontWeight: '700' }}>More</Text>
          <Sym name="arrow_forward" size={18} color={C.purpleText} />
        </Pressable>
      )}
    </View>
  );
}

function Section({ title, right, children, sub }) {
  return (
    <View style={{ paddingTop: z(22), paddingBottom: z(22), borderTopWidth: z(6), borderColor: '#F5F5F7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), marginBottom: z(14) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1D1D1D' }} numberOfLines={1}>{title}</Text>
          {!!sub && <Text style={{ fontSize: 13, color: C.purpleText, fontWeight: '600', marginTop: z(2) }}>{sub}</Text>}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function Grid({ items, cell }) {
  return <View style={{ flexDirection: 'row', paddingHorizontal: z(8) }}>{items.map((t) => <Tile key={t.label} width={cell} {...t} />)}</View>;
}

// Purple round shortcut (Money Transfers row).
function Round({ icon, label, onPress, badge, dot, cell }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: cell, alignItems: 'center' }, pressed && { opacity: 0.7 }]}>
      <View style={{ width: z(62), height: z(62), borderRadius: z(31), backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: z(34), height: z(34), borderRadius: z(8), backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Sym name={icon} size={24} color="#fff" />
        </View>
        {dot && <View style={{ position: 'absolute', top: z(2), right: z(2), width: z(12), height: z(12), borderRadius: z(6), backgroundColor: '#1E9E4A', borderWidth: 2, borderColor: '#fff' }} />}
        {!!badge && (
          <View style={{ position: 'absolute', top: -z(8), backgroundColor: C.orange, borderRadius: z(4), paddingHorizontal: z(6), paddingVertical: z(1) }}>
            <Text style={{ fontSize: 10.5, color: '#fff', fontWeight: '600' }}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 13.5, color: '#2B2B2B', textAlign: 'center', marginTop: z(8), lineHeight: 17 }}>{label}</Text>
    </Pressable>
  );
}

// Top banner: purple with the brand and a big title, curving into white with the offer line.
function Hero({ settings, top }) {
  const w = screenWidth();
  const title = settings?.heroTitle || 'Cashback FEST';
  const [first, ...rest] = title.split(' ');
  return (
    <View>
      <LinearGradient colors={['#4A1A8C', '#5F259F', '#6A2DB0']} style={{ paddingTop: top + z(14), height: top + z(210), alignItems: 'center' }}>
        <Brand size={15} color="#fff" ink />
        <Text style={{ fontSize: 46, fontWeight: '700', color: '#FFD86B', marginTop: z(4), letterSpacing: -1, textShadowColor: '#B23A00', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1, lineHeight: 52 }}>{first}</Text>
        {!!rest.length && <Text style={{ fontSize: 40, fontWeight: '700', color: '#FFE9A8', marginTop: -z(10), letterSpacing: -0.5, textShadowColor: '#B23A00', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 }}>{rest.join(' ')}</Text>}
        <Text style={{ position: 'absolute', left: z(54), top: top + z(110), fontSize: 26, transform: [{ rotate: '-25deg' }] }}>💵</Text>
        <Text style={{ position: 'absolute', right: z(44), top: top + z(104), fontSize: 26, transform: [{ rotate: '20deg' }] }}>💵</Text>
      </LinearGradient>
      <View style={{ marginTop: -z(60), height: z(60) }}>
        <Svg width={w} height={z(60)} viewBox={`0 0 ${w} 60`} preserveAspectRatio="none">
          <Path d={`M0 60 L0 34 C ${w * 0.18} 4, ${w * 0.36} 46, ${w * 0.55} 22 C ${w * 0.72} 2, ${w * 0.86} 30, ${w} 8 L ${w} 60 Z`} fill="#fff" />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', paddingHorizontal: z(24), marginTop: -z(4) }}>
        <Text style={{ fontSize: 23, fontWeight: '700', color: '#1D1D1D', textAlign: 'center', lineHeight: 30 }}>{settings?.heroSubtitle}</Text>
        {!!settings?.heroCta && (
          <Pressable onPress={() => router.push({ pathname: '/search', params: { mode: 'contacts' } })} style={({ pressed }) => [{ marginTop: z(14), backgroundColor: C.purple, borderRadius: z(22), paddingHorizontal: z(22), height: z(42), justifyContent: 'center' }, pressed && { opacity: 0.85 }]}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{settings.heroCta}</Text>
          </Pressable>
        )}
        <Text style={{ alignSelf: 'flex-end', fontSize: 9, color: '#9A9A9A', marginTop: z(2) }}>*T&C Apply</Text>
      </View>
    </View>
  );
}

// Tiny line chart for the stock cards.
function Spark({ up, width, color }) {
  const pts = up ? [30, 22, 28, 12, 24, 8, 18, 26, 14, 20] : [10, 18, 8, 22, 16, 28, 20, 30, 24, 32];
  const step = width / (pts.length - 1);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${p}`).join(' ');
  return <Svg width={width} height={z(40)} viewBox={`0 0 ${width} 40`}><Path d={d} stroke={color} strokeWidth={1.6} fill="none" /></Svg>;
}

const STOCKS = [
  { letter: 'S', name: 'State Bank of India', price: '1,080.00', color: '#5F259F', up: true },
  { letter: 'T', name: 'Tata Consultancy Services', price: '2,407.50', color: '#B0136B', up: false },
  { letter: 'R', name: 'Reliance Industries', price: '1,412.80', color: '#1E6FD9', up: true },
];

export default function Home() {
  const { user, accounts, settings, home, refreshHome, toast } = useApp();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const hs = settings?.homeSections || {};
  const show = (k) => hs[k] !== false;
  const soon = (w) => () => toast(`${w} is not part of this demo`);
  const appName = settings?.appName || 'PlumPay';
  const primary = accounts.find((a) => a.primary) || accounts[0];
  const cell = (screenWidth() - z(16)) / 4;
  const hero = show('hero');

  useLive(() => { refreshHome(); }, [user?.id]);

  // Android back on Home leaves the app (no stack below).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => false);
    return () => sub.remove();
  }, []);

  // Header turns white once the purple banner scrolls away.
  const headerBg = hero ? scrollY.interpolate({ inputRange: [z(120), z(170)], outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'], extrapolate: 'clamp' }) : '#fff';
  const [helpDark, setHelpDark] = useState(!hero);
  useEffect(() => {
    if (!hero) { setHelpDark(true); return undefined; }
    const id = scrollY.addListener(({ value }) => setHelpDark(value > z(145)));
    return () => scrollY.removeListener(id);
  }, [hero, scrollY]);

  const copyUpi = async () => { await Clipboard.setStringAsync(user?.upiId || ''); toast('UPI ID copied'); };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top, backgroundColor: headerBg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: z(16), height: z(60) }}>
          <Pressable hitSlop={8} onPress={() => router.push('/profile')}><YellowAvatar user={user} size={42} qrBadge /></Pressable>
          <Pressable hitSlop={10} onPress={() => router.push('/help')}>
            <Sym name="help" size={28} color={helpDark ? '#1D1D1D' : '#fff'} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        contentContainerStyle={{ paddingBottom: z(20) }}
      >
        {hero ? <Hero settings={settings} top={insets.top} /> : <View style={{ height: insets.top + z(64) }} />}

        {!!settings?.announcement && (
          <View style={{ marginHorizontal: z(16), marginTop: z(12), backgroundColor: '#FFF5D6', borderRadius: z(12), padding: z(12), flexDirection: 'row', gap: z(8) }}>
            <Sym name="campaign" size={20} color="#8A6100" />
            <Text style={{ flex: 1, fontSize: 13, color: '#5C4100' }}>{settings.announcement}</Text>
          </View>
        )}

        {/* Money Transfers */}
        <View style={{ paddingTop: z(hero ? 18 : 8), paddingBottom: z(20) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: z(16), marginBottom: z(18) }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1D1D1D' }}>Money Transfers</Text>
            <Pressable onPress={() => router.push('/refer')} style={{ flexDirection: 'row', alignItems: 'center', gap: z(6), backgroundColor: C.peach, borderRadius: z(16), paddingHorizontal: z(10), height: z(30) }}>
              <View style={{ width: z(18), height: z(18), borderRadius: z(9), backgroundColor: '#F26B21', alignItems: 'center', justifyContent: 'center' }}><Sym name="currency_rupee" size={12} color="#fff" /></View>
              <Text style={{ fontSize: 13.5, color: '#5A3A2A' }}>Refer → ₹{settings?.referralBonus ?? 1200}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: z(8) }}>
            <Round cell={cell} icon="call" dot label={'To Mobile\nNumber'} onPress={() => router.push({ pathname: '/search', params: { mode: 'contacts' } })} />
            <Round cell={cell} icon="account_balance" label={'To Bank &\nSelf A/c'} onPress={() => router.push('/transfer')} />
            <Round cell={cell} icon="account_balance_wallet" badge="Offer" label={`${appName}\nWallet`} onPress={() => (settings?.features?.upiLite === false ? toast('Wallet is not available') : router.push('/upi-lite'))} />
            <Round cell={cell} icon="currency_rupee" label={'Check\nBalance'} onPress={() => router.push('/balance')} />
          </View>
        </View>

        {show('promoChips') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: z(16), gap: z(10), paddingBottom: z(18) }}>
            {[
              { icon: 'percent', bg: '#1E9E6A', text: settings?.promoChip || 'Up to ₹50 Cashback on UPI*', go: () => router.push('/offers') },
              { icon: 'savings', bg: '#5B6B8C', text: 'Start saving in Gold from ₹10', go: soon('Digital gold') },
              { icon: 'bolt', bg: C.purple, text: 'Activate UPI Lite', go: () => router.push('/upi-lite') },
            ].map((c) => (
              <Pressable key={c.text} onPress={c.go} style={{ flexDirection: 'row', alignItems: 'center', gap: z(10), borderWidth: 1, borderColor: '#E6E6E6', borderRadius: z(10), height: z(48), paddingHorizontal: z(12), backgroundColor: '#fff' }}>
                <View style={{ width: z(26), height: z(26), borderRadius: z(8), backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><Sym name={c.icon} size={16} color="#fff" /></View>
                <Text style={{ fontSize: 14, color: '#2B2B2B' }}>{c.text}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {show('recharge') && (
          <Section title="Recharge & Bills">
            <Grid cell={cell} items={[
              { emoji: '📱', label: 'Mobile\nRecharge', onPress: () => router.push('/recharge') },
              { emoji: '🏠', label: 'Rent via\nCredit Card', onPress: bills('creditcard') },
              { emoji: '💡', label: 'Electricity\nBill', onPress: bills('electricity') },
              { emoji: '💰', label: 'Loan\nRepayment', onPress: bills('creditcard') },
            ]} />
            <Strip text="Recharge your FASTag easily" emoji="🚙" onPress={bills('fastag')} onMore={() => router.push('/bills')} />
          </Section>
        )}

        {show('loans') && (
          <Section title="Loans">
            <Grid cell={cell} items={[
              { emoji: '🧑‍💼', label: 'Personal\nLoan', onPress: soon('Personal loans') },
              { emoji: '📊', label: 'Mutual\nFunds Loan', onPress: soon('Loan against mutual funds') },
              { emoji: '📿', label: 'Gold\nLoan', onPress: soon('Gold loans') },
              { emoji: '🎯', label: 'Credit\nScore', badge: 'Latest', badgeColor: '#1E9E4A', onPress: soon('Credit score') },
            ]} />
            <Strip emoji="💰" onPress={soon('Loans')} onMore={soon('Loans')}
              text={<Text style={{ fontSize: 13.5, color: '#2B2B2B' }}>Get loan of up to <Text style={{ fontSize: 19, fontWeight: '700', color: '#1E8E3E' }}>₹5,00,000</Text></Text>} />
          </Section>
        )}

        {show('gold') && (
          <Section title="Gold, Silver & Platinum">
            <Grid cell={cell} items={[
              { emoji: '🫙', label: 'Daily Gold\nwith ₹10', onPress: () => router.push('/balance') },
              { emoji: '🥇', label: 'Buy\nGold', onPress: () => router.push('/balance') },
              { emoji: '🥈', label: 'Daily Silver\nwith ₹10', onPress: soon('Digital silver') },
              { emoji: '💿', label: 'Buy Silver', onPress: soon('Digital silver') },
            ]} />
            <Strip text="Save in pure Platinum daily" emoji="⚪" onPress={soon('Digital platinum')} onMore={soon('Gold & silver')} />
          </Section>
        )}

        {show('insurance') && (
          <>
            <DidYouKnow banners={home?.banners} full />
            <Section title="Insurance">
              <Grid cell={cell} items={[
                { emoji: '🛵', label: 'Bike', onPress: bills('insurance') },
                { emoji: '🚗', label: 'Car', onPress: bills('insurance') },
                { emoji: '🏥', label: 'Health', onPress: bills('insurance') },
                { emoji: '☂️', label: 'Life', onPress: bills('insurance') },
              ]} />
              <Strip text="Save ₹2500+ on Health Policy" emoji="🩺" onPress={bills('insurance')} onMore={bills('insurance')} />
            </Section>
          </>
        )}

        {show('mutualFunds') && (
          <Section title="Mutual Funds">
            <Grid cell={cell} items={[
              { emoji: '📈', label: 'Best SIP\nFunds', onPress: soon('Mutual funds') },
              { emoji: '🌱', label: 'High Growth\nFunds', onPress: soon('Mutual funds') },
              { emoji: '🎟️', label: 'Choti SIP\nwith ₹250', onPress: soon('Mutual funds') },
              { emoji: '🎫', label: 'Daily SIP\nwith ₹10', onPress: soon('Mutual funds') },
            ]} />
            <Strip text="Start a SIP in 5 seconds" emoji="📊" onPress={soon('Mutual funds')} onMore={soon('Mutual funds')} />
          </Section>
        )}

        {show('deposits') && (
          <Section title="Deposits & Savings">
            <Grid cell={cell} items={[
              { emoji: '🏦', label: 'Fixed\nDeposit', onPress: soon('Fixed deposits') },
              { emoji: '🪙', label: 'Daily\nDeposit', badge: 'New', badgeColor: '#C2185B', onPress: soon('Daily deposits') },
              { emoji: '🧓', label: 'Top up\nNPS', onPress: soon('NPS') },
              { emoji: '👴', label: 'Tatkal\nNPS', onPress: soon('NPS') },
            ]} />
            <Strip text="Reach your goals with FDs" emoji="🧮" onPress={soon('Fixed deposits')} onMore={soon('Deposits')} />
          </Section>
        )}

        {show('travel') && (
          <Section title="Travel & Transit">
            <Grid cell={cell} items={[
              { emoji: '✈️', label: 'Flight', onPress: soon('Flight booking') },
              { emoji: '🚌', label: 'Bus', onPress: soon('Bus tickets') },
              { emoji: '🚆', label: 'Train', onPress: soon('Train tickets') },
              { emoji: '🏨', label: 'Hotel', onPress: soon('Hotel booking') },
            ]} />
            <Strip text="Save up to 30% on Hotels" emoji="🏨" onPress={soon('Hotel booking')} onMore={soon('Travel')} />
          </Section>
        )}

        {show('creditCards') && (
          <Section title="New Credit Card">
            <View style={{ flexDirection: 'row', paddingHorizontal: z(8) }}>
              {[
                { label: `${appName}\nPlatinum card`, colors: ['#E3262B', '#9E1015'], tag: 'FREE' },
                { label: `${appName}\nRewards card`, colors: ['#0F2D5C', '#071A38'], ring: true },
                { label: '100%\nApproval...', colors: ['#5B2E91', '#2F1252'], star: true },
                { label: 'Cashback\nCredit Ca...', colors: ['#B0123E', '#6D0A26'], letter: 'A' },
              ].map((c) => (
                <Pressable key={c.label} onPress={soon('Credit cards')} style={{ width: cell, alignItems: 'center' }}>
                  <LinearGradient colors={c.colors} style={{ width: z(54), height: z(80), borderRadius: z(7), alignItems: 'center', justifyContent: 'center' }}>
                    {c.ring && <View style={{ width: z(22), height: z(22), borderRadius: z(11), borderWidth: 2, borderColor: '#fff' }} />}
                    {c.star && <Text style={{ fontSize: 22 }}>✦</Text>}
                    {!!c.letter && <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{c.letter}</Text>}
                    {!!c.tag && <View style={{ backgroundColor: '#fff', borderRadius: z(3), paddingHorizontal: z(4), transform: [{ rotate: '-30deg' }] }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#1E9E4A' }}>{c.tag}</Text></View>}
                  </LinearGradient>
                  <Text style={{ fontSize: 13, color: '#2B2B2B', textAlign: 'center', marginTop: z(8), lineHeight: 17 }} numberOfLines={2}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </Section>
        )}

        {show('offers') && (
          <Section title="Offers & Rewards">
            <Grid cell={cell} items={[
              { emoji: '🎁', label: 'Offer\nZone', onPress: () => router.push('/offers') },
              { emoji: '🎟️', label: 'Brand\nVouchers', onPress: () => router.push('/offers') },
              { emoji: '📺', label: 'Subscriptions', onPress: () => router.push('/bills') },
              { emoji: '🏆', label: 'Rewards', onPress: () => router.push('/rewards') },
            ]} />
            <Strip text="Find the best offers for you" emoji="🏷️" onPress={() => router.push('/offers')} onMore={() => router.push('/rewards')} />
          </Section>
        )}

        {show('stocks') && (
          <Section title="Looking for stocks or ETFs? Find both here" sub={`${appName} Invest`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: z(16), gap: z(10) }}>
              {STOCKS.map((st) => (
                <Pressable key={st.name} onPress={soon('Stocks')} style={{ width: z(176), borderRadius: z(12), borderWidth: 1, borderColor: '#ECECEC', paddingTop: z(14), overflow: 'hidden' }}>
                  <View style={{ paddingHorizontal: z(12) }}>
                    <View style={{ width: z(32), height: z(32), borderRadius: z(16), backgroundColor: st.color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{st.letter}</Text></View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1D1D1D', marginTop: z(10) }} numberOfLines={1}>{st.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1D1D1D', marginTop: z(8) }}>{st.price}</Text>
                    <Text style={{ fontSize: 12.5, color: '#7A7A7A', marginTop: z(2) }}>Previous closing price</Text>
                  </View>
                  <View style={{ marginTop: z(8) }}><Spark up={st.up} width={z(176)} color={st.up ? '#1E8E3E' : '#E5484D'} /></View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={soon('Stocks')} style={{ flexDirection: 'row', alignItems: 'center', gap: z(6), paddingHorizontal: z(16), marginTop: z(16) }}>
              <Text style={{ fontSize: 15, color: C.purpleText, fontWeight: '700' }}>Explore {appName} Invest</Text>
              <Sym name="arrow_circle_right" fill size={18} color={C.purpleText} />
            </Pressable>
            <Text style={{ fontSize: 11, color: '#7A7A7A', paddingHorizontal: z(16), marginTop: z(14), lineHeight: 15 }}>
              Investments in securities market are subject to market risks, read all the related documents carefully before investing. The securities are quoted as an example and not as a recommendation. Demo app: no real trading.
            </Text>
          </Section>
        )}

        {show('myQr') && user && (
          <View style={{ backgroundColor: '#F5F5F7', paddingTop: z(24), paddingBottom: z(24) }}>
            <Text style={{ textAlign: 'center', fontSize: 44, fontWeight: '700', color: '#E9E9EC', letterSpacing: 1 }}>MY QR</Text>
            <View style={{ marginHorizontal: z(46), marginTop: -z(22), backgroundColor: '#fff', borderRadius: z(16), borderWidth: 1, borderColor: '#ECECEC', alignItems: 'center', paddingVertical: z(18) }}>
              <QrBankLine account={primary} />
              <View style={{ marginTop: z(14) }}><BrandQr user={user} size={170} /></View>
              <Pressable onPress={copyUpi} style={{ flexDirection: 'row', alignItems: 'center', gap: z(6), marginTop: z(14), paddingHorizontal: z(16) }}>
                <Text style={{ fontSize: 14.5, color: '#5A5A5A', flexShrink: 1 }} numberOfLines={1}>UPI ID: {user.upiId}</Text>
                <Sym name="content_copy" size={16} color="#5A5A5A" />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: z(10), marginTop: z(16) }}>
                {[['download', 'Download', () => router.push('/my-qr')], ['share', 'Share', () => Share.share({ message: `Pay ${user.name} on ${appName}\nUPI ID: ${user.upiId}` })]].map(([ic, l, go]) => (
                  <Pressable key={l} onPress={go} style={{ flexDirection: 'row', alignItems: 'center', gap: z(6), borderWidth: 1, borderColor: '#E0E0E0', borderRadius: z(20), paddingHorizontal: z(14), height: z(36) }}>
                    <Sym name={ic} size={18} color="#1D1D1D" />
                    <Text style={{ fontSize: 14, color: '#1D1D1D' }}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {show('upiLite') && settings?.features?.upiLite !== false && (
          <Pressable onPress={() => router.push('/upi-lite')} style={{ flexDirection: 'row', alignItems: 'center', gap: z(14), paddingHorizontal: z(16), paddingVertical: z(18), backgroundColor: '#F5F5F7' }}>
            <View style={{ width: z(40), height: z(40), borderRadius: z(10), backgroundColor: '#E6F6EC', alignItems: 'center', justifyContent: 'center' }}><Sym name="bolt" fill size={24} color="#1E9E4A" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#1D1D1D', fontWeight: '500' }}>UPI Lite</Text>
              <Text style={{ fontSize: 14, color: '#6B6B6B', marginTop: z(2) }}>Pay PIN-free</Text>
            </View>
            <Text style={{ fontSize: 15, color: C.purpleText, fontWeight: '700' }}>{user?.upiLite ? 'Add Money' : 'Activate'}</Text>
          </Pressable>
        )}
      </Animated.ScrollView>

      <BottomNav active="home" />
    </View>
  );
}
