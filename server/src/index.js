const path = require('path');
const http = require('http');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const store = require('./db');
const { AVATAR_COLORS, CATEGORIES } = require('./seed');

const PORT = process.env.PORT || 4002;
const D = () => store.get();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
app.get('/', (req, res) => res.redirect('/admin'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------- helpers ----------
class ApiError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
const fail = (status, message, code) => { throw new ApiError(status, message, code); };
const wrap = (fn) => (req, res) => {
  try {
    const out = fn(req, res);
    store.save();
    res.json(out === undefined ? { ok: true } : out);
  } catch (e) {
    if (!(e instanceof ApiError)) console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'Server error', code: e.code });
  }
};
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const findUser = (uid) => D().users.find((u) => u.id === uid);
const findAccount = (aid) => D().accounts.find((a) => a.id === aid);
const findBank = (bid) => D().banks.find((b) => b.id === bid);
const primaryAccount = (uid) => D().accounts.find((a) => a.userId === uid && a.primary && a.linked)
  || D().accounts.find((a) => a.userId === uid && a.linked);

function publicUser(u) {
  if (!u) return null;
  const { id, name, phone, upiId, photo, color, isMerchant, merchantCategory, merchantIcon } = u;
  return { id, name, phone, upiId, photo, color, isMerchant, merchantCategory, merchantIcon: merchantIcon || '' };
}

function publicAccount(a, withBalance) {
  const bank = findBank(a.bankId) || {};
  const out = {
    id: a.id, bankId: a.bankId, bankName: bank.name, bankShort: bank.short, bankColor: bank.color, bankLogo: bank.logo || null,
    last4: a.accountNo.slice(-4), last6: a.accountNo.slice(-6), ifsc: a.ifsc, type: a.type, primary: a.primary, linked: a.linked, hasPin: !!a.pinHash, pinLength: a.pinLength || 4,
  };
  if (withBalance) out.balance = a.balance;
  return out;
}

// Push "something changed" signals to apps and admin panels.
function notifyUsers(userIds, scope = 'all') {
  [...new Set(userIds.filter(Boolean))].forEach((uid) => io.to('user:' + uid).emit('refresh', { scope }));
  io.to('admins').emit('admin:refresh', { scope });
}
function broadcastSettings() {
  io.emit('settings', clientSettings());
  io.to('admins').emit('admin:refresh', { scope: 'settings' });
}
function pushNotification(userId, title, body, extra = {}) {
  const n = { id: store.id('ntf'), userId, title, body, createdAt: Date.now(), readBy: [], ...extra };
  D().notifications.unshift(n);
  if (userId) io.to('user:' + userId).emit('notify', { title, body });
  else io.emit('notify', { title, body });
  return n;
}
function audit(admin, action, details) {
  D().auditLogs.unshift({ id: store.id('log'), adminId: admin.id, adminName: admin.name, action, details, at: Date.now() });
  if (D().auditLogs.length > 2000) D().auditLogs.length = 2000;
}
const DEFAULT_AD = { active: true, sponsor: 'Foodie Express', title: 'Steal deal: meals from ₹99', subtitle: 'Hot & crispy combos near you', cta: 'Order now', color: '#B3261E', emoji: '🍗', image: '' };

function clientSettings() {
  const s = D().settings;
  return {
    appIcon: s.appIcon || '',
    adCard: { ...DEFAULT_AD, ...(s.adCard || {}) },
    appName: s.appName, maintenanceMode: s.maintenanceMode, maintenanceMessage: s.maintenanceMessage,
    perTxLimit: s.perTxLimit, dailyLimit: s.dailyLimit, referralBonus: s.referralBonus, announcement: s.announcement,
    features: s.features, homeSections: s.homeSections, demoOtp: s.demoOtp,
    appVersion: s.appVersion || 'v1.0.0', heroTitle: s.heroTitle ?? 'Cashback FEST', heroSubtitle: s.heroSubtitle ?? 'Up to ₹50 assured cashback on UPI payments*',
    heroCta: s.heroCta ?? 'Pay now', promoChip: s.promoChip ?? 'Up to ₹50 Cashback on UPI*', categories: s.categories || CATEGORIES,
  };
}

// Move money for a transaction (dir = 1 apply, -1 revert).
function applyBalances(t, dir) {
  const fa = findAccount(t.fromAccountId);
  const ta = findAccount(t.toAccountId);
  if (fa) fa.balance = round2(fa.balance - dir * t.amount);
  if (ta) ta.balance = round2(ta.balance + dir * t.amount);
  t.applied = dir === 1;
}

function decorateTxn(t, me) {
  const outgoing = me ? t.fromUserId === me : false;
  const other = outgoing ? findUser(t.toUserId) : findUser(t.fromUserId);
  const fa = findAccount(t.fromAccountId);
  const ta = findAccount(t.toAccountId);
  const fromUser = findUser(t.fromUserId);
  return {
    ...t,
    fromHandle: t.fromHandle || (fromUser && fromUser.upiId) || '',
    direction: outgoing ? 'out' : 'in',
    counterparty: outgoing
      ? { name: t.toName, handle: t.toHandle, user: publicUser(other) }
      : { name: t.fromName, handle: t.fromHandle || (other && other.upiId) || '', user: publicUser(other) },
    fromAccount: fa ? publicAccount(fa) : null,
    toAccount: ta ? publicAccount(ta) : null,
  };
}

// ---------- user auth ----------
function userAuth(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sess = D().sessions[token];
  if (!sess) fail(401, 'Please sign in again', 'UNAUTHORIZED');
  const user = findUser(sess.userId);
  if (!user) fail(401, 'Account not found', 'UNAUTHORIZED');
  if (user.blocked) fail(403, 'Your account has been blocked. Contact support.', 'BLOCKED');
  user.lastActiveAt = Date.now();
  return user;
}
const userRoute = (fn, { allowMaintenance } = {}) => wrap((req, res) => {
  const user = userAuth(req);
  if (D().settings.maintenanceMode && !allowMaintenance) fail(503, D().settings.maintenanceMessage, 'MAINTENANCE');
  return fn(req, user, res);
});
const requireFeature = (key) => { if (!D().settings.features[key]) fail(403, 'This feature is currently unavailable', 'FEATURE_OFF'); };

app.get('/api/health', (req, res) => res.json({ ok: true, ...store.status() }));

app.get('/api/config', wrap(() => ({ settings: clientSettings(), banks: D().banks.filter((b) => b.active) })));

app.post('/api/auth/send-otp', wrap((req) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) fail(400, 'Enter a valid 10-digit mobile number');
  const s = D().settings;
  const code = s.demoOtp ? s.otpCode : store.digits(6);
  D().otps[phone] = { code, at: Date.now() };
  console.log(`[OTP] ${phone}: ${code}`);
  // No SMS gateway in this project: the code is returned so the app can show it as an incoming SMS.
  return { sent: true, phone, code };
}));

app.post('/api/auth/verify-otp', wrap((req) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
  const rec = D().otps[phone];
  if (!rec || rec.code !== String(req.body.code)) fail(400, 'Incorrect OTP. Please try again.');
  if (Date.now() - rec.at > 10 * 60000) fail(400, 'OTP expired. Request a new one.');
  delete D().otps[phone];
  let user = D().users.find((u) => u.phone === phone);
  if (user && user.blocked) fail(403, 'Your account has been blocked. Contact support.', 'BLOCKED');
  if (!user) {
    user = {
      id: store.id('usr'), name: '', phone, email: '', upiId: '', photo: null,
      color: AVATAR_COLORS[D().users.length % AVATAR_COLORS.length], isMerchant: false, merchantCategory: '',
      blocked: false, profileComplete: false, referralCode: 'PT' + store.digits(5), goldCoins: 0, upiLite: 0, createdAt: Date.now(),
    };
    D().users.push(user);
    notifyUsers([], 'users');
  }
  const token = store.token();
  D().sessions[token] = { userId: user.id, createdAt: Date.now() };
  return { token, user, isNew: !user.profileComplete };
}));

app.post('/api/auth/logout', wrap((req) => {
  delete D().sessions[(req.headers.authorization || '').replace('Bearer ', '')];
}));

// ---------- profile & accounts ----------
function meResponse(user) {
  return {
    user,
    accounts: D().accounts.filter((a) => a.userId === user.id && a.linked).map((a) => publicAccount(a)),
    settings: clientSettings(),
  };
}

app.get('/api/me', userRoute((req, user) => meResponse(user), { allowMaintenance: true }));

app.put('/api/me', userRoute((req, user) => {
  const { name, email, photo, language } = req.body;
  if (name !== undefined) {
    if (!String(name).trim()) fail(400, 'Name is required');
    user.name = String(name).trim();
    if (!user.upiId) {
      let handle = user.phone + '@plum';
      while (D().users.some((u) => u.upiId === handle && u.id !== user.id)) handle = user.phone + store.digits(2) + '@plum';
      user.upiId = handle;
    }
  }
  if (email !== undefined) user.email = String(email).trim();
  if (photo !== undefined) user.photo = photo;
  if (language !== undefined) user.language = language;
  user.profileComplete = !!user.name;
  notifyUsers([user.id], 'profile');
  return meResponse(user);
}, { allowMaintenance: true }));

app.post('/api/accounts/discover', userRoute((req, user) => {
  const bank = findBank(req.body.bankId);
  if (!bank) fail(400, 'Select a bank');
  // Pretend we found the account linked to this mobile number at the bank.
  let acc = D().accounts.find((a) => a.userId === user.id && a.bankId === bank.id);
  if (!acc) {
    acc = {
      id: store.id('acc'), userId: user.id, bankId: bank.id, accountNo: store.digits(12), ifsc: bank.ifscPrefix + '0' + store.digits(6),
      type: 'Savings', balance: D().settings.newAccountBalance, primary: false, linked: false, pinHash: null, createdAt: Date.now(),
    };
    D().accounts.push(acc);
  }
  return { account: publicAccount(acc) };
}));

app.post('/api/accounts/:id/link', userRoute((req, user) => {
  const acc = findAccount(req.params.id);
  if (!acc || acc.userId !== user.id) fail(404, 'Account not found');
  const pin = String(req.body.pin || '');
  if (!acc.pinHash) {
    if (!/^\d{4}$|^\d{6}$/.test(pin)) fail(400, 'UPI PIN must be 4 or 6 digits');
    acc.pinHash = store.hashSecret(pin);
    acc.pinLength = pin.length;
  } else if (pin && !store.verifySecret(pin, acc.pinHash)) {
    fail(400, 'Incorrect UPI PIN');
  }
  acc.linked = true;
  if (!D().accounts.some((a) => a.userId === user.id && a.primary && a.linked && a.id !== acc.id)) acc.primary = true;
  notifyUsers([user.id], 'accounts');
  return meResponse(user);
}));

app.post('/api/accounts/:id/pin', userRoute((req, user) => {
  const acc = findAccount(req.params.id);
  if (!acc || acc.userId !== user.id) fail(404, 'Account not found');
  const { oldPin, newPin } = req.body;
  if (acc.pinHash && oldPin !== undefined && !store.verifySecret(oldPin, acc.pinHash)) fail(400, 'Old UPI PIN is incorrect');
  if (!/^\d{4}$|^\d{6}$/.test(String(newPin))) fail(400, 'UPI PIN must be 4 or 6 digits');
  acc.pinHash = store.hashSecret(newPin);
  acc.pinLength = String(newPin).length;
  return { ok: true };
}));

app.post('/api/accounts/:id/primary', userRoute((req, user) => {
  const acc = findAccount(req.params.id);
  if (!acc || acc.userId !== user.id) fail(404, 'Account not found');
  D().accounts.filter((a) => a.userId === user.id).forEach((a) => { a.primary = a.id === acc.id; });
  notifyUsers([user.id], 'accounts');
  return meResponse(user);
}));

app.delete('/api/accounts/:id', userRoute((req, user) => {
  const acc = findAccount(req.params.id);
  if (!acc || acc.userId !== user.id) fail(404, 'Account not found');
  acc.linked = false;
  if (acc.primary) {
    acc.primary = false;
    const next = D().accounts.find((a) => a.userId === user.id && a.linked);
    if (next) next.primary = true;
  }
  notifyUsers([user.id], 'accounts');
  return meResponse(user);
}));

app.post('/api/accounts/:id/balance', userRoute((req, user) => {
  requireFeature('checkBalance');
  const acc = findAccount(req.params.id);
  if (!acc || acc.userId !== user.id) fail(404, 'Account not found');
  if (!store.verifySecret(req.body.pin, acc.pinHash)) fail(400, 'Incorrect UPI PIN', 'INCORRECT_PIN');
  return { account: publicAccount(acc, true) };
}));

// ---------- people ----------
app.get('/api/users/search', userRoute((req, user) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const merchants = req.query.type === 'business';
  let list = D().users.filter((u) => u.id !== user.id && u.profileComplete && !u.blocked && u.isMerchant === merchants);
  if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.upiId.includes(q));
  return { users: list.map(publicUser).sort((a, b) => a.name.localeCompare(b.name)) };
}));

app.get('/api/users/resolve', userRoute((req, user) => {
  const upi = String(req.query.upi || '').toLowerCase().trim();
  const phone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
  const target = D().users.find((u) => (upi && u.upiId === upi) || (phone && u.phone === phone));
  if (!target || !target.profileComplete) fail(404, upi ? 'This UPI ID does not exist' : 'This number is not on PlumPay yet');
  if (target.id === user.id) fail(400, 'You cannot pay yourself. Use self transfer instead.');
  if (target.blocked) fail(400, 'This account cannot receive payments right now');
  return { user: publicUser(target) };
}));

app.get('/api/users/:id', userRoute((req) => {
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  return { user: publicUser(u) };
}));

function recentPeople(user, merchants) {
  const seen = new Set();
  const out = [];
  for (const t of D().transactions) {
    if (t.fromUserId !== user.id && t.toUserId !== user.id) continue;
    const otherId = t.fromUserId === user.id ? t.toUserId : t.fromUserId;
    const other = findUser(otherId);
    if (!other || other.id === user.id || seen.has(other.id) || other.isMerchant !== merchants || other.blocked) continue;
    seen.add(other.id);
    out.push(publicUser(other));
    if (out.length >= 12) break;
  }
  return out;
}

// Billers and operators the user has paid before (for the "Bills & recharges" row).
function recentBills(user) {
  const d = D();
  const seen = new Set();
  const out = [];
  for (const t of d.transactions) {
    if (t.fromUserId !== user.id || !['bill', 'recharge'].includes(t.type) || t.status !== 'success') continue;
    const key = t.billerId || t.operatorId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const biller = t.billerId && d.billers.find((b) => b.id === key);
    const op = t.operatorId && d.operators.find((o) => o.id === key);
    if (!biller && !op) continue;
    const days = (Date.now() - t.createdAt) / 86400000;
    out.push({
      id: key, kind: biller ? 'bill' : 'recharge', name: t.toName, color: (biller || op).color, category: biller ? biller.category : 'recharge',
      // Monthly bills come due again after ~25 days.
      due: biller ? days > 10 : days > 24,
    });
    if (out.length >= 4) break;
  }
  // New users see the most popular billers so the row is never empty.
  const elec = d.billers.find((b) => b.active && b.category === 'electricity');
  const defaults = [
    elec && { id: elec.id, kind: 'bill', name: elec.name, color: elec.color, category: 'electricity', due: true },
    ...['Vi', 'Airtel', 'Jio'].map((n) => d.operators.find((o) => o.active && o.name === n))
      .filter(Boolean).map((o) => ({ id: o.id, kind: 'recharge', name: `${o.name} Prepaid`, color: o.color, category: 'recharge', due: false })),
  ].filter(Boolean);
  for (const b of defaults) {
    if (out.length >= 4) break;
    if (!out.some((x) => x.id === b.id)) out.push(b);
  }
  return out;
}

// ---------- home ----------
app.get('/api/home', userRoute((req, user) => {
  const d = D();
  const unread = d.notifications.filter((n) => (n.userId === null || n.userId === user.id) && !n.readBy.includes(user.id)).length;
  return {
    settings: clientSettings(),
    banners: d.banners.filter((b) => b.active).sort((a, b) => (a.order || 0) - (b.order || 0)),
    offers: d.offers.filter((o) => o.active).slice(0, 4),
    people: recentPeople(user, false),
    businesses: recentPeople(user, true).concat(d.users.filter((u) => u.isMerchant && !u.blocked).map(publicUser))
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i).slice(0, 8),
    pendingRequests: d.requests.filter((r) => r.toUserId === user.id && r.status === 'pending')
      .map((r) => ({ ...r, from: publicUser(findUser(r.fromUserId)) })),
    rewardsTotal: d.rewards.filter((r) => r.userId === user.id && r.scratched).reduce((s, r) => s + r.amount, 0),
    unscratched: d.rewards.filter((r) => r.userId === user.id && !r.scratched).length,
    unreadNotifications: unread,
    recentBills: recentBills(user),
  };
}));

// ---------- transactions ----------
app.get('/api/transactions', userRoute((req, user) => {
  let list = D().transactions.filter((t) => t.fromUserId === user.id || t.toUserId === user.id);
  // A self transfer shows once.
  list = list.map((t) => decorateTxn(t, user.id));
  return { transactions: list };
}));

app.get('/api/transactions/:id', userRoute((req, user) => {
  const t = D().transactions.find((x) => x.id === req.params.id);
  if (!t || (t.fromUserId !== user.id && t.toUserId !== user.id)) fail(404, 'Transaction not found');
  return { transaction: decorateTxn(t, user.id) };
}));

app.get('/api/thread/:userId', userRoute((req, user) => {
  const other = findUser(req.params.userId);
  if (!other) fail(404, 'User not found');
  const pair = (a, b) => (a === user.id && b === other.id) || (a === other.id && b === user.id);
  const txns = D().transactions.filter((t) => pair(t.fromUserId, t.toUserId)).map((t) => ({ kind: 'txn', at: t.createdAt, ...decorateTxn(t, user.id) }));
  const reqs = D().requests.filter((r) => pair(r.fromUserId, r.toUserId)).map((r) => ({ kind: 'request', at: r.createdAt, ...r, mine: r.fromUserId === user.id }));
  return { user: publicUser(other), items: [...txns, ...reqs].sort((a, b) => a.at - b.at) };
}));

// The receipt's category chip ("Money Transfer", "Shopping"…) can be changed by the user.
app.put('/api/transactions/:id/category', userRoute((req, user) => {
  const t = D().transactions.find((x) => x.id === req.params.id);
  if (!t || (t.fromUserId !== user.id && t.toUserId !== user.id)) fail(404, 'Transaction not found');
  const category = String(req.body.category || '').trim().slice(0, 30);
  if (!category) fail(400, 'Choose a category');
  t.category = category;
  notifyUsers([user.id], 'transactions');
  return { transaction: decorateTxn(t, user.id) };
}));

// UPI Lite: a small on-device wallet topped up from the bank account.
app.post('/api/upi-lite', userRoute((req, user) => {
  requireFeature('upiLite');
  const acc = findAccount(req.body.accountId);
  if (!acc || acc.userId !== user.id) fail(400, 'Select a bank account');
  const amount = round2(req.body.amount);
  const withdraw = req.body.action === 'withdraw';
  if (!(amount > 0)) fail(400, 'Enter a valid amount');
  if (!store.verifySecret(req.body.pin, acc.pinHash)) fail(400, 'Incorrect UPI PIN', 'INCORRECT_PIN');
  const lite = user.upiLite || 0;
  if (withdraw && amount > lite) fail(400, 'Not enough balance in UPI Lite');
  if (!withdraw && lite + amount > 5000) fail(400, 'UPI Lite balance can be at most ₹5,000');
  if (!withdraw && acc.balance < amount) fail(400, 'Insufficient balance in your bank account');
  acc.balance = round2(acc.balance + (withdraw ? amount : -amount));
  user.upiLite = round2(lite + (withdraw ? -amount : amount));
  const t = {
    id: store.id('txn'), upiRef: store.digits(12), type: 'self', status: 'success',
    fromUserId: user.id, fromAccountId: withdraw ? null : acc.id, fromName: withdraw ? 'UPI Lite' : user.name, fromHandle: user.upiId,
    toUserId: user.id, toAccountId: withdraw ? acc.id : null, toName: withdraw ? `${(findBank(acc.bankId) || {}).name} - ${acc.accountNo.slice(-4)}` : 'UPI Lite', toHandle: '',
    amount, note: withdraw ? 'Withdrawn from UPI Lite' : 'Added to UPI Lite', category: 'Money Transfer', createdAt: Date.now(), createdBy: 'user', applied: true, failureReason: '',
  };
  D().transactions.unshift(t);
  notifyUsers([user.id], 'accounts');
  return { upiLite: user.upiLite, transaction: decorateTxn(t, user.id) };
}));

function spentToday(userId) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return D().transactions
    .filter((t) => t.fromUserId === userId && t.status === 'success' && t.createdAt >= start.getTime() && t.type !== 'self')
    .reduce((s, t) => s + t.amount, 0);
}

function maybeReward(user, t) {
  if (!D().settings.features.rewards || !['p2p', 'bill', 'recharge'].includes(t.type)) return null;
  const toMerchantOrBill = t.type !== 'p2p' || (findUser(t.toUserId) || {}).isMerchant;
  const camp = D().campaigns.find((c) => c.active && t.amount >= c.minAmount && (!c.types || c.types.includes(t.type)) && (c.types || toMerchantOrBill || t.amount >= 500));
  if (!camp || Math.random() > camp.chance) return null;
  const win = Math.random() < 0.75;
  const amount = win ? Math.round(camp.minCashback + Math.random() * (camp.maxCashback - camp.minCashback)) : 0;
  const r = { id: store.id('rwd'), userId: user.id, campaignId: camp.id, title: camp.title, amount, scratched: false, createdAt: Date.now(), txnId: t.id };
  D().rewards.unshift(r);
  return r;
}

app.post('/api/pay', userRoute((req, user) => {
  const d = D();
  const s = d.settings;
  const b = req.body;
  const type = b.type || 'p2p';
  const featureFor = { p2p: 'payContacts', bank_transfer: 'bankTransfer', self: 'selfTransfer', bill: 'bills', recharge: 'recharge' };
  if (!featureFor[type]) fail(400, 'Unknown payment type');
  requireFeature(featureFor[type]);

  const amount = round2(b.amount);
  if (!(amount > 0)) fail(400, 'Enter a valid amount');
  if (amount > s.perTxLimit) fail(400, `You can send up to ₹${s.perTxLimit.toLocaleString('en-IN')} in one payment`);

  const from = findAccount(b.accountId);
  if (!from || from.userId !== user.id || !from.linked) fail(400, 'Select a bank account');

  const t = {
    id: store.id('txn'), upiRef: store.digits(12), type, status: 'pending', fromUserId: user.id, fromAccountId: from.id,
    fromName: user.name, fromHandle: user.upiId, toUserId: null, toAccountId: null, toName: '', toHandle: '',
    amount, note: String(b.note || '').slice(0, 50), category: 'Money Transfer', failureReason: '', createdAt: Date.now(),
    createdBy: 'user', applied: false,
  };

  if (type === 'p2p') {
    const to = b.toUserId ? findUser(b.toUserId) : d.users.find((u) => u.upiId === String(b.toUpi || '').toLowerCase());
    if (!to || !to.profileComplete) fail(404, 'Receiver not found');
    if (to.id === user.id) fail(400, 'You cannot pay yourself');
    const toAcc = primaryAccount(to.id);
    if (!toAcc || to.blocked) fail(400, `${to.name} cannot receive payments right now`);
    Object.assign(t, { toUserId: to.id, toAccountId: toAcc.id, toName: to.name, toHandle: to.upiId, category: to.isMerchant ? to.merchantCategory : 'Money Transfer' });
  } else if (type === 'self') {
    const toAcc = findAccount(b.toAccountId);
    if (!toAcc || toAcc.userId !== user.id || toAcc.id === from.id) fail(400, 'Select a different account to transfer to');
    const bank = findBank(toAcc.bankId) || {};
    Object.assign(t, { toUserId: user.id, toAccountId: toAcc.id, toName: `${bank.name} ••${toAcc.accountNo.slice(-4)}`, toHandle: toAcc.ifsc, category: 'Money Transfer' });
  } else if (type === 'bank_transfer') {
    const accNo = String(b.accountNo || '').replace(/\s/g, '');
    const ifsc = String(b.ifsc || '').toUpperCase();
    if (accNo.length < 9 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) fail(400, 'Check account number and IFSC');
    if (!String(b.name || '').trim()) fail(400, 'Enter account holder name');
    const toAcc = d.accounts.find((a) => a.accountNo === accNo && a.linked);
    Object.assign(t, { toUserId: toAcc ? toAcc.userId : null, toAccountId: toAcc ? toAcc.id : null, toName: String(b.name).trim(), toHandle: `A/c ••${accNo.slice(-4)} · ${ifsc}`, category: 'Money Transfer' });
    if (toAcc && toAcc.userId === user.id) t.type = 'self';
  } else if (type === 'bill') {
    const biller = d.billers.find((x) => x.id === b.billerId);
    if (!biller) fail(400, 'Select a biller');
    Object.assign(t, { toName: biller.name, toHandle: `Consumer no. ${b.consumerNo || ''}`, category: 'Bills & Recharge', billerId: biller.id, billCategory: biller.category });
  } else if (type === 'recharge') {
    const op = d.operators.find((x) => x.id === b.operatorId);
    if (!op) fail(400, 'Select an operator');
    Object.assign(t, { toName: `${op.name} Prepaid`, toHandle: `Mobile ${b.mobile || ''}`, category: 'Bills & Recharge', operatorId: op.id, planId: b.planId });
  }

  // Failures below are recorded just like a real UPI app does.
  let failure = '';
  if (!store.verifySecret(b.pin, from.pinHash)) failure = 'Incorrect UPI PIN';
  else if (from.balance < amount) failure = 'Insufficient balance in your bank account';
  else if (t.type !== 'self' && spentToday(user.id) + amount > s.dailyLimit) failure = 'Daily UPI limit exceeded';

  if (failure) {
    t.status = 'failed';
    t.failureReason = failure;
    d.transactions.unshift(t);
    notifyUsers([user.id], 'transactions');
    return { transaction: decorateTxn(t, user.id), reward: null };
  }

  t.status = 'success';
  applyBalances(t, 1);
  d.transactions.unshift(t);

  if (b.requestId) {
    const r = d.requests.find((x) => x.id === b.requestId && x.toUserId === user.id);
    if (r) { r.status = 'paid'; r.txnId = t.id; }
  }
  if (t.toUserId && t.toUserId !== user.id) {
    pushNotification(t.toUserId, `₹${amount.toLocaleString('en-IN')} received`, `${user.name} paid you${t.note ? ' for ' + t.note : ''}`, { txnId: t.id });
  }
  const reward = maybeReward(user, t);
  notifyUsers([user.id, t.toUserId], 'transactions');
  return { transaction: decorateTxn(t, user.id), reward };
}));

// ---------- requests ----------
app.post('/api/requests', userRoute((req, user) => {
  requireFeature('requests');
  const to = findUser(req.body.toUserId);
  const amount = round2(req.body.amount);
  if (!to || to.id === user.id) fail(400, 'Select who to request from');
  if (!(amount > 0)) fail(400, 'Enter a valid amount');
  const r = { id: store.id('req'), fromUserId: user.id, toUserId: to.id, amount, note: String(req.body.note || '').slice(0, 50), status: 'pending', createdAt: Date.now() };
  D().requests.unshift(r);
  pushNotification(to.id, `${user.name} requested ₹${amount.toLocaleString('en-IN')}`, r.note || 'Tap to pay');
  notifyUsers([user.id, to.id], 'requests');
  return { request: r };
}));

app.post('/api/requests/:id/decline', userRoute((req, user) => {
  const r = D().requests.find((x) => x.id === req.params.id);
  if (!r || (r.toUserId !== user.id && r.fromUserId !== user.id)) fail(404, 'Request not found');
  r.status = r.fromUserId === user.id ? 'cancelled' : 'declined';
  notifyUsers([r.fromUserId, r.toUserId], 'requests');
}));

// ---------- bills & recharge ----------
app.get('/api/billers', userRoute((req) => {
  requireFeature('bills');
  const cat = req.query.category;
  return { billers: D().billers.filter((b) => b.active && (!cat || b.category === cat)) };
}));

app.post('/api/bills/fetch', userRoute((req, user) => {
  const biller = D().billers.find((x) => x.id === req.body.billerId);
  const consumerNo = String(req.body.consumerNo || '').trim();
  if (!biller) fail(400, 'Select a biller');
  if (consumerNo.length < 5) fail(400, 'Enter a valid consumer number');
  // Deterministic dummy bill for the same consumer number.
  const seed = [...(consumerNo + biller.id)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100000, 7);
  const due = new Date(Date.now() + ((seed % 12) + 3) * 86400000);
  return { bill: { billerId: biller.id, billerName: biller.name, consumerNo, customerName: user.name, amount: 180 + (seed % 3200) + (seed % 100) / 100, dueDate: due.getTime(), billNo: 'BL' + seed + consumerNo.slice(-3) } };
}));

app.get('/api/recharge/operators', userRoute(() => { requireFeature('recharge'); return { operators: D().operators.filter((o) => o.active) }; }));
app.get('/api/recharge/plans', userRoute((req) => ({ plans: D().plans.filter((p) => p.active && p.operatorId === req.query.operatorId).sort((a, b) => a.price - b.price) })));
app.get('/api/recharge/detect', userRoute((req) => {
  const ops = D().operators.filter((o) => o.active);
  const phone = String(req.query.mobile || '').replace(/\D/g, '');
  const known = D().users.find((u) => u.phone === phone);
  return { operator: ops[(Number(phone.slice(-1)) || (known ? 1 : 0)) % ops.length] || null };
}));

// ---------- rewards & offers ----------
app.get('/api/rewards', userRoute((req, user) => {
  const list = D().rewards.filter((r) => r.userId === user.id);
  return { rewards: list, total: list.filter((r) => r.scratched).reduce((s, r) => s + r.amount, 0), referralCode: user.referralCode };
}));

app.post('/api/rewards/:id/scratch', userRoute((req, user) => {
  const r = D().rewards.find((x) => x.id === req.params.id && x.userId === user.id);
  if (!r) fail(404, 'Reward not found');
  if (!r.scratched) {
    r.scratched = true;
    r.scratchedAt = Date.now();
    const acc = primaryAccount(user.id);
    if (r.amount > 0 && acc) {
      const t = {
        id: store.id('txn'), upiRef: store.digits(12), type: 'cashback', status: 'success', fromUserId: null, fromAccountId: null,
        fromName: 'PlumPay Rewards', fromHandle: 'rewards@plum', toUserId: user.id, toAccountId: acc.id, toName: user.name, toHandle: user.upiId,
        amount: r.amount, note: 'Cashback won', category: 'Cashback', createdAt: Date.now(), createdBy: 'system', applied: false,
      };
      applyBalances(t, 1);
      D().transactions.unshift(t);
      r.txnId = t.id;
    }
    notifyUsers([user.id], 'rewards');
  }
  return { reward: r };
}));

app.get('/api/offers', userRoute(() => ({ offers: D().offers.filter((o) => o.active) })));

// ---------- notifications & support ----------
app.get('/api/notifications', userRoute((req, user) => ({
  notifications: D().notifications.filter((n) => n.userId === null || n.userId === user.id).slice(0, 100)
    .map((n) => ({ ...n, read: n.readBy.includes(user.id), readBy: undefined })),
}), { allowMaintenance: true }));

app.post('/api/notifications/read', userRoute((req, user) => {
  D().notifications.forEach((n) => { if ((n.userId === null || n.userId === user.id) && !n.readBy.includes(user.id)) n.readBy.push(user.id); });
}, { allowMaintenance: true }));

app.get('/api/tickets', userRoute((req, user) => ({ tickets: D().tickets.filter((t) => t.userId === user.id) }), { allowMaintenance: true }));
app.post('/api/tickets', userRoute((req, user) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || !message) fail(400, 'Please describe your issue');
  const t = { id: store.id('tkt'), userId: user.id, subject, status: 'open', createdAt: Date.now(), txnId: req.body.txnId || null, replies: [{ from: 'user', text: message, at: Date.now() }] };
  D().tickets.unshift(t);
  notifyUsers([user.id], 'tickets');
  return { ticket: t };
}, { allowMaintenance: true }));
app.post('/api/tickets/:id/reply', userRoute((req, user) => {
  const t = D().tickets.find((x) => x.id === req.params.id && x.userId === user.id);
  if (!t) fail(404, 'Ticket not found');
  t.replies.push({ from: 'user', text: String(req.body.text || '').trim(), at: Date.now() });
  t.status = 'open';
  notifyUsers([user.id], 'tickets');
  return { ticket: t };
}, { allowMaintenance: true }));

// =====================================================================
// ADMIN API
// =====================================================================
function adminAuth(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sess = D().adminSessions[token];
  const admin = sess && D().admins.find((a) => a.id === sess.adminId);
  if (!admin) fail(401, 'Admin login required', 'UNAUTHORIZED');
  return admin;
}
const adminRoute = (fn) => wrap((req, res) => fn(req, adminAuth(req), res));

app.post('/api/admin/login', wrap((req) => {
  const a = D().admins.find((x) => x.username === String(req.body.username || '').trim());
  if (!a || !store.verifySecret(req.body.password || '', a.passHash)) fail(400, 'Wrong username or password');
  const token = store.token();
  D().adminSessions[token] = { adminId: a.id, createdAt: Date.now() };
  audit(a, 'login', 'Signed in to admin panel');
  return { token, admin: { id: a.id, name: a.name, username: a.username, role: a.role } };
}));

// Describes this app's controls so a shared admin panel (the Admin Hub) can adapt to it.
app.get('/api/admin/schema', adminRoute(() => ({
  app: { name: D().settings.appName, kind: 'plumpay', version: 1 },
  features: {
    scan: ['Scan QR code', 'Camera QR scanner and My QR'], payContacts: ['Pay Anyone', 'Pay contacts, phone numbers and UPI IDs'],
    bankTransfer: ['Bank transfer', 'Pay to account number + IFSC'], selfTransfer: ['Self transfer', 'Move money between own accounts'],
    bills: ['Pay bills', 'Electricity, DTH, broadband…'], recharge: ['Mobile recharge', 'Prepaid plans'], rewards: ['Rewards', 'Scratch cards & cashback'],
    requests: ['Request money', 'Ask contacts for money'], checkBalance: ['Check balance', 'View bank balance with PIN'], upiLite: ['UPI Lite', 'Small wallet for PIN-less payments'],
  },
  homeSections: {
    hero: 'Top offer banner (Cashback FEST)', promoChips: 'Offer chips row', recharge: 'Recharge & Bills', loans: 'Loans', gold: 'Gold, Silver & Platinum',
    insurance: 'Insurance + "Did you know?" strip', mutualFunds: 'Mutual Funds', deposits: 'Deposits & Savings', travel: 'Travel & Transit',
    creditCards: 'New Credit Card', offers: 'Offers & Rewards', stocks: 'Stocks / Invest', myQr: 'My QR card', upiLite: 'UPI Lite card',
  },
  brandingFields: [
    { name: 'appVersion', label: 'Version shown in profile' },
    { name: 'heroTitle', label: 'Top banner title (e.g. Cashback FEST)' },
    { name: 'heroSubtitle', label: 'Top banner offer line' },
    { name: 'heroCta', label: 'Top banner button text' },
    { name: 'promoChip', label: 'Offer chip text' },
    { name: 'categories', label: 'Payment categories (comma separated)', type: 'list', span2: true },
  ],
  userFields: [
    { name: 'merchantIcon', label: 'Business icon', type: 'select', options: [['', 'Initials'], ['play', 'App store'], ['bus', 'Bus'], ['hotel', 'Hotel / travel'], ['food', 'Food'], ['fuel', 'Fuel'], ['health', 'Health']] },
    { name: 'goldCoins', label: 'Gold Coins', type: 'number' },
    { name: 'upiLite', label: 'UPI Lite balance (₹)', type: 'number' },
  ],
  txnCategories: true,
  adCard: false,
  banners: { emojiLabel: 'Picture (emoji) on the right', subtitleLabel: 'Small text above (e.g. Did you know?)' },
})));

app.get('/api/admin/me', adminRoute((req, a) => ({ admin: { id: a.id, name: a.name, username: a.username, role: a.role } })));

app.get('/api/admin/stats', adminRoute(() => {
  const d = D();
  const DAY = 86400000;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const ok = d.transactions.filter((t) => t.status === 'success');
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const from = start.getTime() - i * DAY;
    const txs = ok.filter((t) => t.createdAt >= from && t.createdAt < from + DAY);
    days.push({ date: from, count: txs.length, volume: round2(txs.reduce((s, t) => s + t.amount, 0)) });
  }
  const byType = {};
  d.transactions.forEach((t) => { byType[t.type] = (byType[t.type] || 0) + 1; });
  return {
    users: d.users.filter((u) => !u.isMerchant).length,
    merchants: d.users.filter((u) => u.isMerchant).length,
    blocked: d.users.filter((u) => u.blocked).length,
    activeToday: d.users.filter((u) => u.lastActiveAt >= start.getTime()).length,
    transactions: d.transactions.length,
    success: ok.length,
    failed: d.transactions.filter((t) => t.status === 'failed').length,
    pending: d.transactions.filter((t) => t.status === 'pending').length,
    volumeTotal: round2(ok.reduce((s, t) => s + t.amount, 0)),
    volumeToday: round2(ok.filter((t) => t.createdAt >= start.getTime()).reduce((s, t) => s + t.amount, 0)),
    totalBalance: round2(d.accounts.filter((a) => a.linked).reduce((s, a) => s + a.balance, 0)),
    openTickets: d.tickets.filter((t) => t.status === 'open').length,
    days, byType,
    recent: d.transactions.slice(0, 8).map((t) => decorateTxn(t)),
    settings: d.settings,
  };
}));

// ----- users -----
function adminUserRow(u) {
  const accs = D().accounts.filter((a) => a.userId === u.id && a.linked);
  return { ...u, accountsCount: accs.length, balance: round2(accs.reduce((s, a) => s + a.balance, 0)), txnCount: D().transactions.filter((t) => t.fromUserId === u.id || t.toUserId === u.id).length };
}

app.get('/api/admin/users', adminRoute(() => ({ users: D().users.map(adminUserRow) })));

app.get('/api/admin/users/:id', adminRoute((req) => {
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  return {
    user: adminUserRow(u),
    accounts: D().accounts.filter((a) => a.userId === u.id).map((a) => ({ ...publicAccount(a, true), accountNo: a.accountNo, linked: a.linked })),
    transactions: D().transactions.filter((t) => t.fromUserId === u.id || t.toUserId === u.id).map((t) => decorateTxn(t, u.id)),
    sessions: Object.values(D().sessions).filter((s) => s.userId === u.id).length,
  };
}));

app.post('/api/admin/users', adminRoute((req, admin) => {
  const b = req.body;
  const phone = String(b.phone || '').replace(/\D/g, '').slice(-10);
  if (!String(b.name || '').trim()) fail(400, 'Name is required');
  if (phone.length !== 10) fail(400, 'Phone must be 10 digits');
  if (D().users.some((u) => u.phone === phone)) fail(400, 'A user with this phone already exists');
  const upi = String(b.upiId || '').trim().toLowerCase() || phone + '@plum';
  if (D().users.some((u) => u.upiId === upi)) fail(400, 'UPI ID already taken');
  const u = {
    id: store.id('usr'), name: String(b.name).trim(), phone, email: b.email || '', upiId: upi, photo: null,
    color: AVATAR_COLORS[D().users.length % AVATAR_COLORS.length], isMerchant: !!b.isMerchant, merchantCategory: b.merchantCategory || '',
    blocked: false, profileComplete: true, referralCode: 'PT' + store.digits(5), goldCoins: Number(b.goldCoins) || 0, upiLite: 0, merchantIcon: b.merchantIcon || '', createdAt: Date.now(),
  };
  D().users.push(u);
  const bank = findBank(b.bankId) || D().banks[0];
  D().accounts.push({
    id: store.id('acc'), userId: u.id, bankId: bank.id, accountNo: store.digits(12), ifsc: bank.ifscPrefix + '0' + store.digits(6), type: 'Savings',
    balance: round2(b.balance || 0), primary: true, linked: true, pinHash: store.hashSecret(b.pin || '1234'), createdAt: Date.now(),
  });
  audit(admin, 'user.create', `Created user ${u.name} (${u.phone})`);
  notifyUsers([], 'users');
  return { user: adminUserRow(u) };
}));

app.put('/api/admin/users/:id', adminRoute((req, admin) => {
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  const b = req.body;
  if (b.phone !== undefined) {
    const phone = String(b.phone).replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) fail(400, 'Phone must be 10 digits');
    if (D().users.some((x) => x.phone === phone && x.id !== u.id)) fail(400, 'Phone already used');
    u.phone = phone;
  }
  if (b.upiId !== undefined) {
    const upi = String(b.upiId).trim().toLowerCase();
    if (D().users.some((x) => x.upiId === upi && x.id !== u.id)) fail(400, 'UPI ID already taken');
    u.upiId = upi;
  }
  ['name', 'email', 'merchantCategory', 'merchantIcon', 'color'].forEach((k) => { if (b[k] !== undefined) u[k] = String(b[k]); });
  if (b.isMerchant !== undefined) u.isMerchant = !!b.isMerchant;
  ['goldCoins', 'upiLite'].forEach((k) => { if (b[k] !== undefined && b[k] !== '') u[k] = Math.max(0, Number(b[k]) || 0); });
  if (b.photo !== undefined) u.photo = b.photo || null;
  if (b.name) u.profileComplete = true;
  audit(admin, 'user.update', `Updated user ${u.name}`);
  notifyUsers([u.id], 'profile');
  return { user: adminUserRow(u) };
}));

app.delete('/api/admin/users/:id', adminRoute((req, admin) => {
  const d = D();
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  d.users = d.users.filter((x) => x.id !== u.id);
  d.accounts = d.accounts.filter((a) => a.userId !== u.id);
  d.rewards = d.rewards.filter((r) => r.userId !== u.id);
  d.requests = d.requests.filter((r) => r.fromUserId !== u.id && r.toUserId !== u.id);
  Object.keys(d.sessions).forEach((k) => { if (d.sessions[k].userId === u.id) delete d.sessions[k]; });
  io.to('user:' + u.id).emit('logout', { reason: 'Your account was removed' });
  audit(admin, 'user.delete', `Deleted user ${u.name} (${u.phone})`);
  notifyUsers([], 'users');
}));

app.post('/api/admin/users/:id/block', adminRoute((req, admin) => {
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  u.blocked = !!req.body.blocked;
  if (u.blocked) io.to('user:' + u.id).emit('blocked', { message: 'Your account has been blocked. Contact support.' });
  audit(admin, u.blocked ? 'user.block' : 'user.unblock', `${u.blocked ? 'Blocked' : 'Unblocked'} ${u.name}`);
  notifyUsers([u.id], 'profile');
  return { user: adminUserRow(u) };
}));

app.post('/api/admin/users/:id/logout', adminRoute((req, admin) => {
  const u = findUser(req.params.id);
  if (!u) fail(404, 'User not found');
  Object.keys(D().sessions).forEach((k) => { if (D().sessions[k].userId === u.id) delete D().sessions[k]; });
  io.to('user:' + u.id).emit('logout', { reason: 'You were signed out by the administrator' });
  audit(admin, 'user.logout', `Forced logout for ${u.name}`);
}));

app.post('/api/admin/users/:id/accounts', adminRoute((req, admin) => {
  const u = findUser(req.params.id);
  const bank = findBank(req.body.bankId);
  if (!u || !bank) fail(400, 'User and bank are required');
  const hasPrimary = D().accounts.some((a) => a.userId === u.id && a.primary && a.linked);
  const acc = {
    id: store.id('acc'), userId: u.id, bankId: bank.id, accountNo: String(req.body.accountNo || store.digits(12)), ifsc: bank.ifscPrefix + '0' + store.digits(6),
    type: 'Savings', balance: round2(req.body.balance || 0), primary: !hasPrimary, linked: true, pinHash: store.hashSecret(req.body.pin || '1234'), createdAt: Date.now(),
  };
  D().accounts.push(acc);
  audit(admin, 'account.create', `Added ${bank.short} account for ${u.name}`);
  notifyUsers([u.id], 'accounts');
  return { account: acc };
}));

app.delete('/api/admin/accounts/:id', adminRoute((req, admin) => {
  const acc = findAccount(req.params.id);
  if (!acc) fail(404, 'Account not found');
  D().accounts = D().accounts.filter((a) => a.id !== acc.id);
  if (acc.primary) { const next = D().accounts.find((a) => a.userId === acc.userId && a.linked); if (next) next.primary = true; }
  audit(admin, 'account.delete', `Removed account ••${acc.accountNo.slice(-4)} of ${(findUser(acc.userId) || {}).name}`);
  notifyUsers([acc.userId], 'accounts');
}));

app.post('/api/admin/accounts/:id/adjust', adminRoute((req, admin) => {
  const acc = findAccount(req.params.id);
  if (!acc) fail(404, 'Account not found');
  const mode = req.body.mode;
  const amount = round2(req.body.amount);
  if (!(amount >= 0)) fail(400, 'Enter a valid amount');
  const before = acc.balance;
  if (mode === 'set') acc.balance = amount;
  else if (mode === 'credit') acc.balance = round2(acc.balance + amount);
  else if (mode === 'debit') acc.balance = round2(acc.balance - amount);
  else fail(400, 'Unknown mode');
  const user = findUser(acc.userId);
  if (req.body.record && mode !== 'set' && amount > 0) {
    D().transactions.unshift({
      id: store.id('txn'), upiRef: store.digits(12), type: 'admin', status: 'success',
      fromUserId: mode === 'debit' ? acc.userId : null, fromAccountId: mode === 'debit' ? acc.id : null, fromName: mode === 'debit' ? user.name : (req.body.label || 'PlumPay'),
      toUserId: mode === 'credit' ? acc.userId : null, toAccountId: mode === 'credit' ? acc.id : null, toName: mode === 'credit' ? user.name : (req.body.label || 'PlumPay'),
      toHandle: '', amount, note: req.body.reason || 'Balance adjustment', category: 'Adjustment', createdAt: Date.now(), createdBy: 'admin', applied: true,
    });
  }
  audit(admin, 'account.adjust', `${mode} ₹${amount} on ${user ? user.name : ''} ••${acc.accountNo.slice(-4)} (₹${before} → ₹${acc.balance}). ${req.body.reason || ''}`);
  notifyUsers([acc.userId], 'accounts');
  return { balance: acc.balance };
}));

app.post('/api/admin/accounts/:id/pin', adminRoute((req, admin) => {
  const acc = findAccount(req.params.id);
  if (!acc) fail(404, 'Account not found');
  if (!/^\d{4}$|^\d{6}$/.test(String(req.body.pin))) fail(400, 'PIN must be 4 or 6 digits');
  acc.pinHash = store.hashSecret(req.body.pin);
  acc.pinLength = String(req.body.pin).length;
  audit(admin, 'account.pin', `Reset UPI PIN for ••${acc.accountNo.slice(-4)}`);
}));

app.post('/api/admin/accounts/:id/primary', adminRoute((req, admin) => {
  const acc = findAccount(req.params.id);
  if (!acc) fail(404, 'Account not found');
  D().accounts.filter((a) => a.userId === acc.userId).forEach((a) => { a.primary = a.id === acc.id; });
  audit(admin, 'account.primary', `Set ••${acc.accountNo.slice(-4)} as primary`);
  notifyUsers([acc.userId], 'accounts');
}));

// ----- transactions -----
app.get('/api/admin/transactions', adminRoute(() => ({ transactions: D().transactions.map((t) => decorateTxn(t)) })));

function buildAdminTxn(b, existing) {
  const t = existing || { id: store.id('txn'), upiRef: store.digits(12), createdBy: 'admin', applied: false, failureReason: '' };
  const from = b.fromUserId ? findUser(b.fromUserId) : null;
  const to = b.toUserId ? findUser(b.toUserId) : null;
  if (!from && !to) fail(400, 'Choose a sender or a receiver');
  const amount = round2(b.amount);
  if (!(amount > 0)) fail(400, 'Enter a valid amount');
  const fromAcc = from ? (b.fromAccountId && findAccount(b.fromAccountId)) || primaryAccount(from.id) : null;
  const toAcc = to ? (b.toAccountId && findAccount(b.toAccountId)) || primaryAccount(to.id) : null;
  Object.assign(t, {
    type: b.type || 'p2p',
    status: ['success', 'failed', 'pending'].includes(b.status) ? b.status : 'success',
    fromUserId: from ? from.id : null, fromAccountId: fromAcc ? fromAcc.id : null,
    fromName: from ? from.name : (b.fromName || 'External'), fromHandle: from ? from.upiId : (b.fromHandle || ''),
    toUserId: to ? to.id : null, toAccountId: toAcc ? toAcc.id : null,
    toName: to ? to.name : (b.toName || 'External'), toHandle: to ? to.upiId : (b.toHandle || ''),
    amount, note: b.note || '', category: b.category || (to && to.isMerchant ? to.merchantCategory : 'Money Transfer'),
    failureReason: b.status === 'failed' ? (b.failureReason || 'Transaction declined by bank') : '',
    createdAt: b.createdAt ? Number(b.createdAt) : t.createdAt || Date.now(),
  });
  if (b.upiRef) t.upiRef = String(b.upiRef);
  return t;
}

app.post('/api/admin/transactions', adminRoute((req, admin) => {
  const t = buildAdminTxn(req.body);
  if (t.status === 'success' && req.body.affectBalance !== false) applyBalances(t, 1);
  D().transactions.unshift(t);
  D().transactions.sort((a, b) => b.createdAt - a.createdAt);
  if (req.body.notify && t.toUserId && t.status === 'success') pushNotification(t.toUserId, `₹${t.amount.toLocaleString('en-IN')} received`, `${t.fromName} paid you`, { txnId: t.id });
  audit(admin, 'txn.create', `Added ₹${t.amount} ${t.fromName} → ${t.toName} [${t.status}]`);
  notifyUsers([t.fromUserId, t.toUserId], 'transactions');
  return { transaction: decorateTxn(t) };
}));

app.put('/api/admin/transactions/:id', adminRoute((req, admin) => {
  const t = D().transactions.find((x) => x.id === req.params.id);
  if (!t) fail(404, 'Transaction not found');
  const oldUsers = [t.fromUserId, t.toUserId];
  const wasApplied = t.applied;
  if (wasApplied) applyBalances(t, -1);
  buildAdminTxn({ ...t, ...req.body }, t);
  if (t.status === 'success' && (wasApplied || req.body.affectBalance)) applyBalances(t, 1);
  D().transactions.sort((a, b) => b.createdAt - a.createdAt);
  audit(admin, 'txn.update', `Edited txn ${t.upiRef}: ₹${t.amount} [${t.status}]`);
  notifyUsers([...oldUsers, t.fromUserId, t.toUserId], 'transactions');
  return { transaction: decorateTxn(t) };
}));

app.delete('/api/admin/transactions/:id', adminRoute((req, admin) => {
  const t = D().transactions.find((x) => x.id === req.params.id);
  if (!t) fail(404, 'Transaction not found');
  if (t.applied && req.query.revert !== '0') applyBalances(t, -1);
  D().transactions = D().transactions.filter((x) => x.id !== t.id);
  audit(admin, 'txn.delete', `Deleted txn ${t.upiRef} (₹${t.amount} ${t.fromName} → ${t.toName})${req.query.revert !== '0' ? ', balances reverted' : ''}`);
  notifyUsers([t.fromUserId, t.toUserId], 'transactions');
}));

app.post('/api/admin/transactions/:id/refund', adminRoute((req, admin) => {
  const t = D().transactions.find((x) => x.id === req.params.id);
  if (!t || t.status !== 'success') fail(400, 'Only successful transactions can be refunded');
  if (t.refundedBy) fail(400, 'Already refunded');
  const r = {
    id: store.id('txn'), upiRef: store.digits(12), type: 'refund', status: 'success',
    fromUserId: t.toUserId, fromAccountId: t.toAccountId, fromName: t.toName, fromHandle: t.toHandle,
    toUserId: t.fromUserId, toAccountId: t.fromAccountId, toName: t.fromName, toHandle: t.fromHandle || '',
    amount: t.amount, note: `Refund for ${t.upiRef}`, category: 'Refund', createdAt: Date.now(), createdBy: 'admin', applied: false, refundOf: t.id,
  };
  applyBalances(r, 1);
  t.refundedBy = r.id;
  D().transactions.unshift(r);
  if (t.fromUserId) pushNotification(t.fromUserId, `Refund of ₹${t.amount.toLocaleString('en-IN')}`, `Your payment to ${t.toName} was refunded`, { txnId: r.id });
  audit(admin, 'txn.refund', `Refunded ${t.upiRef} (₹${t.amount})`);
  notifyUsers([t.fromUserId, t.toUserId], 'transactions');
  return { transaction: decorateTxn(r) };
}));

// ----- requests -----
app.get('/api/admin/requests', adminRoute(() => ({
  requests: D().requests.map((r) => ({ ...r, fromName: (findUser(r.fromUserId) || {}).name, toName: (findUser(r.toUserId) || {}).name })),
})));
app.delete('/api/admin/requests/:id', adminRoute((req, admin) => {
  const r = D().requests.find((x) => x.id === req.params.id);
  D().requests = D().requests.filter((x) => x.id !== req.params.id);
  audit(admin, 'request.delete', 'Deleted a money request');
  if (r) notifyUsers([r.fromUserId, r.toUserId], 'requests');
}));

// ----- generic catalog CRUD -----
const CATALOG = {
  banks: { prefix: 'bnk', fields: ['name', 'short', 'color', 'ifscPrefix', 'logo', 'active'] },
  billers: { prefix: 'blr', fields: ['name', 'category', 'color', 'active'] },
  operators: { prefix: 'opr', fields: ['name', 'color', 'active'] },
  plans: { prefix: 'pln', fields: ['operatorId', 'price', 'validity', 'data', 'description', 'tag', 'active'] },
  offers: { prefix: 'off', fields: ['brand', 'title', 'description', 'code', 'color', 'active'] },
  banners: { prefix: 'ban', fields: ['title', 'subtitle', 'cta', 'color', 'emoji', 'image', 'order', 'active'] },
  campaigns: { prefix: 'cmp', fields: ['title', 'minAmount', 'chance', 'minCashback', 'maxCashback', 'active'] },
  rewards: { prefix: 'rwd', fields: ['userId', 'title', 'amount', 'scratched'] },
};
const NUMERIC = ['price', 'order', 'minAmount', 'chance', 'minCashback', 'maxCashback', 'amount'];
function pickFields(coll, body) {
  const out = {};
  CATALOG[coll].fields.forEach((f) => {
    if (body[f] === undefined) return;
    out[f] = NUMERIC.includes(f) ? Number(body[f]) : (f === 'active' || f === 'scratched') ? !!body[f] : body[f];
  });
  return out;
}
const catalog = (req) => { if (!CATALOG[req.params.coll]) fail(404, 'Unknown collection'); return req.params.coll; };

app.get('/api/admin/c/:coll', adminRoute((req) => ({ items: D()[catalog(req)] })));
app.post('/api/admin/c/:coll', adminRoute((req, admin) => {
  const coll = catalog(req);
  const item = { id: store.id(CATALOG[coll].prefix), active: true, ...pickFields(coll, req.body), createdAt: Date.now() };
  if (coll === 'rewards') {
    if (!findUser(item.userId)) fail(400, 'Choose a user');
    item.scratched = false;
    item.title = item.title || 'Special reward';
    pushNotification(item.userId, 'You won a scratch card!', 'Open Rewards to scratch it');
  }
  D()[coll].unshift(item);
  audit(admin, coll + '.create', `Added ${coll.slice(0, -1)} ${item.name || item.title || item.price || ''}`);
  notifyUsers(coll === 'rewards' ? [item.userId] : D().users.map((u) => u.id), coll);
  return { item };
}));
app.put('/api/admin/c/:coll/:id', adminRoute((req, admin) => {
  const coll = catalog(req);
  const item = D()[coll].find((x) => x.id === req.params.id);
  if (!item) fail(404, 'Not found');
  Object.assign(item, pickFields(coll, req.body));
  audit(admin, coll + '.update', `Updated ${coll.slice(0, -1)} ${item.name || item.title || item.price || ''}`);
  notifyUsers(D().users.map((u) => u.id), coll);
  return { item };
}));
app.delete('/api/admin/c/:coll/:id', adminRoute((req, admin) => {
  const coll = catalog(req);
  const item = D()[coll].find((x) => x.id === req.params.id);
  D()[coll] = D()[coll].filter((x) => x.id !== req.params.id);
  audit(admin, coll + '.delete', `Deleted ${coll.slice(0, -1)} ${item ? item.name || item.title || item.price || '' : ''}`);
  notifyUsers(D().users.map((u) => u.id), coll);
}));

// ----- settings -----
app.get('/api/admin/settings', adminRoute(() => ({ settings: { ...D().settings, adCard: { ...DEFAULT_AD, ...(D().settings.adCard || {}) }, appIcon: D().settings.appIcon || '' } })));
app.put('/api/admin/settings', adminRoute((req, admin) => {
  const s = D().settings;
  const b = req.body;
  ['appName', 'maintenanceMessage', 'otpCode', 'announcement', 'appIcon', 'appVersion', 'heroTitle', 'heroSubtitle', 'heroCta', 'promoChip'].forEach((k) => { if (b[k] !== undefined) s[k] = String(b[k]); });
  if (b.adCard) s.adCard = { ...DEFAULT_AD, ...(s.adCard || {}), ...b.adCard, active: b.adCard.active !== undefined ? !!b.adCard.active : (s.adCard || DEFAULT_AD).active };
  ['perTxLimit', 'dailyLimit', 'newAccountBalance', 'referralBonus'].forEach((k) => { if (b[k] !== undefined) s[k] = Number(b[k]); });
  if (Array.isArray(b.categories)) s.categories = b.categories.map((c) => String(c).trim()).filter(Boolean).slice(0, 30);
  if (b.homeSections) s.homeSections = { ...s.homeSections };
  ['maintenanceMode', 'demoOtp'].forEach((k) => { if (b[k] !== undefined) s[k] = !!b[k]; });
  if (b.features) Object.keys(b.features).forEach((k) => { s.features[k] = !!b.features[k]; });
  if (b.homeSections) Object.keys(b.homeSections).forEach((k) => { s.homeSections[k] = !!b.homeSections[k]; });
  audit(admin, 'settings.update', 'Changed: ' + Object.keys(b).join(', '));
  broadcastSettings();
  return { settings: s };
}));

// ----- notifications -----
app.get('/api/admin/notifications', adminRoute(() => ({
  notifications: D().notifications.map((n) => ({ ...n, userName: n.userId ? (findUser(n.userId) || {}).name : 'All users', reads: n.readBy.length })),
})));
app.post('/api/admin/notifications', adminRoute((req, admin) => {
  const { title, body, userId } = req.body;
  if (!String(title || '').trim()) fail(400, 'Title is required');
  const n = pushNotification(userId || null, String(title).trim(), String(body || '').trim());
  audit(admin, 'notification.send', `Sent "${n.title}" to ${userId ? (findUser(userId) || {}).name : 'all users'}`);
  notifyUsers(userId ? [userId] : D().users.map((u) => u.id), 'notifications');
  return { notification: n };
}));
app.delete('/api/admin/notifications/:id', adminRoute((req, admin) => {
  D().notifications = D().notifications.filter((n) => n.id !== req.params.id);
  audit(admin, 'notification.delete', 'Deleted a notification');
}));

// ----- tickets -----
app.get('/api/admin/tickets', adminRoute(() => ({
  tickets: D().tickets.map((t) => ({ ...t, user: publicUser(findUser(t.userId)) })),
})));
app.post('/api/admin/tickets/:id/reply', adminRoute((req, admin) => {
  const t = D().tickets.find((x) => x.id === req.params.id);
  if (!t) fail(404, 'Ticket not found');
  const text = String(req.body.text || '').trim();
  if (text) t.replies.push({ from: 'admin', name: admin.name, text, at: Date.now() });
  if (req.body.status) t.status = req.body.status;
  if (text) pushNotification(t.userId, 'Support replied', text.slice(0, 80));
  audit(admin, 'ticket.reply', `Replied to ticket "${t.subject}"`);
  notifyUsers([t.userId], 'tickets');
  return { ticket: t };
}));

// ----- audit & admins -----
app.get('/api/admin/audit', adminRoute(() => ({ logs: D().auditLogs.slice(0, 500) })));
app.get('/api/admin/admins', adminRoute(() => ({ admins: D().admins.map(({ passHash, ...a }) => a) })));
app.post('/api/admin/admins', adminRoute((req, admin) => {
  const { username, password, name } = req.body;
  if (!username || !password) fail(400, 'Username and password are required');
  if (D().admins.some((a) => a.username === username)) fail(400, 'Username already exists');
  const a = { id: store.id('adm'), username, name: name || username, passHash: store.hashSecret(password), role: 'admin', createdAt: Date.now() };
  D().admins.push(a);
  audit(admin, 'admin.create', `Added admin ${username}`);
  return { admin: { id: a.id, username, name: a.name, role: a.role } };
}));
app.delete('/api/admin/admins/:id', adminRoute((req, admin) => {
  if (req.params.id === admin.id) fail(400, 'You cannot delete yourself');
  const a = D().admins.find((x) => x.id === req.params.id);
  if (a && a.role === 'super') fail(400, 'The super admin cannot be removed');
  D().admins = D().admins.filter((x) => x.id !== req.params.id);
  Object.keys(D().adminSessions).forEach((k) => { if (D().adminSessions[k].adminId === req.params.id) delete D().adminSessions[k]; });
  audit(admin, 'admin.delete', `Removed admin ${a ? a.username : ''}`);
}));
app.post('/api/admin/password', adminRoute((req, admin) => {
  if (!store.verifySecret(req.body.oldPassword || '', admin.passHash)) fail(400, 'Current password is wrong');
  if (String(req.body.newPassword || '').length < 6) fail(400, 'New password must be at least 6 characters');
  admin.passHash = store.hashSecret(req.body.newPassword);
  audit(admin, 'admin.password', 'Changed own password');
}));

app.post('/api/admin/reset-demo', adminRoute(() => {
  store.reset();
  io.emit('logout', { reason: 'Demo data was reset' });
  return { ok: true };
}));

// ---------- sockets ----------
io.on('connection', (socket) => {
  const { token, admin } = socket.handshake.auth || {};
  if (admin) {
    if (D().adminSessions[token]) socket.join('admins');
    return;
  }
  const sess = D().sessions[token];
  if (sess) socket.join('user:' + sess.userId);
  socket.emit('settings', clientSettings());
});

process.on('SIGINT', async () => { await store.flush(); process.exit(0); });

store.load().then(() => server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\nPlumPay server running on port ${PORT}`);
  console.log(`  Admin panel: http://localhost:${PORT}/admin   (admin / admin123)`);
  ips.forEach((ip) => console.log(`  Phone/LAN:   http://${ip}:${PORT}`));
  console.log('');
})).catch((e) => {
  console.error('Could not start:', e.message);
  process.exit(1);
});
