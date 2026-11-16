const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Indian digit grouping: 12,34,567.89
export function groupIN(n) {
  const [int, dec] = Math.abs(Number(n) || 0).toFixed(2).split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return { int: (rest ? rest + ',' : '') + last3, dec };
}

export function inr(n, { decimals = 'auto' } = {}) {
  const { int, dec } = groupIN(n);
  const sign = Number(n) < 0 ? '-' : '';
  if (decimals === 'auto' && dec === '00') return `${sign}₹${int}`;
  return `${sign}₹${int}.${dec}`;
}

const pad = (n) => String(n).padStart(2, '0');

export function time(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ap}`;
}

export function shortDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

export function fullDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time(ts)}`;
}

// "4 November"
export function dayMonth(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

// "4 Nov 2026, 2:15 pm"
export function receiptDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time(ts)}`;
}

export const MONTH_NAMES = MONTHS_LONG;

export function monthKey(ts) {
  const d = new Date(ts);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function initials(name) {
  // Two letters (first + last word), like the reference app's avatars: "KR".
  const w = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return ((w[0][0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

export function firstName(name) {
  return (name || '').trim().split(/\s+/)[0];
}

export const TYPE_LABEL = {
  p2p: 'UPI payment', bank_transfer: 'Bank transfer', self: 'Self transfer', bill: 'Bill payment',
  recharge: 'Mobile recharge', cashback: 'Cashback', refund: 'Refund', admin: 'Adjustment',
};

export const BILL_CATEGORIES = [
  { key: 'electricity', label: 'Electricity', icon: 'lightning-bolt' },
  { key: 'dth', label: 'DTH / Cable TV', icon: 'satellite-uplink' },
  { key: 'broadband', label: 'Broadband', icon: 'router-wireless' },
  { key: 'water', label: 'Water', icon: 'water' },
  { key: 'gas', label: 'LPG / Gas', icon: 'gas-cylinder' },
  { key: 'fastag', label: 'FASTag', icon: 'car' },
  { key: 'creditcard', label: 'Credit card', icon: 'credit-card-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-check-outline' },
];

// "1:45 PM"
export function time12(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())} ${ap}`;
}

// "13 Nov, 12:45 PM" (history rows)
export function rowDate(ts) {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${time12(ts)}`;
}

// "11:08 AM, 13 Nov 2026" (receipts)
export function paidAt(ts) {
  const d = new Date(ts);
  return `${time12(ts)}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// "23 Sep 2026" (chat date pill)
export function dayMonYear(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// PhonePe shows decimals only when present, with one digit if it ends in 0: ₹4,01,326.1
export function inrShort(n) {
  const v = Math.round(Math.abs(Number(n) || 0) * 100) / 100;
  const { int, dec } = groupIN(v);
  const d = dec === '00' ? '' : '.' + dec.replace(/0$/, '');
  return `${Number(n) < 0 ? '-' : ''}₹${int}${d}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? ONES[h] + ' Hundred' : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}
// Indian numbering in words: 100000 -> "Rupees One Lakh Only"
export function rupeesInWords(amount) {
  const rupees = Math.floor(Math.abs(Number(amount) || 0));
  const paise = Math.round((Math.abs(Number(amount) || 0) - rupees) * 100);
  const parts = [];
  const crore = Math.floor(rupees / 10000000), lakh = Math.floor((rupees % 10000000) / 100000), thousand = Math.floor((rupees % 100000) / 1000), rest = rupees % 1000;
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (rest) parts.push(threeDigits(rest));
  let out = 'Rupees ' + (parts.join(' ') || 'Zero');
  if (paise) out += ' and ' + twoDigits(paise) + ' Paise';
  return out + ' Only';
}

// Mask a UPI ID: 9876543210@ppy -> ******3210@ppy
export function maskUpi(upi) {
  const [h, d] = String(upi || '').split('@');
  if (!d) return upi || '';
  return '******' + h.slice(-4) + '@' + d;
}

export function maskPhone(p) {
  return '+91 ******' + String(p || '').slice(-4);
}
