/* Leonida 100% Tracker: all UI logic. Data comes from data.js (generated from the spreadsheet). */
(() => {
  'use strict';
  const D = window.GTA_DATA;
  const KEY = 'leonida-tracker-v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

  /* ---------------- State ---------------- */
  const blank = () => ({ check: {}, coll: {}, chal: {}, miss: {}, tro: {}, known: {}, reg: {}, weightMode: 'cat', sfx: true });
  let S = load();
  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return blank(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable */ } }

  const ui = { selCheck: 1, checkCat: 'all', checkStatus: 'all', chapter: null, storyType: 'all', storySearch: '', hideDoneColl: false, troTier: 'all', troState: 'all' };

  /* ---------------- Getters ---------------- */
  const CL = D.checklist.items;
  const isMoney = (it) => /\(\$\)/.test(it.name);
  const chalDone = (c) => S.chal[c.id] ?? c.done;
  const chalTotal = () => sum(D.challenges.items, chalDone);
  const checkDone = (it) => (it.auto === 'Challenges' ? chalTotal() : (S.check[it.id] ?? it.done));
  const linePct = (it) => (it.req ? Math.min(1, checkDone(it) / it.req) : 0);
  const collDone = (c) => S.coll[c.id] ?? c.done;
  // Missions are Not started / Completed / Missed ("In progress" from older saves or the sheet counts as not started).
  const missStatus = (m) => { const s = S.miss[m.id]?.status ?? m.status; return s === 'Completed' || s === 'Missed' ? s : 'Not started'; };
  const missChar = (m) => m.lock || (m.id in S.miss && 'char' in S.miss[m.id] ? S.miss[m.id].char : m.char);

  // Trophies: earned if ticked manually, or automatically when their condition is met.
  const TL = D.trophies.list;
  function trophyAuto(t) {
    const a = t.auto; if (!a) return false;
    if (a.type === 'mission') { const m = D.missions.items.find((x) => x.id === a.id); return !!m && missStatus(m) === 'Completed'; }
    if (a.type === 'overall') return overall() >= 1 - 1e-9;
    if (a.type === 'challenges') return chalTotal() >= a.n;
    if (a.type === 'platinum') return TL.every((x) => x === t || trophyEarned(x));
    return false;
  }
  const trophyManual = (t) => !!(S.known[t.id] ?? t.done);
  const trophyEarned = (t) => trophyManual(t) || trophyAuto(t);
  const regPct = (r) => S.reg[r.id] ?? r.pct;

  const CATS = Object.keys(D.weights);
  function catStats(cat) {
    const its = CL.filter((i) => i.cat === cat);
    return { cat, lines: its.length, done: its.filter((i) => linePct(i) >= 1).length, avg: its.length ? sum(its, linePct) / its.length : 0, weight: D.weights[cat] };
  }
  function overall() {
    if (S.weightMode === 'equal') return sum(CL, linePct) / CL.length;
    return sum(CATS, (c) => { const s = catStats(c); return s.avg * s.weight; });
  }
  function trackers() {
    const coll = D.collectibles.items, mis = D.missions.items, main = mis.filter((m) => m.type === 'Main'), side = mis.filter((m) => m.type !== 'Main');
    const comp = (arr) => arr.filter((m) => missStatus(m) === 'Completed').length;
    const regs = D.regions.items;
    return [
      { id: 'collect', name: 'Collectibles', done: sum(coll, collDone), total: sum(coll, (c) => c.total) },
      { id: 'story', name: 'Main Story', done: comp(main), total: main.length },
      { id: 'story', name: 'Optional & Side', done: comp(side), total: side.length, type: 'side' },
      { id: 'challenges', name: 'Challenges', done: chalTotal(), total: D.challenges.items.length * 10 },
      { id: 'leonida', name: 'Regions Explored', done: sum(regs, regPct) / regs.length, total: 100, pctOnly: true },
      { id: 'trophies', name: 'Trophies', done: TL.filter(trophyEarned).length, total: TL.length },
    ];
  }
  const RANKS = [[0, 'Fresh off the Keys'], [.05, 'Small-Time Hustler'], [.2, 'Street Operator'], [.4, 'Leonida Regular'], [.6, 'Vice City Heavy'], [.8, 'Kingpin'], [1, 'Legend of Leonida']];
  const rankFor = (p) => RANKS.filter(([t]) => p >= t - 1e-9).pop()[1];
  const starsFor = (p) => (p >= 1 ? 5 : Math.floor(p * 5));

  /* ---------------- Formatting ---------------- */
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtMoney = (n) => '$' + fmtInt(n);
  const fmtPct = (p) => Math.round(p * 100) + '%';
  const FMT = { pct: fmtPct, int: fmtInt, money: fmtMoney, pct100: (v) => Math.round(v) + '%' };
  const num = (key, v, fmt = 'int') => `<span data-nk="${key}" data-v="${v}" data-fmt="${fmt}">${FMT[fmt](v)}</span>`;
  const bar = (key, p, cls = '') => `<div class="bar ${cls} ${p >= 1 ? 'done' : ''}"><i data-k="${key}" style="--p:${p}"></i></div>`;
  const ring = (key, p, label, sw = 8) => `<div class="ring"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="44" stroke-width="${sw}"/><circle class="fill" data-k="${key}" style="--p:${p}" cx="50" cy="50" r="44" stroke-width="${sw}" pathLength="100"/></svg><div class="label">${label}</div></div>`;
  const star = (on) => `<svg class="${on ? 'on' : ''}"><use href="#star"/></svg>`;
  // Drop spreadsheet-only instructions ("enter counts in yellow", "use the dropdown"...) from sheet text.
  const SHEET_ONLY = /yellow|dropdown|blue =|green =|enter (your|counts|how)|edit counts|set status|in the .* column/i;
  const clean = (s) => String(s || '').split(/(?<=\.)\s+/).filter((x) => !SHEET_ONLY.test(x)).join(' ');
  const pageHead = (eyebrow, title, sub) => `<header class="page-head stagger"><p class="eyebrow">${eyebrow}</p><h2 class="page-title">${title}</h2>${clean(sub) ? `<p class="page-sub">${clean(sub)}</p>` : ''}</header>`;
  const notes = (arr) => { const a = (arr || []).map(clean).filter(Boolean); return a.length ? `<div class="notes">${a.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''; };

  /* ---------------- Sound ---------------- */
  let actx;
  function tone(freq, dur = .08, type = 'triangle', vol = .05, delay = 0) {
    if (!S.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .02);
    } catch { /* audio unavailable */ }
  }
  const sfx = {
    up: () => tone(880, .07), down: () => tone(520, .07), nav: () => tone(660, .05, 'sine', .04),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, 'triangle', .06, i * .09)),
    star: () => [988, 1319].forEach((f, i) => tone(f, .18, 'square', .03, i * .08)),
  };

  /* ---------------- Banner ---------------- */
  // Banners queue up so a mission + the trophy it unlocks play one after another.
  const bannerQ = [];
  let bannerBusy = false;
  function banner(title, sub) {
    if (bannerQ.some((x) => x[0] === title && x[1] === sub)) return;
    bannerQ.push([title, sub]);
    if (!bannerBusy) nextBanner();
  }
  function nextBanner() {
    const item = bannerQ.shift();
    if (!item) { bannerBusy = false; return; }
    bannerBusy = true;
    const b = $('#banner');
    $('#bannerTitle').textContent = item[0]; $('#bannerSub').textContent = item[1] || '';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    setTimeout(() => { b.classList.remove('show'); nextBanner(); }, 2700);
    sfx.win();
  }

  /* ---------------- Tabs & routing ---------------- */
  const TABS = [
    { id: 'hq', label: 'HQ' }, { id: 'checklist', label: '100%' }, { id: 'story', label: 'Story' }, { id: 'collect', label: 'Collectibles' },
    { id: 'challenges', label: 'Challenges' }, { id: 'leonida', label: 'Leonida' }, { id: 'trophies', label: 'Trophies' }, { id: 'intel', label: 'Intel' },
  ];
  let cur = null;
  const view = $('#view');
  const strip = $('#tabStrip');
  strip.innerHTML = TABS.map((t, i) => `<button class="tab" role="tab" data-go="${t.id}" aria-selected="false" title="${t.label} (${i + 1})">${t.label}</button>`).join('') + '<span class="tab-ink"></span>';

  function moveInk() {
    const btn = $(`.tab[data-go="${cur}"]`, strip), ink = $('.tab-ink', strip);
    if (!btn) return;
    ink.style.width = btn.offsetWidth + 'px';
    ink.style.transform = `translateX(${btn.offsetLeft}px)`;
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
  function go(id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; else route(); }
  function route() {
    const id = (location.hash.replace(/^#\/?/, '') || 'hq');
    const next = TABS.some((t) => t.id === id) ? id : 'hq';
    const dir = cur == null ? 1 : Math.sign(TABS.findIndex((t) => t.id === next) - TABS.findIndex((t) => t.id === cur)) || 1;
    const changed = next !== cur;
    cur = next;
    $$('.tab', strip).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.go === cur)));
    moveInk();
    if (changed) { sfx.nav(); window.scrollTo({ top: 0, behavior: 'instant' }); }
    render(changed ? dir : 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', moveInk);

  /* ---------------- Render + animated patching ---------------- */
  function render(dir = 0) {
    const html = VIEWS[cur]();
    if (dir) {
      view.classList.remove('enter-right', 'enter-left'); void view.offsetWidth;
      view.classList.add(dir > 0 ? 'enter-right' : 'enter-left');
    }
    patch(view, html, !!dir);
    updateHud();
  }
  view.addEventListener('animationend', (e) => { if (e.target === view) view.classList.remove('enter-right', 'enter-left'); });

  function patch(el, html, fromZero) {
    const oldP = {}, oldN = {};
    if (!fromZero) {
      $$('[data-k]', el).forEach((n) => (oldP[n.dataset.k] = n.style.getPropertyValue('--p')));
      $$('[data-nk]', el).forEach((n) => (oldN[n.dataset.nk] = +n.dataset.v));
    }
    el.innerHTML = html;
    animateIn(el, oldP, oldN, fromZero);
  }
  function animateIn(el, oldP, oldN, fromZero) {
    const pend = [];
    $$('[data-k]', el).forEach((n) => {
      const target = n.style.getPropertyValue('--p');
      const from = fromZero ? '0' : oldP[n.dataset.k];
      if (from !== undefined && from !== '' && from !== target) { n.style.setProperty('--p', from); pend.push([n, target]); }
    });
    if (pend.length) { el.getBoundingClientRect(); requestAnimationFrame(() => requestAnimationFrame(() => pend.forEach(([n, t]) => n.style.setProperty('--p', t)))); }
    $$('[data-nk]', el).forEach((n) => {
      const to = +n.dataset.v, from = fromZero ? 0 : oldN[n.dataset.nk];
      if (from === undefined || from === to) return;
      tween(n, from, to, FMT[n.dataset.fmt]);
    });
  }
  function tween(node, from, to, f, ms = 900) {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      node.textContent = f(from + (to - from) * e);
      if (k < 1 && node.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- HUD ---------------- */
  let lastStars = null;
  function updateHud() {
    const p = overall(), s = starsFor(p);
    const hp = $('#hudPct'), old = parseFloat(hp.dataset.v || 0);
    hp.dataset.v = p;
    if (old !== p) tween(hp, old, p, fmtPct, 700); else hp.textContent = fmtPct(p);
    $('#hudRank').textContent = rankFor(p);
    const st = $('#hudStars');
    st.innerHTML = [0, 1, 2, 3, 4].map((i) => star(i < s)).join('');
    if (lastStars !== null && s > lastStars) { st.classList.remove('flash'); void st.offsetWidth; st.classList.add('flash'); sfx.star(); }
    if (lastStars !== null && p >= 1 && starsFor(p) === 5 && lastStars < 5) banner('100% Complete', 'Legend of Leonida');
    lastStars = s;
  }

  /* ---------------- Views ---------------- */
  const VIEWS = {};

  VIEWS.hq = () => {
    const p = overall(), s = starsFor(p);
    const linesDone = CL.filter((i) => linePct(i) >= 1).length;
    const modes = [['cat', 'Category weights (GTABase 45 / 45 / 10)'], ['equal', 'Equal per line (Timesaver estimate)']];
    const mi = modes.findIndex((m) => m[0] === S.weightMode);
    const next = CL.filter((i) => linePct(i) < 1 && !i.auto).sort((a, b) => linePct(b) - linePct(a) || (a.req - checkDone(a)) - (b.req - checkDone(b))).slice(0, 6);
    return `
      <section class="hq-hero stagger">
        <div class="hero-ring">${ring('overall', p, `<b>${num('ov', p, 'pct')}</b><small>100% Completion</small>`, 7)}</div>
        <div class="hero-info">
          <p class="eyebrow">Your Leonida rap sheet</p>
          <div class="rank">${esc(rankFor(p))}</div>
          <div class="big-stars">${[0, 1, 2, 3, 4].map((i) => star(i < s)).join('')}</div>
          <div class="selector">
            <span><span class="lbl">Weighting</span><br><span class="val">${modes[mi][1]}</span></span>
            <span class="ctrl"><button class="chev" data-act="weight" aria-label="Previous weighting">‹</button>${mi + 1} / 2<button class="chev" data-act="weight" aria-label="Next weighting">›</button></span>
          </div>
          <p class="muted small" style="margin-top:12px">${num('ld', linesDone)} of ${CL.length} checklist lines complete. Not sure which weighting matches your in-game %? Try both; details in <a href="#/intel">Intel</a>.</p>
        </div>
      </section>

      <div class="sec-h"><h3>Checklist Categories</h3><span>Tap a card to open it</span></div>
      <div class="grid-3 stagger">${CATS.map((c, i) => { const st = catStats(c); return `
        <article class="card hoverable cat-card" data-act="openCat" data-cat="${esc(c)}">
          <div class="top"><h4>${esc(c)}</h4><span class="pct">${num('cat' + i, st.avg, 'pct')}</span></div>
          ${bar('cat' + i, st.avg, 'thick')}
          <div class="meta"><span>${st.done} / ${st.lines} lines</span><span>Weight ${Math.round(st.weight * 100)}%</span></div>
        </article>`; }).join('')}</div>

      <div class="sec-h"><h3>Other Trackers</h3><span>Beyond the 100% list</span></div>
      <div class="grid-auto stagger">${trackers().map((t, i) => { const pp = t.pctOnly ? t.done / 100 : (t.total ? t.done / t.total : 0); return `
        <article class="card hoverable stat-tile" data-go="${t.id}">
          ${ring('tr' + i, Math.min(1, pp), fmtPct(pp), 10)}
          <div><b>${t.name}</b><span>${t.pctOnly ? 'Average explored' : `${fmtInt(t.done)} / ${fmtInt(t.total)}`}</span></div>
        </article>`; }).join('')}</div>

      <div class="sec-h"><h3>Closest To Done</h3><span>Keep the streak going</span></div>
      <div class="up-next stagger">${next.map((it) => `
        <article class="card hoverable" data-act="openLine" data-id="${it.id}">
          <div class="nm">${esc(it.name)}</div>${bar('nx' + it.id, linePct(it))}
          <div class="ct"><span>${esc(it.cat)}</span><span>${(isMoney(it) ? fmtMoney : fmtInt)(it.req - checkDone(it))} to go</span></div>
        </article>`).join('')}</div>`;
  };

  VIEWS.checklist = () => {
    const status = (i) => (linePct(i) >= 1 ? 'Complete' : checkDone(i) > 0 ? 'In progress' : 'Not started');
    let items = CL.filter((i) => (ui.checkCat === 'all' || i.cat === ui.checkCat) && (ui.checkStatus === 'all' || status(i) === ui.checkStatus));
    if (!CL.some((i) => i.id === ui.selCheck)) ui.selCheck = CL[0].id;
    const sel = CL.find((i) => i.id === ui.selCheck);
    const chip = (grp, val, label, n) => `<button class="chip ${ui[grp] === val ? 'on' : ''}" data-act="chip" data-grp="${grp}" data-val="${esc(val)}">${label}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
    const groups = CATS.filter((c) => items.some((i) => i.cat === c));
    const f = isMoney(sel) ? fmtMoney : fmtInt;
    const quick = sel.auto ? '' : (isMoney(sel) ? [1000, 10000, 50000] : [1, 5, 10]).map((d) => `<button data-act="step" data-kind="check" data-id="${sel.id}" data-d="${d}">+${f(d).replace('$', '$')}</button>`).join('') +
      `<button data-act="set" data-kind="check" data-id="${sel.id}" data-v="${sel.req}">Max</button><button data-act="set" data-kind="check" data-id="${sel.id}" data-v="0">Reset</button>`;
    return `
      ${pageHead('The road to 100%', '100% Checklist', esc(D.checklist.subtitle))}
      <div class="filters">${chip('checkCat', 'all', 'All', CL.length)}${CATS.map((c) => chip('checkCat', c, c, CL.filter((i) => i.cat === c).length)).join('')}</div>
      <div class="filters">${['all', 'Not started', 'In progress', 'Complete'].map((s) => chip('checkStatus', s, s === 'all' ? 'Any status' : s, CL.filter((i) => s === 'all' || status(i) === s).length)).join('')}</div>
      <div class="split">
        <div>${groups.length ? groups.map((c) => { const st = catStats(c); return `
          <div class="sec-h"><h3>${esc(c)}</h3><span>${st.done} / ${st.lines} · ${fmtPct(st.avg)}</span></div>
          <div class="rows">${items.filter((i) => i.cat === c).map((i) => { const fm = isMoney(i) ? fmtMoney : fmtInt; return `
            <div class="mrow ${i.id === ui.selCheck ? 'sel' : ''} ${linePct(i) >= 1 ? 'complete' : ''}" data-act="selLine" data-id="${i.id}" tabindex="0">
              <div class="nm" title="${esc(i.name)}">${esc(i.name)}</div>
              ${bar('ck' + i.id, linePct(i))}
              <div class="cnt">${fm(checkDone(i))} / ${fm(i.req)}</div>
              ${i.auto ? '<span class="tag auto">Auto</span>' : `<div class="step"><button data-act="step" data-kind="check" data-id="${i.id}" data-d="${isMoney(i) ? -5000 : -1}" aria-label="Decrease">‹</button><button data-act="step" data-kind="check" data-id="${i.id}" data-d="${isMoney(i) ? 5000 : 1}" aria-label="Increase">›</button></div>`}
            </div>`; }).join('')}</div>`; }).join('') : '<div class="empty">Nothing matches these filters.</div>'}
          ${notes(D.checklist.notes)}
        </div>
        <aside class="card detail">
          <h3>${esc(sel.name)}</h3>
          <p><span class="tag">${esc(sel.cat)}</span> ${sel.auto ? '<span class="tag auto">Auto-filled from Challenges</span>' : ''}</p>
          <p>${esc(sel.note || 'No extra notes for this one. Just get it done.')}</p>
          <div class="kv"><div><small>Done</small><b>${num('dd', checkDone(sel), isMoney(sel) ? 'money' : 'int')}</b></div><div><small>Required</small><b>${f(sel.req)}</b></div><div><small>In game</small><b>${sel.total != null ? f(sel.total) : '—'}</b></div></div>
          ${bar('dt', linePct(sel), 'thick')}
          ${sel.auto ? `<p style="margin-top:14px"><button class="pill" data-go="challenges">Open Challenges</button></p>` : `
          <label class="muted small" style="display:block;margin:14px 0 6px">Set exact value</label>
          <input class="num-in" type="number" min="0" inputmode="numeric" value="${checkDone(sel)}" data-in="check" data-id="${sel.id}">
          <div class="quick">${quick}</div>`}
          <p class="muted small" style="margin-top:14px">Tip: ↑ ↓ to move, ← → to adjust.</p>
        </aside>
      </div>`;
  };

  const chapKey = (m) => (m.chapter.startsWith('Prologue') ? 'P' : (m.chapter.match(/^Ch (\d+)/) || [])[1] || '?');
  const CHAPTERS = (() => {
    const map = new Map();
    D.missions.items.forEach((m) => {
      const k = chapKey(m);
      if (!map.has(k)) map.set(k, { key: k, title: k === 'P' ? 'Prologue' : '', items: [] });
      const c = map.get(k); c.items.push(m);
      if (!c.title && !/Strangers/.test(m.chapter)) c.title = m.chapter.split('–').slice(1).join('–').trim();
    });
    return [...map.values()];
  })();
  const typeClass = (t) => (/Missable/.test(t) ? 'Missable' : /Optional/.test(t) ? 'Optional' : /Stranger/.test(t) ? 'Stranger' : 'Main');
  const STATUSES = ['Not started', 'Completed', 'Missed'];
  const MARK = { 'Not started': '', Completed: '✔', Missed: '✖' };
  const LOCK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4zm2 0h4V5a2 2 0 1 0-4 0v2z"/></svg>';
  const CHARS = [null, 'Jason', 'Lucia', 'Both'];

  VIEWS.story = () => {
    // Land on the first chapter that still has unfinished missions.
    if (!ui.chapter) ui.chapter = (CHAPTERS.find((c) => c.items.some((m) => missStatus(m) !== 'Completed')) || CHAPTERS[0]).key;
    const ch = CHAPTERS.find((c) => c.key === ui.chapter) || CHAPTERS[0];
    const q = ui.storySearch.trim().toLowerCase();
    const types = [['all', 'All'], ['Main', 'Main'], ['Optional', 'Optional'], ['Missable', 'Missable'], ['Stranger', 'Strangers & Freaks']];
    const pool = q ? D.missions.items : ch.items;
    const list = pool.filter((m) => (ui.storyType === 'all' || typeClass(m.type) === ui.storyType) && (!q || m.name.toLowerCase().includes(q)));
    const done = (arr) => arr.filter((m) => missStatus(m) === 'Completed').length;
    const mainSubs = list.filter((m) => !/Strangers/.test(m.chapter)), sideSubs = list.filter((m) => /Strangers/.test(m.chapter));
    const rowsFor = (arr) => arr.map((m) => { const st = missStatus(m), chr = missChar(m); return `
      <div class="mission st-${st.split(' ')[0]}">
        <span class="no">${m.id}</span>
        <span class="nm">${esc(m.name)}${q ? ` <span class="muted small">· ${esc(m.chapter)}</span>` : ''}</span>
        <span class="type-tag type-${typeClass(m.type)}">${esc(m.type)}</span>
        ${m.lock ? `<span class="char-btn ${m.lock} locked" title="${m.lock === 'Both' ? 'Each character plays their own version' : `Only ${m.lock} can play this one`}">${LOCK_SVG}${m.lock}</span>`
          : `<button class="char-btn ${chr || ''}" data-act="char" data-id="${m.id}" title="Who played it? (optional)">${chr || 'Char'}</button>`}
        <button class="mcheck m-${st.split(' ')[0]}" data-act="status" data-id="${m.id}" title="${st}: click to change" aria-label="${esc(m.name)}: ${st}">${MARK[st]}</button>
      </div>`; }).join('');
    return `
      ${pageHead('Jason & Lucia', 'Story Missions', esc(D.missions.subtitle))}
      <div class="chapters stagger">${CHAPTERS.map((c) => { const p = c.items.length ? done(c.items) / c.items.length : 0; return `
        <button class="chapter ${c.key === ch.key && !q ? 'on' : ''}" data-act="chapter" data-key="${c.key}">
          <div class="no">${c.key === 'P' ? '00' : '0' + c.key}</div>
          <div class="ttl">${esc(c.title)}</div>
          ${bar('ch' + c.key, p)}
          <div class="cnt">${done(c.items)} / ${c.items.length} complete</div>
        </button>`; }).join('')}</div>
      <div class="story-tools">
        <div class="filters" style="margin:0">${types.map(([v, l]) => `<button class="chip ${ui.storyType === v ? 'on' : ''}" data-act="chip" data-grp="storyType" data-val="${v}">${l}</button>`).join('')}</div>
        <input class="search" type="search" placeholder="Search all missions…" value="${esc(ui.storySearch)}" data-in="search">
      </div>
      ${q ? `<div class="sec-h"><h3>Search results</h3><span>${list.length} found</span></div><div class="rows">${rowsFor(list) || '<div class="empty">No missions match.</div>'}</div>` : `
        <div class="sec-h"><h3>${ch.key === 'P' ? 'Prologue' : `Chapter ${ch.key} · ${esc(ch.title)}`}</h3><span>${done(ch.items)} / ${ch.items.length} complete
          <button class="chip" style="margin-left:10px" data-act="bulk" data-key="${ch.key}">Mark main missions done</button></span></div>
        <div class="rows">${rowsFor(mainSubs) || '<div class="empty">No missions of this type here.</div>'}</div>
        ${sideSubs.length ? `<div class="sec-h"><h3>Strangers &amp; Freaks</h3><span>${done(sideSubs)} / ${sideSubs.length}</span></div><div class="rows">${rowsFor(sideSubs)}</div>` : ''}`}
      <p class="muted small" style="margin-top:14px">Click the circle: empty = not started, ✔ = completed, ✖ = missed. Missions locked to one character show a padlock; for the rest you can optionally log who played it.</p>`;
  };

  VIEWS.collect = () => {
    const items = D.collectibles.items;
    const groups = [...new Set(items.map((c) => c.cat))];
    const tot = sum(items, (c) => c.total), done = sum(items, collDone);
    return `
      ${pageHead('Leave no stone unturned', 'Collectibles', esc(D.collectibles.subtitle))}
      <div class="hq-hero" style="grid-template-columns:200px 1fr;max-width:720px;margin:0 auto 10px">
        <div style="width:180px;aspect-ratio:1;margin:auto">${ring('colAll', tot ? done / tot : 0, `<b style="font:900 30px var(--f-wide)">${fmtPct(tot ? done / tot : 0)}</b><br><small class="muted">found</small>`, 9)}</div>
        <div><div class="rank" style="font:900 34px var(--f-wide);font-stretch:112%">${num('colN', done)} <span class="muted" style="font-size:.6em">/ ${fmtInt(tot)}</span></div>
          <p class="muted">${items.filter((c) => collDone(c) >= c.total).length} of ${items.length} item types fully collected.</p>
          <button class="chip ${ui.hideDoneColl ? 'on' : ''}" data-act="toggleHide">Hide completed</button></div>
      </div>
      ${groups.map((g) => { const its = items.filter((c) => c.cat === g && !(ui.hideDoneColl && collDone(c) >= c.total)); if (!its.length) return ''; const all = items.filter((c) => c.cat === g); return `
        <div class="coll-group"><div class="sec-h"><h3>${esc(g)}</h3><span>${fmtInt(sum(all, collDone))} / ${fmtInt(sum(all, (c) => c.total))}</span></div>
        <div class="grid-auto stagger">${its.map((c) => { const d = collDone(c), p = c.total ? d / c.total : 0; return `
          <article class="card hoverable coll ${p >= 1 ? 'complete' : ''}">
            <div class="hd"><span class="nm">${esc(c.name)}</span><span class="cnt">${num('cn' + c.id, d)}<small> / ${fmtInt(c.total)}</small></span></div>
            ${bar('cb' + c.id, p)}
            <div class="ft"><div class="step"><button data-act="step" data-kind="coll" data-id="${esc(c.id)}" data-d="-1" aria-label="Decrease">−</button><button data-act="step" data-kind="coll" data-id="${esc(c.id)}" data-d="1" aria-label="Increase">+</button></div>
            <input class="num-mini" type="number" min="0" max="${c.total}" value="${d}" data-in="coll" data-id="${esc(c.id)}" aria-label="Found count"></div>
          </article>`; }).join('')}</div></div>`; }).join('')}
      ${notes(D.collectibles.notes)}`;
  };

  VIEWS.challenges = () => {
    const items = D.challenges.items, tot = chalTotal(), max = items.length * 10;
    return `
      ${pageHead('Prove yourself', 'Challenges', esc(D.challenges.subtitle))}
      <div class="grid-3 stagger" style="margin-bottom:10px">
        <article class="card"><h4>Total</h4><div style="font:900 34px var(--f-wide);margin:6px 0">${num('chT', tot)} <span class="muted" style="font-size:.5em">/ ${max}</span></div>${bar('chT', tot / max)}</article>
        <article class="card"><h4>For 100% (70)</h4><div style="font:900 34px var(--f-wide);margin:6px 0">${fmtPct(Math.min(1, tot / 70))}</div>${bar('ch70', Math.min(1, tot / 70))}</article>
        <article class="card"><h4>One Last Thing (50)</h4><div style="font:900 34px var(--f-wide);margin:6px 0">${tot >= 50 ? 'Unlocked' : `${50 - tot} to go`}</div>${bar('ch50', Math.min(1, tot / 50))}</article>
      </div>
      <div class="grid-auto stagger" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${items.map((c) => { const d = chalDone(c); return `
        <article class="card hoverable chal">
          <div class="hd"><h4>${esc(c.id)}</h4><b>${d}<span class="muted" style="font-size:.55em"> / 10</span></b></div>
          <div class="pips">${Array.from({ length: 10 }, (_, i) => `<button class="pip ${i < d ? 'on' : ''}" data-act="pip" data-id="${esc(c.id)}" data-v="${i + 1}" aria-label="${i + 1} completed"></button>`).join('')}</div>
          <div class="unlocks"><div class="unlock ${d >= 5 ? 'on' : ''}"><small>Unlock at 5</small><span>${esc(c.unlock5)}</span></div><div class="unlock ${d >= 10 ? 'on' : ''}"><small>Unlock at 10</small><span>${esc(c.unlock10)}</span></div></div>
        </article>`; }).join('')}</div>
      ${notes(D.challenges.notes)}`;
  };

  const REGION_SHAPES = {
    'Port Gellhorn': { d: 'M18 58 L150 42 L158 112 L104 126 L40 120 Z', lx: 88, ly: 88 },
    'Mount Kalaga National Park': { d: 'M150 42 L312 34 L320 108 L158 112 Z', lx: 236, ly: 72, label: 'Mt Kalaga' },
    'Ambrosia': { d: 'M158 112 L320 108 L312 228 L200 234 L176 172 Z', lx: 214, ly: 150 },
    'Grassrivers': { d: 'M200 234 L282 230 L288 346 L236 366 L210 300 Z', lx: 246, ly: 290 },
    'Vice City': { d: 'M282 230 L312 228 L342 278 L340 344 L288 346 Z', lx: 314, ly: 300 },
    'Leonida Keys': { d: 'M296 372 q14 6 6 18 q-12 6 -16 -8 Z M268 398 q12 2 8 14 q-14 4 -14 -8 Z M236 414 q12 0 10 12 q-14 4 -16 -6 Z M204 424 q10 0 8 10 q-12 4 -14 -4 Z', lx: 250, ly: 446 },
  };
  VIEWS.leonida = () => {
    const regs = D.regions.items, avg = sum(regs, regPct) / regs.length;
    return `
      ${pageHead('State of Leonida', 'Explore Leonida', esc(D.regions.subtitle))}
      <div class="split" style="grid-template-columns:minmax(280px,1fr) minmax(0,1.2fr)">
        <div class="map-wrap card">
          <svg class="map" viewBox="0 0 380 470" role="img" aria-label="Stylised map of Leonida regions">
            <rect class="water" x="0" y="0" width="380" height="470" rx="12"/>
            <ellipse cx="248" cy="182" rx="22" ry="15" fill="rgba(111,227,214,.25)"/>
            ${regs.map((r) => { const sh = REGION_SHAPES[r.id]; if (!sh) return ''; const p = regPct(r) / 100; return `
              <path class="region" data-region="${esc(r.id)}" d="${sh.d}" fill="#ff7eb6" fill-opacity="${(.12 + p * .78).toFixed(3)}"/>`; }).join('')}
            ${regs.map((r) => { const sh = REGION_SHAPES[r.id]; if (!sh) return ''; return `<text x="${sh.lx}" y="${sh.ly}" text-anchor="middle">${esc(sh.label || r.id)}</text><text class="pctlbl" data-pl="${esc(r.id)}" x="${sh.lx}" y="${sh.ly + 15}" text-anchor="middle">${Math.round(regPct(r))}%</text>`; }).join('')}
          </svg>
          <div class="sec-h" style="margin-top:6px"><h3>Average explored</h3><span>${num('ravg', avg, 'pct100')}</span></div>
          ${bar('ravg', avg / 100, 'thick')}
        </div>
        <div class="stagger">${regs.map((r) => { const v = regPct(r); return `
          <article class="card region-row" data-region="${esc(r.id)}">
            <div class="hd"><h4>${esc(r.id)}</h4><b data-rl="${esc(r.id)}">${Math.round(v)}%</b></div>
            <p><span class="tag">${esc(r.inspo)}</span> ${esc(r.desc)}</p>
            <input type="range" min="0" max="100" step="1" value="${v}" style="--v:${v}" data-in="reg" data-id="${esc(r.id)}" aria-label="${esc(r.id)} explored percent">
          </article>`; }).join('')}</div>
      </div>`;
  };

  const TIERS = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  const TIER_ICON = { Platinum: '🏆', Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const TGROUPS = ['Platinum', 'Story', 'Completion', 'Characters', 'Miscellaneous'];
  const TGROUP_LABEL = { Platinum: 'Platinum', Story: 'Story', Completion: 'Completion & Activities', Characters: 'Characters & Side Quests', Miscellaneous: 'Miscellaneous' };
  const autoLabel = (t) => {
    const a = t.auto; if (!a) return '';
    if (a.type === 'mission') { const m = D.missions.items.find((x) => x.id === a.id); return m ? `Ticks itself when you complete “${m.name}”` : ''; }
    if (a.type === 'overall') return 'Ticks itself at 100% on this tracker';
    if (a.type === 'challenges') return `Ticks itself at ${a.n} challenges`;
    if (a.type === 'platinum') return 'Ticks itself when every other trophy is earned';
    return '';
  };

  VIEWS.trophies = () => {
    const earned = TL.filter(trophyEarned).length;
    const chip = (grp, val, label, n) => `<button class="chip ${ui[grp] === val ? 'on' : ''}" data-act="chip" data-grp="${grp}" data-val="${val}">${label}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
    const list = TL.filter((t) => (ui.troTier === 'all' || t.tier === ui.troTier) && (ui.troState === 'all' || (ui.troState === 'earned') === trophyEarned(t)));
    return `
      ${pageHead('Trophy cabinet', 'Trophies', `All ${TL.length} trophies: ${TIERS.map((x) => `${TL.filter((t) => t.tier === x).length} ${x}`).join(', ')}. Story trophies, A Long Road, One Last Thing and the Platinum tick themselves as you progress.`)}
      <div style="max-width:520px;margin:0 auto 18px;text-align:center"><div style="font:900 40px var(--f-wide)">${num('trT', earned)} <span class="muted" style="font-size:.5em">/ ${TL.length} earned</span></div>${bar('trT', earned / TL.length, 'thick')}</div>
      <div class="grid-auto stagger" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${TIERS.map((x) => { const all = TL.filter((t) => t.tier === x), d = all.filter(trophyEarned).length; return `
        <button class="card hoverable trophy t-${x} ${ui.troTier === x ? 'on' : ''}" data-act="chip" data-grp="troTier" data-val="${ui.troTier === x ? 'all' : x}" title="Show only ${x}">
          <div class="cup">${TIER_ICON[x]}</div><h4>${x}</h4>
          <div class="cnt">${num('tr' + x, d)}<small> / ${all.length}</small></div>${bar('trb' + x, all.length ? d / all.length : 0)}
        </button>`; }).join('')}</div>
      <div class="filters" style="margin-top:18px">${chip('troState', 'all', 'All', TL.length)}${chip('troState', 'unearned', 'Still to get', TL.length - earned)}${chip('troState', 'earned', 'Earned', earned)}
        ${ui.troTier !== 'all' ? chip('troTier', 'all', `✕ ${ui.troTier} only`) : ''}</div>
      ${TGROUPS.map((g) => { const its = list.filter((t) => t.group === g); if (!its.length) return ''; const all = TL.filter((t) => t.group === g); return `
        <div class="sec-h"><h3>${TGROUP_LABEL[g]}</h3><span>${all.filter(trophyEarned).length} / ${all.length}</span></div>
        <div class="rows">${its.map((t) => { const on = trophyEarned(t), auto = trophyAuto(t); return `
          <div class="trow ${on ? 'on' : ''}">
            <span class="tmedal t-${t.tier}" title="${t.tier}">${TIER_ICON[t.tier]}</span>
            <div class="tinfo"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span>${t.tip ? `<small>${esc(t.tip)}</small>` : ''}${t.auto ? `<small class="auto-note">⚡ ${esc(autoLabel(t))}</small>` : ''}</div>
            <button class="mcheck ${on ? 'm-Completed' : 'm-Not'}" data-act="trophy" data-id="${t.id}" ${auto ? 'disabled title="Earned automatically"' : `title="${on ? 'Earned: click to undo' : 'Mark as earned'}"`} aria-label="${esc(t.name)}: ${on ? 'earned' : 'not earned'}">${on ? '✔' : ''}</button>
          </div>`; }).join('')}</div>`; }).join('') || '<div class="empty">Nothing matches these filters.</div>'}
      ${notes(D.trophies.notes)}`;
  };

  VIEWS.intel = () => `
      ${pageHead('Where the numbers come from', 'Intel', esc(D.sources.subtitle))}
      <div class="sec-h"><h3>Sources</h3><span>${D.sources.items.length} references</span></div>
      <div class="grid-auto stagger" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${D.sources.items.map((s) => `
        <a class="card hoverable src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="go">↗</span><b>${esc(s.name)}</b><span>${esc(s.used)}</span></a>`).join('')}</div>
      <div class="sec-h"><h3>Known Caveats</h3><span>Read before you trust a number</span></div>
      <ul class="caveats">${D.sources.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}${D.weightNote ? `<li>${esc(D.weightNote)}</li>` : ''}</ul>
      <div class="sec-h"><h3>Your Save Data</h3><span>Stored in this browser only</span></div>
      <article class="card">
        <p class="muted" style="margin-top:0">Progress lives in this browser's local storage. Export a backup before clearing site data or switching devices.</p>
        <div class="data-actions">
          <button class="pill" data-act="export">Export backup</button>
          <button class="pill ghost" data-act="import">Import backup</button>
          <button class="pill danger" data-act="reset">Reset all progress</button>
          <input type="file" accept="application/json" id="importFile" hidden>
        </div>
      </article>`;

  /* ---------------- Mutations ---------------- */
  function setCheck(id, v) {
    const it = CL.find((i) => i.id === id); if (!it || it.auto) return;
    const before = linePct(it), old = checkDone(it);
    S.check[id] = Math.max(0, Math.round(v));
    (S.check[id] > old ? sfx.up : sfx.down)();
    if (before < 1 && linePct(it) >= 1) banner('Requirement Complete', it.name);
    checkCategoryComplete(it.cat, before);
  }
  const catDoneSnapshot = {};
  function checkCategoryComplete(cat) {
    const done = catStats(cat).avg >= 1;
    if (done && catDoneSnapshot[cat] === false) banner('Category Complete', cat);
    catDoneSnapshot[cat] = done;
  }
  CATS.forEach((c) => (catDoneSnapshot[c] = catStats(c).avg >= 1));

  function setColl(id, v) {
    const c = D.collectibles.items.find((x) => x.id === id); if (!c) return;
    const old = collDone(c);
    S.coll[id] = clamp(Math.round(v), 0, c.total);
    (S.coll[id] > old ? sfx.up : sfx.down)();
    if (old < c.total && S.coll[id] >= c.total) banner('Set Collected', c.name);
  }
  function setChal(id, v) {
    const c = D.challenges.items.find((x) => x.id === id); if (!c) return;
    const old = chalDone(c), chk = CL.find((i) => i.auto), before = linePct(chk);
    S.chal[id] = clamp(v, 0, 10);
    (S.chal[id] > old ? sfx.up : sfx.down)();
    if (old < 10 && S.chal[id] >= 10) banner('Vehicle Unlocked', c.unlock10);
    else if (old < 5 && S.chal[id] >= 5) banner('Vehicle Unlocked', c.unlock5);
    if (before < 1 && linePct(chk) >= 1) banner('Requirement Complete', chk.name);
    checkCategoryComplete(chk.cat);
  }
  // Any trophy that became earned since the last save gets a banner (manual ticks and auto unlocks alike).
  const earnedNow = () => new Set(TL.filter(trophyEarned).map((t) => t.id));
  let earnedSet = earnedNow();
  function commit() {
    save();
    const now = earnedNow();
    TL.forEach((t) => { if (now.has(t.id) && !earnedSet.has(t.id)) banner('Trophy Unlocked', t.name); });
    earnedSet = now;
    render(0);
  }

  /* ---------------- Events ---------------- */
  document.addEventListener('click', (e) => {
    const goEl = e.target.closest('[data-go]');
    const act = e.target.closest('[data-act]');
    // Innermost actionable element wins.
    if (act && (!goEl || goEl.contains(act))) { handleAct(act, e); return; }
    if (goEl) go(goEl.dataset.go);
  });

  function handleAct(el, e) {
    const a = el.dataset.act, id = el.dataset.id;
    switch (a) {
      case 'weight': S.weightMode = S.weightMode === 'cat' ? 'equal' : 'cat'; sfx.nav(); commit(); break;
      case 'openCat': ui.checkCat = el.dataset.cat; ui.checkStatus = 'all'; go('checklist'); break;
      case 'openLine': ui.selCheck = +id; ui.checkCat = 'all'; ui.checkStatus = 'all'; go('checklist'); break;
      case 'chip': ui[el.dataset.grp] = el.dataset.val; sfx.nav(); render(0); break;
      case 'selLine': if (e.target.closest('.step')) return; ui.selCheck = +id; sfx.nav(); render(0); break;
      case 'step': {
        const d = +el.dataset.d, k = el.dataset.kind;
        if (k === 'check') { const it = CL.find((i) => i.id === +id); setCheck(+id, checkDone(it) + d); ui.selCheck = +id; }
        if (k === 'coll') { const c = D.collectibles.items.find((x) => x.id === id); setColl(id, collDone(c) + d); }
        commit(); break;
      }
      case 'set': setCheck(+id, +el.dataset.v); commit(); break;
      case 'pip': { const c = D.challenges.items.find((x) => x.id === id); const v = +el.dataset.v; setChal(id, chalDone(c) === v ? v - 1 : v); commit(); break; }
      case 'chapter': ui.chapter = el.dataset.key; ui.storySearch = ''; sfx.nav(); render(0); break;
      case 'status': {
        const m = D.missions.items.find((x) => x.id === +id), nx = STATUSES[(STATUSES.indexOf(missStatus(m)) + 1) % STATUSES.length];
        S.miss[id] = { ...(S.miss[id] || {}), status: nx };
        if (nx === 'Completed') banner('Mission Complete', m.name); else if (nx === 'Missed') sfx.down(); else sfx.nav();
        commit(); break;
      }
      case 'char': {
        const m = D.missions.items.find((x) => x.id === +id), nx = CHARS[(CHARS.indexOf(missChar(m)) + 1) % CHARS.length];
        S.miss[id] = { ...(S.miss[id] || {}), char: nx }; sfx.nav(); commit(); break;
      }
      case 'bulk': {
        const ch = CHAPTERS.find((c) => c.key === el.dataset.key);
        const mains = ch.items.filter((m) => m.type === 'Main');
        if (!confirm(`Mark all ${mains.length} main missions in this chapter as Completed?`)) return;
        mains.forEach((m) => (S.miss[m.id] = { ...(S.miss[m.id] || {}), status: 'Completed' }));
        banner('Chapter Complete', ch.title || 'Prologue'); commit(); break;
      }
      case 'toggleHide': ui.hideDoneColl = !ui.hideDoneColl; sfx.nav(); render(0); break;
      case 'trophy': {
        const t = TL.find((x) => x.id === id); if (!t || trophyAuto(t)) return;
        S.known[id] = !trophyManual(t);
        if (!S.known[id]) sfx.down();
        commit(); break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify({ app: 'leonida-tracker', version: 1, savedAt: new Date().toISOString(), state: S }, null, 2)], { type: 'application/json' });
        const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `leonida-tracker-${new Date().toISOString().slice(0, 10)}.json`; a2.click();
        setTimeout(() => URL.revokeObjectURL(a2.href), 1000); break;
      }
      case 'import': $('#importFile').click(); break;
      case 'reset': if (confirm('Reset ALL progress? This cannot be undone (export a backup first).')) { const sfxOn = S.sfx; S = blank(); S.sfx = sfxOn; commit(); } break;
    }
  }

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'importFile' && t.files[0]) {
      t.files[0].text().then((txt) => {
        try { const j = JSON.parse(txt); S = Object.assign(blank(), j.state || j); earnedSet = earnedNow(); commit(); banner('Save Loaded', 'Welcome back'); }
        catch { alert('That file is not a valid tracker backup.'); }
      });
      return;
    }
    const k = t.dataset.in, id = t.dataset.id;
    if (k === 'check') { setCheck(+id, +t.value || 0); commit(); }
    if (k === 'coll') { setColl(id, +t.value || 0); commit(); }
    if (k === 'reg') { S.reg[id] = +t.value; save(); render(0); }
  });

  document.addEventListener('input', (e) => {
    const t = e.target, k = t.dataset.in;
    if (k === 'reg') {
      const v = +t.value, id = t.dataset.id;
      t.style.setProperty('--v', v);
      const lbl = $(`[data-rl="${CSS.escape(id)}"]`), pl = $(`[data-pl="${CSS.escape(id)}"]`), reg = $(`.region[data-region="${CSS.escape(id)}"]`);
      if (lbl) lbl.textContent = v + '%';
      if (pl) pl.textContent = v + '%';
      if (reg) reg.setAttribute('fill-opacity', (.12 + v / 100 * .78).toFixed(3));
    }
    if (k === 'search') {
      ui.storySearch = t.value;
      const pos = t.selectionStart; render(0);
      const s = $('[data-in="search"]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    }
  });

  // Map <-> region card highlight
  document.addEventListener('mouseover', (e) => {
    const r = e.target.closest('[data-region]');
    $$('[data-region].hl').forEach((n) => { if (!r || n.dataset.region !== r.dataset.region) n.classList.remove('hl'); });
    if (r) $$(`[data-region="${CSS.escape(r.dataset.region)}"]`).forEach((n) => n.classList.add('hl'));
  });
  document.addEventListener('click', (e) => {
    const p = e.target.closest('path.region');
    if (p) { const card = $(`.region-row[data-region="${CSS.escape(p.dataset.region)}"]`); card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); card?.querySelector('input')?.focus(); }
  });

  // Keyboard: game-menu style navigation
  document.addEventListener('keydown', (e) => {
    const intro = $('#intro');
    if (!intro.hidden && !intro.classList.contains('leaving')) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } return; }
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const idx = TABS.findIndex((t) => t.id === cur);
    if (e.key === 'q' || e.key === 'Q') go(TABS[(idx - 1 + TABS.length) % TABS.length].id);
    else if (e.key === 'e' || e.key === 'E') go(TABS[(idx + 1) % TABS.length].id);
    else if (/^[1-8]$/.test(e.key)) go(TABS[+e.key - 1].id);
    else if (e.key === 'Escape') showIntro();
    else if (cur === 'checklist' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const vis = $$('.mrow', view).map((r) => +r.dataset.id), i = vis.indexOf(ui.selCheck);
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        ui.selCheck = vis[clamp((i < 0 ? 0 : i) + (e.key === 'ArrowDown' ? 1 : -1), 0, vis.length - 1)]; sfx.nav(); render(0);
        $('.mrow.sel', view)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        const it = CL.find((x) => x.id === ui.selCheck);
        if (it && !it.auto) { setCheck(it.id, checkDone(it) + (e.key === 'ArrowRight' ? 1 : -1) * (isMoney(it) ? 5000 : 1)); commit(); }
      }
    } else if (e.key === 'Enter' && e.target.matches('[data-act="selLine"], [data-act="known"]')) { e.target.click(); }
  });

  $('#prevTab').addEventListener('click', () => go(TABS[(TABS.findIndex((t) => t.id === cur) - 1 + TABS.length) % TABS.length].id));
  $('#nextTab').addEventListener('click', () => go(TABS[(TABS.findIndex((t) => t.id === cur) + 1) % TABS.length].id));
  const sfxBtn = $('#sfxBtn');
  const syncSfx = () => sfxBtn.setAttribute('aria-pressed', String(!!S.sfx));
  sfxBtn.addEventListener('click', () => { S.sfx = !S.sfx; save(); syncSfx(); sfx.nav(); });
  syncSfx();

  /* ---------------- Intro ---------------- */
  function showIntro() {
    const intro = $('#intro');
    intro.hidden = false; intro.classList.remove('leaving');
    $('#app').setAttribute('aria-hidden', 'true');
    tween($('#introPct'), 0, overall(), fmtPct, 1400);
  }
  function start() {
    const intro = $('#intro');
    intro.classList.add('leaving');
    sfx.win();
    try { sessionStorage.setItem('leonida-started', '1'); } catch { /* ignore */ }
    const app = $('#app');
    const firstTime = app.hidden;
    app.hidden = false; app.removeAttribute('aria-hidden');
    if (firstTime) route(); else render(1);
    setTimeout(() => { intro.hidden = true; }, 850);
    view.focus({ preventScroll: true });
  }
  $('#startBtn').addEventListener('click', start);

  let started = false;
  try { started = sessionStorage.getItem('leonida-started') === '1'; } catch { /* ignore */ }
  if (started) { $('#intro').hidden = true; $('#app').hidden = false; route(); }
  else showIntro();
  document.fonts?.ready.then(moveInk);
})();
