import { Dimensions, Platform } from 'react-native';

// In the browser preview the app lives in a phone-sized frame.
export const PHONE_WIDTH = 412;
// Sizes in the code were measured on a 412dp-wide screen; z() scales them to the real phone.
export const SCALE = Math.min(1, (Platform.OS === 'web' ? Math.min(Dimensions.get('window').width, PHONE_WIDTH) : Dimensions.get('window').width) / PHONE_WIDTH);
export const z = (n) => Math.round(n * SCALE * 2) / 2;

export const screenWidth = () => (Platform.OS === 'web' ? Math.min(Dimensions.get('window').width, PHONE_WIDTH) : Dimensions.get('window').width);

// Colours sampled from the reference recording.
export const C = {
  purple: '#5F259F', // brand purple: round shortcut icons, buttons, tab Scan button
  purpleDeep: '#3D1773',
  purpleText: '#6739B7', // "More", "Manage", "CHECK BALANCE"
  lilac: '#F1E9FB', // search pill, soft icon circles
  lilacLine: '#E4D7F5',
  tile: '#F5F5F7', // grey service tiles
  peach: '#FFEDE3', // "Refer → ₹1200" pill
  orange: '#F26B21', // "Offer" badge
  okGreen: '#1B8A3B', // "Transaction Successful" header

  // Older names kept so shared screens pick up the purple theme.
  navy: '#5F259F',
  navyDeep: '#3D1773',
  navyText: '#5F259F',
  cyan: '#8B5CF6',
  link: '#6739B7',
  icon: '#5F259F',
  mint: '#E9DDFB',
  mintText: '#4B2A86',
  offer: '#F1E9FB',
  badge: '#F26B21',

  blue: '#5F259F',
  blueDark: '#3D1773',
  blueSoft: '#F1E9FB',
  blueTint: '#E4D7F5',
  text: '#1D1D1D',
  muted: '#6B6B6B',
  faint: '#9A9A9A',
  line: '#EEEEEE',
  bg: '#FFFFFF',
  page: '#F5F5F7',
  surface: '#F5F5F7',
  green: '#1E8E3E',
  greenSoft: '#E3F6EC',
  red: '#E5484D',
  redSoft: '#FDE7E8',
  pink: '#FFDADC',
  amber: '#B06000',
  amberSoft: '#FFF5D6',
  gYellow: '#F9D540',
  gRed: '#E5484D',
  gGreen: '#1E8E3E',
  gBlue: '#5F259F',
};

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};
