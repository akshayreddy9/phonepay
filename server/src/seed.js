// Demo data so the app looks populated on first launch.
const { id, hashSecret, digits } = require('./db');

const AVATAR_COLORS = ['#B8F2E8', '#D7E8C4', '#FCD9E6', '#D6E4FF', '#FFE3C2', '#E6DBFF', '#C9F0FF', '#FFF0B3', '#E3E3E3', '#CDEFD7'];

// Transaction categories shown as chips in history and on receipts (user can change them).
const CATEGORIES = ['Money Transfer', 'Shopping', 'Travel', 'Food', 'Groceries', 'Bills & Recharge', 'Fuel', 'Health', 'Entertainment', 'Investment', 'Education', 'Rent', 'Others'];

const BANKS = [
  { name: 'DBS Bank', short: 'DBS', color: '#E31B23', ifscPrefix: 'DBSS' },
  { name: 'State Bank Of India', short: 'SBI', color: '#22409A', ifscPrefix: 'SBIN' },
  { name: 'HDFC Bank', short: 'HDFC', color: '#004C8F', ifscPrefix: 'HDFC' },
  { name: 'ICICI Bank', short: 'ICICI', color: '#F37E20', ifscPrefix: 'ICIC' },
  { name: 'Axis Bank', short: 'AXIS', color: '#97144D', ifscPrefix: 'UTIB' },
  { name: 'Kotak Mahindra Bank', short: 'KOTAK', color: '#ED1C24', ifscPrefix: 'KKBK' },
  { name: 'Bank of Baroda', short: 'BOB', color: '#F15A29', ifscPrefix: 'BARB' },
  { name: 'Punjab National Bank', short: 'PNB', color: '#A6192E', ifscPrefix: 'PUNB' },
  { name: 'Canara Bank', short: 'CANARA', color: '#0091D5', ifscPrefix: 'CNRB' },
  { name: 'Yes Bank', short: 'YES', color: '#0060AA', ifscPrefix: 'YESB' },
];

const PEOPLE = [
  ['Rahul Sharma', '9876543210', 'rahul.sharma@gmail.com'],
  ['Priya Reddy', '9876543211', 'priya.reddy@gmail.com'],
  ['Arjun Kumar', '9876543212', 'arjun.k@gmail.com'],
  ['Sneha Patel', '9876543213', 'sneha.patel@gmail.com'],
  ['Vikram Singh', '9876543214', 'vikram.singh@gmail.com'],
  ['Ananya Iyer', '9876543215', 'ananya.iyer@gmail.com'],
  ['Karthik Rao', '9876543216', 'karthik.rao@gmail.com'],
  ['Meera Nair', '9876543217', 'meera.nair@gmail.com'],
  ['Mr Nandaluru Chethan Reddy', '9876543218', 'chethan.n@gmail.com'],
  ['Raki Shasank', '9876543219', 'raki.s@gmail.com'],
];

// [name, phone, category, icon key used by the app]
const MERCHANTS = [
  ['Google Play Store', '9000000001', 'Shopping', 'play'],
  ['RedBus', '9000000002', 'Travel', 'bus'],
  ['Ixigo Hotels', '9000000003', 'Travel', 'hotel'],
  ['Sri Laxmi Sai Electricals', '9000000004', 'Shopping', ''],
  ['Venkateswara Netcafe', '9000000005', 'Others', ''],
  ['Apollo Pharmacy', '9000000006', 'Health', 'health'],
  ['Chai Point', '9000000007', 'Food', 'food'],
  ['Indian Oil Petrol Pump', '9000000008', 'Fuel', 'fuel'],
];

const upiHandle = (phone) => `${phone}@plum`;

function buildSeed() {
  const now = Date.now();
  const DAY = 86400000;
  const db = {
    users: [], accounts: [], transactions: [], requests: [], rewards: [], campaigns: [],
    offers: [], banners: [], banks: [], billers: [], operators: [], plans: [],
    notifications: [], tickets: [], auditLogs: [], admins: [], sessions: {}, adminSessions: {}, otps: {},
    settings: {
      appName: 'PlumPay',
      appVersion: 'v1.0.0',
      maintenanceMode: false,
      maintenanceMessage: 'We are upgrading our systems. Please try again in a little while.',
      demoOtp: true,
      otpCode: '123456',
      perTxLimit: 100000,
      dailyLimit: 200000,
      newAccountBalance: 25000,
      referralBonus: 1200,
      announcement: '',
      heroTitle: 'Cashback FEST',
      heroSubtitle: 'Up to ₹50 assured cashback on UPI payments*',
      heroCta: 'Pay now',
      promoChip: 'Up to ₹50 Cashback on UPI*',
      categories: CATEGORIES,
      features: { scan: true, payContacts: true, bankTransfer: true, selfTransfer: true, bills: true, recharge: true, rewards: true, requests: true, checkBalance: true, upiLite: true },
      homeSections: { hero: true, promoChips: true, recharge: true, loans: true, gold: true, insurance: true, mutualFunds: true, deposits: true, travel: true, creditCards: true, offers: true, stocks: true, myQr: true, upiLite: true },
    },
  };

  db.banks = BANKS.map((b) => ({ id: id('bnk'), ...b, active: true }));
  const bankAt = (i) => db.banks[i % db.banks.length];

  const pin = hashSecret('1234');
  const addUser = (name, phone, email, i, merchant, icon) => {
    const u = {
      id: id('usr'), name, phone, email: email || '', upiId: upiHandle(phone), photo: null,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length], isMerchant: !!merchant, merchantCategory: merchant || '', merchantIcon: icon || '',
      blocked: false, profileComplete: true, referralCode: name.split(' ')[0].toUpperCase().slice(0, 5) + digits(3),
      goldCoins: merchant ? 0 : 10 + Math.round(Math.random() * 60), upiLite: 0,
      createdAt: now - (120 - i) * DAY,
    };
    db.users.push(u);
    const bank = bankAt(i * 3 + 1);
    db.accounts.push({
      id: id('acc'), userId: u.id, bankId: bank.id, accountNo: digits(12), ifsc: bank.ifscPrefix + '0' + digits(6),
      type: 'Savings', balance: merchant ? 150000 : 30000 + Math.round(Math.random() * 60000),
      primary: true, linked: true, pinHash: pin, pinLength: 4, createdAt: u.createdAt,
    });
    return u;
  };
  PEOPLE.forEach(([n, p, e], i) => addUser(n, p, e, i));
  MERCHANTS.forEach(([n, p, c, ic], i) => addUser(n, p, '', i + 3, c, ic));

  const byPhone = (p) => db.users.find((u) => u.phone === p);
  const primary = (u) => db.accounts.find((a) => a.userId === u.id && a.primary);

  // Rahul (the main demo login): DBS account as primary, plus an SBI account.
  const rahul = byPhone('9876543210');
  rahul.goldCoins = 34;
  const rAcc = primary(rahul);
  rAcc.bankId = db.banks[0].id;
  rAcc.ifsc = 'DBSS0IN0811';
  rAcc.accountNo = '0811' + digits(4) + '8063';
  db.accounts.push({
    id: id('acc'), userId: rahul.id, bankId: db.banks[1].id, accountNo: digits(8) + '2698', ifsc: 'SBIN0' + digits(6),
    type: 'Savings', balance: 18450, primary: false, linked: true, pinHash: pin, pinLength: 4, createdAt: now - 60 * DAY,
  });

  const txn = (from, to, amount, daysAgo, extra = {}) => {
    const fa = from ? primary(from) : null;
    const ta = to ? primary(to) : null;
    db.transactions.push({
      id: id('txn'), upiRef: digits(12), type: 'p2p', status: 'success',
      fromUserId: from ? from.id : null, fromAccountId: fa ? fa.id : null, fromName: from ? from.name : extra.fromName, fromHandle: from ? from.upiId : '',
      toUserId: to ? to.id : null, toAccountId: ta ? ta.id : null, toName: to ? to.name : extra.toName, toHandle: to ? to.upiId : (extra.toHandle || ''),
      amount, note: '', category: to && to.isMerchant ? to.merchantCategory : 'Money Transfer', failureReason: '',
      createdAt: now - daysAgo * DAY - Math.round(Math.random() * 8) * 3600000, createdBy: 'seed', applied: false,
      ...extra,
    });
  };

  // Rahul's own history, spread over four months like a real statement.
  const P = (p) => byPhone(p);
  txn(rahul, P('9000000001'), 1999, 3, { note: 'Automatic Payment of ₹1999 Setup', category: 'Shopping' });
  txn(rahul, P('9000000004'), 25000, 3, { category: 'Money Transfer' });
  txn(rahul, P('9000000007'), 120, 5, { category: 'Food' });
  txn(P('9876543211'), rahul, 1500, 8, { note: 'Dinner share' });
  txn(rahul, P('9000000003'), 396.43, 17);
  txn(rahul, P('9000000002'), 555.5, 41);
  txn(rahul, P('9000000002'), 555.5, 41.1);
  txn(rahul, P('9000000002'), 555.5, 41.2);
  txn(P('9876543218'), rahul, 4000, 54, { note: '' });
  txn(rahul, P('9000000005'), 3600, 56);
  txn(rahul, P('9876543212'), 10000, 57, { note: 'Rent share', category: 'Rent' });
  txn(P('9876543216'), rahul, 7000, 70);
  txn(rahul, P('9876543219'), 250, 71);
  txn(rahul, P('9876543219'), 500, 71.1);
  txn(rahul, null, 13800, 79, { type: 'admin', toName: 'Skyways Air Services Limited IPO - Money Unblocked', category: 'Investment', direction: 'in' });
  txn(rahul, P('9876543214'), 9000, 80, { status: 'failed', failureReason: 'Bank server is not responding' });
  txn(rahul, P('9000000008'), 640, 85);

  // Background activity between other users, so the admin dashboard has volume.
  const people = db.users.filter((u) => !u.isMerchant && u.id !== rahul.id);
  const merchants = db.users.filter((u) => u.isMerchant);
  for (let k = 0; k < 40; k++) {
    const from = people[k % people.length];
    const toMerchant = k % 3 === 0;
    let to = toMerchant ? merchants[k % merchants.length] : people[(k * 7 + 3) % people.length];
    if (to.id === from.id) to = people[(k + 1) % people.length];
    txn(from, to, toMerchant ? 40 + Math.round(Math.random() * 900) : 100 + Math.round(Math.random() * 4000), Math.random() * 60);
  }
  // The IPO "unblock" entry is money coming back to Rahul from outside.
  const ipo = db.transactions.find((t) => t.type === 'admin');
  Object.assign(ipo, { fromUserId: null, fromAccountId: null, fromName: 'Skyways Air Services Limited IPO - Money Unblocked', toUserId: rahul.id, toAccountId: rAcc.id, toName: rahul.name, toHandle: rahul.upiId });
  delete ipo.direction;

  db.requests.push({ id: id('req'), fromUserId: P('9876543212').id, toUserId: rahul.id, amount: 350, note: 'Pizza last night', status: 'pending', createdAt: now - DAY / 3 });

  db.campaigns = [
    { id: id('cmp'), title: 'Cashback on payments', minAmount: 100, chance: 0.6, minCashback: 5, maxCashback: 75, active: true },
    { id: id('cmp'), title: 'Bill payment bonanza', minAmount: 200, chance: 0.8, minCashback: 10, maxCashback: 150, active: true, types: ['bill', 'recharge'] },
  ];
  db.rewards.push(
    { id: id('rwd'), userId: rahul.id, campaignId: db.campaigns[0].id, title: 'Cashback on payments', amount: 42, scratched: false, createdAt: now - DAY },
    { id: id('rwd'), userId: rahul.id, campaignId: db.campaigns[0].id, title: 'Cashback on payments', amount: 15, scratched: true, createdAt: now - 9 * DAY },
  );

  db.offers = [
    { id: id('off'), brand: 'Flights', title: '15% OFF* on flights', description: 'On domestic flight bookings. Once per user.', code: 'FLY15', color: '#0E4AA1', active: true },
    { id: id('off'), brand: 'Bus', title: '15% OFF on Bus', description: 'On bus tickets above ₹500.', code: 'BUS15', color: '#D3363D', active: true },
    { id: id('off'), brand: 'BGMI', title: 'BGMI Official | 10% Off', description: 'On in-game purchases.', code: 'BGMI10', color: '#1F1F1F', active: true },
    { id: id('off'), brand: 'Bills', title: 'Pay Bills ₹100 Off | VISA', description: 'On bill payments with VISA cards.', code: 'VISA100', color: '#1A1F71', active: true },
  ];

  // "Did you know?" strips on Home and Profile (dark purple carousel).
  db.banners = [
    { id: id('ban'), title: 'Bike policy prevents ₹2000* fine', subtitle: 'Did you know?', cta: '', color: '#2B1745', emoji: '🛵', active: true, order: 1 },
    { id: id('ban'), title: 'You can earn 8.25%* p.a. on FDs', subtitle: 'Did you know?', cta: '', color: '#3B1E6E', emoji: '💰', active: true, order: 2 },
    { id: id('ban'), title: 'Daily RD starts at just ₹100/day', subtitle: 'Did you know?', cta: '', color: '#2E1B5B', emoji: '🫙', active: true, order: 3 },
    { id: id('ban'), title: 'Passkeys enable OTP-free login', subtitle: 'Did you know?', cta: '', color: '#2B1745', emoji: '🔑', active: true, order: 4 },
  ];

  const billers = {
    electricity: ['TS Southern Power (TSSPDCL)', 'BESCOM Bangalore', 'Tata Power Mumbai', 'MSEDCL Maharashtra', 'Adani Electricity'],
    dth: ['Tata Play', 'Airtel Digital TV', 'Dish TV', 'Sun Direct'],
    broadband: ['ACT Fibernet', 'Airtel Xstream Fiber', 'JioFiber', 'BSNL Broadband'],
    water: ['HMWSSB Hyderabad', 'Delhi Jal Board', 'BWSSB Bangalore'],
    gas: ['Indane Gas', 'HP Gas', 'Bharat Gas', 'Mahanagar Gas'],
    fastag: ['ICICI FASTag', 'HDFC FASTag', 'IDFC FASTag'],
    creditcard: ['HDFC Credit Card', 'SBI Card', 'ICICI Credit Card', 'Axis Credit Card'],
    insurance: ['LIC of India', 'HDFC Life', 'Star Health'],
  };
  const billerColors = ['#0E4AA1', '#E8710A', '#188038', '#9334E6', '#D93025'];
  Object.entries(billers).forEach(([category, names]) =>
    names.forEach((name, i) => db.billers.push({ id: id('blr'), category, name, color: billerColors[i % billerColors.length], active: true })));

  db.operators = [
    { id: id('opr'), name: 'Jio', color: '#0F3CC9', active: true },
    { id: id('opr'), name: 'Airtel', color: '#E40000', active: true },
    { id: id('opr'), name: 'Vi', color: '#E9202D', active: true },
    { id: id('opr'), name: 'BSNL', color: '#1C75BC', active: true },
  ];
  const planTemplates = [
    [199, '28 days', '1.5 GB/day', 'Unlimited calls, 100 SMS/day', 'Popular'],
    [299, '28 days', '2 GB/day', 'Unlimited calls, 100 SMS/day', 'Best seller'],
    [479, '56 days', '1.5 GB/day', 'Unlimited calls, 100 SMS/day', ''],
    [719, '84 days', '2 GB/day', 'Unlimited calls + OTT subscription', 'Entertainment'],
    [1799, '365 days', '24 GB total', 'Unlimited calls, 3600 SMS', 'Annual'],
    [19, '1 day', '1 GB', 'Data add-on', 'Data'],
  ];
  db.operators.forEach((op) => planTemplates.forEach(([price, validity, data, description, tag]) =>
    db.plans.push({ id: id('pln'), operatorId: op.id, price: op.name === 'BSNL' ? price - 20 : price, validity, data, description, tag, active: true })));

  const pastBills = [
    [db.billers.find((b) => b.category === 'electricity'), 'bill', 1240, 'Consumer no. 1102345678', 'Electricity bill', 12],
    [db.operators.find((o) => o.name === 'Jio'), 'recharge', 299, 'Mobile 9876543210', '2 GB/day · 28 days', 25],
  ];
  pastBills.forEach(([who, type, amount, handle, note, daysAgo]) => db.transactions.push({
    id: id('txn'), upiRef: digits(12), type, status: 'success', fromUserId: rahul.id, fromAccountId: rAcc.id, fromName: rahul.name, fromHandle: rahul.upiId,
    toUserId: null, toAccountId: null, toName: type === 'bill' ? who.name : `${who.name} Prepaid`, toHandle: handle, amount, note,
    category: 'Bills & Recharge', billerId: type === 'bill' ? who.id : undefined, billCategory: type === 'bill' ? who.category : undefined,
    operatorId: type === 'recharge' ? who.id : undefined, createdAt: now - daysAgo * DAY, createdBy: 'seed', applied: false, failureReason: '',
  }));
  db.transactions.sort((a, b) => b.createdAt - a.createdAt);

  db.notifications.push({ id: id('ntf'), userId: null, title: 'Welcome to PlumPay!', body: 'Pay anyone, recharge and pay bills instantly with UPI.', createdAt: now - 2 * DAY, readBy: [] });

  db.tickets.push({
    id: id('tkt'), userId: rahul.id, subject: 'Money debited but payment failed', status: 'open', createdAt: now - 2 * DAY,
    replies: [{ from: 'user', text: 'My payment to Vikram failed but money was debited. Please help.', at: now - 2 * DAY }],
  });

  db.admins.push({ id: id('adm'), username: 'admin', name: 'Super Admin', passHash: hashSecret('admin123'), role: 'super', createdAt: now });

  // Apply seed transactions to balances so totals are consistent.
  for (const t of db.transactions) {
    if (t.status !== 'success') continue;
    const fa = db.accounts.find((a) => a.id === t.fromAccountId);
    const ta = db.accounts.find((a) => a.id === t.toAccountId);
    if (fa) fa.balance -= t.amount;
    if (ta) ta.balance += t.amount;
    t.applied = true;
  }
  db.accounts.forEach((a) => { if (a.balance < 1000) a.balance += 15000; a.balance = Math.round(a.balance * 100) / 100; });
  rAcc.balance = 401326.1;

  return db;
}

module.exports = { buildSeed, AVATAR_COLORS, CATEGORIES };
