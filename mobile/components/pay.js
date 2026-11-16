import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, View } from 'react-native';
import { Text } from './Text';
import Svg, { Circle, Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { BankLogo, Btn, Sheet, s as ui } from './ui';
import { C } from '../lib/theme';
import { inr } from '../lib/format';

// Numeric keypad used on PIN and amount screens.
export function Keypad({ onKey, dark, confirmEnabled = true }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
  const fg = dark ? C.text : C.blue;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: dark ? '#F1F3F4' : '#fff', paddingVertical: 6 }}>
      {keys.map((k) => (
        <Pressable
          key={k}
          onPress={() => onKey(k)}
          disabled={k === 'ok' && !confirmEnabled}
          android_ripple={{ color: '#DADCE0', borderless: false }}
          style={({ pressed }) => [{ width: '33.33%', height: 64, alignItems: 'center', justifyContent: 'center' }, pressed && { backgroundColor: '#E8EAED' }]}
        >
          {k === 'back' ? <MaterialIcons name="backspace" size={26} color={fg} />
            : k === 'ok' ? (
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: confirmEnabled ? C.blue : '#BDC1C6', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="check" size={30} color="#fff" />
              </View>
            ) : <Text style={{ fontSize: 28, color: fg, fontWeight: '400' }}>{k}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

export function PinDots({ length, filled, show, value, error }) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!error) return;
    Animated.sequence([10, -10, 8, -8, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }))).start();
  }, [error, shake]);
  return (
    <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, transform: [{ translateX: shake }] }}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={{ width: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 26, height: 34, color: C.text, fontWeight: '600' }}>{i < filled ? (show ? value[i] : '•') : ''}</Text>
          <View style={{ height: 2, width: 28, backgroundColor: i < filled ? C.blue : '#9AA0A6' }} />
        </View>
      ))}
    </Animated.View>
  );
}

// Bottom sheet to choose which bank account pays.
export function AccountSheet({ visible, onClose, accounts, selectedId, onSelect, amount, onPay, payLabel }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Choose account to pay with">
      {accounts.map((a) => (
        <Pressable key={a.id} onPress={() => onSelect(a)} style={[ui.row, { paddingVertical: 12 }]}>
          <BankLogo account={a} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: C.text }}>{a.bankName} ••{a.last4}</Text>
            <Text style={{ fontSize: 13, color: C.muted }}>{a.type} account{a.primary ? ' · Primary' : ''}</Text>
          </View>
          <MaterialIcons name={selectedId === a.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={selectedId === a.id ? C.blue : C.faint} />
        </Pressable>
      ))}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Btn title={payLabel || `Pay ${inr(amount)}`} onPress={onPay} disabled={!selectedId} />
      </View>
    </Sheet>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Animated success tick (circle draws, then the check mark strokes in).
export function SuccessTick({ size = 140, color = C.green, failed, ink = "#fff" }) {
  const scale = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: false }),
      Animated.timing(draw, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    Animated.loop(Animated.timing(ripple, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }), { iterations: 2 }).start();
  }, [scale, draw, ripple]);
  const len = 60;
  const fill = failed ? C.red : color;
  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: fill,
        opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <AnimatedCircle cx="50" cy="50" r="48" fill={fill} />
          {failed ? (
            <AnimatedPath d="M34 34 L66 66 M66 34 L34 66" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none"
              strokeDasharray={len * 1.6} strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [len * 1.6, 0] })} />
          ) : (
            <AnimatedPath d="M28 52 L44 67 L73 36" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"
              strokeDasharray={len} strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [len, 0] })} />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

// Scratch card: drag a finger over the cover to reveal what's underneath.
export function ScratchCard({ size = 260, children, onRevealed, coverColor = '#4285F4' }) {
  const GRID = 12;
  const [cleared, setCleared] = useState(() => new Set());
  const [done, setDone] = useState(false);
  const layout = useRef({ x: 0, y: 0 });
  const doneRef = useRef(false);
  const fade = useRef(new Animated.Value(1)).current;

  const scratchAt = (x, y) => {
    if (doneRef.current) return;
    const cell = size / GRID;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    setCleared((prev) => {
      const next = new Set(prev);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx >= 0 && gy >= 0 && gx < GRID && gy < GRID) next.add(gy * GRID + gx);
      }
      if (next.size > GRID * GRID * 0.45 && !doneRef.current) {
        doneRef.current = true;
        Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setDone(true));
        onRevealed && onRevealed();
      }
      return next;
    });
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => scratchAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => scratchAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
  })).current;

  const cell = size / GRID;
  return (
    <View style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' }} onLayout={(e) => (layout.current = e.nativeEvent.layout)}>
      <View style={{ position: 'absolute', inset: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      {!done && (
        <Animated.View {...pan.panHandlers} style={{ position: 'absolute', width: size, height: size, opacity: fade }}>
          {Array.from({ length: GRID * GRID }).map((_, i) => (
            <View key={i} pointerEvents="none" style={{
              position: 'absolute', left: (i % GRID) * cell, top: Math.floor(i / GRID) * cell, width: cell + 0.5, height: cell + 0.5,
              backgroundColor: cleared.has(i) ? 'transparent' : ((Math.floor(i / GRID) + i) % 2 ? coverColor : shade(coverColor)),
            }} />
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: cleared.size < 6 ? 1 : 0 }}>
            <MaterialIcons name="card-giftcard" size={64} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 8 }}>Scratch here</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 18), g = Math.max(0, ((n >> 8) & 255) - 18), b = Math.max(0, (n & 255) - 18);
  return `rgb(${r},${g},${b})`;
}
