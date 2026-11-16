// Shows the Expo Go QR code in the terminal and as a page in the browser,
// so the phone can connect even when Expo's own QR doesn't appear.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const QRCode = require('qrcode');

const port = process.argv[2] || '8081';
const ips = Object.values(os.networkInterfaces()).flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address)
  .sort((a, b) => (b.startsWith('192.168.') - a.startsWith('192.168.')));
const ip = ips[0] || 'localhost';
const url = `exp://${ip}:${port}`;

(async () => {
  console.log('\n  Scan this with the Expo Go app on your phone (same Wi-Fi):\n');
  console.log(await QRCode.toString(url, { type: 'terminal', small: true }));
  console.log(`  Or in Expo Go tap "Enter URL manually" and type:  ${url}\n`);

  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 320 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>PhonePayy - Scan with Expo Go</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f8fc;color:#1f1f1f}
.card{background:#fff;padding:32px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center;max-width:420px}
svg{width:320px;height:320px}code{background:#e8f0fe;color:#0b57d0;padding:6px 10px;border-radius:8px;font-size:16px}ol{text-align:left;line-height:1.7}</style></head>
<body><div class="card"><h2>Open PhonePayy on your phone</h2>${svg}
<p><code>${url}</code></p><ol><li>Install <b>Expo Go</b> from the Play Store</li><li>Connect the phone to the <b>same Wi-Fi</b> as this laptop</li>
<li>Open Expo Go → <b>Scan QR code</b> (or "Enter URL manually")</li><li>Wait for "Bundling 100%" — the first load takes about a minute</li></ol></div></body></html>`;
  const file = path.join(os.tmpdir(), 'phonepayy-expo-qr.html');
  fs.writeFileSync(file, html);
  if (process.platform === 'win32') exec(`start "" "${file}"`);
})();
