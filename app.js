/* ───────── LANGUAGE ───────── */
let currentLang = 'en';

const t = {
  address:      { en: 'Address',       ja: 'アドレス' },
  balance:      { en: 'Balance (BTC)', ja: '残高 (BTC)' },
  usd:          { en: 'USD',           ja: 'USD換算' },
  txs:          { en: 'Txs',           ja: '取引数' },
  totalBalance: { en: 'Total',         ja: '合計残高' },
  addresses:    { en: 'Addresses',     ja: 'アドレス数' },
  btcPrice:     { en: 'BTC Price',     ja: 'BTC価格' },
  errorFetch:   { en: 'Failed to fetch', ja: '取得失敗' },
  noData:       { en: 'Enter addresses on the left and press "Check Balances".',
                  ja: '左側にアドレスを入力して「残高を確認」を押してください。' },
  unconfirmed:  { en: 'unconfirmed',   ja: '未承認' },
  lastUpdated:  { en: 'Last updated',  ja: '最終更新' },
  needAddr:     { en: 'Please enter at least one Bitcoin address.',
                  ja: '少なくとも1つのビットコインアドレスを入力してください。' }
};
const tx = k => t[k][currentLang];
const locale = () => (currentLang === 'ja' ? 'ja-JP' : 'en-US');

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-ja').classList.toggle('active', lang === 'ja');
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute('data-' + lang);
  });
  const ta = document.getElementById('addr-input');
  ta.placeholder = ta.getAttribute('data-' + lang + '-placeholder');
  renderResults(lastResults);
  updateLastUpdated();
}

/* ───────── STATE ───────── */
let lastResults = [];
let lastUpdate = null;
let timerInterval = null;
let countdown = 60;
let fetching = false;
const INTERVAL = 60;
const CIRC = 2 * Math.PI * 12;

/* ───────── FETCH ───────── */
async function fetchAll() {
  if (fetching) return;
  const addresses = document.getElementById('addr-input').value
    .split('\n').map(a => a.trim()).filter(Boolean).slice(0, 10);

  if (!addresses.length) { alert(tx('needAddr')); return; }

  fetching = true;
  document.getElementById('refresh-bar').style.display = 'flex';

  // Keep previous values visible during auto-refresh; only show spinners on first load
  const sameSet = lastResults.length === addresses.length &&
                  lastResults.every((r, i) => r.address === addresses[i] && r.status === 'ok');
  if (!sameSet) {
    lastResults = addresses.map(a => ({ address: a, status: 'loading' }));
    renderResults(lastResults);
  }

  try {
    const [price, ...balances] = await Promise.all([
      fetchBtcPrice(),
      ...addresses.map(fetchAddress)
    ]);
    lastResults = balances.map(b => ({ ...b, price }));
    renderResults(lastResults);
    lastUpdate = new Date();
    updateLastUpdated();
  } finally {
    fetching = false;
    resetTimer();
  }
}

async function fetchBtcPrice() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const d = await r.json();
    return d.bitcoin.usd;
  } catch { return null; }
}

async function fetchAddress(address) {
  try {
    const r = await fetch('https://blockstream.info/api/address/' + encodeURIComponent(address));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const funded = d.chain_stats.funded_txo_sum + d.mempool_stats.funded_txo_sum;
    const spent  = d.chain_stats.spent_txo_sum  + d.mempool_stats.spent_txo_sum;
    const sat = funded - spent;
    return {
      address, status: 'ok',
      balanceBtc: sat / 1e8,
      txCount: d.chain_stats.tx_count + d.mempool_stats.tx_count,
      unconfirmed: d.mempool_stats.tx_count
    };
  } catch (e) {
    return { address, status: 'error', message: e.message };
  }
}

/* ───────── RENDER ───────── */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 8 });
const fmtUsd = n => n.toLocaleString(locale(), { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const short = a => (a.length > 26 ? a.slice(0, 12) + '…' + a.slice(-10) : a);

function renderResults(results) {
  const area = document.getElementById('results-area');

  if (!results.length) {
    area.innerHTML = `<div class="empty-state"><div class="icon">₿</div><p>${esc(tx('noData'))}</p></div>`;
    return;
  }

  const ok = results.filter(r => r.status === 'ok');
  const totalBtc = ok.reduce((s, r) => s + r.balanceBtc, 0);
  const price = results.find(r => r.price)?.price ?? null;

  const top = `
    <div class="results-top">
      <div class="stat">
        <div class="s-label">${tx('totalBalance')}</div>
        <div class="s-value orange">${fmt(totalBtc)} BTC</div>
        ${price != null ? `<div class="s-sub">≈ ${fmtUsd(totalBtc * price)}</div>` : ''}
      </div>
      <div class="stat">
        <div class="s-label">${tx('addresses')}</div>
        <div class="s-value orange">${results.length}</div>
      </div>
      ${price != null ? `
      <div class="stat">
        <div class="s-label">${tx('btcPrice')}</div>
        <div class="s-value green">${fmtUsd(price)}</div>
      </div>` : ''}
    </div>`;

  const rows = results.map((r, i) => {
    const link = `<a href="https://blockstream.info/address/${encodeURIComponent(r.address)}" target="_blank" rel="noopener" title="${esc(r.address)}">${esc(short(r.address))}</a>`;
    const idx = `<td class="idx">${i + 1}</td>`;

    if (r.status === 'loading') {
      return `<tr>${idx}<td class="addr">${link}</td><td class="num" colspan="3"><span class="spinner-inline"></span></td></tr>`;
    }
    if (r.status === 'error') {
      return `<tr class="row-error">${idx}<td class="addr">${link}</td>
        <td class="num" colspan="3"><span class="dot err"></span><span class="err-text" title="${esc(r.message || '')}">${tx('errorFetch')}</span></td></tr>`;
    }
    const usd = price != null ? fmtUsd(r.balanceBtc * price) : '–';
    const mem = r.unconfirmed > 0 ? ` <span class="mempool" title="${tx('unconfirmed')}">(+${r.unconfirmed})</span>` : '';
    return `<tr>${idx}
      <td class="addr">${link}</td>
      <td class="num btc"><span class="dot ok"></span>${fmt(r.balanceBtc)}</td>
      <td class="num usd">${usd}</td>
      <td class="num txs">${r.txCount.toLocaleString(locale())}${mem}</td>
    </tr>`;
  }).join('');

  area.innerHTML = top + `
    <div class="table-scroll">
      <table>
        <thead><tr>
          <th>#</th>
          <th>${tx('address')}</th>
          <th class="num">${tx('balance')}</th>
          <th class="num">${tx('usd')}</th>
          <th class="num txs">${tx('txs')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ───────── TIMER ───────── */
function resetTimer() {
  countdown = INTERVAL;
  if (timerInterval) clearInterval(timerInterval);
  updateRing();
  timerInterval = setInterval(() => {
    countdown--;
    updateRing();
    if (countdown <= 0) { clearInterval(timerInterval); fetchAll(); }
  }, 1000);
}

function updateRing() {
  document.getElementById('ring-fill').style.strokeDashoffset = CIRC * (1 - countdown / INTERVAL);
  document.getElementById('countdown').textContent = Math.max(countdown, 0);
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  el.textContent = lastUpdate ? `${tx('lastUpdated')}: ${lastUpdate.toLocaleTimeString(locale())}` : '';
}

/* ───────── CLEAR ───────── */
function clearAll() {
  document.getElementById('addr-input').value = '';
  document.getElementById('refresh-bar').style.display = 'none';
  lastResults = [];
  lastUpdate = null;
  if (timerInterval) clearInterval(timerInterval);
  renderResults([]);
}

/* ───────── INIT ───────── */
setLang('en');

// Optional: ?addr=a,b,c (or ?lang=ja) pre-fills the list and loads balances
(function initFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get('lang') === 'ja') setLang('ja');
  const a = p.get('addr');
  if (a) {
    document.getElementById('addr-input').value = a.split(/[,\s]+/).filter(Boolean).join('\n');
    fetchAll();
  }
})();
