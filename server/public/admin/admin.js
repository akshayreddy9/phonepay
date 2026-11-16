/* PhonePayy Admin Panel — plain JS single page app */
const S = { token: localStorage.getItem('pn_admin_token'), admin: null, route: 'dashboard', users: [], dirty: false };
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dt = (ts) => (ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const toLocalInput = (ts) => new Date((ts || Date.now()) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const TYPE_LABEL = { p2p: 'UPI payment', bank_transfer: 'Bank transfer', self: 'Self transfer', bill: 'Bill payment', recharge: 'Recharge', cashback: 'Cashback', refund: 'Refund', admin: 'Admin adjustment' };
const BILL_CATS = ['electricity', 'dth', 'broadband', 'water', 'gas', 'fastag', 'creditcard', 'insurance'];

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (S.token || '') },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/admin/login') { logout(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = 'toast'), 2600);
}
async function run(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); throw e; }
}

const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
function avatar(u, size = 32) {
  if (!u) return `<span class="avatar" style="background:#9aa0a6;width:${size}px;height:${size}px">?</span>`;
  const style = `width:${size}px;height:${size}px;background-color:${u.color || '#1a73e8'};${u.photo ? `background-image:url('${u.photo}')` : ''}`;
  return `<span class="avatar" style="${style}">${u.photo ? '' : esc(initials(u.name))}</span>`;
}
const person = (u, sub) => `<div class="person">${avatar(u)}<div class="meta">${esc(u ? u.name : '—')}<small>${esc(sub ?? (u ? u.upiId : ''))}</small></div></div>`;
const pill = (text, cls) => `<span class="pill ${cls || esc(text)}">${esc(text)}</span>`;

// ---------- modal & forms ----------
function closeModal() {
  $('#modalRoot').innerHTML = '';
  if (S.dirty) { S.dirty = false; render(); }
}
// Shrinks an uploaded image to a small PNG data URL so it can be stored with the data.
function resizeImage(file, max = 192) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function wireImageFields(root) {
  root.querySelectorAll('[data-file]').forEach((inp) => {
    const name = inp.dataset.file;
    const hidden = root.querySelector(`input[type=hidden][name="${name}"]`);
    const prev = root.querySelector(`[data-prev="${name}"]`);
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      try {
        hidden.value = await resizeImage(inp.files[0], Number(inp.dataset.max) || 192);
        prev.src = hidden.value;
        prev.style.display = '';
      } catch { toast('Could not read that image', true); }
    };
    const clear = root.querySelector(`[data-clear="${name}"]`);
    if (clear) clear.onclick = () => { hidden.value = ''; prev.removeAttribute('src'); prev.style.display = 'none'; inp.value = ''; };
  });
}

function fieldHtml(f) {
  const v = f.value ?? '';
  const name = `name="${f.name}"`;
  let input;
  if (f.type === 'image') {
    return `<label class="${f.span2 ? 'span2' : ''}">${esc(f.label)}<div class="img-field">
      <img data-prev="${f.name}" ${v ? `src="${esc(v)}"` : 'style="display:none"'} alt="" />
      <input type="file" accept="image/png,image/jpeg,image/webp" data-file="${f.name}" data-max="${f.max || 192}" />
      <input type="hidden" ${name} value="${esc(v)}" />
      <button type="button" class="btn sm" data-clear="${f.name}">Remove</button></div>${f.hint ? `<small class="muted">${esc(f.hint)}</small>` : ''}</label>`;
  }
  if (f.type === 'select') {
    input = `<select ${name}>${f.options.map((o) => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('')}</select>`;
  } else if (f.type === 'checkbox') {
    return `<label class="check ${f.span2 ? 'span2' : ''}"><input type="checkbox" ${name} ${v ? 'checked' : ''}/> ${esc(f.label)}</label>`;
  } else if (f.type === 'textarea') {
    input = `<textarea ${name} rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
  } else {
    input = `<input type="${f.type || 'text'}" ${name} value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.step ? `step="${f.step}"` : ''} ${f.required ? 'required' : ''}/>`;
  }
  return `<label class="${f.span2 ? 'span2' : ''}">${esc(f.label)}${input}${f.hint ? `<small class="muted">${esc(f.hint)}</small>` : ''}</label>`;
}
function readForm(form, fields) {
  const out = {};
  fields.forEach((f) => {
    const el = form.elements[f.name];
    if (!el) return;
    if (f.type === 'checkbox') out[f.name] = el.checked;
    else if (f.type === 'number') out[f.name] = el.value === '' ? undefined : Number(el.value);
    else if (f.type === 'datetime-local') out[f.name] = el.value ? new Date(el.value).getTime() : undefined;
    else out[f.name] = el.value;
  });
  return out;
}
function modal({ title, fields, body = '', submitText = 'Save', onSubmit, wide, onMount, danger }) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-bg"><form class="modal ${wide ? 'wide' : ''}">
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">${body}${fields ? `<div class="form-grid">${fields.map(fieldHtml).join('')}</div>` : ''}</div>
    ${onSubmit ? `<div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger solid' : 'primary'}">${esc(submitText)}</button></div>` : ''}
  </form></div>`;
  const form = $('form', root);
  root.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
  $('.modal-bg', root).onmousedown = (e) => { if (e.target.classList.contains('modal-bg')) closeModal(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    const btn = form.querySelector('.modal-foot .btn:last-child');
    btn.disabled = true;
    try {
      const keep = await onSubmit(fields ? readForm(form, fields) : {}, form);
      if (keep !== false) closeModal();
    } catch (err) { toast(err.message, true); } finally { btn.disabled = false; }
  };
  wireImageFields(root);
  if (onMount) onMount(form);
  return form;
}
function confirmBox(message, okText = 'Delete') {
  return new Promise((resolve) => {
    modal({ title: 'Are you sure?', body: `<p>${esc(message)}</p>`, submitText: okText, danger: true, onSubmit: () => resolve(true) });
    $('#modalRoot').querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
  });
}

// ---------- table ----------
function table(container, { columns, rows, actions, onAction, empty = 'Nothing here yet' }) {
  if (!rows.length) { container.innerHTML = `<div class="table-wrap"><div class="empty">${esc(empty)}</div></div>`; return; }
  container.innerHTML = `<div class="table-wrap"><table><thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}${actions ? '<th></th>' : ''}</tr></thead>
  <tbody>${rows.map((r, i) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}${actions ? `<td class="actions" data-i="${i}">${actions(r)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  container.querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = () => onAction(b.dataset.act, rows[Number(b.closest('[data-i]').dataset.i)]);
  });
}
const act = (name, label, cls = '') => `<button class="btn sm ${cls}" data-act="${name}">${label}</button>`;

// ---------- auth ----------
async function login(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const r = await api('POST', '/admin/login', { username: f.username.value, password: f.password.value });
    S.token = r.token;
    localStorage.setItem('pn_admin_token', r.token);
    boot();
  } catch (err) { $('#loginErr').textContent = err.message; }
}
function logout() {
  S.token = null;
  localStorage.removeItem('pn_admin_token');
  $('#shell').classList.add('hidden');
  $('#login').classList.remove('hidden');
}

// ---------- navigation ----------
const NAV = [
  ['dashboard', '📊', 'Dashboard'], ['users', '👥', 'Users'], ['transactions', '💸', 'Transactions'], ['requests', '🙏', 'Money requests'],
  ['banks', '🏦', 'Banks'], ['bills', '🧾', 'Billers'], ['recharge', '📱', 'Recharge plans'], ['rewards', '🎁', 'Rewards'],
  ['offers', '🏷️', 'Offers'], ['banners', '🖼️', 'Home banners'], ['notifications', '🔔', 'Notifications'], ['support', '💬', 'Support tickets'],
  ['settings', '⚙️', 'App settings'], ['audit', '📜', 'Audit logs'], ['admins', '🛡️', 'Admins'],
];
function renderNav(openTickets) {
  $('#nav').innerHTML = NAV.map(([id, icon, label]) => `<a href="#${id}" class="${S.route === id ? 'active' : ''}">${icon} ${label}${id === 'support' && openTickets ? `<span class="badge">${openTickets}</span>` : ''}</a>`).join('');
}
window.addEventListener('hashchange', () => { S.route = location.hash.slice(1) || 'dashboard'; $('#side').classList.remove('open'); render(); });

async function loadUsers() {
  S.users = (await api('GET', '/admin/users')).users;
  return S.users;
}
const userById = (id) => S.users.find((u) => u.id === id);

async function render() {
  const item = NAV.find((n) => n[0] === S.route) || NAV[0];
  S.route = item[0];
  $('#pageTitle').textContent = item[2];
  renderNav(S.openTickets);
  const page = $('#page');
  try { await PAGES[S.route](page); } catch (e) { page.innerHTML = `<div class="card">Failed to load: ${esc(e.message)}</div>`; }
}

// ---------- pages ----------
const PAGES = {};

PAGES.dashboard = async (page) => {
  const s = await api('GET', '/admin/stats');
  S.openTickets = s.openTickets;
  renderNav(s.openTickets);
  const max = Math.max(1, ...s.days.map((d) => d.volume));
  const w = 700, h = 200, bw = w / s.days.length;
  const bars = s.days.map((d, i) => {
    const bh = (d.volume / max) * (h - 40);
    const label = new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return `<g><rect class="bar" x="${i * bw + 6}" y="${h - 20 - bh}" width="${bw - 12}" height="${bh}" rx="4"><title>${label}: ${inr(d.volume)} (${d.count} txns)</title></rect>
      <text x="${i * bw + bw / 2}" y="${h - 5}" text-anchor="middle">${label}</text></g>`;
  }).join('');
  page.innerHTML = `
    <div class="grid stats">
      ${[['Users', s.users, `${s.merchants} merchants · ${s.blocked} blocked`], ['Transactions', s.transactions, `${s.success} success · ${s.failed} failed`],
         ['Volume today', inr(s.volumeToday), `Total ${inr(s.volumeTotal)}`], ['Money in wallets', inr(s.totalBalance), 'Sum of all bank balances'],
         ['Active today', s.activeToday, 'Users who opened the app'], ['Open tickets', s.openTickets, 'Waiting for reply']]
        .map(([l, v, sub]) => `<div class="card stat"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${sub}</div></div>`).join('')}
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card"><h3>Payment volume — last 14 days</h3><svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg></div>
      <div class="card"><h3>Quick controls</h3>
        <div class="switch-row"><div>Maintenance mode<small>App shows a maintenance screen</small></div>${switchHtml('q-maint', s.settings.maintenanceMode)}</div>
        <div class="switch-row"><div>Demo OTP (${esc(s.settings.otpCode)})<small>Fixed OTP for logins</small></div>${switchHtml('q-otp', s.settings.demoOtp)}</div>
        <div class="switch-row"><div>Rewards<small>Scratch cards after payments</small></div>${switchHtml('q-rewards', s.settings.features.rewards)}</div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="#transactions">+ Add transaction</a><a class="btn" href="#notifications">Send notification</a></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Recent transactions <a href="#transactions" class="btn sm" style="margin-left:auto">View all</a></h3><div id="recent"></div></div>`;
  $('#q-maint').onchange = (e) => run(() => api('PUT', '/admin/settings', { maintenanceMode: e.target.checked }), 'Maintenance ' + (e.target.checked ? 'ON' : 'OFF'));
  $('#q-otp').onchange = (e) => run(() => api('PUT', '/admin/settings', { demoOtp: e.target.checked }), 'Saved');
  $('#q-rewards').onchange = (e) => run(() => api('PUT', '/admin/settings', { features: { rewards: e.target.checked } }), 'Saved');
  table($('#recent'), { columns: txnColumns(), rows: s.recent });
};

function switchHtml(id, checked) {
  return `<label class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}/><span></span></label>`;
}

// ----- users -----
PAGES.users = async (page) => {
  const [users, banks] = await Promise.all([loadUsers(), api('GET', '/admin/c/banks')]);
  S.banks = banks.items;
  page.innerHTML = `<div class="toolbar">
      <input id="uq" placeholder="Search name, phone, UPI ID" value="${esc(S.uq || '')}"/>
      <select id="uf"><option value="">All</option><option value="people">People</option><option value="merchant">Merchants</option><option value="blocked">Blocked</option><option value="incomplete">Incomplete sign-ups</option></select>
      <span class="spacer"></span><button class="btn primary" id="addUser">+ Add user</button></div><div id="ut"></div>`;
  $('#uf').value = S.uf || '';
  const draw = () => {
    S.uq = $('#uq').value; S.uf = $('#uf').value;
    const q = S.uq.toLowerCase();
    const rows = users.filter((u) => (!q || `${u.name} ${u.phone} ${u.upiId}`.toLowerCase().includes(q))
      && (!S.uf || (S.uf === 'people' && !u.isMerchant) || (S.uf === 'merchant' && u.isMerchant) || (S.uf === 'blocked' && u.blocked) || (S.uf === 'incomplete' && !u.profileComplete)));
    table($('#ut'), {
      columns: [
        { label: 'User', render: (u) => person(u, u.isMerchant ? u.merchantCategory : u.email) },
        { label: 'Phone', key: 'phone' }, { label: 'UPI ID', key: 'upiId' },
        { label: 'Balance', render: (u) => `<span class="amount">${inr(u.balance)}</span> <small class="muted">${u.accountsCount} a/c</small>` },
        { label: 'Txns', key: 'txnCount' },
        { label: 'Type', render: (u) => u.isMerchant ? pill('merchant', 'info') : 'Person' },
        { label: 'Status', render: (u) => u.blocked ? pill('blocked') : u.profileComplete ? pill('active', 'on') : pill('incomplete', 'pending') },
        { label: 'Joined', render: (u) => dt(u.createdAt) },
      ],
      rows,
      actions: (u) => act('view', 'Manage') + act('edit', 'Edit') + act('block', u.blocked ? 'Unblock' : 'Block', 'danger') + act('del', 'Delete', 'danger'),
      onAction: async (a, u) => {
        if (a === 'view') userDetail(u.id);
        if (a === 'edit') userForm(u);
        if (a === 'block') await run(() => api('POST', `/admin/users/${u.id}/block`, { blocked: !u.blocked }), u.blocked ? 'User unblocked' : 'User blocked').then(render);
        if (a === 'del' && await confirmBox(`Delete ${u.name}? Their accounts and rewards will be removed.`)) await run(() => api('DELETE', `/admin/users/${u.id}`), 'User deleted').then(render);
      },
    });
  };
  $('#uq').oninput = draw; $('#uf').onchange = draw;
  $('#addUser').onclick = () => userForm();
  draw();
};

function userForm(u) {
  const banks = (S.banks || []).map((b) => [b.id, b.name]);
  const fields = [
    { name: 'name', label: 'Full name', value: u?.name, required: true },
    { name: 'phone', label: 'Mobile number', value: u?.phone, required: true },
    { name: 'email', label: 'Email', value: u?.email },
    { name: 'upiId', label: 'UPI ID', value: u?.upiId, placeholder: 'auto-generated if empty' },
    { name: 'isMerchant', label: 'This is a business / merchant', type: 'checkbox', value: u?.isMerchant },
    { name: 'merchantCategory', label: 'Business category', value: u?.merchantCategory, placeholder: 'Shopping, Travel, Food…' },
    { name: 'merchantIcon', label: 'Business icon', type: 'select', options: [['', 'Initials'], ['play', 'App store'], ['bus', 'Bus'], ['hotel', 'Hotel / travel'], ['food', 'Food'], ['fuel', 'Fuel'], ['health', 'Health']], value: u?.merchantIcon || '' },
    { name: 'goldCoins', label: 'Gold Coins', type: 'number', value: u?.goldCoins ?? 0 },
    { name: 'upiLite', label: 'UPI Lite balance (₹)', type: 'number', value: u?.upiLite ?? 0 },
    { name: 'color', label: 'Avatar colour', type: 'color', value: u?.color || '#1a73e8' },
  ];
  if (!u) fields.push(
    { name: 'bankId', label: 'Bank', type: 'select', options: banks },
    { name: 'balance', label: 'Opening balance (₹)', type: 'number', value: 10000 },
    { name: 'pin', label: 'UPI PIN', value: '1234', hint: '4 or 6 digits' },
  );
  modal({
    title: u ? 'Edit user' : 'Add user', fields,
    onSubmit: async (v) => {
      if (u) await run(() => api('PUT', `/admin/users/${u.id}`, v), 'User updated');
      else await run(() => api('POST', '/admin/users', v), 'User created');
      S.dirty = true;
    },
  });
}

async function userDetail(id) {
  const d = await api('GET', `/admin/users/${id}`);
  const u = d.user;
  const banks = S.banks || (await api('GET', '/admin/c/banks')).items;
  modal({
    title: u.name, wide: true,
    body: `<div class="person">${avatar(u, 56)}<div class="meta" style="font-size:16px">${esc(u.name)} ${u.blocked ? pill('blocked') : ''}<small>${esc(u.phone)} · ${esc(u.upiId)} · ${esc(u.email || '')}</small><small>Joined ${dt(u.createdAt)} · last active ${dt(u.lastActiveAt)} · ${d.sessions} active session(s)</small></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn" id="ud-edit">Edit profile</button>
        <button type="button" class="btn" id="ud-acc">+ Add bank account</button>
        <button type="button" class="btn" id="ud-txn">+ Add transaction</button>
        <button type="button" class="btn" id="ud-notify">Send notification</button>
        <button type="button" class="btn" id="ud-reward">Give scratch card</button>
        <button type="button" class="btn danger" id="ud-logout">Force logout</button>
        <button type="button" class="btn danger" id="ud-block">${u.blocked ? 'Unblock' : 'Block'}</button>
      </div>
      <h3 style="margin:8px 0 0">Bank accounts</h3><div id="ud-accounts"></div>
      <h3 style="margin:8px 0 0">Transactions (${d.transactions.length})</h3><div id="ud-txns"></div>`,
    onMount: () => {
      const reopen = () => { S.dirty = true; userDetail(id); };
      table($('#ud-accounts'), {
        columns: [
          { label: 'Bank', render: (a) => `<b style="color:${a.bankColor}">${esc(a.bankShort)}</b> ${esc(a.bankName)}` },
          { label: 'Account no.', key: 'accountNo' }, { label: 'IFSC', key: 'ifsc' },
          { label: 'Balance', render: (a) => `<span class="amount">${inr(a.balance)}</span>` },
          { label: 'Status', render: (a) => (a.primary ? pill('primary', 'info') + ' ' : '') + (a.linked ? pill('linked', 'on') : pill('unlinked', 'off')) },
        ],
        rows: d.accounts, empty: 'No bank accounts',
        actions: () => act('adjust', 'Adjust balance') + act('pin', 'Reset PIN') + act('primary', 'Make primary') + act('del', 'Remove', 'danger'),
        onAction: async (a, acc) => {
          if (a === 'adjust') adjustBalance(acc, reopen);
          if (a === 'pin') modal({ title: 'Reset UPI PIN', fields: [{ name: 'pin', label: 'New UPI PIN', value: '1234' }], onSubmit: (v) => run(() => api('POST', `/admin/accounts/${acc.id}/pin`, v), 'PIN reset') });
          if (a === 'primary') await run(() => api('POST', `/admin/accounts/${acc.id}/primary`), 'Primary account changed').then(reopen);
          if (a === 'del' && await confirmBox('Remove this bank account?', 'Remove')) await run(() => api('DELETE', `/admin/accounts/${acc.id}`), 'Account removed').then(reopen);
        },
      });
      table($('#ud-txns'), { columns: txnColumns(id), rows: d.transactions.slice(0, 50), empty: 'No transactions', actions: txnActions, onAction: (a, t) => txnAction(a, t, reopen) });
      $('#ud-edit').onclick = () => userForm(u);
      $('#ud-acc').onclick = () => modal({
        title: 'Add bank account', fields: [
          { name: 'bankId', label: 'Bank', type: 'select', options: banks.map((b) => [b.id, b.name]) },
          { name: 'accountNo', label: 'Account number', placeholder: 'auto' },
          { name: 'balance', label: 'Balance (₹)', type: 'number', value: 5000 },
          { name: 'pin', label: 'UPI PIN', value: '1234' }],
        onSubmit: async (v) => { await run(() => api('POST', `/admin/users/${id}/accounts`, v), 'Account added'); reopen(); return false; },
      });
      $('#ud-txn').onclick = () => txnForm(null, { fromUserId: id }, reopen);
      $('#ud-notify').onclick = () => notifyForm(id);
      $('#ud-reward').onclick = () => modal({
        title: 'Give scratch card', fields: [{ name: 'title', label: 'Title', value: 'Special reward' }, { name: 'amount', label: 'Cashback inside (₹, 0 = better luck next time)', type: 'number', value: 50 }],
        onSubmit: (v) => run(() => api('POST', '/admin/c/rewards', { ...v, userId: id }), 'Scratch card sent'),
      });
      $('#ud-logout').onclick = () => run(() => api('POST', `/admin/users/${id}/logout`), 'User signed out').then(reopen);
      $('#ud-block').onclick = () => run(() => api('POST', `/admin/users/${id}/block`, { blocked: !u.blocked }), 'Saved').then(reopen);
    },
  });
}

function adjustBalance(acc, done) {
  modal({
    title: `Adjust balance — ${acc.bankShort} ••${acc.last4}`,
    body: `<p class="muted">Current balance: <b>${inr(acc.balance)}</b></p>`,
    fields: [
      { name: 'mode', label: 'Action', type: 'select', options: [['credit', 'Add money (credit)'], ['debit', 'Deduct money (debit)'], ['set', 'Set exact balance']] },
      { name: 'amount', label: 'Amount (₹)', type: 'number', step: '0.01', required: true },
      { name: 'reason', label: 'Reason / note', span2: true, placeholder: 'e.g. Cashback correction' },
      { name: 'record', label: 'Show this as a transaction in the user\'s history', type: 'checkbox', span2: true },
      { name: 'label', label: 'Shown as from/to (if recorded)', value: 'PhonePayy', span2: true },
    ],
    onSubmit: async (v) => { await run(() => api('POST', `/admin/accounts/${acc.id}/adjust`, v), 'Balance updated'); done(); return false; },
  });
}

// ----- transactions -----
function txnColumns(perspective) {
  return [
    { label: 'Date', render: (t) => dt(t.createdAt) },
    { label: 'From', render: (t) => person(t.fromUserId ? userById(t.fromUserId) || { name: t.fromName, color: '#9aa0a6' } : { name: t.fromName, color: '#9aa0a6' }, t.fromHandle || '') },
    { label: 'To', render: (t) => person(t.toUserId ? userById(t.toUserId) || { name: t.toName, color: '#9aa0a6' } : { name: t.toName, color: '#9aa0a6' }, t.toHandle || '') },
    { label: 'Amount', render: (t) => `<span class="${perspective && t.toUserId === perspective && t.fromUserId !== perspective ? 'amount-in' : 'amount'}">${perspective && t.toUserId === perspective && t.fromUserId !== perspective ? '+' : ''}${inr(t.amount)}</span>` },
    { label: 'Type', render: (t) => esc(TYPE_LABEL[t.type] || t.type) },
    { label: 'Status', render: (t) => pill(t.status) + (t.refundedBy ? ' ' + pill('refunded', 'info') : '') },
    { label: 'UPI ref', key: 'upiRef' },
    { label: 'Note', render: (t) => `<span class="muted">${esc(t.note || t.failureReason || '')}</span>` },
  ];
}
const txnActions = (t) => act('view', 'View') + act('edit', 'Edit') + (t.status === 'success' && !t.refundedBy && t.type !== 'refund' ? act('refund', 'Refund') : '') + act('del', 'Delete', 'danger');
async function txnAction(a, t, done = render) {
  if (a === 'view') return txnView(t);
  if (a === 'edit') return txnForm(t, null, done);
  if (a === 'refund' && await confirmBox(`Refund ${inr(t.amount)} from ${t.toName} back to ${t.fromName}?`, 'Refund')) return run(() => api('POST', `/admin/transactions/${t.id}/refund`), 'Refunded').then(done);
  if (a === 'del') {
    modal({
      title: 'Delete transaction',
      body: `<p>Delete <b>${inr(t.amount)}</b> ${esc(t.fromName)} → ${esc(t.toName)}?</p>${t.refundedBy ? '<p class="muted">This payment was already refunded, so its money has been returned.</p>' : ''}`,
      fields: [{ name: 'revert', label: 'Also reverse the money movement (restore balances)', type: 'checkbox', value: t.applied && !t.refundedBy, span2: true }],
      submitText: 'Delete', danger: true,
      onSubmit: async (v) => { await run(() => api('DELETE', `/admin/transactions/${t.id}?revert=${v.revert ? 1 : 0}`), 'Transaction deleted'); S.dirty = true; if (done !== render) { done(); return false; } },
    });
  }
}
function txnView(t) {
  const rows = [
    ['Status', pill(t.status)], ['Amount', `<b>${inr(t.amount)}</b>`], ['Type', TYPE_LABEL[t.type] || t.type],
    ['From', `${esc(t.fromName)} <span class="muted">${esc(t.fromHandle || '')}</span>`], ['To', `${esc(t.toName)} <span class="muted">${esc(t.toHandle || '')}</span>`],
    ['From account', t.fromAccount ? `${esc(t.fromAccount.bankName)} ••${t.fromAccount.last4}` : '—'], ['To account', t.toAccount ? `${esc(t.toAccount.bankName)} ••${t.toAccount.last4}` : '—'],
    ['Date', dt(t.createdAt)], ['UPI reference', esc(t.upiRef)], ['Transaction ID', esc(t.id)], ['Note', esc(t.note || '—')],
    ['Failure reason', esc(t.failureReason || '—')], ['Category', esc(t.category || '')], ['Created by', esc(t.createdBy)], ['Balances applied', t.applied ? 'Yes' : 'No'],
  ];
  modal({ title: 'Transaction details', body: `<div class="kv">${rows.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>` });
}
async function txnForm(t, preset, done = render) {
  if (!S.users.length) await loadUsers();
  if (!S.categories) S.categories = (await api('GET', '/admin/settings')).settings.categories || [];
  const users = [['', '— External / none —'], ...S.users.map((u) => [u.id, `${u.name} (${u.phone})`])];
  const v = t || { type: 'p2p', status: 'success', ...preset };
  modal({
    title: t ? 'Edit transaction' : 'Add transaction',
    body: t ? '<p class="muted">Editing a successful transaction re-applies the balance changes using the new values.</p>' : '',
    fields: [
      { name: 'fromUserId', label: 'Sender (user)', type: 'select', options: users, value: v.fromUserId || '' },
      { name: 'fromName', label: 'Sender name (if external)', value: v.fromUserId ? '' : v.fromName },
      { name: 'toUserId', label: 'Receiver (user)', type: 'select', options: users, value: v.toUserId || '' },
      { name: 'toName', label: 'Receiver name (if external)', value: v.toUserId ? '' : v.toName },
      { name: 'amount', label: 'Amount (₹)', type: 'number', step: '0.01', value: v.amount, required: true },
      { name: 'type', label: 'Type', type: 'select', options: Object.entries(TYPE_LABEL), value: v.type },
      { name: 'status', label: 'Status', type: 'select', options: ['success', 'pending', 'failed'], value: v.status },
      { name: 'createdAt', label: 'Date & time', type: 'datetime-local', value: toLocalInput(v.createdAt) },
      { name: 'note', label: 'Note', value: v.note },
      { name: 'failureReason', label: 'Failure reason (if failed)', value: v.failureReason },
      { name: 'upiRef', label: 'UPI reference no.', value: v.upiRef, placeholder: 'auto-generated' },
      { name: 'category', label: 'Category (chip shown in the app)', type: 'select', options: [...new Set([...(S.categories || []), v.category || 'Money Transfer'])], value: v.category || 'Money Transfer' },
      ...(t ? [] : [
        { name: 'affectBalance', label: 'Move money between the accounts (update balances)', type: 'checkbox', value: true, span2: true },
        { name: 'notify', label: 'Send "money received" notification to receiver', type: 'checkbox', value: true, span2: true },
      ]),
    ],
    onSubmit: async (vals) => {
      if (!vals.upiRef) delete vals.upiRef;
      if (t) await run(() => api('PUT', `/admin/transactions/${t.id}`, vals), 'Transaction updated');
      else await run(() => api('POST', '/admin/transactions', vals), 'Transaction added');
      S.dirty = true;
      if (done !== render) { done(); return false; }
    },
  });
}

PAGES.transactions = async (page) => {
  const [{ transactions }] = await Promise.all([api('GET', '/admin/transactions'), loadUsers()]);
  const f = S.tf || (S.tf = { q: '', status: '', type: '', from: '', to: '' });
  page.innerHTML = `<div class="toolbar">
    <input id="tq" placeholder="Search name, UPI ref, note" value="${esc(f.q)}"/>
    <select id="ts"><option value="">All status</option><option>success</option><option>pending</option><option>failed</option></select>
    <select id="tt"><option value="">All types</option>${Object.entries(TYPE_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
    <input id="tfrom" type="date" value="${f.from}" title="From date"/><input id="tto" type="date" value="${f.to}" title="To date"/>
    <span class="spacer"></span><button class="btn" id="csv">Export CSV</button><button class="btn primary" id="addTxn">+ Add transaction</button></div>
    <p class="muted" id="tcount"></p><div id="tt-table"></div>`;
  $('#ts').value = f.status; $('#tt').value = f.type;
  let rows = [];
  const draw = () => {
    Object.assign(f, { q: $('#tq').value.toLowerCase(), status: $('#ts').value, type: $('#tt').value, from: $('#tfrom').value, to: $('#tto').value });
    const fromTs = f.from ? new Date(f.from).setHours(0, 0, 0, 0) : 0;
    const toTs = f.to ? new Date(f.to).setHours(23, 59, 59, 999) : Infinity;
    rows = transactions.filter((t) => (!f.q || `${t.fromName} ${t.toName} ${t.upiRef} ${t.note} ${t.toHandle}`.toLowerCase().includes(f.q))
      && (!f.status || t.status === f.status) && (!f.type || t.type === f.type) && t.createdAt >= fromTs && t.createdAt <= toTs);
    const vol = rows.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
    $('#tcount').textContent = `${rows.length} transactions · ${inr(vol)} successful volume`;
    table($('#tt-table'), { columns: txnColumns(), rows: rows.slice(0, 300), actions: txnActions, onAction: (a, t) => txnAction(a, t) });
  };
  ['tq', 'ts', 'tt', 'tfrom', 'tto'].forEach((i) => ($('#' + i).oninput = draw));
  $('#addTxn').onclick = () => txnForm();
  $('#csv').onclick = () => {
    const head = ['Date', 'UPI Ref', 'Type', 'Status', 'From', 'To', 'Amount', 'Note'];
    const lines = rows.map((t) => [new Date(t.createdAt).toISOString(), t.upiRef, t.type, t.status, t.fromName, t.toName, t.amount, t.note || ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'phonepayy-transactions.csv' });
    a.click();
  };
  draw();
};

PAGES.requests = async (page) => {
  const { requests } = await api('GET', '/admin/requests');
  page.innerHTML = '<div id="rt"></div>';
  table($('#rt'), {
    columns: [{ label: 'Date', render: (r) => dt(r.createdAt) }, { label: 'Requested by', key: 'fromName' }, { label: 'Requested from', key: 'toName' },
      { label: 'Amount', render: (r) => `<b>${inr(r.amount)}</b>` }, { label: 'Note', key: 'note' }, { label: 'Status', render: (r) => pill(r.status) }],
    rows: requests, empty: 'No money requests',
    actions: () => act('del', 'Delete', 'danger'),
    onAction: async (a, r) => { if (await confirmBox('Delete this request?')) await run(() => api('DELETE', `/admin/requests/${r.id}`), 'Deleted').then(render); },
  });
};

// ----- generic catalog pages -----
async function catalogPage(container, { coll, columns, fields, addLabel, filter, defaults = {} }) {
  const { items } = await api('GET', '/admin/c/' + coll);
  const rows = filter ? items.filter(filter) : items;
  container.innerHTML = `<div class="toolbar"><span class="muted">${rows.length} items</span><span class="spacer"></span><button class="btn primary" data-add>+ ${esc(addLabel)}</button></div><div data-table></div>`;
  const form = (item) => modal({
    title: item ? 'Edit' : addLabel,
    fields: fields.map((f) => ({ ...f, value: item ? item[f.name] : (defaults[f.name] ?? f.value) })),
    onSubmit: async (v) => {
      if (item) await run(() => api('PUT', `/admin/c/${coll}/${item.id}`, v), 'Saved');
      else await run(() => api('POST', `/admin/c/${coll}`, { ...defaults, ...v }), 'Added');
      S.dirty = true;
    },
  });
  $('[data-add]', container).onclick = () => form();
  table($('[data-table]', container), {
    columns: [...columns, { label: 'Status', render: (r) => (r.active === false ? pill('off') : pill('on')) }],
    rows,
    actions: (r) => act('edit', 'Edit') + act('toggle', r.active === false ? 'Enable' : 'Disable') + act('del', 'Delete', 'danger'),
    onAction: async (a, r) => {
      if (a === 'edit') form(r);
      if (a === 'toggle') await run(() => api('PUT', `/admin/c/${coll}/${r.id}`, { active: r.active === false }), 'Saved').then(render);
      if (a === 'del' && await confirmBox('Delete this item?')) await run(() => api('DELETE', `/admin/c/${coll}/${r.id}`), 'Deleted').then(render);
    },
  });
}
const swatch = (c) => `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${esc(c)};vertical-align:middle"></span>`;
const activeField = { name: 'active', label: 'Active / visible in app', type: 'checkbox', value: true, span2: true };

function tabs(page, list, key) {
  page.innerHTML = `<div class="tabs">${list.map(([id, label]) => `<button data-tab="${id}">${label}</button>`).join('')}</div><div id="tabBody"></div>`;
  const show = (id) => {
    S[key] = id;
    page.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    list.find((x) => x[0] === id)[2]($('#tabBody'));
  };
  page.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  show(S[key] || list[0][0]);
}

PAGES.banks = (page) => catalogPage(page, {
  coll: 'banks', addLabel: 'Add bank',
  columns: [
    { label: 'Logo', render: (b) => (b.logo ? `<img src="${esc(b.logo)}" class="logo-thumb" alt="" />` : `<span class="logo-thumb" style="background:${esc(b.color)}"></span>`) },
    { label: 'Bank', render: (b) => `<b>${esc(b.short)}</b> ${esc(b.name)}` }, { label: 'IFSC prefix', key: 'ifscPrefix' }],
  fields: [{ name: 'name', label: 'Bank name' }, { name: 'short', label: 'Short name' }, { name: 'ifscPrefix', label: 'IFSC prefix (4 letters)' },
    { name: 'color', label: 'Brand colour (used when there is no logo)', type: 'color', value: '#1a73e8' },
    { name: 'logo', label: 'Bank logo', type: 'image', span2: true, hint: 'Shown on Bank accounts, the PIN screen and payment receipts in the app.' }, activeField],
});

PAGES.bills = (page) => catalogPage(page, {
  coll: 'billers', addLabel: 'Add biller',
  columns: [{ label: 'Biller', render: (b) => `${swatch(b.color)} ${esc(b.name)}` }, { label: 'Category', key: 'category' }],
  fields: [{ name: 'name', label: 'Biller name' }, { name: 'category', label: 'Category', type: 'select', options: BILL_CATS }, { name: 'color', label: 'Colour', type: 'color', value: '#1a73e8' }, activeField],
});

PAGES.recharge = async (page) => {
  const ops = (await api('GET', '/admin/c/operators')).items;
  tabs(page, [
    ['ops', 'Operators', (el) => catalogPage(el, {
      coll: 'operators', addLabel: 'Add operator',
      columns: [{ label: 'Operator', render: (o) => `${swatch(o.color)} ${esc(o.name)}` }],
      fields: [{ name: 'name', label: 'Operator name' }, { name: 'color', label: 'Colour', type: 'color', value: '#1a73e8' }, activeField],
    })],
    ...ops.map((o) => [o.id, `${o.name} plans`, (el) => catalogPage(el, {
      coll: 'plans', addLabel: `Add ${o.name} plan`, filter: (p) => p.operatorId === o.id, defaults: { operatorId: o.id },
      columns: [{ label: 'Price', render: (p) => `<b>${inr(p.price)}</b>` }, { label: 'Validity', key: 'validity' }, { label: 'Data', key: 'data' }, { label: 'Benefits', key: 'description' }, { label: 'Tag', key: 'tag' }],
      fields: [{ name: 'price', label: 'Price (₹)', type: 'number' }, { name: 'validity', label: 'Validity', placeholder: '28 days' }, { name: 'data', label: 'Data', placeholder: '1.5 GB/day' },
        { name: 'tag', label: 'Tag', placeholder: 'Popular' }, { name: 'description', label: 'Benefits', span2: true }, activeField],
    })]),
  ], 'rechargeTab');
};

PAGES.rewards = async (page) => {
  await loadUsers();
  tabs(page, [
    ['camp', 'Cashback campaigns', (el) => catalogPage(el, {
      coll: 'campaigns', addLabel: 'Add campaign',
      columns: [{ label: 'Campaign', key: 'title' }, { label: 'Min payment', render: (c) => inr(c.minAmount) }, { label: 'Win chance', render: (c) => Math.round(c.chance * 100) + '%' },
        { label: 'Cashback range', render: (c) => `${inr(c.minCashback)} – ${inr(c.maxCashback)}` }],
      fields: [{ name: 'title', label: 'Title', span2: true }, { name: 'minAmount', label: 'Minimum payment (₹)', type: 'number', value: 100 },
        { name: 'chance', label: 'Chance of scratch card (0–1)', type: 'number', step: '0.05', value: 0.5 },
        { name: 'minCashback', label: 'Min cashback (₹)', type: 'number', value: 5 }, { name: 'maxCashback', label: 'Max cashback (₹)', type: 'number', value: 50 }, activeField],
    })],
    ['cards', 'Scratch cards issued', async (el) => {
      const { items } = await api('GET', '/admin/c/rewards');
      el.innerHTML = '<div class="toolbar"><span class="spacer"></span><button class="btn primary" id="giveCard">+ Give scratch card</button></div><div id="rw"></div>';
      $('#giveCard').onclick = () => modal({
        title: 'Give scratch card', fields: [
          { name: 'userId', label: 'User', type: 'select', options: S.users.map((u) => [u.id, `${u.name} (${u.phone})`]) },
          { name: 'title', label: 'Title', value: 'Special reward' }, { name: 'amount', label: 'Cashback (₹, 0 = better luck next time)', type: 'number', value: 50 }],
        onSubmit: async (v) => { await run(() => api('POST', '/admin/c/rewards', v), 'Scratch card sent'); S.dirty = true; },
      });
      table($('#rw'), {
        columns: [{ label: 'Date', render: (r) => dt(r.createdAt) }, { label: 'User', render: (r) => person(userById(r.userId)) }, { label: 'Title', key: 'title' },
          { label: 'Amount', render: (r) => (r.amount ? inr(r.amount) : 'Better luck next time') }, { label: 'Scratched', render: (r) => (r.scratched ? pill('yes', 'on') : pill('not yet', 'pending')) }],
        rows: items, actions: () => act('edit', 'Edit') + act('del', 'Delete', 'danger'),
        onAction: async (a, r) => {
          if (a === 'edit') modal({ title: 'Edit scratch card', fields: [{ name: 'title', label: 'Title', value: r.title }, { name: 'amount', label: 'Amount', type: 'number', value: r.amount }, { name: 'scratched', label: 'Already scratched', type: 'checkbox', value: r.scratched }], onSubmit: async (v) => { await run(() => api('PUT', `/admin/c/rewards/${r.id}`, v), 'Saved'); S.dirty = true; } });
          if (a === 'del' && await confirmBox('Delete this scratch card?')) await run(() => api('DELETE', `/admin/c/rewards/${r.id}`), 'Deleted').then(render);
        },
      });
    }],
  ], 'rewardsTab');
};

PAGES.offers = (page) => catalogPage(page, {
  coll: 'offers', addLabel: 'Add offer',
  columns: [{ label: 'Brand', render: (o) => `${swatch(o.color)} <b>${esc(o.brand)}</b>` }, { label: 'Offer', key: 'title' }, { label: 'Code', key: 'code' }],
  fields: [{ name: 'brand', label: 'Brand' }, { name: 'code', label: 'Coupon code' }, { name: 'title', label: 'Headline', span2: true }, { name: 'description', label: 'Details', type: 'textarea', span2: true },
    { name: 'color', label: 'Colour', type: 'color', value: '#1a73e8' }, activeField],
});

PAGES.banners = (page) => catalogPage(page, {
  coll: 'banners', addLabel: 'Add banner',
  columns: [{ label: 'Preview', render: (b) => `<div style="background:${esc(b.color)};color:#fff;padding:8px 12px;border-radius:10px;min-width:240px"><small>${esc(b.subtitle)}</small><br><b>${esc(b.title)}</b> <b style="font-size:18px">${esc(b.emoji || '')}</b></div>` }, { label: 'Order', key: 'order' }],
  fields: [{ name: 'title', label: 'Headline', span2: true }, { name: 'subtitle', label: 'Small text above the highlight', span2: true }, { name: 'cta', label: 'Button text', value: 'Explore Now' }, { name: 'emoji', label: 'Big highlight (e.g. 7.99%)', value: '7.99%' },
    { name: 'color', label: 'Background colour', type: 'color', value: '#e8f4fd' }, { name: 'image', label: 'Image URL (optional)', span2: true }, { name: 'order', label: 'Display order', type: 'number', value: 1 }, activeField],
});

// ----- notifications -----
async function notifyForm(userId) {
  if (!S.users.length) await loadUsers();
  modal({
    title: 'Send notification',
    fields: [
      { name: 'userId', label: 'Send to', type: 'select', options: [['', 'All users'], ...S.users.map((u) => [u.id, `${u.name} (${u.phone})`])], value: userId || '', span2: true },
      { name: 'title', label: 'Title', span2: true, required: true }, { name: 'body', label: 'Message', type: 'textarea', span2: true }],
    submitText: 'Send',
    onSubmit: async (v) => { await run(() => api('POST', '/admin/notifications', v), 'Notification sent'); S.dirty = true; },
  });
}
PAGES.notifications = async (page) => {
  const { notifications } = await api('GET', '/admin/notifications');
  page.innerHTML = '<div class="toolbar"><span class="muted">Notifications pop up instantly in the app and appear in its notification list.</span><span class="spacer"></span><button class="btn primary" id="sendN">+ Send notification</button></div><div id="nt"></div>';
  $('#sendN').onclick = () => notifyForm();
  table($('#nt'), {
    columns: [{ label: 'Date', render: (n) => dt(n.createdAt) }, { label: 'To', key: 'userName' }, { label: 'Title', render: (n) => `<b>${esc(n.title)}</b>` }, { label: 'Message', key: 'body' }, { label: 'Read by', key: 'reads' }],
    rows: notifications, actions: () => act('del', 'Delete', 'danger'),
    onAction: async (a, n) => run(() => api('DELETE', `/admin/notifications/${n.id}`), 'Deleted').then(render),
  });
};

// ----- support -----
PAGES.support = async (page) => {
  const { tickets } = await api('GET', '/admin/tickets');
  S.openTickets = tickets.filter((t) => t.status === 'open').length;
  renderNav(S.openTickets);
  page.innerHTML = '<div id="st"></div>';
  table($('#st'), {
    columns: [{ label: 'Opened', render: (t) => dt(t.createdAt) }, { label: 'User', render: (t) => person(t.user, t.user ? t.user.phone : '') }, { label: 'Subject', render: (t) => `<b>${esc(t.subject)}</b>` },
      { label: 'Messages', render: (t) => t.replies.length }, { label: 'Last update', render: (t) => dt(t.replies[t.replies.length - 1].at) }, { label: 'Status', render: (t) => pill(t.status) }],
    rows: tickets, empty: 'No support tickets', actions: () => act('open', 'Open & reply'),
    onAction: (a, t) => ticketView(t),
  });
};
function ticketView(t) {
  modal({
    title: t.subject, wide: false,
    body: `<div class="muted">${esc(t.user ? t.user.name + ' · ' + t.user.phone : '')}${t.txnId ? ' · Transaction ' + esc(t.txnId) : ''}</div>
      <div class="thread">${t.replies.map((r) => `<div class="msg ${r.from}">${esc(r.text)}<small>${r.from === 'admin' ? esc(r.name || 'Support') : 'User'} · ${dt(r.at)}</small></div>`).join('')}</div>`,
    fields: [{ name: 'text', label: 'Reply', type: 'textarea', span2: true }, { name: 'status', label: 'Status', type: 'select', options: ['open', 'closed'], value: t.status }],
    submitText: 'Send reply',
    onSubmit: async (v) => { await run(() => api('POST', `/admin/tickets/${t.id}/reply`, v), 'Reply sent'); S.dirty = true; },
  });
}

// ----- settings -----
PAGES.settings = async (page) => {
  const { settings: s } = await api('GET', '/admin/settings');
  const FEAT = { scan: ['Scan QR code', 'Camera QR scanner and My QR'], payContacts: ['Pay contacts / phone / UPI ID', 'Person-to-person payments'], bankTransfer: ['Bank transfer', 'Pay to account number + IFSC'],
    selfTransfer: ['Self transfer', 'Move money between own accounts'], bills: ['Pay bills', 'Electricity, DTH, broadband…'], recharge: ['Mobile recharge', 'Prepaid plans'],
    rewards: ['Rewards', 'Scratch cards & cashback'], requests: ['Request money', 'Ask contacts for money'], checkBalance: ['Check balance', 'View bank balance with PIN'], upiLite: ['UPI Lite', 'Small wallet for PIN-less payments'] };
  const HOME = { hero: 'Top offer banner (Cashback FEST)', promoChips: 'Offer chips row', recharge: 'Recharge & Bills', loans: 'Loans', gold: 'Gold, Silver & Platinum', insurance: 'Insurance + "Did you know?" strip', mutualFunds: 'Mutual Funds', deposits: 'Deposits & Savings', travel: 'Travel & Transit', creditCards: 'New Credit Card', offers: 'Offers & Rewards', stocks: 'Stocks / Invest', myQr: 'My QR card', upiLite: 'UPI Lite card' };
  page.innerHTML = `<div class="grid two">
    <div class="grid">
      <div class="card"><h3>App branding &amp; home header</h3><div class="form-grid">
        ${fieldHtml({ name: 'b_appName', label: 'App name (splash, home, receipts)', value: s.appName })}
        ${fieldHtml({ name: 'b_appVersion', label: 'Version shown in profile', value: s.appVersion })}
        ${fieldHtml({ name: 'b_heroTitle', label: 'Top banner title (e.g. Cashback FEST)', value: s.heroTitle })}
        ${fieldHtml({ name: 'b_heroSubtitle', label: 'Top banner offer line', value: s.heroSubtitle })}
        ${fieldHtml({ name: 'b_heroCta', label: 'Top banner button text', value: s.heroCta })}
        ${fieldHtml({ name: 'b_promoChip', label: 'Offer chip text', value: s.promoChip })}
        ${fieldHtml({ name: 'b_categories', label: 'Payment categories (comma separated)', type: 'textarea', value: (s.categories || []).join(', '), span2: true })}
        ${fieldHtml({ name: 'b_appIcon', label: 'App logo', type: 'image', value: s.appIcon, max: 256, hint: 'Shown inside the app (splash, welcome screen). The phone launcher icon is part of the APK and changes only with a new build.' })}
      </div><div style="margin-top:14px"><button class="btn primary" id="saveBrand">Save branding</button></div></div>
      <div class="card"><h3>General</h3><div class="form-grid">
        ${fieldHtml({ name: 'announcement', label: 'Home announcement (empty = hidden)', value: s.announcement })}
        ${fieldHtml({ name: 'perTxLimit', label: 'Per-transaction limit (₹)', type: 'number', value: s.perTxLimit })}
        ${fieldHtml({ name: 'dailyLimit', label: 'Daily limit per user (₹)', type: 'number', value: s.dailyLimit })}
        ${fieldHtml({ name: 'newAccountBalance', label: 'Balance for newly linked bank accounts (₹)', type: 'number', value: s.newAccountBalance })}
        ${fieldHtml({ name: 'referralBonus', label: 'Referral bonus (₹)', type: 'number', value: s.referralBonus })}
        ${fieldHtml({ name: 'otpCode', label: 'Demo OTP code', value: s.otpCode })}
        ${fieldHtml({ name: 'maintenanceMessage', label: 'Maintenance message', value: s.maintenanceMessage, span2: true })}
      </div><div style="margin-top:14px"><button class="btn primary" id="saveGen">Save changes</button></div></div>
      <div class="card"><h3>Switches</h3>
        <div class="switch-row"><div>Maintenance mode<small>Users see a maintenance screen and cannot pay</small></div>${switchHtml('s-maintenanceMode', s.maintenanceMode)}</div>
        <div class="switch-row"><div>Demo OTP<small>Use the fixed OTP above instead of a random one</small></div>${switchHtml('s-demoOtp', s.demoOtp)}</div>
      </div>
      <div class="card"><h3>Danger zone</h3><p class="muted">Reset all data back to the demo seed (users, transactions, settings). All app users are signed out.</p>
        <button class="btn danger solid" id="resetDemo">Reset demo data</button></div>
    </div>
    <div class="grid">
      <div class="card"><h3>App features</h3>${Object.entries(FEAT).map(([k, [l, d]]) => `<div class="switch-row"><div>${l}<small>${d}</small></div>${switchHtml('f-' + k, s.features[k])}</div>`).join('')}</div>
      <div class="card"><h3>Home screen sections</h3>${Object.entries(HOME).map(([k, l]) => `<div class="switch-row"><div>${l}</div>${switchHtml('h-' + k, s.homeSections[k])}</div>`).join('')}</div>
    </div></div>`;
  wireImageFields(page);
  const val = (n) => page.querySelector(`[name=${n}]`).value;
  $('#saveBrand').onclick = () => run(() => api('PUT', '/admin/settings', { appName: val('b_appName'), appIcon: val('b_appIcon'), appVersion: val('b_appVersion'),
    heroTitle: val('b_heroTitle'), heroSubtitle: val('b_heroSubtitle'), heroCta: val('b_heroCta'), promoChip: val('b_promoChip'),
    categories: val('b_categories').split(',') }), 'Branding saved — app updated');
  $('#saveGen').onclick = () => {
    const v = {};
    ['announcement', 'maintenanceMessage', 'otpCode'].forEach((k) => (v[k] = page.querySelector(`[name=${k}]`).value));
    ['perTxLimit', 'dailyLimit', 'newAccountBalance', 'referralBonus'].forEach((k) => (v[k] = Number(page.querySelector(`[name=${k}]`).value)));
    run(() => api('PUT', '/admin/settings', v), 'Settings saved — app updated');
  };
  ['maintenanceMode', 'demoOtp'].forEach((k) => ($('#s-' + k).onchange = (e) => run(() => api('PUT', '/admin/settings', { [k]: e.target.checked }), 'Saved')));
  Object.keys(FEAT).forEach((k) => ($('#f-' + k).onchange = (e) => run(() => api('PUT', '/admin/settings', { features: { [k]: e.target.checked } }), 'Saved')));
  Object.keys(HOME).forEach((k) => ($('#h-' + k).onchange = (e) => run(() => api('PUT', '/admin/settings', { homeSections: { [k]: e.target.checked } }), 'Saved')));
  $('#resetDemo').onclick = async () => { if (await confirmBox('Reset ALL data to demo state?', 'Reset')) { await run(() => api('POST', '/admin/reset-demo'), 'Demo data restored'); logout(); } };
};

PAGES.audit = async (page) => {
  const { logs } = await api('GET', '/admin/audit');
  page.innerHTML = `<div class="toolbar"><input id="aq" placeholder="Search logs"/></div><div id="at"></div>`;
  const draw = () => {
    const q = $('#aq').value.toLowerCase();
    table($('#at'), {
      columns: [{ label: 'Time', render: (l) => dt(l.at) }, { label: 'Admin', key: 'adminName' }, { label: 'Action', render: (l) => pill(l.action, 'info') }, { label: 'Details', key: 'details' }],
      rows: logs.filter((l) => !q || `${l.adminName} ${l.action} ${l.details}`.toLowerCase().includes(q)), empty: 'No activity yet',
    });
  };
  $('#aq').oninput = draw;
  draw();
};

PAGES.admins = async (page) => {
  const { admins } = await api('GET', '/admin/admins');
  page.innerHTML = '<div class="toolbar"><button class="btn" id="chPw">Change my password</button><span class="spacer"></span><button class="btn primary" id="addAdm">+ Add admin</button></div><div id="adt"></div>';
  $('#addAdm').onclick = () => modal({
    title: 'Add admin', fields: [{ name: 'name', label: 'Name' }, { name: 'username', label: 'Username' }, { name: 'password', label: 'Password', type: 'password' }],
    onSubmit: async (v) => { await run(() => api('POST', '/admin/admins', v), 'Admin added'); S.dirty = true; },
  });
  $('#chPw').onclick = () => modal({
    title: 'Change password', fields: [{ name: 'oldPassword', label: 'Current password', type: 'password' }, { name: 'newPassword', label: 'New password', type: 'password' }],
    onSubmit: (v) => run(() => api('POST', '/admin/password', v), 'Password changed'),
  });
  table($('#adt'), {
    columns: [{ label: 'Name', key: 'name' }, { label: 'Username', key: 'username' }, { label: 'Role', render: (a) => pill(a.role, 'info') }, { label: 'Created', render: (a) => dt(a.createdAt) }],
    rows: admins, actions: (a) => (a.role === 'super' || a.id === S.admin.id ? '' : act('del', 'Remove', 'danger')),
    onAction: async (x, a) => { if (await confirmBox(`Remove admin ${a.username}?`, 'Remove')) await run(() => api('DELETE', `/admin/admins/${a.id}`), 'Removed').then(render); },
  });
};

// ---------- boot & realtime ----------
let socket;
let refreshTimer;
function connectSocket() {
  if (socket) socket.disconnect();
  socket = io({ auth: { token: S.token, admin: true } });
  socket.on('connect', () => $('#live').classList.remove('off'));
  socket.on('disconnect', () => $('#live').classList.add('off'));
  socket.on('admin:refresh', () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if ($('#modalRoot').innerHTML) S.dirty = true; else render(); }, 400);
  });
}

async function boot() {
  if (!S.token) return logout();
  try {
    const { admin } = await api('GET', '/admin/me');
    S.admin = admin;
  } catch { return; }
  $('#login').classList.add('hidden');
  $('#shell').classList.remove('hidden');
  $('#who').textContent = S.admin.name;
  S.route = location.hash.slice(1) || 'dashboard';
  connectSocket();
  render();
}

$('#loginForm').onsubmit = login;
$('#logoutBtn').onclick = logout;
boot();
