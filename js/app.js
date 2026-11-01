/* ===== Book Mafi — общая логика ===== */
const BOT_TOKEN = "9124482530:AAGkGyeahI_m6hkLlF1Cj-p6MPY3MMSEQys";
const CHAT_ID = "5249728466";
/* Через сколько часов после оформления заказ переходит на следующий этап:
   [принят, собирают, у курьера, доставлен] */
const STAGE_HOURS = [0, 1, 6, 48];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('bm_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bm_' + k, JSON.stringify(v)); } catch (e) {} }
};
const state = { lang: store.get('lang', 'ru'), theme: store.get('theme', 'dark') };
const page = document.body.dataset.page;
const t = k => (I18N[state.lang] && I18N[state.lang][k]) || I18N.en[k] || k;
const money = n => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ' + t('cur');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bookById = id => BOOKS.find(b => b.id === id);

/* --- данные пользователя --- */
const getCart = () => store.get('cart', []);
const getFavs = () => store.get('favs', []);
const getOrders = () => store.get('orders', []);
const getUser = () => store.get('user', {});
const cartCount = () => getCart().reduce((a, i) => a + i.qty, 0);

/* --- тема --- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  store.set('theme', state.theme);
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

/* --- переходы между страницами --- */
function buildCurtain() {
  const c = document.createElement('div');
  c.className = 'curtain start';
  c.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  document.body.appendChild(c);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    c.classList.remove('start'); c.classList.add('out');
    setTimeout(() => c.classList.remove('out'), 1100);
  }));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) return;
    e.preventDefault();
    c.classList.remove('out'); c.classList.add('in');
    setTimeout(() => { location.href = href; }, 750);
  });
  window.addEventListener('pageshow', ev => { if (ev.persisted) { c.className = 'curtain'; } });
}

/* --- загрузочный экран (один раз за сессию, на главной — всегда при заходе) --- */
function buildBoot() {
  const first = !sessionStorage.getItem('bm_booted');
  if (!first) return { done() {} };
  sessionStorage.setItem('bm_booted', '1');
  const b = document.createElement('div');
  b.className = 'boot';
  b.innerHTML = '<div class="book3d"><i></i><i></i><i></i></div><div class="boot-logo">Book <b>Mafi</b></div><div class="boot-bar"><span></span></div><p data-i18n="loading"></p>';
  document.body.appendChild(b);
  document.body.style.overflow = 'hidden';
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    setTimeout(() => { b.classList.add('done'); document.body.style.overflow = ''; setTimeout(() => b.remove(), 1000); }, 350);
  };
  setTimeout(finish, 2600); // не дольше 2.6 сек
  return { done() { setTimeout(finish, 1500); } };
}

/* --- шапка и подвал --- */
function buildChrome() {
  const links = [['index.html', 'nav_home', 'home'], ['catalog.html', 'nav_catalog', 'catalog'], ['favorites.html', 'nav_fav', 'favorites'], ['cart.html', 'nav_cart', 'cart'], ['profile.html', 'nav_profile', 'profile']];
  const h = document.createElement('header');
  h.className = 'top';
  h.innerHTML = `
    <a class="brand" href="index.html">Book <span>Mafi</span></a>
    <nav class="links" id="nav">
      ${links.map(l => `<a href="${l[0]}" class="${l[2] === page ? 'active' : ''}"><span data-i18n="${l[1]}"></span>${l[2] === 'favorites' ? '<em class="badge" id="fav-badge">0</em>' : ''}${l[2] === 'cart' ? '<em class="badge" id="cart-badge">0</em>' : ''}</a>`).join('')}
    </nav>
    <div class="tools">
      <div class="lang">${['ru', 'uz', 'en'].map(l => `<button data-lang="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      <button class="theme-btn" id="theme-btn" aria-label="theme">
        <svg class="moon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <button class="burger" id="burger" aria-label="menu">☰</button>
    </div>`;
  document.body.prepend(h);
  const tw = document.createElement('div'); tw.className = 'toasts'; tw.id = 'toasts'; document.body.appendChild(tw);
  if (page !== 'home') {
    const f = document.createElement('footer'); f.className = 'foot';
    f.innerHTML = '<b>Book Mafi</b> · <span data-i18n="footer"></span> · 2026';
    document.body.appendChild(f);
  }
  $('#theme-btn').onclick = toggleTheme;
  $('#burger').onclick = () => $('#nav').classList.toggle('open');
  $$('.lang button').forEach(b => b.onclick = () => setLang(b.dataset.lang));
}

function setLang(l) {
  state.lang = l; store.set('lang', l);
  document.documentElement.lang = l === 'uz' ? 'uz' : l;
  applyI18n();
  if (window.pageRender) window.pageRender();
}
function applyI18n() {
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  updateBadges();
}
function updateBadges(bump) {
  const cb = $('#cart-badge'), fb = $('#fav-badge');
  if (cb) { cb.textContent = cartCount(); cb.style.display = cartCount() ? '' : 'none'; if (bump === 'cart') { cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); } }
  if (fb) { fb.textContent = getFavs().length; fb.style.display = getFavs().length ? '' : 'none'; if (bump === 'fav') { fb.classList.remove('bump'); void fb.offsetWidth; fb.classList.add('bump'); } }
}
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3000);
}

/* --- появление при скролле --- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } }), { threshold: .08 }) : null;
function observeReveals(root = document) {
  $$('.reveal:not(.show)', root).forEach((el, i) => { if (io) { el.style.transitionDelay = (i % 8) * 60 + 'ms'; io.observe(el); } else el.classList.add('show'); });
}

/* --- обложка и карточка книги --- */
const genreName = g => t('g_' + g);
const coverHTML = b => `<div class="cover" style="--h:${b.hue}"><div class="c-top">${esc(genreName(b.genre))}</div><div class="c-title">${esc(b.title)}</div><div class="c-author">${esc(b.author)}</div></div>`;
const heartSVG = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.8 6.2 4.8c2 0 3.5 1.1 4.3 2.5L12 9l1.5-1.7c.8-1.4 2.3-2.5 4.3-2.5 3.5 0 5.3 3.6 3.8 7C19.500 16.400 12 21 12 21z"/></svg>';
function cardHTML(b) {
  const fav = getFavs().includes(b.id), inCart = getCart().some(i => i.id === b.id);
  return `<article class="card reveal" data-id="${b.id}">
    <button class="heart ${fav ? 'on' : ''}" data-fav="${b.id}" aria-label="like">${heartSVG}</button>
    ${coverHTML(b)}
    <h3>${esc(b.title)}</h3><div class="au">${esc(b.author)}</div>
    <div class="ds">${esc(b.desc[state.lang])}</div>
    <div class="row"><div class="price">${money(b.price)}</div><button class="btn sm" data-add="${b.id}">${inCart ? '✓ ' + t('in_cart') : t('add')}</button></div>
  </article>`;
}

/* --- действия: корзина, избранное --- */
function addToCart(id) {
  const cart = getCart(), it = cart.find(i => i.id === id);
  if (it) it.qty++; else cart.push({ id, qty: 1 });
  store.set('cart', cart); updateBadges('cart'); toast('🛒 ' + t('added'));
}
function toggleFav(id, btn, ev) {
  let f = getFavs();
  if (f.includes(id)) { f = f.filter(x => x !== id); toast('💔 ' + t('fav_removed')); }
  else { f.push(id); toast('❤ ' + t('fav_added')); heartBurst(ev, btn); }
  store.set('favs', f); updateBadges('fav');
  if (btn) { btn.classList.toggle('on', f.includes(id)); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
}
function heartBurst(ev, btn) {
  const r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span'); s.className = 'burst'; s.textContent = ['❤', '💖', '✨', '📖'][i % 4];
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${(Math.random() - .5) * 120}deg`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
}
/* делегирование кликов по карточкам (каталог и избранное) */
function bindCards(root, rerender) {
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]'), a = e.target.closest('[data-add]');
    if (f) { e.stopPropagation(); toggleFav(+f.dataset.fav, f, e); if (page === 'favorites') setTimeout(rerender, 450); return; }
    if (a) { e.stopPropagation(); addToCart(+a.dataset.add); a.textContent = '✓ ' + t('in_cart'); return; }
    const c = e.target.closest('.card'); if (c) openBook(+c.dataset.id);
  });
  root.addEventListener('pointermove', e => {
    const c = e.target.closest('.card'); if (!c || e.pointerType === 'touch') return;
    if (e.target.closest('button')) { c.style.transform = ''; return; } /* над кнопками карточка не наклоняется — клики всегда точные */
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  });
  root.addEventListener('pointerout', e => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
}

/* --- модальное окно с книгой --- */
function ensureModal() {
  if ($('#modal')) return;
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal';
  m.innerHTML = '<div class="modal-box" id="modal-box"></div>';
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) closeBook(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBook(); });
}
let openedId = null;
function openBook(id) {
  ensureModal(); openedId = id;
  const b = bookById(id), fav = getFavs().includes(id);
  $('#modal-box').innerHTML = `<button class="x" onclick="closeBook()" aria-label="${t('close')}">×</button>
    <div>${coverHTML(b)}</div>
    <div><h2>${esc(b.title)}</h2><div style="color:var(--muted);margin-top:6px">${esc(b.author)}</div>
      <div class="meta"><span class="pill">${esc(genreName(b.genre))}</span><span class="pill">★ ${b.rating}</span><span class="pill">${b.pages} ${t('pages')}</span></div>
      <p>${esc(b.desc[state.lang])}</p>
      <div class="price" style="font-size:1.8rem;margin-bottom:18px">${money(b.price)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="m-add">🛒 ${t('add')}</button><button class="btn ghost" id="m-fav">${fav ? '❤' : '♡'}</button></div></div>`;
  $('#m-add').onclick = () => { addToCart(id); closeBook(); if (window.pageRender) window.pageRender(); };
  $('#m-fav').onclick = e => { toggleFav(id, e.currentTarget, e); e.currentTarget.textContent = getFavs().includes(id) ? '❤' : '♡'; if (window.pageRender && page !== 'favorites') window.pageRender(); };
  requestAnimationFrame(() => $('#modal').classList.add('open'));
}
function closeBook() { const m = $('#modal'); if (m) m.classList.remove('open'); if (page === 'favorites' && window.pageRender) setTimeout(window.pageRender, 300); }

/* ===== КАТАЛОГ ===== */
function initCatalog() {
  const f = { q: '', g: 'all', sort: 'def' };
  const chips = $('#chips');
  const draw = () => {
    chips.innerHTML = ['all', ...GENRES].map(g => `<button class="chip ${f.g === g ? 'on' : ''}" data-g="${g}">${t('g_' + g)}</button>`).join('');
    const sel = $('#sort'); const cur = sel.value || 'def';
    sel.innerHTML = [['def', 'sort_def'], ['asc', 'sort_asc'], ['desc', 'sort_desc'], ['az', 'sort_az']].map(o => `<option value="${o[0]}">${t(o[1])}</option>`).join(''); sel.value = cur;
    let list = BOOKS.filter(b => (f.g === 'all' || b.genre === f.g) && (b.title + ' ' + b.author).toLowerCase().includes(f.q.toLowerCase()));
    if (f.sort === 'asc') list.sort((a, b) => a.price - b.price);
    if (f.sort === 'desc') list.sort((a, b) => b.price - a.price);
    if (f.sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    $('#count').innerHTML = `${t('found')} <b>${list.length}</b>`;
    $('#grid').innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>${t('nothing')}</div>`;
    observeReveals($('#grid'));
  };
  chips.addEventListener('click', e => { const c = e.target.closest('[data-g]'); if (c) { f.g = c.dataset.g; draw(); } });
  $('#q').addEventListener('input', e => { f.q = e.target.value; draw(); });
  $('#sort').addEventListener('change', e => { f.sort = e.target.value; draw(); });
  bindCards($('#grid'), draw);
  window.pageRender = draw; draw();
}

/* ===== ИЗБРАННОЕ ===== */
function initFavorites() {
  const draw = () => {
    const list = getFavs().map(bookById).filter(Boolean);
    $('#count').innerHTML = `${t('fav_count')} <b>${list.length}</b>`;
    $('#grid').innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><div class="big">💝</div><p>${t('fav_empty')}</p><a class="btn" href="catalog.html">${t('fav_to_cat')}</a></div>`;
    observeReveals($('#grid'));
  };
  bindCards($('#grid'), draw);
  window.pageRender = draw; draw();
}

/* ===== КОРЗИНА ===== */
function initCart() {
  const draw = () => {
    const cart = getCart().filter(i => bookById(i.id));
    const list = $('#cart-list');
    if (!cart.length) {
      list.innerHTML = `<div class="empty"><div class="big">🛒</div><p>${t('cart_empty')}</p><a class="btn" href="catalog.html">${t('fav_to_cat')}</a></div>`;
    } else {
      list.innerHTML = cart.map(i => { const b = bookById(i.id); return `<div class="item" data-id="${b.id}">
        ${coverHTML(b)}
        <div><h3>${esc(b.title)}</h3><div class="au">${esc(b.author)}</div>
          <div class="qty"><button data-q="-1">−</button><b>${i.qty}</b><button data-q="1">+</button></div></div>
        <div class="side"><div class="price">${money(b.price * i.qty)}</div><button class="rm" data-rm="1">${t('remove')}</button></div></div>`; }).join('');
    }
    const total = cart.reduce((a, i) => a + bookById(i.id).price * i.qty, 0), n = cart.reduce((a, i) => a + i.qty, 0);
    $('#sum-items').textContent = n; $('#sum-total').textContent = money(total);
    $('#sum-del').textContent = t('free');
    const u = getUser();
    if (!$('#o-name').value) $('#o-name').value = u.name || '';
    if (!$('#o-phone').value) $('#o-phone').value = u.phone || '';
    if (!$('#o-addr').value) $('#o-addr').value = u.address || '';
    updateBadges();
  };
  $('#cart-list').addEventListener('click', e => {
    const item = e.target.closest('.item'); if (!item) return;
    const id = +item.dataset.id; let cart = getCart();
    const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
    if (q) { const it = cart.find(i => i.id === id); it.qty += +q.dataset.q; if (it.qty <= 0) cart = cart.filter(i => i.id !== id); store.set('cart', cart); draw(); }
    if (rm) { item.classList.add('out'); setTimeout(() => { store.set('cart', cart.filter(i => i.id !== id)); draw(); }, 380); }
  });
  $('#order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const cart = getCart().filter(i => bookById(i.id));
    if (!cart.length) { toast(t('order_empty')); return; }
    const user = { name: $('#o-name').value.trim(), phone: $('#o-phone').value.trim(), address: $('#o-addr').value.trim() };
    store.set('user', user);
    const total = cart.reduce((a, i) => a + bookById(i.id).price * i.qty, 0);
    const order = { id: Date.now().toString().slice(-6), ts: Date.now(), items: cart, total, ...user };
    const orders = getOrders(); orders.unshift(order); store.set('orders', orders);
    const lines = cart.map(i => { const b = bookById(i.id); return `• ${esc(b.title)} — ${i.qty} шт. × ${b.price.toLocaleString('ru-RU')} = ${(b.price * i.qty).toLocaleString('ru-RU')} UZS`; }).join('\n');
    const text = `📚 <b>Новый заказ в Book Mafi #${order.id}</b>\n\n👤 <b>Покупатель:</b> ${esc(user.name)}\n📞 <b>Телефон:</b> ${esc(user.phone)}\n📍 <b>Адрес:</b> ${esc(user.address)}\n\n🛒 <b>Книги:</b>\n${lines}\n\n💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} UZS`;
    store.set('cart', []); draw();
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }) });
      toast(r.ok ? '✅ ' + t('order_ok') : '⚠ ' + t('order_tg_err'));
    } catch (err) { toast('⚠ ' + t('order_tg_err')); }
    setTimeout(() => { document.querySelector('.curtain').classList.add('in'); setTimeout(() => location.href = 'profile.html', 750); }, 1800);
  });
  window.pageRender = draw; draw();
}

/* ===== ПРОФИЛЬ ===== */
function orderStage(o) {
  const h = (Date.now() - o.ts) / 36e5; let s = 0;
  STAGE_HOURS.forEach((x, i) => { if (h >= x) s = i; });
  return s;
}
function fmtDate(ts) {
  const loc = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-GB' }[state.lang];
  try { return new Date(ts).toLocaleString(loc, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(ts).toLocaleString(); }
}
function initProfile() {
  const draw = () => {
    const u = getUser(), orders = getOrders();
    $('#p-name').value = u.name || ''; $('#p-phone').value = u.phone || ''; $('#p-addr').value = u.address || '';
    $('#avatar').textContent = (u.name || 'B').trim()[0].toUpperCase();
    $('#st-orders').textContent = orders.length; $('#st-fav').textContent = getFavs().length; $('#st-cart').textContent = cartCount();
    const box = $('#orders');
    if (!orders.length) { box.innerHTML = `<div class="empty"><div class="big">📦</div><p>${t('no_orders')}</p><a class="btn" href="catalog.html">${t('fav_to_cat')}</a></div>`; return; }
    box.innerHTML = orders.map(o => {
      const s = orderStage(o), names = o.items.map(i => { const b = bookById(i.id); return b ? `${b.title}${i.qty > 1 ? ' ×' + i.qty : ''}` : ''; }).join(', ');
      const icons = ['📝', '📦', '🚚', '🏠'];
      const tl = [0, 1, 2, 3].map(i => `<div class="tl ${i < s ? 'done' : ''} ${i === s ? 'done cur' : ''}"><div class="dot">${i <= s ? icons[i] : ''}</div>${t('st' + (i + 1))}<small>${i <= s ? fmtDate(o.ts + STAGE_HOURS[i] * 36e5) : ''}</small></div>`).join('');
      const pct = [0, 33.3, 66.6, 100][s] * .75;
      const eta = s === 3 ? `${t('delivered_on')}: <b>${fmtDate(o.ts + STAGE_HOURS[3] * 36e5)}</b>` : `${t('eta')}: <b>${fmtDate(o.ts + STAGE_HOURS[3] * 36e5)}</b>`;
      return `<div class="order"><div class="order-head"><h4>${t('order_no')}${o.id}</h4><b class="price">${money(o.total)}</b></div>
        <div class="order-books">${esc(names)}</div><div class="order-books">${t('from')} ${fmtDate(o.ts)}</div>
        <span class="now">● ${t('now_status')}: ${t('st' + (s + 1))}</span>
        <div class="timeline"><div class="fill" data-w="${pct}%"></div>${tl}</div><div class="eta">🚚 ${eta}</div></div>`;
    }).join('');
    setTimeout(() => $$('.fill').forEach(f => f.style.width = f.dataset.w), 80);
  };
  $('#profile-form').addEventListener('submit', e => {
    e.preventDefault();
    store.set('user', { name: $('#p-name').value.trim(), phone: $('#p-phone').value.trim(), address: $('#p-addr').value.trim() });
    toast('✅ ' + t('saved')); draw();
  });
  window.pageRender = draw; draw();
}

/* ===== ГЛАВНАЯ: скролл-видео + резкие склейки ===== */
function initHome(boot) {
  const video = $('#src'), canvas = $('#scene-canvas'), ctx = canvas.getContext('2d', { alpha: false });
  const stage = $('.stage'), track = $('.scroll-track');
  const VID_END = 0.43;                         // доля скролла, на которой видео заканчивается
  const panels = $$('.panel').map(p => ({ el: p, a: +p.dataset.from, b: +p.dataset.to }));
  const scenes = $$('.scene').map(s => ({ el: s, at: +s.dataset.at, on: false }));
  const flash = $('.flash'), intro = $('.hero-intro'), hint = $('.hint'), bar = $('.progress');
  let ready = false, target = 0, cur = 0, lastDrawn = -1, frac = 0;

  /* декор сцен */
  $('.hearts').innerHTML = Array.from({ length: 16 }, (_, i) => `<span style="left:${(i * 6.4 + Math.random() * 4) % 100}%;animation-delay:${-Math.random() * 7}s;font-size:${1.2 + Math.random() * 2}rem">${['❤', '💖', '💜'][i % 3]}</span>`).join('');

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; draw(true);
  };
  function draw(force) {
    if (!ready || !video.videoWidth) return;
    if (!force && Math.abs(video.currentTime - lastDrawn) < 0.0005) return;
    const cw = canvas.width, ch = canvas.height, vw = video.videoWidth, vh = video.videoHeight;
    const sc = Math.max(cw / vw, ch / vh), nw = vw * sc, nh = vh * sc;
    ctx.drawImage(video, (cw - nw) / 2, (ch - nh) / 2, nw, nh); lastDrawn = video.currentTime;
  }
  const fraction = () => { const m = track.offsetHeight - innerHeight; return m > 0 ? Math.min(Math.max(scrollY / m, 0), 1) : 0; };

  function update() {
    frac = fraction();
    bar.style.width = (frac * 100) + '%';
    if (video.duration) target = Math.min(frac / VID_END, 1) * (video.duration - 0.04);
    stage.classList.toggle('after-video', frac > VID_END + 0.02);
    intro.classList.toggle('gone', frac > 0.04); hint.classList.toggle('gone', frac > 0.04);
    panels.forEach(p => p.el.classList.toggle('show', frac >= p.a && frac < p.b));
    scenes.forEach((s, i) => {
      const on = frac >= s.at;
      if (on !== s.on) { s.on = on; s.el.classList.toggle('on', on); if (on) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); } }
    });
  }
  function loop() {
    if (ready && video.duration) {
      cur += (target - cur) * 0.14;
      if (Math.abs(cur - target) < 0.003) cur = target;
      if (Math.abs(cur - video.currentTime) > 0.004) video.currentTime = cur;
    }
    requestAnimationFrame(loop);
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => { resize(); update(); });
  video.addEventListener('seeked', () => draw());
  const start = () => {
    if (ready) return; ready = true; resize(); update(); cur = target; video.currentTime = target; draw(true);
    boot.done(); requestAnimationFrame(loop);
  };
  video.addEventListener('error', () => { canvas.style.display = 'none'; boot.done(); update(); }, true); /* если браузер не смог открыть видео — остаётся градиентный фон, сцены работают */
  video.addEventListener('loadeddata', start);
  if (video.readyState >= 2) start();
  setTimeout(() => { if (!ready) boot.done(); }, 3500);
  video.load();
  update();
  window.pageRender = () => {};
}

/* ===== СТАРТ ===== */
(function () {
  applyTheme();
  document.documentElement.lang = state.lang;
  const boot = page === 'home' ? buildBoot() : (buildBoot(), { done() {} });
  buildChrome();
  buildCurtain();
  applyI18n();
  const init = { home: () => initHome(boot), catalog: initCatalog, favorites: initFavorites, cart: initCart, profile: initProfile }[page];
  if (init) init();
  observeReveals();
  updateBadges();
  window.addEventListener('storage', () => { updateBadges(); });
})();
