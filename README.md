# PhonePayy: UPI Payments App + Admin Panel

A PhonePe-style UPI payments app for Android (React Native / Expo) with a web admin panel that controls everything in the app in real time. The screens follow the layout, colours and flows of the PhonePe app (home, profile panel, UPI settings, bank details, Balance & History, receipts, chat), but under its own name and logo. College project: **no real money moves**. All balances and transactions live in the project's own database, and every receipt says "Demo transaction".

```
phonepay/
├── server/          Node.js + Express + Socket.io backend and admin panel
│   ├── src/         index.js (API), db.js (JSON / MongoDB storage), seed.js (demo data)
│   └── public/admin Admin panel (HTML/CSS/JS, served at /admin)
├── mobile/          Expo (React Native) Android app
│   ├── app/         One file per screen (Expo Router)
│   ├── components/  UI kit, receipt, history rows, PIN pad, logo
│   └── lib/         API client, global store + live updates, formatting, theme
├── START-SERVER.bat  Double-click to start the server + open admin panel
├── START-APP.bat     Double-click to start the app (scan QR with Expo Go)
└── START-PREVIEW.bat Server + the app in your browser
```

---

## 0. Online version

| What | Where |
|---|---|
| Admin panel | `https://phonepayy.onrender.com/admin` or the shared Admin Hub (hosted on Render, data in MongoDB Atlas) |
| Server / API | `https://phonepayy.onrender.com` |
| Android APK | Built with Expo EAS (see section 5) |
| Source code | <https://github.com/akshayreddy9/phonepayy> |

The APK always talks to the online server. On Render's free plan the server sleeps after about 15 minutes without use, so the **first request after a break takes up to a minute**. Open the admin panel a minute before a demo to wake it up.

## 1. Run it locally (about 5 minutes)

PhonePayy uses port **4002** (server) and **8083** (Expo), so it can run at the same time as GGPay (4000 / 8081).

**You need:** a Windows laptop with [Node.js](https://nodejs.org) (LTS) and an Android phone on the **same Wi-Fi**.

1. **Start the server:** double-click `START-SERVER.bat`. The admin panel opens at <http://localhost:4002/admin>. Log in with `admin` / `admin123`.
   The window prints `Phone/LAN: http://192.168.x.x:4002`, the address the phone uses. If Windows Firewall asks, click **Allow access**.
2. **Start the app:** double-click `START-APP.bat` (first run installs packages).
3. **On your phone:** install **Expo Go**, open it, and scan the QR code from the `START-APP` window.
4. **Log in** with a demo number:

   | Mobile number | Name | UPI PIN |
   |---|---|---|
   | 9876543210 | Rahul Sharma (DBS + SBI accounts, 34 Gold Coins, 4 months of history) | 1234 |
   | 9876543211 – 9876543219 | Priya, Arjun, Sneha, Vikram… | 1234 |
   | Any other 10-digit number | New user: full sign-up flow | You set it |

   The OTP is **123456** (demo mode). It also pops up like an SMS and auto-fills.

No phone? Double-click `START-PREVIEW.bat` to use the app in the browser inside a phone-sized frame.

## 2. App screens (matched to the reference recording)

| Screen | What it has |
|---|---|
| **Splash** | Wordmark, "Made with ❤ in India", security badges |
| **Home** | Avatar + brand ❤ UPI header that alternates with a promo line, bell with unread dot; search bar that docks beside the avatar on scroll; 4 round shortcuts (Scan any QR, Pay Anyone, To Bank & Self A/c, Balance & History); Recharge & Bills carousel with "Get ₹20" badge; "Exclusive offer for You!" with a live countdown; money tiles; Refer & Win / Cashback chips; promo banner carousel; Travel & Tickets, Gold & Silver, Financial Services, Free Tools, Do More, Promoted, Refer & Win; floating **Scan QR** pill that shrinks to a circle while scrolling |
| **Profile panel** (tap avatar) | Slides in from the left: name, verified badge, UPI ID (copy), "Receive money from all UPI apps", QR in a cyan/navy frame, Change Bank, Share / Add QR, Settings list, Security Shield, version, Sign out |
| **UPI & Payment Settings** | Pay with Fingerprint, UPI ID, UPI Number; Payment Accounts (add tiles, banks with "Receiving money in this account", UPI Lite); UPI Settings list |
| **Bank account** | Gradient header with bank logo, Default bank ✓, **Check balance** (UPI PIN) → shows balance in place, UPI PIN Change, account details, ⋮ menu (set default, forgot PIN, remove) |
| **Balance & History** | Big collapsing title, account cards with Check Balance, UPI Lite, Portfolio (Gold Coins), month-grouped history with **Total Spent** |
| **Payment History** | Sticky month headers with Total Spent, search, filters (paid / received / failed / bills / last 30 days), statement export |
| **Receipt** | "Sent Successfully" / "Money Received" / "Payment Failed", amount with seal, amount in words, category chip with **Edit**, To / From blocks, Pay Again / View History, UPI Ref (copy), expandable Payment Details timeline, Share, Help |
| **Chat** | Masked phone, date pills, payment bubbles with stamp and time, **Pay Securely** |
| **Pay** | Recipient header, large amount, amount in words, Add Message, bank selector, Pay ₹X → UPI PIN → animated success → receipt |
| **Also** | To Bank & Self A/c, UPI Lite (add / withdraw), QR scanner, My QR, bills, mobile recharge, rewards (scratch cards), offers, refer, notifications, help tickets, app lock |

## 3. Admin panel (`/admin`)

The same controls are also available in the shared **Admin Hub** (separate project in `../admin-hub`), which manages GGPay, PhonePayy and future clones from one login. PhonePayy describes its own controls to the hub through `GET /api/admin/schema`.


| Page | Control |
|---|---|
| Dashboard | Users, transactions, today's volume, money in accounts, 14-day chart, quick switches |
| Users | Add / edit / delete / block, force logout, **Gold Coins**, **UPI Lite balance**, business icon, adjust bank balance, reset UPI PIN, add/remove banks, send notification, give scratch card |
| Transactions | Filter, **add any transaction**, edit (amount, status, date, **category chip**), refund, delete, CSV export |
| Banks / Billers / Recharge plans / Offers / Home banners | Add, edit, enable/disable, delete. Changes appear in the app immediately |
| App settings | App name, version, **home header promo**, **exclusive-offer title + countdown end**, **payment categories**, limits, OTP, maintenance mode, feature switches (incl. UPI Lite), show/hide each Home section |
| Rewards, Notifications, Support tickets, Audit logs, Admins | As in a real back office |

## 4. How it works

```
 Android phone (Expo app)  ──HTTP /api──▶  Node.js server  ◀──HTTP /api/admin──  Admin panel (browser)
          ▲                                  │  MongoDB (online) or data/db.json (local)
          └──────── Socket.io (live) ────────┘──────── Socket.io (live) ────────▶
```

Every payment checks the UPI PIN (salted **scrypt** hash), balance, per-payment and daily limits, and feature switches. Failed payments are recorded with a reason. Any change pushes a `refresh` event to the affected phones and the admin panel.

## 5. Hosting (same setup as the GGPay project)

1. **GitHub:** the code is in `akshayreddy9/phonepayy`.
2. **Render:** Dashboard → **New → Blueprint** → pick the `phonepayy` repo. When asked for `MONGODB_URI`, paste the MongoDB Atlas connection string (the same cluster as GGPay is fine: the blueprint sets `MONGODB_DB=phonepayy`, so the data stays separate). If the name `phonepayy` is taken, Render gives another URL: put it in `mobile/app.json` → `extra.serverUrl`.
3. **APK (Expo EAS):**
   ```bash
   cd mobile
   npx eas-cli@latest login
   npx eas-cli@latest init          # creates the Expo project and links app.json
   npx eas-cli@latest update:configure
   npx eas-cli@latest build -p android --profile preview
   ```
   Later screen changes go out over the air: `npx eas-cli@latest update --channel preview --message "what changed"`.

## 6. Demo script for the viva

1. Admin panel on the laptop, app on the phone, side by side.
2. Tap the avatar → profile panel → **UPI & Payment Settings** → DBS Bank → **Check balance** (PIN 1234).
3. Home → **Pay Anyone** → Priya → ₹250 → PIN → success → receipt → change the category with **Edit**.
4. Admin → **Transactions** → edit that payment to ₹300 → the app updates live.
5. Admin → **App settings** → change the home promo or offer countdown → Home updates instantly.
6. Admin → **Users → Rahul → Edit** → Gold Coins 100 → Balance & History shows it.
7. Admin → **Maintenance mode ON** → the app shows the maintenance screen → turn it off.
8. Admin → **Notifications** → send "Hello class!" → pops up on the phone.
