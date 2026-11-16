import { createContext, forwardRef, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { SCALE } from '../lib/theme';

// Inter in four static weights, picked from the style's fontWeight.
export const FONTS = {
  'Inter-Regular': require('../assets/fonts/Inter_400Regular.ttf'),
  'Inter-Medium': require('../assets/fonts/Inter_500Medium.ttf'),
  'Inter-SemiBold': require('../assets/fonts/Inter_600SemiBold.ttf'),
  'Inter-Bold': require('../assets/fonts/Inter_700Bold.ttf'),
};

const family = (w) => (w >= 700 ? 'Inter-Bold' : w >= 600 ? 'Inter-SemiBold' : w >= 500 ? 'Inter-Medium' : 'Inter-Regular');

// Picks the font file for the weight and scales sizes to the screen width.
// Text nested inside another Text only overrides what it sets, so it inherits size and weight.
function adapt(style, nested) {
  const flat = StyleSheet.flatten(style) || {};
  const out = {};
  if (!flat.fontFamily && (!nested || flat.fontWeight !== undefined)) {
    out.fontFamily = family(flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight || 400));
    out.fontWeight = 'normal';
  }
  if (!nested || flat.fontSize) out.fontSize = (flat.fontSize || 14) * SCALE;
  if (flat.lineHeight) out.lineHeight = flat.lineHeight * SCALE;
  return [style, out];
}

const InText = createContext(false);

export const Text = forwardRef(function Text({ style, children, ...props }, ref) {
  const nested = useContext(InText);
  return (
    <RNText ref={ref} {...props} style={adapt(style, nested)}>
      {nested ? children : <InText.Provider value>{children}</InText.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={adapt(style, false)} />;
});
