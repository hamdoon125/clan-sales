/* Clan Agency — بوابة السيلز */
'use strict';

// الموقع ما يشتغلش جوه موقع تاني (حماية من خداع المستخدمين بصفحة مزيفة فوقه)
if (window.top !== window.self) {
  document.documentElement.innerHTML = '';
  try { window.top.location = window.self.location.href; } catch (e) {}
  throw new Error('framed');
}

const C = window.CLAN_CONFIG;
const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

const GOVS = ['القاهرة','الجيزة','الإسكندرية','القليوبية','الشرقية','الدقهلية','الغربية','المنوفية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء','برة مصر'];
const EXPS = ['مفيش خبرة','أقل من سنة','سنة لـ سنتين','3 لـ 5 سنين','أكتر من 5 سنين'];
const METHODS = ['إنستاباي','فودافون كاش'];
const KINDS = { script: 'سكريبتات', reply: 'ردود جاهزة', story: 'ستوري', tip: 'نصايح' };          // بتظهر في «المحتوى»
const GUIDE_KINDS = { guide: 'الدليل: ابدأ إزاي', first: 'الدليل: أول عميل', faq: 'الدليل: سؤال شائع' }; // بتظهر في «الدليل»
const ALL_KINDS = Object.assign({}, KINDS, GUIDE_KINDS);
const ROLES = { marketer: 'مسوق', employee: 'موظف', admin: 'أدمن', super_admin: 'سوبر أدمن' };
const STAFF = ['employee', 'admin', 'super_admin'];
const ADMINS = ['admin', 'super_admin'];
const SUPER = ['super_admin'];
const MIN_PW = 8;
// نسخة الشروط: لو عدّلت نص الشروط غيّر التاريخ ده، وكل المسوقين هيتطلب منهم يوافقوا تاني
const TERMS_VERSION = '2026-11-22';
const ACTIONS = {
  accept_terms: 'وافق على الشروط', lead_link: 'عميل سجّل من رابط إحالة', lead_call: 'سجّل عميل اتصل بكود مسوق',
  add_sale: 'سجّل بيعة', cancel_sale: 'لغى بيعة', payout: 'سجّل تحويل', block: 'وقّف حساب', unblock: 'فعّل حساب',
  reset_password: 'غيّر باسورد', set_role: 'غيّر صلاحية', set_manager: 'نقل موظف لأدمن', fire: 'رفد', setting: 'غيّر إعداد',
  content_add: 'أضاف محتوى', content_edit: 'عدّل محتوى', content_delete: 'مسح محتوى', news_add: 'نشر خبر', news_edit: 'عدّل خبر',
  news_pin: 'ثبّت خبر', news_unpin: 'شال تثبيت خبر', news_delete: 'مسح خبر', export: 'صدّر بيانات', update_payout_info: 'غيّر رقم التحويل', verify_payout: 'أكّد رقم تحويل', backup: 'نزّل نسخة احتياطية',
  lead_add: 'سجّل عميل جديد', lead_assign: 'وزّع طلب', lead_status: 'غيّر حالة طلب'
};
const isStaff = () => ME && STAFF.includes(ME.role);
const isAdmin = () => ME && ADMINS.includes(ME.role);
const isSuper = () => ME && ME.role === 'super_admin';

const main = document.getElementById('main');
const navEl = document.getElementById('nav');
let ME = null;          // نتيجة my_summary
let SERVICES = [];
let PREFILL = null;     // تمرير كود من صفحة لصفحة في الإدارة
let JUST_JOINED = null; // بعد التسجيل مباشرة

/* ---------------- مساعدات ---------------- */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' جنيه';
const num = n => Number(n || 0).toLocaleString('en-US');
const opts = (arr, sel) => arr.map(v => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const digits = s => String(s == null ? '' : s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
function normPhone(v) {
  let p = digits(v).replace(/\D/g, '');
  if (p.startsWith('0020')) p = '0' + p.slice(4);
  else if (p.length === 12 && p.startsWith('20')) p = '0' + p.slice(2);
  else if (p.length === 10 && p.startsWith('1')) p = '0' + p;
  return p;
}
const phoneEmail = p => `${normPhone(p)}@${C.EMAIL_DOMAIN}`;
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: '2-digit', year: 'numeric' });
const fdate = d => d ? dateFmt.format(new Date(d)) : '';
const dtFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const fdatetime = d => d ? dtFmt.format(new Date(d)).replace(/\s?am$/i, ' ص').replace(/\s?pm$/i, ' م') : '';
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800);
}
async function busy(btn, label, fn) {
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}
function showErr(box, msg) { if (!box) return; box.textContent = msg || ''; box.hidden = !msg; }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('اتنسخ ✓'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('اتنسخ ✓'); } catch (e2) { toast('ما قدرناش ننسخ، انسخه بإيدك'); }
    ta.remove();
  }
}
function errMsg(e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  if (/Invalid login credentials/i.test(m)) return 'رقم الموبايل أو الباسورد غلط';
  if (/already registered|already been registered/i.test(m)) return 'الرقم ده متسجل قبل كده. ادخل من «دخول»';
  if (/Password should be at least|weak password/i.test(m)) return `الباسورد ضعيف. لازم ${MIN_PW} حروف أو أرقام على الأقل`;
  if (/Database error saving new user/i.test(m)) return 'في مشكلة في بياناتك. راجع الاسم ورقم الموبايل وجرّب تاني';
  if (/rate limit|too many/i.test(m)) return 'محاولات كتير ورا بعض. استنى دقيقة وجرّب تاني';
  if (/captcha/i.test(m)) return 'التحقق إنك مش روبوت ما نجحش. استنى العلامة ✓ وجرّب تاني';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'في مشكلة في النت. اتأكد إنك متصل وجرّب تاني';
  if (/FORBIDDEN/.test(m)) return 'مش مسموحلك تعمل ده';
  if (/leads_phone_open_uq|duplicate key/i.test(m)) return 'رقم العميل ده متسجل في طلب تاني مفتوح';
  if (/JWT|session/i.test(m)) return 'الجلسة خلصت. ادخل تاني';
  return m || 'حصلت مشكلة، جرّب تاني';
}
async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args || {});
  if (error) throw errMsg(error);
  return data;
}
async function q(promise) {
  const { data, error } = await promise;
  if (error) throw errMsg(error);
  return data;
}
function pill(s) {
  const map = { confirmed: ['ok', 'مؤكدة'], cancelled: ['no', 'ملغية'], active: ['ok', 'نشط'], blocked: ['no', 'موقوف'] };
  const [c, t] = map[s] || ['mid', s];
  return `<span class="pill ${c}">${esc(t)}</span>`;
}
function view(html) { main.innerHTML = html; window.scrollTo(0, 0); return main; }

// زرار العين 👁 لإظهار/إخفاء الباسورد: بيتضاف لوحده لأي خانة باسورد في أي صفحة.
// مخفي افتراضيًا، وبيحافظ على المكتوب ومكان المؤشر. (تحسين شكل بس، مالوش علاقة بالدخول أو الحماية)
const EYE_SHOW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_HIDE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function addPasswordEyes(root) {
  root.querySelectorAll('input[type="password"]:not([data-eye])').forEach(inp => {
    inp.dataset.eye = '1';
    const wrap = document.createElement('span');
    wrap.className = 'pw-wrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-eye';
    const paint = shown => {
      btn.innerHTML = shown ? EYE_HIDE : EYE_SHOW;
      btn.setAttribute('aria-label', shown ? 'إخفاء الباسورد' : 'إظهار الباسورد');
      btn.title = shown ? 'إخفاء الباسورد' : 'إظهار الباسورد';
      btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
    };
    paint(false);
    btn.addEventListener('mousedown', e => e.preventDefault()); // ما يشيلش الفوكس من الخانة
    btn.addEventListener('click', () => {
      const shown = inp.type === 'password';
      const s = inp.selectionStart, e = inp.selectionEnd, focused = document.activeElement === inp;
      inp.type = shown ? 'text' : 'password';
      paint(shown);
      if (focused) { try { inp.setSelectionRange(s, e); } catch (x) {} }
    });
    wrap.appendChild(btn);
  });
}
new MutationObserver(() => addPasswordEyes(document)).observe(document.body, { childList: true, subtree: true });
function loading() { view('<div class="card"><p class="empty">جاري التحميل…</p></div>'); }
function failed(m) {
  view(`<div class="card"><p class="err">${esc(m)}</p><button class="btn ghost sm" id="retry">جرّب تاني</button></div>`);
  $('#retry').addEventListener('click', () => route());
}
function twoStep(btn, label) {
  if (btn.dataset.sure) return true;
  btn.dataset.sure = '1'; const old = btn.textContent; btn.textContent = label || 'متأكد؟ اضغط تاني';
  setTimeout(() => { delete btn.dataset.sure; btn.textContent = old; }, 4000);
  return false;
}
function ytEmbed(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

/* ---------------- التوجيه ---------------- */
const ROUTES = {
  login:        { page: loginPage,     who: 'guest' },
  signup:       { page: signupPage,    who: 'guest' },
  guide:        { page: guidePage,     who: 'any',   nav: 'الدليل' },
  terms:        { page: termsPage,     who: 'any' },
  home:         { page: homePage,      who: ['marketer'],  nav: 'الرئيسية' },
  sales:        { page: salesPage,     who: ['marketer'],  nav: 'بيعاتي' },
  leads:        { page: leadsPage,     who: ['marketer'],  nav: 'عملائي' },
  library:      { page: libraryPage,   who: 'user',        nav: 'المحتوى' },
  leaders:      { page: leadersPage,   who: ['marketer'],  nav: 'الترتيب' },
  news:         { page: newsPage,      who: 'user',        nav: 'الأخبار' },
  account:      { page: accountPage,   who: 'user',        nav: 'حسابي' },
  'a-dash':     { page: aDashPage,     who: ADMINS, nav: 'الملخص' },
  'a-leads':    { page: aLeadsPage,    who: STAFF,  nav: 'الطلبات' },
  'a-sale':     { page: aSalePage,     who: STAFF,  nav: 'بيعة جديدة' },
  'a-data':     { page: aDataPage,     who: STAFF,  nav: 'الاستعلام' },
  'a-pay':      { page: aPayPage,      who: ADMINS, nav: 'تحويل' },
  'a-mk':       { page: aMkPage,       who: ADMINS, nav: 'المسوقين' },
  'a-team':     { page: aTeamPage,     who: STAFF,  nav: 'الفريق' },
  'a-log':      { page: aLogPage,      who: STAFF,  nav: 'سجل العمليات' },
  'a-content':  { page: aContentPage,  who: ADMINS, nav: 'إدارة المحتوى' },
  'a-news':     { page: aNewsPage,     who: ADMINS, nav: 'إدارة الأخبار' },
  'a-settings': { page: aSettingsPage, who: SUPER,  nav: 'الإعدادات' }
};
const needsTerms = () => !!ME && ME.role === 'marketer' && ME.terms_version !== TERMS_VERSION;
const homeFor = () => !ME ? 'login' : ME.role === 'marketer' ? 'home' : ME.role === 'employee' ? 'a-sale' : 'a-dash';
const allowed = (r, role) => r.who === 'user' || r.who === 'any' || (Array.isArray(r.who) && r.who.includes(role));

// أيقونات القايمة (stroke بلون النص)
const NAV_ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  leads: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  sales: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2m0 8v2"/>',
  library: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  leaders: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  news: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'a-dash': '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  'a-leads': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'a-sale': '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  'a-data': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  'a-pay': '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 14h2M2 10h20"/>',
  'a-mk': '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  'a-team': '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 11l2 2 4-4"/>',
  'a-log': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'a-content': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  'a-news': '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>',
  'a-settings': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  more: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  logout: '<path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M8 17l-5-5 5-5M3 12h12"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>'
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[k] || NAV_ICONS.more}</svg>`;

// الموبايل: شريط سفلي (أهم 4 صفحات + المزيد) وقايمة كاملة بتطلع من تحت
const tabbar = document.createElement('nav');
tabbar.className = 'tabbar'; tabbar.id = 'tabbar'; tabbar.hidden = true; tabbar.setAttribute('aria-label', 'التنقل');
const sheet = document.createElement('div');
sheet.className = 'sheet'; sheet.id = 'sheet'; sheet.hidden = true;
sheet.innerHTML = `<div class="sheet-bg" data-close></div>
  <div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <div class="sheet-head"><div class="sheet-who"><b id="sheet-title"></b><small class="muted" id="sheet-sub"></small></div>
      <button type="button" class="icon-btn" data-close aria-label="اقفل القايمة">${icon('close')}</button></div>
    <div id="sheet-body"></div>
    <button type="button" class="btn ghost sheet-out" id="sheet-logout">${icon('logout')} تسجيل خروج</button>
  </div>`;
document.body.append(tabbar, sheet);
let sheetReturn = null;
function openSheet() {
  sheet.hidden = false; document.documentElement.classList.add('locked');
  sheetReturn = document.activeElement; $('[data-close].icon-btn', sheet).focus();
}
function closeSheet() {
  if (sheet.hidden) return;
  sheet.hidden = true; document.documentElement.classList.remove('locked');
  if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true });
}
sheet.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target.closest('a')) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
$('#sheet-logout', sheet).addEventListener('click', () => { closeSheet(); $('#logoutBtn').click(); });
tabbar.addEventListener('click', e => { if (e.target.closest('[data-more]')) openSheet(); });

function renderNav(current) {
  closeSheet();
  if (!ME || needsTerms()) {
    navEl.hidden = true; tabbar.hidden = true; document.body.classList.remove('has-tabbar');
    $('#who').hidden = !ME; if (ME) $('#whoName').textContent = firstName(ME.name);
    return;
  }
  const count = k => k === 'a-leads' && ME.new_leads > 0 ? num(ME.new_leads) : '';
  const badge = k => count(k) ? ` <span class="nbadge">${count(k)}</span>` : '';
  const link = k => `<a href="#${k}" class="${k === current ? 'on' : ''}">${ROUTES[k].nav}${badge(k)}</a>`;
  let groups;
  if (ME.role === 'marketer') {
    groups = [['', ['home', 'leads', 'sales', 'library', 'guide', 'leaders', 'news', 'account']]];
  } else {
    const staff = Object.keys(ROUTES).filter(k => k.startsWith('a-') && allowed(ROUTES[k], ME.role));
    groups = [['الشغل', staff], ['عام', ['library', 'guide', 'news', 'account']]];
  }
  navEl.innerHTML = groups.map(g => g[1].map(link).join('')).join('<span class="sep"></span>');
  navEl.hidden = false;
  const on = $('a.on', navEl); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#who').hidden = false;
  const sub = ME.role === 'marketer' ? ME.code : ROLES[ME.role];
  $('#whoName').textContent = `${firstName(ME.name)} · ${sub}`;

  // الشريط السفلي
  const all = groups.flatMap(g => g[1]), main = all.slice(0, 4), inMore = !main.includes(current);
  const moreCount = all.slice(4).map(count).filter(Boolean).length;
  tabbar.innerHTML = main.map(k => `<a href="#${k}" class="${k === current ? 'on' : ''}"${k === current ? ' aria-current="page"' : ''}>
      <span class="ti">${icon(k)}${count(k) ? `<span class="tdot">${count(k)}</span>` : ''}</span><span class="tl">${ROUTES[k].nav}</span></a>`).join('')
    + `<button type="button" data-more class="${inMore ? 'on' : ''}" aria-haspopup="dialog">
      <span class="ti">${icon('more')}${moreCount ? '<span class="tdot dot"></span>' : ''}</span><span class="tl">${inMore && ROUTES[current] && ROUTES[current].nav || 'المزيد'}</span></button>`;
  tabbar.hidden = false; document.body.classList.add('has-tabbar');

  // القايمة الكاملة
  $('#sheet-title', sheet).textContent = ME.name;
  $('#sheet-sub', sheet).textContent = sub;
  $('#sheet-body', sheet).innerHTML = groups.map(([title, keys]) => `${title ? `<p class="sheet-lbl">${title}</p>` : ''}
    <div class="sheet-grid">${keys.map(k => `<a href="#${k}" class="${k === current ? 'on' : ''}">${icon(k)}<span>${ROUTES[k].nav}</span>${badge(k)}</a>`).join('')}</div>`).join('');
}

async function loadMe() {
  ME = await rpc('my_summary');
  SERVICES = ME.services || [];
  return ME;
}

async function route() {
  // رابط إحالة: العميل بيشوف صفحة التعريف بس (حتى لو حد من الفريق فاتحه وهو داخل)
  const ref = refCode();
  if (ref && location.hash !== '#terms') {
    closeSheet(); navEl.hidden = true; $('#who').hidden = true; tabbar.hidden = true; document.body.classList.remove('has-tabbar');
    return refPage(ref);
  }
  const brandSub = $('.brand small'); if (brandSub) brandSub.textContent = 'بوابة السيلز';
  const { data: { session } } = await sb.auth.getSession();
  let key = location.hash.replace(/^#/, '');
  if (!session) {
    ME = null;
    if (!ROUTES[key] || (ROUTES[key].who !== 'guest' && ROUTES[key].who !== 'any')) key = 'login';
  } else {
    if (!ME) {
      try { await loadMe(); }
      catch (m) {
        if (/NO_PROFILE/.test(m)) { await sb.auth.signOut(); ME = null; toast('الحساب ده مش موجود'); return go('login'); }
        renderNav(null); return failed(m);
      }
    }
    const r = ROUTES[key];
    if (!r || r.who === 'guest' || !allowed(r, ME.role)) key = homeFor();
    // المسوق اللي ما وافقش على النسخة الحالية من الشروط لازم يوافق الأول
    if (needsTerms()) key = 'terms';
  }
  if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);
  renderNav(key);
  try { await ROUTES[key].page(); }
  catch (m) { failed(typeof m === 'string' ? m : errMsg(m)); }
}
window.route = route;
function go(k) { if (location.hash === '#' + k) route(); else location.hash = k; }
window.addEventListener('hashchange', route);
$('#logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); ME = null; go('login'); });

/* ================= الدخول والتسجيل ================= */
// CAPTCHA (Cloudflare Turnstile): بتشتغل لوحدها لما يتحط TURNSTILE_SITE_KEY في config.js
let tsLoad = null;
function loadTurnstile() {
  if (!tsLoad) tsLoad = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = () => res(window.turnstile); s.onerror = () => { tsLoad = null; rej('ما قدرناش نحمّل التحقق. اتأكد من النت وجرّب تاني'); };
    document.head.append(s);
  });
  return tsLoad;
}
function mountCaptcha(el) {
  if (!C.TURNSTILE_SITE_KEY) return { token: async () => undefined, reset() {} };
  el.hidden = false;
  let tok = null, id = null, ts = null;
  const ready = loadTurnstile().then(t => {
    ts = t;
    id = t.render(el, { sitekey: C.TURNSTILE_SITE_KEY, language: 'ar', theme: 'auto',
      callback: v => { tok = v; }, 'expired-callback': () => { tok = null; }, 'error-callback': () => { tok = null; } });
  });
  return {
    async token() { await ready; if (!tok) throw 'استنى لحد ما علامة التحقق تخلص (✓) وبعدين جرّب تاني'; return tok; },
    reset() { tok = null; if (ts && id !== null) ts.reset(id); }
  };
}

function loginPage() {
  view(`
  <form class="card narrow" id="lf" novalidate>
    <div class="stack"><h1>أهلًا بيك 👋</h1><p class="lead">ادخل برقم موبايلك والباسورد.</p></div>
    <label class="f">رقم الموبايل<input id="l-phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="01xxxxxxxxx"></label>
    <label class="f">الباسورد<input id="l-pw" type="password" autocomplete="current-password"></label>
    <div class="cap" id="l-cap" hidden></div>
    <div class="err" id="l-err" hidden></div>
    <button class="btn" id="l-btn">دخول</button>
    <p class="muted" style="font-size:13.5px">نسيت الباسورد؟ كلّمنا واتساب <b class="ltr">${esc(C.SUPPORT_PHONE)}</b> وابعت كودك.</p>
  </form>
  <div class="card narrow" style="text-align:center">
    <p><b>لسه ما سجلتش؟</b> سجّل وخد كودك في دقيقة.</p>
    <a class="btn gold" href="#signup">سجّل دلوقتي</a>
    <p class="muted">عندك أسئلة قبل ما تبدأ؟ <a href="#guide">اقرأ الدليل والأسئلة الشائعة</a></p>
  </div>
  <p class="foot"><a href="${esc(C.SITE_URL)}" target="_blank" rel="noopener">موقع Clan Agency</a> · <a href="#terms">الشروط والخصوصية</a></p>`);
  const cap = mountCaptcha($('#l-cap'));
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#l-err'), '');
    const phone = $('#l-phone').value, pw = $('#l-pw').value;
    if (normPhone(phone).length < 8) return showErr($('#l-err'), 'اكتب رقم موبايلك صح');
    if (!pw) return showErr($('#l-err'), 'اكتب الباسورد');
    try {
      await busy($('#l-btn'), 'بندخّلك…', async () => {
        const captchaToken = await cap.token();
        const { error } = await sb.auth.signInWithPassword({ email: phoneEmail(phone), password: pw, options: captchaToken ? { captchaToken } : undefined });
        if (error) { cap.reset(); throw errMsg(error); }
      });
      ME = null; go('home');
    } catch (m) { showErr($('#l-err'), m); }
  });
}

function signupPage() {
  view(`
  <form class="card narrow" id="sf" novalidate>
    <div class="stack"><h1>انضم لفريق السيلز</h1><p class="lead">املا بياناتك وهتاخد كودك على طول. أي عميل يدفع وهو جاي بكودك، العمولة ليك.</p></div>
    <label class="f">الاسم بالكامل<input id="s-name" autocomplete="name"></label>
    <div class="row2">
      <label class="f">السن<input id="s-age" inputmode="numeric" maxlength="2"></label>
      <label class="f">المحافظة<select id="s-gov"><option value="">اختار…</option>${opts(GOVS)}</select></label>
    </div>
    <label class="f">سنين الخبرة <span class="opt">(لو موجودة)</span><select id="s-exp">${opts(EXPS)}</select></label>
    <label class="f">رقم الموبايل (واتساب)<input id="s-phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="01xxxxxxxxx"></label>
    <div class="stack" style="font-weight:600;font-size:14px">عايز تقبض عمولتك على
      <div class="choice">${METHODS.map((m, i) => `<label><input type="radio" name="s-method" value="${esc(m)}"${i ? '' : ' checked'}>${esc(m)}</label>`).join('')}</div>
    </div>
    <label class="f">رقم التحويل <span class="opt">(لو غير رقم موبايلك)</span><input id="s-pay" type="tel" inputmode="tel" dir="ltr" placeholder="نفس رقم الموبايل"></label>
    <div class="row2">
      <label class="f">الباسورد<input id="s-pw" type="password" autocomplete="new-password" placeholder="8 حروف أو أرقام على الأقل"></label>
      <label class="f">اكتب الباسورد تاني<input id="s-pw2" type="password" autocomplete="new-password"></label>
    </div>
    <label class="agree"><input type="checkbox" id="s-terms"><span>قريت ووافقت على <a href="#terms" target="_blank" rel="noopener">شروط العمل وسياسة الخصوصية</a></span></label>
    <div class="cap" id="s-cap" hidden></div>
    <div class="err" id="s-err" hidden></div>
    <button class="btn gold" id="s-btn">سجّلني وطلّعلي الكود</button>
    <p class="muted" style="text-align:center">عندك حساب؟ <a href="#login">ادخل من هنا</a> · <a href="#guide">الأسئلة الشائعة</a></p>
  </form>`);
  const cap = mountCaptcha($('#s-cap'));
  $('#sf').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#s-err'); showErr(err, '');
    const name = $('#s-name').value.trim().replace(/\s+/g, ' ');
    const age = parseInt(digits($('#s-age').value), 10);
    const gov = $('#s-gov').value, exp = $('#s-exp').value;
    const phone = normPhone($('#s-phone').value);
    const pay = normPhone($('#s-pay').value) || phone;
    const method = ($('input[name="s-method"]:checked') || {}).value;
    const pw = $('#s-pw').value, pw2 = $('#s-pw2').value;
    if (name.length < 3 || !name.includes(' ')) return showErr(err, 'اكتب اسمك بالكامل (الاسم الأول واسم الأب على الأقل)');
    if (!(age >= 16 && age <= 70)) return showErr(err, 'اكتب سنك صح (من 16 لـ 70 سنة)');
    if (!gov) return showErr(err, 'اختار المحافظة');
    if (phone.length < 8 || phone.length > 15) return showErr(err, 'رقم الموبايل مش صح');
    if (pay.length < 8 || pay.length > 15) return showErr(err, 'رقم التحويل مش صح');
    if (pw.length < MIN_PW) return showErr(err, `الباسورد لازم ${MIN_PW} حروف أو أرقام على الأقل`);
    if (pw !== pw2) return showErr(err, 'الباسوردين مش زي بعض');
    if (!$('#s-terms').checked) return showErr(err, 'لازم توافق على شروط العمل وسياسة الخصوصية الأول');
    try {
      const data = await busy($('#s-btn'), 'بنسجّلك…', async () => {
        const captchaToken = await cap.token();
        const { data, error } = await sb.auth.signUp({
          email: phoneEmail(phone), password: pw,
          options: Object.assign({ data: { name, age: String(age), gov, exp, phone, pay_method: method, pay_number: pay, terms_version: TERMS_VERSION } }, captchaToken ? { captchaToken } : {})
        });
        if (error) { cap.reset(); throw errMsg(error); }
        return data;
      });
      if (!data.session) return showErr(err, 'اتسجلت، بس الدخول مقفول لحد ما الإدارة تقفل «Confirm email» في إعدادات Supabase. كلّمنا على ' + C.SUPPORT_PHONE);
      JUST_JOINED = true; ME = null; go('home');
    } catch (m) { showErr(err, m); }
  });
}

/* ================= رابط الإحالة ================= */
// رابط المسوق: البوابة نفسها + ?ref=الكود (العميل بيشوف صفحة تعريف وفورم، من غير حساب)
const refLink = code => `${location.origin}${location.pathname.replace(/index\.html$/, '')}?ref=${encodeURIComponent(code)}`;
const refCode = () => (new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
// واتساب: الرقم المصري 01xxxxxxxxx بيتحول لـ 201xxxxxxxxx
const waNumber = p => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '2' + d : d; };
const telNumber = p => '+' + waNumber(p);
const CALL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
// رسالة الترحيب اللي الكول سنتر بيبعتها للعميل (مصر بالمصري، برة مصر بلهجة خليجية)
function leadGreeting(r) {
  const name = firstName(r.client_name), me = ME ? firstName(ME.name) : '';
  const svc = (r.services || []).filter(s => s !== 'أكتر من خدمة' && s !== 'أخرى').join(' و');
  const biz = r.business ? ` لـ ${r.business}` : '';
  if ((r.country || 'مصر').trim() !== 'مصر') {
    return `السلام عليكم ${name}، حيّاك الله 🌟\nمعك ${me} من فريق Clan Agency.\nوصلنا طلبك${svc ? ` بخصوص ${svc}` : ''}${biz}، ويسعدنا نخدمك.\nمتى يناسبك نتواصل ونوضح لك التفاصيل؟`;
  }
  return `أهلًا يا ${name} 👋\nمعاك ${me} من فريق Clan Agency.\nوصلنا طلبك${svc ? ` بخصوص ${svc}` : ''}${biz}، ومبسوطين إنك اخترتنا.\nإمتى يناسبك نتكلم ونوضحلك التفاصيل والعرض المناسب؟`;
}

async function refPage(code) {
  const brandSub = $('.brand small'); if (brandSub) brandSub.textContent = 'تسويق رقمي';
  loading();
  let ri;
  try { ri = await rpc('ref_info', { p_ref: code }); } catch (m) { return failed(m); }
  if (!ri || !ri.ok) {
    view(`<div class="card narrow" style="text-align:center">
      <h1>الرابط ده مش شغال</h1>
      <p class="lead">ممكن يكون فيه غلطة في الرابط. تقدر تكلّم فريقنا على طول.</p>
      <a class="btn gold" href="${esc(waLink(C.CLIENTS_PHONE, 'أهلًا، عايز أعرف تفاصيل عن خدماتكم'))}" target="_blank" rel="noopener">كلّمنا واتساب</a>
      <a href="${esc(C.SITE_URL)}" target="_blank" rel="noopener">موقع Clan Agency</a></div>`);
    return;
  }
  const svcs = (ri.services || []).filter(s => s !== 'أكتر من خدمة');
  const waMsg = `أهلًا، أنا جاي من طرف كود ${ri.code} وعايز أعرف تفاصيل عن خدماتكم`;
  view(`
  <div class="card ref-hero">
    <div class="stack"><h1>أهلًا بيك 👋</h1>
      <p class="lead"><b>${esc(ri.name)}</b> رشّحلك <b>Clan Agency</b>. إحنا بنساعد البيزنس يوصل لعملا أكتر أونلاين.</p></div>
    ${svcs.length ? `<div class="chips">${svcs.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="refcode"><span>لو هتكلمنا، قول للفريق الكود ده:</span><b class="ltr" id="r-code">${esc(ri.code)}</b></div>
    <div class="actions">
      <a class="btn gold" id="r-wa" href="${esc(waLink(C.CLIENTS_PHONE, waMsg))}" target="_blank" rel="noopener">${WA_ICON} كلّمنا واتساب</a>
      <a class="btn" id="r-call" href="tel:${esc(telNumber(C.CLIENTS_PHONE))}">${CALL_ICON} اتصل بينا</a>
      <a class="btn ghost" href="#r-form" id="r-jump">سيب بياناتك ونكلمك</a>
    </div>
    <p class="muted ltr" style="font-size:13.5px;text-align:center">${esc(C.CLIENTS_PHONE)}</p>
    <p class="muted" style="font-size:13.5px">تعرف أكتر عننا من <a href="${esc(C.SITE_URL)}" target="_blank" rel="noopener">موقعنا</a>.</p>
  </div>
  <form class="card" id="r-form" novalidate>
    <div class="stack"><h2>سيب بياناتك</h2><p class="lead">فريقنا هيكلمك على الواتساب ويعملك عرض مناسب للبيزنس بتاعك.</p></div>
    <div class="row2">
      <label class="f">اسمك<input id="r-name" autocomplete="name"></label>
      <label class="f">موبايلك (واتساب)<input id="r-phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="01xxxxxxxxx"></label>
    </div>
    <div class="row2">
      <label class="f">اسم البيزنس <span class="opt">(اختياري)</span><input id="r-biz" autocomplete="organization" placeholder="مثلًا: مطعم الريف"></label>
      <label class="f">البلد<input id="r-country" value="مصر" autocomplete="country-name"></label>
    </div>
    <div class="stack" style="font-weight:600;font-size:14px">محتاج إيه؟ <span class="opt">(اختار حاجة أو أكتر)</span>
      <div class="svc-pick" id="r-svc">${svcs.map(s => `<label><input type="checkbox" value="${esc(s)}">${esc(s)}</label>`).join('')}</div>
    </div>
    <label class="f">عايز تقولنا حاجة؟ <span class="opt">(اختياري)</span><textarea id="r-notes" rows="2" placeholder="مثلًا: أنسب وقت نكلمك فيه"></textarea></label>
    <label class="trap" aria-hidden="true">سيب الخانة دي فاضية<input id="r-web" tabindex="-1" autocomplete="off"></label>
    <div class="err" id="r-err" hidden></div>
    <button class="btn gold" id="r-btn">ابعت</button>
    <p class="muted" style="font-size:13px">بياناتك بتوصل لفريق Clan Agency بس. <a href="${esc(location.pathname)}#terms" id="r-privacy" target="_blank" rel="noopener">سياسة الخصوصية</a></p>
  </form>`);
  $('#r-jump').addEventListener('click', e => { e.preventDefault(); $('#r-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#r-name').focus({ preventScroll: true }); });
  $('#r-form').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#r-err'), '');
    const services = $$('#r-svc input:checked').map(x => x.value);
    const a = { p_ref: ri.code, p_client: $('#r-name').value.trim(), p_phone: $('#r-phone').value, p_business: $('#r-biz').value,
      p_country: $('#r-country').value, p_services: services, p_notes: $('#r-notes').value, p_trap: $('#r-web').value };
    if (a.p_client.length < 2) return showErr($('#r-err'), 'اكتب اسمك');
    if (normPhone(a.p_phone).length < 8) return showErr($('#r-err'), 'اكتب رقم موبايلك صح');
    if (!services.length) return showErr($('#r-err'), 'اختار خدمة واحدة على الأقل');
    try {
      await busy($('#r-btn'), 'بنبعت…', () => rpc('ref_add_lead', a));
      $('#r-form').outerHTML = `<div class="card" id="r-done" style="text-align:center">
        <h2>وصلنا طلبك ✓</h2>
        <p class="lead">شكرًا يا ${esc(firstName(a.p_client))}. فريقنا هيكلمك على الواتساب قريب.</p>
        <p class="muted">مستعجل؟ كلّمنا إنت على طول:</p>
        <a class="btn gold" href="${esc(waLink(C.CLIENTS_PHONE, waMsg))}" target="_blank" rel="noopener">${WA_ICON} كلّمنا واتساب</a></div>`;
      $('#r-done').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (m) { showErr($('#r-err'), m); }
  });
}
const WA_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.2z"/></svg>';

/* ================= صفحات المسوق ================= */
function readyMessage(code) {
  return `تمام جدًا 👌\n🌐 تقدر تتعرف علينا أكتر من موقعنا: ${C.SITE_URL}\nسيب بياناتك من هنا وفريقنا هيكلمك: ${refLink(code)}\nأو كلّم فريقنا على الواتساب ده: ${C.CLIENTS_PHONE}\nوقولهم إنك جاي من طرف كود ${code}، وهيبعتولك عرض مناسب ليك.`;
}

async function homePage() {
  loading();
  const [me, pinned] = await Promise.all([
    loadMe(),
    q(sb.from('announcements').select('id,title,body,created_at').eq('pinned', true).order('created_at', { ascending: false }).limit(2))
  ]);
  const lv = me.level || {};
  const toNext = lv.next_min != null ? lv.next_min - me.total_sales : 0;
  const pct = lv.next_min != null ? Math.max(4, Math.min(100, ((me.total_sales - lv.min) / (lv.next_min - lv.min)) * 100)) : 100;
  const welcome = JUST_JOINED ? `
    <div class="card">
      <div class="stack"><h1>أهلًا يا ${esc(firstName(me.name))} 🎉</h1><p class="lead">اتسجلت في فريق Clan Agency. ده كودك:</p></div>
      <div class="code-big">${esc(me.code)}</div>
      <p class="note"><b>خد سكرين شوت.</b> هتدخل بعد كده برقم موبايلك والباسورد، وكودك هيفضل ظاهر هنا دايمًا.</p>
      <ol style="margin:0;padding-inline-start:20px;display:grid;gap:6px">
        <li>افتح «المحتوى» وخد السكريبتات والستوري الجاهزة</li>
        <li>ابعت لأصحاب البيزنس، ونزّل ستوري لكل اللي تعرفهم</li>
        <li>ابعت للعميل المهتم رابط الإحالة بتاعك (تحت)، أو خليه يكلّم <b class="ltr">${esc(C.CLIENTS_PHONE)}</b> ويقول كودك <b class="ltr">${esc(me.code)}</b></li>
        <li>أول ما يدفع، ليك ${money(me.commission)}</li>
      </ol>
    </div>` : '';
  JUST_JOINED = null;
  view(`
  ${welcome}
  <div class="card">
    <div class="head"><h1>أهلًا يا ${esc(firstName(me.name))}</h1><span class="badge">🏅 ${esc(lv.name || '')}</span></div>
    ${me.status === 'blocked' ? `<p class="err">حسابك موقوف حاليًا. كلّمنا على ${esc(C.SUPPORT_PHONE)}.</p>` : ''}
    <div class="codebox"><div><small>كودك</small><div class="code">${esc(me.code)}</div></div><button class="btn sm" id="cp-code">انسخ الكود</button></div>
    <div class="stats">
      <div class="stat hl"><small>الباقي ليك</small><b>${money(me.balance)}</b></div>
      <div class="stat"><small>بيعات الشهر ده</small><b>${num(me.month_sales)}</b></div>
      <div class="stat"><small>ترتيبك الشهر ده</small><b>${me.month_rank ? '#' + num(me.month_rank) : '—'}</b></div>
      <div class="stat"><small>كل بيعاتك</small><b>${num(me.total_sales)}</b></div>
      <div class="stat"><small>إجمالي عمولتك</small><b>${money(me.earned)}</b></div>
      <div class="stat"><small>اتحوّلك</small><b>${money(me.paid)}</b></div>
    </div>
    <div class="level">
      <div class="head"><span>مستواك: <b>${esc(lv.name || '')}</b></span><span class="muted">${lv.next ? `فاضلك ${num(toNext)} بيعة وتوصل <b>${esc(lv.next)}</b>` : 'وصلت لأعلى مستوى 🔥'}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>
  <div class="card">
    <div class="head"><h2>🔗 رابط الإحالة بتاعك</h2>${me.link_leads ? `<span class="badge">${num(me.link_leads)} عميل سجّل منه</span>` : ''}</div>
    <p class="lead">شاركه مع العملا في الشات أو البوست أو الستوري. العميل بيفتحه ويكلّمنا أو يسيب بياناته، ويتسجل باسمك على طول.</p>
    <div class="linkbox"><span class="ltr" id="ref-url">${esc(refLink(me.code))}</span></div>
    <div class="actions">
      <button type="button" class="btn" id="cp-link">انسخ الرابط</button>
      <button type="button" class="btn gold" id="sh-link">شارك</button>
      <a class="btn ghost" href="${esc(refLink(me.code))}" target="_blank" rel="noopener">جرّبه</a>
    </div>
  </div>
  <div class="card">
    <h2>لما العميل يبقى مهتم</h2>
    <p class="lead">ابعتله الرسالة دي. كودك متحط فيها جاهز:</p>
    <div class="snip"><pre>${esc(readyMessage(me.code))}</pre></div>
    <div class="actions"><button class="btn" id="cp-ready">انسخ الرسالة</button><a class="btn gold" href="#leads">سجّل بيانات عميل</a><a class="btn ghost" href="#library">كل السكريبتات</a></div>
  </div>
  ${me.total_sales === 0 ? `<a class="card guide-cta" href="#guide"><div class="stack"><h2>لسه بادئ؟ 🚀</h2><p class="muted">اقرأ الدليل: تبدأ إزاي، وتجيب أول عميل إزاي، وإجابات كل الأسئلة.</p></div><span class="btn sm">افتح الدليل</span></a>` : ''}
  ${pinned.length ? `<div class="card"><div class="head"><h2>📌 من الإدارة</h2><a href="#news">كل الأخبار</a></div>${pinned.map(n => `<div class="stack"><h3>${esc(n.title)}</h3><p class="news-body muted">${esc(n.body || '')}</p></div>`).join('')}</div>` : ''}`);
  $('#cp-code').addEventListener('click', () => copyText(me.code));
  $('#cp-ready').addEventListener('click', () => copyText(readyMessage(me.code)));
  $('#cp-link').addEventListener('click', () => copyText(refLink(me.code)));
  $('#sh-link').addEventListener('click', async () => {
    const text = `Clan Agency بتساعد البيزنس يوصل لعملا أكتر: إدارة صفحات، إعلانات ممولة، مواقع، لوجوهات.\nسيب بياناتك من هنا وفريقنا هيكلمك:`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Clan Agency', text, url: refLink(me.code) }); } catch (e) { /* المستخدم قفل المشاركة */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + refLink(me.code))}`, '_blank', 'noopener');
    }
  });
}

async function salesPage() {
  loading();
  const [sales, pays] = await Promise.all([rpc('my_sales', { lim: 300, off: 0 }), rpc('my_payouts')]);
  const me = ME;
  view(`
  <div class="card">
    <h1>بيعاتي</h1>
    <div class="stats">
      <div class="stat hl"><small>الباقي ليك</small><b>${money(me.balance)}</b></div>
      <div class="stat"><small>كل البيعات</small><b>${num(me.total_sales)}</b></div>
      <div class="stat"><small>اتحوّلك</small><b>${money(me.paid)}</b></div>
    </div>
    ${me.balance > 0 ? `<p class="note">الباقي هيتحوّلك على <b>${esc(me.pay_method)}</b> رقم <b class="ltr">${esc(me.pay_number)}</b>. <a href="#account">غيّر رقم التحويل</a></p>` : ''}
    <div class="list">${sales.length ? sales.map(s => `
      <div class="item"><div class="main"><b>${esc(s.service)}</b><span class="sub">${fdate(s.created_at)} · ${esc(s.client_name)}${s.country && s.country !== 'مصر' ? ' · ' + esc(s.country) : ''}</span></div>
      <div class="end">${s.status === 'cancelled' ? pill('cancelled') : `<span class="amt">+${money(s.amount)}</span>`}</div></div>`).join('')
      : `<p class="empty">لسه مفيش بيعات. أول عميل يدفع بكودك هيظهر هنا.</p>`}</div>
  </div>
  <div class="card"><h2>التحويلات اللي وصلتني</h2>
    <div class="list">${pays.length ? pays.map(p => `
      <div class="item"><div class="main"><b>${esc(p.method || '')}</b><span class="sub">${fdate(p.created_at)}</span></div><div class="end"><span class="amt">${money(p.amount)}</span></div></div>`).join('')
      : `<p class="empty">لسه مفيش تحويلات.</p>`}</div>
  </div>`);
}

async function libraryPage() {
  loading();
  let items = await q(sb.from('content').select('*').order('sort').order('id'));
  const code = ME.code;
  const fill = t => String(t || '').replace(/\[كودك\]/g, code);
  items = items.filter(i => KINDS[i.kind]);
  const kinds = Object.keys(KINDS).filter(k => items.some(i => i.kind === k));
  let cur = 'all';
  view(`
  <div class="card">
    <div class="stack"><h1>المحتوى</h1><p class="lead">انسخ وابعت. كودك <b class="ltr">${esc(code)}</b> بيتحط لوحده مكان [كودك]. غيّر في الكلام شوية من عميل للتاني.</p></div>
    <div class="seg" id="kinds"><button class="on" data-k="all">الكل</button>${kinds.map(k => `<button data-k="${k}">${KINDS[k]}</button>`).join('')}</div>
    <div class="list" id="snips" style="gap:12px"></div>
  </div>`);
  function draw() {
    const list = items.filter(i => cur === 'all' || i.kind === cur);
    $('#snips').innerHTML = list.length ? list.map(i => `
      <div class="snip">
        <div class="head"><h3>${esc(i.title)}</h3><span class="kind">${esc(KINDS[i.kind] || '')}</span></div>
        ${i.image_url ? `<img src="${esc(i.image_url)}" alt="${esc(i.title)}" loading="lazy">` : ''}
        ${i.body ? `<pre>${esc(fill(i.body)).replace(new RegExp(esc(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<mark>$&</mark>')}</pre>` : ''}
        <div class="actions">
          ${i.body ? `<button class="btn sm" data-copy="${i.id}">انسخ</button>` : ''}
          ${i.image_url ? `<a class="btn sm ghost" href="${esc(i.image_url)}" target="_blank" rel="noopener">افتح الصورة واحفظها</a>` : ''}
        </div>
      </div>`).join('') : '<p class="empty">مفيش محتوى هنا لسه.</p>';
  }
  draw();
  $('#kinds').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cur = b.dataset.k; $$('#kinds button').forEach(x => x.classList.toggle('on', x === b)); draw();
  });
  $('#snips').addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const it = items.find(i => String(i.id) === b.dataset.copy); if (it) copyText(fill(it.body));
  });
}

async function leadersPage() {
  view(`
  <div class="card">
    <div class="stack"><h1>الترتيب 🏆</h1><p class="lead">أكتر المسوقين بيعات. اتنافس واطلع في الأوائل.</p></div>
    <div class="seg" id="per"><button data-p="week">الأسبوع ده</button><button class="on" data-p="month">الشهر ده</button><button data-p="all">من الأول</button></div>
    <div class="list" id="lb"><p class="empty">جاري التحميل…</p></div>
  </div>`);
  async function load(p) {
    $('#lb').innerHTML = '<p class="empty">جاري التحميل…</p>';
    try {
      const rows = await rpc('leaderboard', { period: p });
      $('#lb').innerHTML = rows.length ? rows.map(r => `
        <div class="item ${r.is_me ? 'me' : ''}"><div class="withrank"><span class="rank ${r.pos <= 3 ? 'r' + r.pos : ''}">${num(r.pos)}</span>
          <div class="main"><b>${esc(r.name)}${r.is_me ? ' (إنت)' : ''}</b><span class="sub ltr">${esc(r.code)}</span></div></div>
          <div class="end"><span class="amt">${num(r.sales)} بيعة</span></div></div>`).join('')
        : '<p class="empty">لسه مفيش بيعات في الفترة دي. كن أول واحد!</p>';
    } catch (m) { $('#lb').innerHTML = `<p class="err">${esc(m)}</p>`; }
  }
  $('#per').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#per button').forEach(x => x.classList.toggle('on', x === b)); load(b.dataset.p);
  });
  load('month');
}

async function newsPage() {
  loading();
  const rows = await q(sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(60));
  view(`<div class="card"><h1>الأخبار والتدريب</h1>${rows.length ? '' : '<p class="empty">مفيش أخبار لسه.</p>'}</div>
  ${rows.map(n => {
    const yt = ytEmbed(n.video_url);
    return `<div class="card">
      <div class="head"><h2>${n.pinned ? '📌 ' : ''}${esc(n.title)}</h2><span class="muted" style="font-size:13px">${fdate(n.created_at)}</span></div>
      ${n.body ? `<p class="news-body">${esc(n.body)}</p>` : ''}
      ${yt ? `<div class="video"><iframe src="${esc(yt)}" title="${esc(n.title)}" loading="lazy" allowfullscreen></iframe></div>`
           : n.video_url ? `<a class="btn ghost sm" href="${esc(n.video_url)}" target="_blank" rel="noopener">افتح الفيديو</a>` : ''}
    </div>`;
  }).join('')}`);
}

async function guidePage() {
  loading();
  const [items, commission] = await Promise.all([
    q(sb.from('content').select('id,kind,title,body,sort').in('kind', ['guide', 'first', 'faq']).order('sort').order('id')),
    ME ? Promise.resolve(ME.commission) : q(sb.from('settings').select('value').eq('key', 'commission')).then(r => (r[0] || {}).value).catch(() => null)
  ]);
  const fill = t => String(t || '')
    .replace(/\[العمولة\]/g, commission ? money(commission) : 'العمولة')
    .replace(/\[كودك\]/g, ME ? ME.code : '(كودك)');
  const by = k => items.filter(i => i.kind === k);
  const steps = by('guide'), first = by('first'), faq = by('faq');
  view(`
  <div class="card">
    <div class="stack"><h1>دليل المسوق</h1><p class="lead">كل اللي محتاج تعرفه عشان تبدأ وتجيب أول عميل وتقبض عمولتك.</p></div>
    <div class="seg" id="jump">
      ${steps.length ? '<button data-to="g-start">ابدأ إزاي</button>' : ''}
      ${first.length ? '<button data-to="g-first">أول عميل</button>' : ''}
      ${faq.length ? '<button data-to="g-faq">الأسئلة الشائعة</button>' : ''}
    </div>
    ${ME ? '' : `<div class="actions"><a class="btn gold" href="#signup">سجّل وخد كودك</a><a class="btn ghost" href="#login">عندي حساب</a></div>`}
  </div>
  ${steps.length ? `<div class="card" id="g-start"><h2>ابدأ إزاي؟</h2>
    <ol class="steps-list">${steps.map(s => `<li><h3>${esc(s.title)}</h3><p class="news-body muted">${esc(fill(s.body))}</p></li>`).join('')}</ol></div>` : ''}
  ${first.length ? `<div class="card" id="g-first"><h2>إزاي تجيب أول عميل؟</h2>
    <div class="tips">${first.map(s => `<div class="tip"><h3>${esc(s.title)}</h3><p class="news-body muted">${esc(fill(s.body))}</p></div>`).join('')}</div></div>` : ''}
  ${faq.length ? `<div class="card" id="g-faq"><h2>الأسئلة الشائعة</h2>
    <div class="faq">${faq.map(s => `<details><summary>${esc(s.title)}</summary><p class="news-body">${esc(fill(s.body))}</p></details>`).join('')}</div></div>` : ''}
  ${items.length ? '' : '<div class="card"><p class="empty">الدليل لسه ما اتكتبش.</p></div>'}
  <div class="card" style="text-align:center"><p>لسه عندك سؤال؟ كلّمنا واتساب <b class="ltr">${esc(C.SUPPORT_PHONE)}</b></p>
    <p class="muted"><a href="#terms">شروط العمل وسياسة الخصوصية</a></p></div>`);
  $('#jump').addEventListener('click', e => {
    const b = e.target.closest('[data-to]'); if (!b) return;
    const t = document.getElementById(b.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ================= الشروط وسياسة الخصوصية ================= */
// لو غيّرت أي بند هنا، غيّر TERMS_VERSION فوق
const TERMS = [
  ['طبيعة الشغل', [
    'الشغل مع Clan Agency كمسوق بالعمولة. ده مش عقد عمل ولا وظيفة، ومفيش مرتب ثابت ولا تأمينات.',
    'بتشتغل في الوقت والمكان اللي يناسبك، ومن صفحاتك أو معارفك.']],
  ['العمولة', [
    'العمولة مبلغ ثابت عن كل عميل يتعاقد ويدفع فعلًا، وقيمتها هي المعلنة في البوابة وقت تسجيل البيعة ([العمولة] حاليًا).',
    'العمولة بتستحق لما العميل يدفع وفريق الشركة يسجل البيعة في البوابة، وبتظهر في حسابك على طول.',
    'التحويل بيكون على إنستاباي أو فودافون كاش للرقم المسجل في حسابك. قبل أول تحويل الإدارة بتتأكد من الرقم، ولو غيّرته بيتأكد منه تاني.',
    'لو البيعة اتلغت أو العميل استرد فلوسه، العمولة بتتلغي. ولو كانت اتصرفت، بتتخصم من مستحقاتك الجاية.']],
  ['العميل بيتحسب لمين', [
    'العميل بيتحسب لأول مسوق يسجله في البوابة أو يقول للفريق إنه جاي من طرف كوده.',
    'لو نفس العميل اتسجل قبل كده باسم مسوق تاني، العمولة لصاحب التسجيل الأول.',
    'في أي خلاف، الإدارة بتحكم بسجلات البوابة، وقرارها نهائي.']],
  ['التزاماتك', [
    'تتكلم مع العملا باحترام وتعرّف نفسك إنك مسوق مع Clan Agency، مش موظف ولا مدير فيها.',
    'ما توعدش العميل بأسعار أو خصومات أو مواعيد تسليم. الأسعار والاتفاق مع فريق الشركة بس.',
    'ما تعملش صفحات أو إعلانات ممولة باسم Clan Agency أو اللوجو بتاعها من غير إذن مكتوب.',
    'ما تبعتش رسايل مزعجة (سبام) ولا تضايق حد رفض.',
    'تاخد موافقة العميل قبل ما تسجل رقمه في البوابة.']],
  ['ممنوع', [
    'تفتح أكتر من حساب، أو تسجل باسم أو رقم مش بتاعك.',
    'تسجل عملا وهميين أو عملا مش إنت اللي جبتهم.',
    'تدّي حسابك أو الباسورد بتاعك لحد تاني.',
    'أي تلاعب في البوابة أو في بيانات العملا.']],
  ['الإيقاف وإنهاء التعامل', [
    'الإدارة من حقها توقف أو تقفل أي حساب يخالف الشروط دي، وتلغي العمولات اللي جاية من المخالفة.',
    'العمولات السليمة المستحقة قبل الإيقاف بتتصرف عادي.',
    'تقدر توقف شغلك معانا في أي وقت، وعمولاتك المستحقة بتتصرف.']],
  ['تعديل الشروط', [
    'ممكن نعدّل الشروط دي. لما ده يحصل، البوابة هتطلب منك توافق على النسخة الجديدة أول ما تدخل.']]
];
const PRIVACY = [
  ['بنجمع إيه', [
    'بياناتك: الاسم، السن، المحافظة، الخبرة، رقم الموبايل، وطريقة ورقم التحويل.',
    'بيانات العملا اللي بتسجلهم: الاسم، الموبايل، البيزنس، الخدمة، والملاحظات.',
    'سجل العمليات (مين عمل إيه وإمتى) عشان نحمي حقك وحق الشركة.']],
  ['بنستخدمها في إيه', [
    'تشغيل حسابك، وحساب عمولتك وتحويلها، والتواصل معاك، ومتابعة العملا.']],
  ['مين يشوفها', [
    'فريق إدارة Clan Agency بس، وكل واحد حسب صلاحيته.',
    'مش بنبيع بياناتك ولا بندّيها لأي جهة برة الشركة، إلا لو القانون طلب كده.']],
  ['حمايتها', [
    'البيانات متخزنة على خوادم آمنة ومشفرة، والدخول محمي بصلاحيات.',
    'الباسورد متخزن مشفر، ومحدش يقدر يشوفه، ولا حتى الإدارة.',
    'الموقع بيحفظ جلسة الدخول بس في المتصفح. مفيش إعلانات ولا أدوات تتبع.']],
  ['حقوقك', [
    'تقدر تعدّل بياناتك ورقم التحويل من صفحة «حسابي».',
    'تقدر تطلب مسح حسابك وبياناتك بالتواصل معانا. السجلات المالية (البيعات والتحويلات) بنحتفظ بيها كسجل حسابات.']]
];

async function termsPage() {
  const gate = needsTerms();
  const commission = ME ? ME.commission
    : await q(sb.from('settings').select('value').eq('key', 'commission')).then(r => (r[0] || {}).value).catch(() => null);
  const fill = t => esc(t).replace('[العمولة]', commission ? money(commission) : 'المبلغ المعلن');
  const sec = (id, title, list) => `<div class="card" id="${id}"><h2>${title}</h2>
    <ol class="terms">${list.map(([h, items]) => `<li><h3>${esc(h)}</h3><ul>${items.map(i => `<li>${fill(i)}</li>`).join('')}</ul></li>`).join('')}</ol></div>`;
  const accepted = ME && ME.terms_version === TERMS_VERSION && ME.terms_accepted_at;
  view(`
  <div class="card">
    <div class="stack"><h1>شروط العمل وسياسة الخصوصية</h1>
      <p class="lead">القواعد اللي بنشتغل بيها مع المسوقين، وإزاي بنتعامل مع بياناتك. آخر تحديث: ${fdate(TERMS_VERSION + 'T12:00:00')}.</p></div>
    ${gate ? `<p class="note">${ME.terms_version ? 'الشروط اتحدّثت. ' : ''}عشان تكمل في البوابة، اقرا الشروط دي ووافق عليها تحت.</p>` : ''}
    ${accepted ? `<p class="okbox">✓ وافقت على النسخة دي يوم ${fdate(ME.terms_accepted_at)}.</p>` : ''}
    <div class="seg" id="t-jump"><button type="button" data-to="t-terms">شروط العمل</button><button type="button" data-to="t-privacy">الخصوصية</button></div>
  </div>
  ${sec('t-terms', 'شروط العمل', TERMS)}
  ${sec('t-privacy', 'سياسة الخصوصية', PRIVACY)}
  ${gate ? `<form class="card" id="tf" novalidate>
      <label class="agree"><input type="checkbox" id="t-ok"><span>قريت ووافقت على شروط العمل وسياسة الخصوصية</span></label>
      <div class="err" id="t-err" hidden></div>
      <button class="btn gold" id="t-btn">موافق، كمّل</button>
      <button type="button" class="btn ghost" id="t-out">مش موافق، اخرج</button>
    </form>`
  : `<div class="card" style="text-align:center"><p>عندك سؤال عن الشروط؟ كلّمنا واتساب <b class="ltr">${esc(C.SUPPORT_PHONE)}</b></p>
      ${ME ? '' : `<div class="actions" style="justify-content:center"><a class="btn gold" href="#signup">سجّل وخد كودك</a><a class="btn ghost" href="#login">عندي حساب</a></div>`}</div>`}`);
  $('#t-jump').addEventListener('click', e => {
    const b = e.target.closest('[data-to]'); if (!b) return;
    const t = document.getElementById(b.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (!gate) return;
  $('#t-out').addEventListener('click', () => $('#logoutBtn').click());
  $('#tf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#t-err'), '');
    if (!$('#t-ok').checked) return showErr($('#t-err'), 'علّم على «قريت ووافقت» الأول');
    try {
      await busy($('#t-btn'), 'بنسجّل موافقتك…', () => rpc('accept_terms', { p_version: TERMS_VERSION }));
      await loadMe(); toast('شكرًا ✓'); go(homeFor());
    } catch (m) { showErr($('#t-err'), m); }
  });
}

async function accountPage() {
  const me = await loadMe();
  view(`
  <div class="card">
    <h1>حسابي</h1>
    <div class="list">
      <div class="item"><span class="muted">الاسم</span><b>${esc(me.name)}</b></div>
      <div class="item"><span class="muted">الكود</span><b class="ltr">${esc(me.code)}</b></div>
      <div class="item"><span class="muted">الموبايل</span><b class="ltr">${esc(me.phone)}</b></div>
      <div class="item"><span class="muted">المحافظة</span><b>${esc(me.gov || '')}</b></div>
      <div class="item"><span class="muted">اتسجلت</span><b>${fdate(me.joined)}</b></div>
      ${me.role !== 'marketer' ? `<div class="item"><span class="muted">الصلاحية</span><b>${esc(ROLES[me.role])}</b></div>` : ''}
      <div class="item"><span class="muted">الشروط والخصوصية</span><span>${me.terms_accepted_at ? `وافقت يوم ${fdate(me.terms_accepted_at)} · ` : ''}<a href="#terms">اقرأها</a></span></div>
    </div>
  </div>
  <form class="card" id="pf" novalidate>
    <h2>العمولة تتحوّلي على</h2>
    ${me.role === 'marketer' ? `<p class="${me.payout_verified ? 'okbox' : 'note'}" style="margin:0">${me.payout_verified ? '✓ الإدارة اتأكدت من رقم التحويل بتاعك.' : 'الإدارة هتكلمك تتأكد من رقم التحويل قبل أول تحويل.'} لو غيّرت الرقم، هيتأكد منه تاني.</p>` : ''}
    <div class="choice">${METHODS.map(m => `<label><input type="radio" name="p-m" value="${esc(m)}"${m === me.pay_method ? ' checked' : ''}>${esc(m)}</label>`).join('')}</div>
    <label class="f">رقم التحويل<input id="p-num" type="tel" dir="ltr" value="${esc(me.pay_number || '')}"></label>
    <div class="err" id="p-err" hidden></div>
    <button class="btn" id="p-btn">احفظ</button>
  </form>
  <form class="card" id="wf" novalidate>
    <h2>غيّر الباسورد</h2>
    <div class="row2">
      <label class="f">الباسورد الجديد<input id="w-1" type="password" autocomplete="new-password"></label>
      <label class="f">اكتبه تاني<input id="w-2" type="password" autocomplete="new-password"></label>
    </div>
    <div class="err" id="w-err" hidden></div>
    <button class="btn" id="w-btn">غيّر الباسورد</button>
  </form>`);
  $('#pf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#p-err'), '');
    try {
      await busy($('#p-btn'), 'بنحفظ…', () => rpc('update_my_payout', { p_method: ($('input[name="p-m"]:checked') || {}).value, p_number: $('#p-num').value }));
      await loadMe(); toast('اتحفظ ✓');
    } catch (m) { showErr($('#p-err'), m); }
  });
  $('#wf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#w-err'), '');
    const a = $('#w-1').value, b = $('#w-2').value;
    if (a.length < MIN_PW) return showErr($('#w-err'), `الباسورد لازم ${MIN_PW} حروف أو أرقام على الأقل`);
    if (a !== b) return showErr($('#w-err'), 'الباسوردين مش زي بعض');
    try {
      await busy($('#w-btn'), 'بنغيّر…', async () => { const { error } = await sb.auth.updateUser({ password: a }); if (error) throw errMsg(error); });
      $('#w-1').value = ''; $('#w-2').value = ''; toast('الباسورد اتغيّر ✓');
    } catch (m) { showErr($('#w-err'), m); }
  });
}

/* ================= الإدارة ================= */
function codePeek(input, box, onLoad) {
  let t, last = '';
  const run = async () => {
    const v = input.value.trim(); if (!v || v === last) return; last = v;
    box.hidden = false; box.className = 'peek'; box.textContent = 'بندوّر…';
    try {
      const a = await rpc('staff_find', { p_code: v });
      if (input.value.trim() !== v) return;
      box.className = 'peek ' + (a.status === 'blocked' ? 'no' : 'ok');
      box.innerHTML = `<b>${esc(a.name)}</b> <span class="ltr">${esc(a.code)}</span> · ${esc(a.gov || '')} · ${num(a.sales_count)} بيعة`
        + (a.balance != null ? ` · الباقي ليه ${money(a.balance)}` : '')
        + (a.status === 'blocked' ? ' · <b>موقوف</b>' : '');
      onLoad && onLoad(a);
    } catch (m) { if (input.value.trim() === v) { box.className = 'peek no'; box.textContent = m; onLoad && onLoad(null); } }
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 450); });
  return run;
}

async function aDashPage() {
  loading();
  const d = await rpc('admin_dashboard');
  view(`
  <div class="card">
    <div class="head"><h1>الملخص</h1><div class="actions"><button class="btn ghost sm" id="d-ref">تحديث</button><button class="btn ghost sm" id="d-exp">تصدير Excel</button></div></div>
    ${d.scope === 'admin' ? `<p class="note">أرقام البيعات والتحويلات هنا بتاعتك إنت وموظفينك (${num(d.team_size)} في الفريق).</p>` : ''}
    ${d.scope === 'super_admin' && (!d.last_backup || Date.now() - new Date(d.last_backup).getTime() > 7 * 86400000)
      ? `<div class="err" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>${d.last_backup ? `آخر نسخة احتياطية كانت ${fdate(d.last_backup)}، من أكتر من أسبوع.` : 'لسه ما نزّلتش أي نسخة احتياطية.'} نزّل نسخة دلوقتي عشان البيانات ما تضيعش.</span><a class="btn sm" href="#a-settings">نزّل نسخة</a></div>` : ''}
    ${d.unverified_owed ? `<p class="note">${num(d.unverified_owed)} مسوق ليهم فلوس ورقم تحويلهم لسه ما اتأكدش. هتأكده أول مرة تحوّل لكل واحد.</p>` : ''}
    <div class="stats">
      <div class="stat hl"><small>مستحق للمسوقين</small><b>${money(d.owed_total)}</b></div>
      <div class="stat"><small>بيعات الأسبوع${d.scope === 'admin' ? ' (فريقك)' : ''}</small><b>${num(d.sales_week)}</b></div>
      <div class="stat"><small>بيعات الشهر${d.scope === 'admin' ? ' (فريقك)' : ''}</small><b>${num(d.sales_month)}</b></div>
      <div class="stat"><small>كل البيعات${d.scope === 'admin' ? ' (فريقك)' : ''}</small><b>${num(d.sales_total)}</b></div>
      <div class="stat"><small>المسوقين</small><b>${num(d.marketers)}</b></div>
      <div class="stat"><small>جداد الشهر ده</small><b>${num(d.new_month)}</b></div>
      <div class="stat"><small>باعوا الشهر ده</small><b>${num(d.active_month)}</b></div>
      <div class="stat"><small>اتحوّل${d.scope === 'admin' ? ' (فريقك)' : ''}</small><b>${money(d.paid_total)}</b></div>
      <a class="stat hl" href="#a-leads" style="text-decoration:none;color:inherit"><small>طلبات عملا جديدة</small><b>${num(d.leads_new)}</b></a>
      <a class="stat" href="#a-leads" style="text-decoration:none;color:inherit"><small>طلبات لسه مفتوحة</small><b>${num(d.leads_open)}</b></a>
      ${d.scope === 'super_admin' ? `<div class="stat"><small>الموظفين</small><b>${num(d.team_size)}</b></div>` : ''}
    </div>
  </div>
  <div class="card"><h2>محتاجين يتحوّلهم</h2>
    <div class="list" id="owed">${d.owed.length ? d.owed.map(m => `
      <div class="item"><div class="main"><b>${esc(m.name)} <span class="ltr sub">${esc(m.code)}</span></b><span class="sub">${esc(m.pay_method || '')} · <span class="ltr">${esc(m.pay_number || '')}</span>${m.payout_verified ? '' : ' · <span class="pill no">رقم مش متأكد</span>'}</span></div>
      <div class="end"><span class="amt">${money(m.balance)}</span><button class="btn sm gold" data-pay="${esc(m.code)}">حوّل</button></div></div>`).join('')
      : '<p class="empty">مفيش عمولات مستحقة دلوقتي ✓</p>'}</div>
  </div>
  <div class="card"><h2>آخر البيعات</h2>
    <div class="list">${d.recent.length ? d.recent.map(s => `
      <div class="item"><div class="main"><b>${esc(s.client_name)} · ${esc(s.service)}</b><span class="sub">${fdate(s.created_at)} · ${esc(s.name)} <span class="ltr">${esc(s.code)}</span>${s.created_by_name ? ' · سجّلها ' + esc(firstName(s.created_by_name)) : ''}</span></div>
      <div class="end">${pill(s.status)}</div></div>`).join('') : '<p class="empty">لسه مفيش بيعات.</p>'}</div>
  </div>`);
  $('#d-ref').addEventListener('click', route);
  $('#owed').addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (b) { PREFILL = b.dataset.pay; location.hash = 'a-pay'; } });
  $('#d-exp').addEventListener('click', e => busy(e.target, 'بنجهّز…', exportCsv).catch(m => toast(m)));
}

async function exportCsv() {
  const rows = await rpc('admin_export');
  const head = ['الكود','الاسم','الموبايل','السن','المحافظة','الخبرة','طريقة التحويل','رقم التحويل','الصلاحية','الحالة','تاريخ التسجيل','عدد البيعات','إجمالي العمولة','اتحوّل','الباقي'];
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [head.join(',')].concat(rows.map(r => [r.code, r.name, '\t' + r.phone, r.age, r.gov, r.exp, r.pay_method, '\t' + (r.pay_number || ''),
    ROLES[r.role] || r.role, r.status === 'blocked' ? 'موقوف' : 'نشط', fdate(r.created_at), r.sales_count, r.earned, r.paid, r.balance].map(cell).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `clan-marketers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function aSalePage() {
  view(`
  <form class="card" id="sf" novalidate>
    <div class="stack"><h1>تسجيل بيعة</h1><p class="lead">سجّل البيعة <b>بعد ما العميل يأكد الدفع</b> بس. العمولة بتتحسب لوحدها.</p></div>
    <label class="f">كود المسوق<input id="s-code" dir="ltr" placeholder="M001" autocomplete="off"></label>
    <div class="peek" id="s-peek" hidden></div>
    <div class="row2">
      <label class="f">اسم العميل / البيزنس<input id="s-client"></label>
      <label class="f">موبايل العميل <span class="opt">(بيمنع التكرار)</span><input id="s-cphone" type="tel" dir="ltr"></label>
    </div>
    <div class="row2">
      <label class="f">الخدمة<select id="s-service"><option value="">اختار…</option>${opts(SERVICES)}</select></label>
      <label class="f">البلد<input id="s-country" value="مصر"></label>
    </div>
    <label class="f">ملاحظات <span class="opt">(اختياري، مش بتظهر للمسوق)</span><textarea id="s-notes" rows="2"></textarea></label>
    <div class="err" id="s-err" hidden></div>
    <div class="note" id="s-dup" hidden></div>
    <button class="btn gold" id="s-btn">سجّل البيعة</button>
  </form>
  <div id="s-ok"></div>`);
  codePeek($('#s-code'), $('#s-peek'));
  async function submit(force) {
    showErr($('#s-err'), ''); $('#s-dup').hidden = true;
    const args = { p_code: $('#s-code').value, p_client: $('#s-client').value, p_client_phone: $('#s-cphone').value,
      p_country: $('#s-country').value, p_service: $('#s-service').value, p_notes: $('#s-notes').value, p_force: !!force };
    if (!args.p_code.trim()) return showErr($('#s-err'), 'اكتب كود المسوق');
    try {
      const r = await busy($('#s-btn'), 'بنسجّل…', () => rpc('staff_add_sale', args));
      if (r.duplicate) {
        $('#s-dup').hidden = false;
        $('#s-dup').innerHTML = `⚠️ العميل ده متسجل قبل كده: بيعة رقم <b>${esc(r.id)}</b> يوم ${fdate(r.date)} لكود <b class="ltr">${esc(r.code)}</b> (${esc(r.service)}).
          <div class="actions" style="margin-top:10px"><button type="button" class="btn sm" id="s-force">دي بيعة جديدة، سجّلها برضه</button></div>`;
        $('#s-force').addEventListener('click', () => submit(true));
        return;
      }
      $('#s-ok').innerHTML = `<div class="okbox">✓ اتسجلت بيعة رقم ${esc(r.id)} لـ ${esc(r.name)} (<span class="ltr">${esc(r.code)}</span>). بقى عنده ${num(r.sales_count)} بيعة.</div>`;
      ['#s-client', '#s-cphone', '#s-notes'].forEach(s => { $(s).value = ''; }); $('#s-service').value = '';
      toast('البيعة اتسجلت ✓');
    } catch (m) { showErr($('#s-err'), m); }
  }
  $('#sf').addEventListener('submit', e => { e.preventDefault(); submit(false); });
}

function aPayPage() {
  view(`
  <form class="card" id="pf" novalidate>
    <div class="stack"><h1>تسجيل تحويل</h1><p class="lead">حوّل للمسوق الأول على إنستاباي أو فودافون كاش، وبعدين سجّل المبلغ هنا.</p></div>
    <label class="f">كود المسوق<input id="p-code" dir="ltr" placeholder="M001" autocomplete="off"></label>
    <div class="peek" id="p-peek" hidden></div>
    <div class="row2">
      <label class="f">المبلغ (جنيه)<input id="p-amount" inputmode="decimal" dir="ltr"></label>
      <label class="f">اتحوّل على<select id="p-method">${opts(METHODS)}</select></label>
    </div>
    <label class="f">ملاحظات <span class="opt">(مثلًا رقم العملية)</span><input id="p-notes"></label>
    <div class="note" id="p-verify-box" hidden>
      <b>⚠️ رقم التحويل ده لسه ما اتأكدش.</b> أي حد يقدر يسجّل برقم مش بتاعه، فقبل أول تحويل كلّم المسوق
      على رقم موبايله واتأكد إن رقم التحويل بتاعه فعلًا.
      <label class="f" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="p-verify" style="width:auto"> اتصلت بالمسوق واتأكدت إن الرقم ده بتاعه</label>
    </div>
    <div class="err" id="p-err" hidden></div>
    <button class="btn gold" id="p-btn">سجّل التحويل</button>
  </form>
  <div id="p-ok"></div>`);
  const inp = $('#p-code');
  let verified = true;
  const run = codePeek(inp, $('#p-peek'), a => {
    $('#p-verify-box').hidden = true; verified = true;
    if (!a) return;
    $('#p-amount').value = a.balance > 0 ? a.balance : '';
    if (a.pay_method) $('#p-method').value = a.pay_method;
    $('#p-peek').innerHTML += `<br>التحويل على ${esc(a.pay_method || '')}: <b class="ltr">${esc(a.pay_number || '')}</b> ${a.payout_verified ? '<span class="pill ok">متأكدين منه ✓</span>' : '<span class="pill no">مش متأكد</span>'}`
      + (a.same_payout && a.same_payout.length ? `<br><b style="color:var(--bad)">تنبيه: نفس رقم التحويل مستخدم في: ${a.same_payout.map(esc).join('، ')}</b>` : '');
    verified = !!a.payout_verified; $('#p-verify-box').hidden = verified; $('#p-verify').checked = false;
  });
  if (PREFILL) { inp.value = PREFILL; PREFILL = null; run(); }
  $('#pf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#p-err'), '');
    const amount = Number(digits($('#p-amount').value).replace(/[^\d.]/g, ''));
    if (!inp.value.trim()) return showErr($('#p-err'), 'اكتب كود المسوق');
    if (!(amount > 0)) return showErr($('#p-err'), 'اكتب المبلغ');
    if (!verified && !$('#p-verify').checked) return showErr($('#p-err'), 'اتأكد من رقم التحويل الأول وعلّم على المربع');
    try {
      const r = await busy($('#p-btn'), 'بنسجّل…', () => rpc('admin_add_payout', { p_code: inp.value, p_amount: amount, p_method: $('#p-method').value, p_notes: $('#p-notes').value, p_verified: !verified && $('#p-verify').checked }));
      if (!verified) { verified = true; $('#p-verify-box').hidden = true; }
      $('#p-ok').innerHTML = `<div class="okbox">✓ اتسجل التحويل لـ ${esc(r.name)}. الباقي ليه دلوقتي ${money(r.balance)}.</div>`;
      $('#p-amount').value = ''; $('#p-notes').value = ''; toast('التحويل اتسجل ✓');
    } catch (m) { showErr($('#p-err'), m); }
  });
}

function aMkPage() {
  let off = 0, query = '';
  view(`
  <form class="card" id="qf" novalidate>
    <h1>المسوقين</h1>
    <div class="row2" style="grid-template-columns:1fr auto">
      <input id="q" placeholder="دوّر بالكود أو الاسم أو الموبايل">
      <button class="btn" id="q-btn">دوّر</button>
    </div>
    <div class="err" id="q-err" hidden></div>
    <div class="list" id="q-res"></div>
    <button type="button" class="btn ghost sm" id="q-more" hidden>اعرض أكتر</button>
  </form>
  <div id="det" style="display:grid;gap:16px"></div>`);
  const res = $('#q-res'), det = $('#det');
  async function load(append) {
    showErr($('#q-err'), '');
    try {
      const rows = await rpc('admin_marketers', { q: query, lim: 50, off });
      const html = rows.map(m => `
        <div class="item click" data-code="${esc(m.code)}"><div class="main"><b>${esc(m.name)}</b>
          <span class="sub"><span class="ltr">${esc(m.code)}</span> · ${esc(m.gov || '')} · <span class="ltr">${esc(m.phone)}</span> · ${num(m.sales_count)} بيعة${m.role !== 'marketer' ? ' · ' + esc(ROLES[m.role]) : ''}</span></div>
          <div class="end">${m.balance > 0 ? `<span class="amt">${money(m.balance)}</span>` : ''}${pill(m.status)}</div></div>`).join('');
      res.innerHTML = append ? res.innerHTML + html : (html || '<p class="empty">مفيش نتايج.</p>');
      $('#q-more').hidden = rows.length < 50;
      if (!append && rows.length === 1 && query) open(rows[0].code);
    } catch (m) { showErr($('#q-err'), m); }
  }
  $('#qf').addEventListener('submit', e => { e.preventDefault(); query = $('#q').value.trim(); off = 0; det.innerHTML = ''; load(false); });
  $('#q-more').addEventListener('click', () => { off += 50; load(true); });
  res.addEventListener('click', e => { const r = e.target.closest('[data-code]'); if (r) open(r.dataset.code); });
  if (PREFILL) { query = PREFILL; $('#q').value = PREFILL; PREFILL = null; load(false); open(query); }
  else load(false);

  async function open(code) {
    det.innerHTML = '<div class="card"><p class="empty">جاري التحميل…</p></div>';
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    let a;
    try { a = await rpc('admin_marketer', { p_code: code }); }
    catch (m) { det.innerHTML = `<div class="card"><p class="err">${esc(m)}</p></div>`; return; }
    const blocked = a.status === 'blocked';
    det.innerHTML = `
    <div class="card">
      <div class="head"><div class="stack"><h2>${esc(a.name)} <span class="ltr">${esc(a.code)}</span></h2>
        <span class="muted" style="font-size:13.5px">${esc(a.age || '')} سنة · ${esc(a.gov || '')} · خبرة: ${esc(a.exp || '-')} · اتسجل ${fdate(a.created_at)}</span>
        <span class="muted" style="font-size:13.5px">موبايل <span class="ltr">${esc(a.phone)}</span> · ${esc(a.pay_method || '')} <span class="ltr">${esc(a.pay_number || '')}</span>
          ${a.payout_verified ? `<span class="pill ok">رقم التحويل متأكد ✓</span>` : `<span class="pill no">رقم التحويل مش متأكد</span>`}</span>
        <span class="muted" style="font-size:13.5px">${a.terms_accepted_at ? `وافق على الشروط يوم ${fdate(a.terms_accepted_at)}${a.terms_version !== TERMS_VERSION ? ' (نسخة قديمة)' : ''}` : '<span class="pill no">لسه ما وافقش على الشروط</span>'}</span>
        ${a.same_payout && a.same_payout.length ? `<span style="color:var(--bad);font-weight:600;font-size:13.5px">⚠️ نفس رقم التحويل مستخدم في: ${a.same_payout.map(esc).join('، ')}</span>` : ''}</div>
        ${pill(a.status)}</div>
      <div class="stats">
        <div class="stat hl"><small>الباقي ليه</small><b>${money(a.balance)}</b></div>
        <div class="stat"><small>بيعات الشهر</small><b>${num(a.month_sales)}</b></div>
        <div class="stat"><small>كل البيعات</small><b>${num(a.sales_count)}</b></div>
        <div class="stat"><small>اتحوّله</small><b>${money(a.paid)}</b></div>
      </div>
      <div class="actions">
        ${a.balance > 0 ? '<button class="btn sm gold" id="m-pay">سجّل تحويل</button>' : ''}
        <button class="btn sm ${blocked ? '' : 'danger'}" id="m-st">${blocked ? 'فعّل الحساب' : 'أوقف الحساب'}</button>
      </div>
      <div class="row2">
        ${isSuper() ? `<label class="f">الصلاحية <span class="opt">(ترقية)</span><select id="m-role">${Object.keys(ROLES).map(k => `<option value="${k}"${k === a.role ? ' selected' : ''}>${ROLES[k]}</option>`).join('')}</select></label>` : ''}
        <label class="f">باسورد جديد <span class="opt">(لو نسي الباسورد، ${MIN_PW} حروف على الأقل)</span>
          <span style="display:flex;gap:8px"><input id="m-pw" type="password" dir="ltr" autocomplete="new-password"><button type="button" class="btn sm" id="m-pw-btn">غيّر</button></span></label>
      </div>
    </div>
    <div class="card"><h2>البيعات</h2><div class="list" id="m-sales">${a.sales.length ? a.sales.map(s => `
      <div class="item"><div class="main"><b>${esc(s.client_name)} · ${esc(s.service)}</b>
        <span class="sub">رقم ${esc(s.id)} · ${fdate(s.created_at)}${s.client_phone ? ' · <span class="ltr">' + esc(s.client_phone) + '</span>' : ''} · ${esc(s.country)}${s.created_by_name ? ' · سجّلها ' + esc(firstName(s.created_by_name)) : ' · سجّلها فريق تاني'}${s.notes ? ' · ' + esc(s.notes) : ''}</span></div>
        <div class="end">${s.status === 'cancelled' ? pill('cancelled') : `<span class="amt">${money(s.amount)}</span>${s.can_cancel ? `<button class="btn sm danger" data-cancel="${esc(s.id)}">إلغاء</button>` : ''}`}</div></div>`).join('')
      : '<p class="empty">مفيش بيعات.</p>'}</div></div>
    <div class="card"><h2>التحويلات</h2><div class="list">${a.payouts.length ? a.payouts.map(p => `
      <div class="item"><div class="main"><b>${esc(p.method || '')}</b><span class="sub">${fdate(p.created_at)}${p.created_by_name ? ' · سجّله ' + esc(firstName(p.created_by_name)) : ''}${p.notes ? ' · ' + esc(p.notes) : ''}</span></div>
      <div class="end"><span class="amt">${money(p.amount)}</span></div></div>`).join('') : '<p class="empty">مفيش تحويلات.</p>'}</div></div>`;
    const mp = $('#m-pay', det); if (mp) mp.addEventListener('click', () => { PREFILL = a.code; location.hash = 'a-pay'; });
    $('#m-st', det).addEventListener('click', async e => {
      if (!twoStep(e.target)) return;
      try { await rpc('admin_set_status', { p_code: a.code, p_status: blocked ? 'active' : 'blocked' }); toast('اتعدّل ✓'); open(a.code); }
      catch (m) { toast(m); }
    });
    const roleSel = $('#m-role', det);
    if (roleSel) roleSel.addEventListener('change', async e => {
      const to = e.target.value;
      try {
        await rpc('super_set_role', { p_code: a.code, p_role: to, p_manager_code: null });
        toast(to === 'employee' ? 'بقى موظف ✓ اختار الأدمن بتاعه من «الفريق»' : 'الصلاحية اتغيرت ✓'); open(a.code);
      } catch (m) { toast(m); e.target.value = a.role; }
    });
    $('#m-pw-btn', det).addEventListener('click', async e => {
      const pw = $('#m-pw', det).value.trim();
      if (pw.length < MIN_PW) return toast(`الباسورد لازم ${MIN_PW} حروف أو أرقام على الأقل`);
      try { await busy(e.target, '…', () => rpc('admin_reset_password', { p_code: a.code, p_password: pw })); toast('الباسورد اتغيّر. ابعته للمسوق ✓'); }
      catch (m) { toast(m); }
    });
    $('#m-sales', det).addEventListener('click', async e => {
      const b = e.target.closest('[data-cancel]'); if (!b || !twoStep(b, 'متأكد؟')) return;
      try { await rpc('admin_cancel_sale', { p_id: Number(b.dataset.cancel) }); toast('البيعة اتلغت'); open(a.code); }
      catch (m) { toast(m); }
    });
  }
}

/* ---------- الاستعلام ---------- */
function cairoToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date()); }
function dateRange(preset) {
  const t = cairoToday(), d = new Date(t + 'T00:00:00Z');
  const iso = x => x.toISOString().slice(0, 10);
  const shift = (x, n) => { const y = new Date(x); y.setUTCDate(y.getUTCDate() + n); return y; };
  if (preset === 'today') return [t, t];
  if (preset === 'week') return [iso(shift(d, -((d.getUTCDay() + 1) % 7))), t];
  if (preset === 'month') return [t.slice(0, 8) + '01', t];
  if (preset === 'last') { const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)); const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)); return [iso(first), iso(end)]; }
  return ['', ''];
}
function csvDownload(name, head, rows) {
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [head.map(cell).join(',')].concat(rows.map(r => r.map(cell).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${name}-${cairoToday()}.csv`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function fetchAll(fn, args) {
  let rows = [], off = 0;
  for (;;) {
    const r = await rpc(fn, Object.assign({}, args, { lim: 500, off }));
    rows = rows.concat(r.rows); off += 500;
    if (r.rows.length < 500 || rows.length >= 50000) return rows;
  }
}

function aDataPage() {
  let tab = 'sales', off = 0, args = {};
  const PRESETS = [['today', 'النهاردة'], ['week', 'الأسبوع ده'], ['month', 'الشهر ده'], ['last', 'الشهر اللي فات'], ['all', 'كله']];
  const presetBtns = `<div class="seg" id="d-pre">${PRESETS.map(([k, l]) => `<button type="button" data-p="${k}"${k === 'month' ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`;
  const dates = `<div class="row2"><label class="f">من تاريخ<input type="date" id="d-from"></label><label class="f">لحد تاريخ<input type="date" id="d-to"></label></div>`;
  const staffBox = isAdmin() ? `<label class="f">سجّلها <span class="opt">(كود الموظف، اختياري)</span><input id="d-staff" dir="ltr" placeholder="${isSuper() ? 'الكل' : 'إنت وفريقك'}"></label>` : '';
  const forms = {
    sales: `${presetBtns}${dates}
      <div class="row2"><label class="f">العميل <span class="opt">(اسم أو موبايل)</span><input id="d-q"></label><label class="f">كود المسوق<input id="d-code" dir="ltr" placeholder="الكل"></label></div>
      ${staffBox ? `<div class="row2">${staffBox}<span></span></div>` : ''}
      <div class="row3"><label class="f">الخدمة<select id="d-service"><option value="">الكل</option>${opts(SERVICES)}</select></label>
        <label class="f">البلد<input id="d-country" placeholder="الكل"></label>
        <label class="f">الحالة<select id="d-status"><option value="">الكل</option><option value="confirmed">مؤكدة</option><option value="cancelled">ملغية</option></select></label></div>`,
    payouts: `${presetBtns}${dates}
      <div class="row2"><label class="f">كود المسوق<input id="d-code" dir="ltr" placeholder="الكل"></label>
        <label class="f">الطريقة<select id="d-method"><option value="">الكل</option>${opts(METHODS)}</select></label></div>
      ${staffBox ? `<div class="row2">${staffBox.replace('سجّلها', 'سجّله')}<span></span></div>` : ''}`,
    marketers: `<div class="row2"><label class="f">بحث <span class="opt">(اسم، كود، موبايل)</span><input id="d-q"></label>
        <label class="f">المحافظة<select id="d-gov"><option value="">الكل</option>${opts(GOVS)}</select></label></div>
      <div class="row3"><label class="f">الحالة<select id="d-status"><option value="">الكل</option><option value="active">نشط</option><option value="blocked">موقوف</option></select></label>
        ${isSuper() ? `<label class="f">الصلاحية<select id="d-role"><option value="">الكل</option>${Object.keys(ROLES).map(k => `<option value="${k}">${ROLES[k]}</option>`).join('')}</select></label>` : ''}
        <label class="f">ترتيب حسب<select id="d-sort"><option value="new">الأحدث</option><option value="month">بيعات الشهر</option><option value="sales">كل البيعات</option><option value="balance">الباقي ليه</option></select></label></div>`
  };
  view(`
  <div class="card">
    <div class="stack"><h1>الاستعلام</h1><p class="lead">${isSuper() ? 'دوّر في كل البيانات' : isAdmin() ? 'دوّر في شغلك وشغل موظفينك' : 'دوّر في البيعات اللي إنت سجّلتها'}، وشوف الإجماليات، وصدّر النتيجة Excel.</p></div>
    <div class="seg" id="d-tabs"><button class="on" data-t="sales">البيعات</button>${isAdmin() ? '<button data-t="payouts">التحويلات</button><button data-t="marketers">المسوقين</button>' : ''}</div>
    <form id="d-form" novalidate></form>
    <div class="actions"><button class="btn" id="d-go" form="d-form">اعرض</button><button type="button" class="btn ghost" id="d-clear">امسح الفلاتر</button><button type="button" class="btn ghost" id="d-exp">تصدير Excel</button></div>
  </div>
  <div class="card"><div class="stats" id="d-sum"></div><div class="err" id="d-err" hidden></div><div class="list" id="d-rows"></div>
    <button type="button" class="btn ghost sm" id="d-more" hidden>اعرض أكتر</button></div>`);
  const form = $('#d-form');
  function setPreset(p) {
    const [a, b] = dateRange(p); if ($('#d-from')) { $('#d-from').value = a; $('#d-to').value = b; }
    $$('#d-pre button').forEach(x => x.classList.toggle('on', x.dataset.p === p));
  }
  function drawForm() {
    form.innerHTML = forms[tab];
    if ($('#d-pre')) { setPreset('month'); $('#d-pre').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { setPreset(b.dataset.p); run(false); } }); }
    ['#d-from', '#d-to'].forEach(s => { const el = $(s); if (el) el.addEventListener('change', () => $$('#d-pre button').forEach(x => x.classList.remove('on'))); });
  }
  const v = s => { const el = $(s); return el ? el.value.trim() : ''; };
  function collect() {
    if (tab === 'sales') return { p_q: v('#d-q') || null, p_code: v('#d-code') || null, p_from: v('#d-from') || null, p_to: v('#d-to') || null, p_status: v('#d-status') || null, p_service: v('#d-service') || null, p_country: v('#d-country') || null, p_staff_code: v('#d-staff') || null };
    if (tab === 'payouts') return { p_code: v('#d-code') || null, p_from: v('#d-from') || null, p_to: v('#d-to') || null, p_method: v('#d-method') || null, p_staff_code: v('#d-staff') || null };
    return { p_q: v('#d-q') || null, p_gov: v('#d-gov') || null, p_status: v('#d-status') || null, p_role: v('#d-role') || null, p_sort: v('#d-sort') || 'new' };
  }
  const FN = { sales: 'staff_sales_query', payouts: 'admin_payouts_query', marketers: 'admin_marketers_query' };
  const mk = (code, name) => isAdmin() ? `<a href="#a-mk" data-mk="${esc(code)}">${esc(name)} <span class="ltr">${esc(code)}</span></a>` : `${esc(name)} <span class="ltr">${esc(code)}</span>`;
  const ROW = {
    sales: s => `<div class="item"><div class="main"><b>${esc(s.client_name)} · ${esc(s.service)}</b>
      <span class="sub">رقم ${esc(s.id)} · ${fdate(s.created_at)} · ${mk(s.code, s.marketer_name)}${s.client_phone ? ' · <span class="ltr">' + esc(s.client_phone) + '</span>' : ''} · ${esc(s.country)}${s.created_by_name ? ' · سجّلها ' + esc(firstName(s.created_by_name)) : ''}${s.notes ? ' · ' + esc(s.notes) : ''}</span></div>
      <div class="end">${s.status === 'cancelled' ? pill('cancelled') : `<span class="amt">${money(s.amount)}</span>`}</div></div>`,
    payouts: p => `<div class="item"><div class="main"><b>${mk(p.code, p.marketer_name)}</b>
      <span class="sub">${fdate(p.created_at)} · ${esc(p.method || '')}${p.created_by_name ? ' · سجّله ' + esc(firstName(p.created_by_name)) : ''}${p.notes ? ' · ' + esc(p.notes) : ''}</span></div>
      <div class="end"><span class="amt">${money(p.amount)}</span></div></div>`,
    marketers: m => `<div class="item"><div class="main"><b>${mk(m.code, m.name)}</b>
      <span class="sub">${esc(m.gov || '')} · <span class="ltr">${esc(m.phone)}</span> · اتسجل ${fdate(m.created_at)}${m.role !== 'marketer' ? ' · ' + esc(ROLES[m.role]) : ''}</span>
      <span class="sub">بيعات الشهر ${num(m.month_sales)} · كل البيعات ${num(m.sales_count)} · اتحوّله ${money(m.paid)}</span></div>
      <div class="end">${m.balance > 0 ? `<span class="amt">${money(m.balance)}</span>` : ''}${pill(m.status)}</div></div>`
  };
  const SUM = {
    sales: r => [['عدد البيعات المؤكدة', num(r.confirmed)], ['إجمالي العمولات', money(r.amount)], ['مسوقين باعوا', num(r.marketers)], ['كل النتايج (مع الملغية)', num(r.count)]],
    payouts: r => [['عدد التحويلات', num(r.count)], ['إجمالي المحوّل', money(r.amount)]],
    marketers: r => [['عدد المسوقين', num(r.count)], ['مستحق ليهم', money(r.balance)]]
  };
  async function run(more) {
    showErr($('#d-err'), '');
    if (!more) { off = 0; args = collect(); if (args.p_from && args.p_to && args.p_from > args.p_to) return showErr($('#d-err'), '«من تاريخ» لازم يكون قبل «لحد تاريخ»'); }
    try {
      const r = await busy($('#d-go'), 'بندوّر…', () => rpc(FN[tab], Object.assign({}, args, { lim: 50, off })));
      if (!more) $('#d-sum').innerHTML = SUM[tab](r).map(([l, x], i) => `<div class="stat${i ? '' : ' hl'}"><small>${l}</small><b>${x}</b></div>`).join('');
      const html = r.rows.map(ROW[tab]).join('');
      $('#d-rows').innerHTML = more ? $('#d-rows').innerHTML + html : (html || '<p class="empty">مفيش نتايج بالفلاتر دي.</p>');
      $('#d-more').hidden = r.rows.length < 50;
    } catch (m) { showErr($('#d-err'), m); }
  }
  $('#d-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    tab = b.dataset.t; $$('#d-tabs button').forEach(x => x.classList.toggle('on', x === b));
    drawForm(); $('#d-sum').innerHTML = ''; $('#d-rows').innerHTML = ''; run(false);
  });
  form.addEventListener('submit', e => { e.preventDefault(); run(false); });
  $('#d-clear').addEventListener('click', () => { drawForm(); run(false); });
  $('#d-more').addEventListener('click', () => { off += 50; run(true); });
  $('#d-rows').addEventListener('click', e => { const a = e.target.closest('[data-mk]'); if (a) { e.preventDefault(); PREFILL = a.dataset.mk; location.hash = 'a-mk'; } });
  $('#d-exp').addEventListener('click', e => busy(e.target, 'بنجهّز…', async () => {
    const a = collect(), rows = await fetchAll(FN[tab], a);
    if (!rows.length) throw 'مفيش نتايج تتصدّر';
    if (tab === 'sales') csvDownload('clan-sales', ['رقم','التاريخ','كود المسوق','المسوق','العميل','موبايل العميل','البلد','الخدمة','العمولة','الحالة','سجّلها','ملاحظات'],
      rows.map(s => [s.id, fdate(s.created_at), s.code, s.marketer_name, s.client_name, s.client_phone ? '\t' + s.client_phone : '', s.country, s.service, s.amount, s.status === 'cancelled' ? 'ملغية' : 'مؤكدة', s.created_by_name, s.notes]));
    else if (tab === 'payouts') csvDownload('clan-payouts', ['رقم','التاريخ','كود المسوق','المسوق','المبلغ','الطريقة','سجّله','ملاحظات'],
      rows.map(p => [p.id, fdate(p.created_at), p.code, p.marketer_name, p.amount, p.method, p.created_by_name, p.notes]));
    else csvDownload('clan-marketers', ['الكود','الاسم','الموبايل','المحافظة','الخبرة','الصلاحية','الحالة','طريقة التحويل','رقم التحويل','تاريخ التسجيل','بيعات الشهر','كل البيعات','إجمالي العمولة','اتحوّل','الباقي'],
      rows.map(m => [m.code, m.name, '\t' + m.phone, m.gov, m.exp, ROLES[m.role] || m.role, m.status === 'blocked' ? 'موقوف' : 'نشط', m.pay_method, m.pay_number ? '\t' + m.pay_number : '', fdate(m.created_at), m.month_sales, m.sales_count, m.earned, m.paid, m.balance]));
  }).catch(m => toast(m)));
  drawForm();
  if (STAFF_PREFILL && $('#d-staff')) { $('#d-staff').value = STAFF_PREFILL; setPreset('all'); }
  STAFF_PREFILL = null;
  run(false);
}

/* ---------- الفريق: الموظف نفسه، الأدمن نفسه وموظفينه، السوبر الكل ---------- */
let STAFF_PREFILL = null;
async function aTeamPage() {
  loading();
  const team = await rpc('staff_team');
  const admins = team.filter(t => t.role === 'admin' && t.status === 'active');
  const card = t => {
    const me = t.code === ME.code, canManage = isSuper() && !me;
    return `<div class="card" data-code="${esc(t.code)}">
      <div class="head"><div class="stack"><h2>${esc(t.name)} <span class="ltr">${esc(t.code)}</span>${me ? ' <span class="pill mid">إنت</span>' : ''}</h2>
        <span class="muted" style="font-size:13.5px">${esc(ROLES[t.role] || t.role)}${t.role === 'employee' ? ' · ' + (t.manager_name ? 'تبع ' + esc(t.manager_name) : 'مش متوزع على أدمن') : ''}${t.role === 'admin' ? ' · ' + num(t.team_size) + ' موظف' : ''} · <span class="ltr">${esc(t.phone)}</span></span>
        <span class="muted" style="font-size:13.5px">آخر عملية: ${t.last_action ? fdate(t.last_action) : 'لسه'}</span></div>
        ${pill(t.status)}</div>
      <div class="stats">
        <div class="stat"><small>بيعات سجّلها الشهر ده</small><b>${num(t.sales_month)}</b></div>
        <div class="stat"><small>كل البيعات اللي سجّلها</small><b>${num(t.sales_total)}</b></div>
        ${t.role !== 'employee' ? `<div class="stat"><small>حوّل الشهر ده</small><b>${money(t.paid_month)}</b></div>` : ''}
      </div>
      <div class="actions">
        <button class="btn sm ghost" data-work="${esc(t.code)}">شوف شغله</button>
        <button class="btn sm ghost" data-log="${esc(t.code)}">سجل عملياته</button>
      </div>
      ${canManage ? `<div class="row3">
        <label class="f">الصلاحية<select data-role>${['employee', 'admin', 'super_admin'].map(k => `<option value="${k}"${k === t.role ? ' selected' : ''}>${ROLES[k]}</option>`).join('')}</select></label>
        ${t.role === 'employee' ? `<label class="f">تبع أنهي أدمن<select data-mgr><option value="">من غير أدمن</option>${admins.map(a => `<option value="${esc(a.code)}"${a.code === t.manager_code ? ' selected' : ''}>${esc(a.name)} (${esc(a.code)})</option>`).join('')}</select></label>` : '<span></span>'}
        <label class="f">باسورد جديد<span style="display:flex;gap:8px"><input data-pw type="password" dir="ltr" autocomplete="new-password"><button type="button" class="btn sm" data-pw-btn>غيّر</button></span></label>
      </div>
      <div class="actions">
        <button class="btn sm ${t.status === 'blocked' ? '' : 'ghost'}" data-st="${t.status === 'blocked' ? 'active' : 'blocked'}">${t.status === 'blocked' ? 'فعّل الحساب' : 'أوقف مؤقتًا'}</button>
        <button class="btn sm danger" data-fire>رفد</button>
      </div>` : ''}
    </div>`;
  };
  view(`
  <div class="card">
    <div class="stack"><h1>الفريق</h1><p class="lead">${isSuper() ? 'كل الموظفين والأدمنز. من هنا بتتابع شغلهم، وترقّي، وتوزّع الموظفين على الأدمنز، وترفد.' : isAdmin() ? 'إنت والموظفين اللي تحتك. الترقية والرفد عند السوبر أدمن.' : 'شغلك إنت.'}</p></div>
    ${isSuper() ? `<p class="note">عشان تضيف موظف جديد: خليه يسجّل في الموقع عادي، وبعدين افتح حسابه من «المسوقين» وغيّر صلاحيته لـ «موظف» أو «أدمن».</p>` : ''}
  </div>
  <div id="team" style="display:grid;gap:16px">${team.map(card).join('') || '<div class="card"><p class="empty">مفيش موظفين لسه.</p></div>'}</div>`);
  const box = $('#team');
  box.addEventListener('click', async e => {
    const c = e.target.closest('[data-code]'); if (!c) return; const code = c.dataset.code;
    if (e.target.closest('[data-work]')) { STAFF_PREFILL = code; location.hash = 'a-data'; return; }
    if (e.target.closest('[data-log]')) { STAFF_PREFILL = code; location.hash = 'a-log'; return; }
    const st = e.target.closest('[data-st]');
    if (st) { if (!twoStep(st)) return; try { await rpc('admin_set_status', { p_code: code, p_status: st.dataset.st }); toast('اتعدّل ✓'); route(); } catch (m) { toast(m); } return; }
    const fire = e.target.closest('[data-fire]');
    if (fire) { if (!twoStep(fire, 'متأكد؟ هيترفد ويتقفل حسابه')) return; try { await rpc('super_fire', { p_code: code }); toast('اترفد ✓'); route(); } catch (m) { toast(m); } return; }
    const pwb = e.target.closest('[data-pw-btn]');
    if (pwb) {
      const pw = $('[data-pw]', c).value.trim();
      if (pw.length < MIN_PW) return toast(`الباسورد لازم ${MIN_PW} حروف أو أرقام على الأقل`);
      try { await busy(pwb, '…', () => rpc('admin_reset_password', { p_code: code, p_password: pw })); $('[data-pw]', c).value = ''; toast('الباسورد اتغيّر ✓'); } catch (m) { toast(m); }
    }
  });
  box.addEventListener('change', async e => {
    const c = e.target.closest('[data-code]'); if (!c) return; const code = c.dataset.code;
    try {
      if (e.target.matches('[data-role]')) { await rpc('super_set_role', { p_code: code, p_role: e.target.value, p_manager_code: null }); toast('الصلاحية اتغيرت ✓'); route(); }
      if (e.target.matches('[data-mgr]')) { await rpc('super_set_manager', { p_employee_code: code, p_admin_code: e.target.value || null }); toast('اتنقل ✓'); route(); }
    } catch (m) { toast(m); route(); }
  });
}

/* ---------- سجل العمليات ---------- */
async function aLogPage() {
  let off = 0, args = {};
  view(`
  <form class="card" id="lgf" novalidate>
    <div class="stack"><h1>سجل العمليات</h1><p class="lead">كل عملية بتتسجل هنا بالوقت واللي عملها، ومحدش يقدر يعدّلها أو يمسحها.${isSuper() ? '' : isAdmin() ? ' إنت شايف عملياتك وعمليات موظفينك.' : ' إنت شايف عملياتك إنت.'}</p></div>
    <div class="row3">
      ${isAdmin() ? `<label class="f">كود الموظف<input id="lg-actor" dir="ltr" placeholder="الكل"></label>` : ''}
      <label class="f">نوع العملية<select id="lg-action"><option value="">الكل</option>${Object.keys(ACTIONS).map(k => `<option value="${k}">${ACTIONS[k]}</option>`).join('')}</select></label>
      <label class="f">من تاريخ<input type="date" id="lg-from"></label>
    </div>
    <button class="btn" id="lg-go">اعرض</button>
  </form>
  <div class="card"><p class="muted" id="lg-count"></p><div class="err" id="lg-err" hidden></div><div class="list" id="lg-rows"></div>
    <button type="button" class="btn ghost sm" id="lg-more" hidden>اعرض أكتر</button></div>`);
  if (STAFF_PREFILL && $('#lg-actor')) $('#lg-actor').value = STAFF_PREFILL;
  STAFF_PREFILL = null;
  const detail = r => {
    const d = r.details || {};
    if (r.action === 'add_sale' || r.action === 'cancel_sale') return `بيعة رقم ${esc(d.sale_id)}${d.client ? ' · ' + esc(d.client) : ''}${d.amount ? ' · ' + money(d.amount) : ''}${d.forced ? ' · رغم التكرار' : ''}`;
    if (r.action === 'payout') return `${money(d.amount)}${d.to ? ' على <span class="ltr">' + esc(d.to) + '</span>' : ''}`;
    if (r.action === 'set_role') return `من ${esc(ROLES[d.from] || d.from)} لـ ${esc(ROLES[d.to] || d.to)}`;
    if (r.action === 'fire') return `كان ${esc(ROLES[d.was] || d.was)}`;
    if (r.action === 'set_manager') return d.admin ? `بقى تبع <span class="ltr">${esc(d.admin)}</span>` : 'من غير أدمن';
    if (r.action === 'setting') return `${esc(JSON.stringify(d.from))} ← ${esc(JSON.stringify(d.to))}`;
    return '';
  };
  async function run(more) {
    showErr($('#lg-err'), '');
    if (!more) { off = 0; args = { p_actor_code: ($('#lg-actor') ? $('#lg-actor').value.trim() : '') || null, p_action: $('#lg-action').value || null, p_from: $('#lg-from').value || null }; }
    try {
      const r = await busy($('#lg-go'), '…', () => rpc('staff_audit', Object.assign({}, args, { lim: 50, off })));
      $('#lg-count').textContent = `${num(r.count)} عملية`;
      const html = r.rows.map(x => `<div class="item"><div class="main"><b>${esc(ACTIONS[x.action] || x.action)}${x.target ? ' · <span class="ltr">' + esc(x.target) + '</span>' : ''}</b>
        <span class="sub">${esc(x.actor_name || 'حساب اتمسح')} ${x.actor_code ? '<span class="ltr">' + esc(x.actor_code) + '</span>' : ''} · ${esc(ROLES[x.actor_role] || '')} · ${new Date(x.at).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'short', timeStyle: 'short' })}</span>
        ${detail(x) ? `<span class="sub">${detail(x)}</span>` : ''}</div></div>`).join('');
      $('#lg-rows').innerHTML = more ? $('#lg-rows').innerHTML + html : (html || '<p class="empty">مفيش عمليات.</p>');
      $('#lg-more').hidden = r.rows.length < 50;
    } catch (m) { showErr($('#lg-err'), m); }
  }
  $('#lgf').addEventListener('submit', e => { e.preventDefault(); run(false); });
  $('#lg-more').addEventListener('click', () => { off += 50; run(true); });
  run(false);
}

async function aContentPage() {
  loading();
  const items = await q(sb.from('content').select('*').order('kind').order('sort').order('id'));
  view(`
  <form class="card" id="cf" novalidate>
    <h1 id="c-title">إضافة محتوى</h1>
    <div class="row2">
      <label class="f">النوع<select id="c-kind">${Object.keys(ALL_KINDS).map(k => `<option value="${k}">${ALL_KINDS[k]}</option>`).join('')}</select></label>
      <label class="f">الترتيب <span class="opt">(الأصغر يظهر الأول)</span><input id="c-sort" inputmode="numeric" value="0" dir="ltr"></label>
    </div>
    <label class="f">العنوان<input id="c-t"></label>
    <label class="f">النص <span class="opt">(اكتب [كودك] ويتحط مكانها كود المسوق لوحده)</span><textarea id="c-body" rows="6"></textarea></label>
    <label class="f">صورة <span class="opt">(اختياري، للستوري مثلًا)</span><input id="c-img" type="file" accept="image/*"></label>
    <div class="err" id="c-err" hidden></div>
    <div class="actions"><button class="btn gold" id="c-btn">احفظ</button><button type="button" class="btn ghost" id="c-cancel" hidden>إلغاء التعديل</button></div>
  </form>
  <div class="card"><h2>المحتوى الموجود (${num(items.length)})</h2>
    <div class="list" id="c-list">${items.map(i => `
      <div class="item"><div class="main"><b>${esc(i.title)}</b><span class="sub">${esc(ALL_KINDS[i.kind] || i.kind)} · ترتيب ${esc(i.sort)}${i.image_url ? ' · فيه صورة' : ''}</span></div>
      <div class="end"><button class="btn sm ghost" data-edit="${i.id}">تعديل</button><button class="btn sm danger" data-del="${i.id}">امسح</button></div></div>`).join('') || '<p class="empty">مفيش محتوى.</p>'}</div>
  </div>`);
  let editing = null;
  function fillForm(i) {
    editing = i; $('#c-title').textContent = i ? 'تعديل محتوى' : 'إضافة محتوى'; $('#c-cancel').hidden = !i;
    $('#c-kind').value = i ? i.kind : 'script'; $('#c-sort').value = i ? i.sort : 0;
    $('#c-t').value = i ? i.title : ''; $('#c-body').value = i ? (i.body || '') : ''; $('#c-img').value = '';
    if (i) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#c-cancel').addEventListener('click', () => fillForm(null));
  $('#c-list').addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return fillForm(items.find(i => String(i.id) === ed.dataset.edit));
    const del = e.target.closest('[data-del]');
    if (del && twoStep(del, 'متأكد؟')) {
      try { await rpc('admin_delete_content', { p_id: Number(del.dataset.del) }); toast('اتمسح'); route(); } catch (m) { toast(m); }
    }
  });
  $('#cf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#c-err'), '');
    const row = { kind: $('#c-kind').value, sort: parseInt(digits($('#c-sort').value), 10) || 0, title: $('#c-t').value.trim(), body: $('#c-body').value.trim() || null };
    if (!row.title) return showErr($('#c-err'), 'اكتب العنوان');
    const file = $('#c-img').files[0];
    if (!row.body && !file && !(editing && editing.image_url)) return showErr($('#c-err'), 'اكتب نص أو ارفع صورة');
    try {
      await busy($('#c-btn'), 'بنحفظ…', async () => {
        if (file) {
          if (file.size > 5 * 1024 * 1024) throw 'الصورة أكبر من 5 ميجا';
          const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[file.type];
          if (!ext) throw 'ارفع صورة بس (PNG أو JPG أو WEBP أو GIF)';
          const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
          const { error } = await sb.storage.from('content').upload(path, file, { contentType: file.type, upsert: false });
          if (error) throw errMsg(error);
          row.image_url = sb.storage.from('content').getPublicUrl(path).data.publicUrl;
        }
        await rpc('admin_save_content', { p_id: editing ? editing.id : null, p_kind: row.kind, p_title: row.title, p_body: row.body, p_image_url: row.image_url || null, p_sort: row.sort });
      });
      toast('اتحفظ ✓'); route();
    } catch (m) { showErr($('#c-err'), m); }
  });
}

async function aNewsPage() {
  loading();
  const rows = await q(sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(100));
  view(`
  <form class="card" id="nf" novalidate>
    <h1>خبر أو تدريب جديد</h1>
    <label class="f">العنوان<input id="n-t"></label>
    <label class="f">الكلام<textarea id="n-body" rows="5"></textarea></label>
    <label class="f">لينك فيديو <span class="opt">(يوتيوب أو أي لينك، اختياري)</span><input id="n-video" dir="ltr" placeholder="https://youtube.com/..."></label>
    <label class="f" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="n-pin" style="width:auto"> ثبّته في الرئيسية عند كل المسوقين</label>
    <div class="err" id="n-err" hidden></div>
    <button class="btn gold" id="n-btn">انشر</button>
  </form>
  <div class="card"><h2>المنشور</h2>
    <div class="list" id="n-list">${rows.map(n => `
      <div class="item"><div class="main"><b>${n.pinned ? '📌 ' : ''}${esc(n.title)}</b><span class="sub">${fdate(n.created_at)}${n.video_url ? ' · فيه فيديو' : ''}</span></div>
      <div class="end"><button class="btn sm ghost" data-pin="${n.id}" data-v="${n.pinned ? 0 : 1}">${n.pinned ? 'شيل التثبيت' : 'ثبّت'}</button><button class="btn sm danger" data-del="${n.id}">امسح</button></div></div>`).join('') || '<p class="empty">مفيش أخبار.</p>'}</div>
  </div>`);
  $('#nf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#n-err'), '');
    const row = { p_id: null, p_title: $('#n-t').value.trim(), p_body: $('#n-body').value.trim() || null, p_video_url: $('#n-video').value.trim() || null, p_pinned: $('#n-pin').checked };
    if (!row.p_title) return showErr($('#n-err'), 'اكتب العنوان');
    if (row.p_video_url && !/^https:\/\//i.test(row.p_video_url)) return showErr($('#n-err'), 'لينك الفيديو لازم يبدأ بـ https://');
    try { await busy($('#n-btn'), 'بننشر…', () => rpc('admin_save_news', row)); toast('اتنشر ✓'); route(); }
    catch (m) { showErr($('#n-err'), m); }
  });
  $('#n-list').addEventListener('click', async e => {
    const p = e.target.closest('[data-pin]');
    if (p) { try { await rpc('admin_pin_news', { p_id: Number(p.dataset.pin), p_pinned: p.dataset.v === '1' }); route(); } catch (m) { toast(m); } return; }
    const d = e.target.closest('[data-del]');
    if (d && twoStep(d, 'متأكد؟')) { try { await rpc('admin_delete_news', { p_id: Number(d.dataset.del) }); toast('اتمسح'); route(); } catch (m) { toast(m); } }
  });
}

async function aSettingsPage() {
  loading();
  const rows = await q(sb.from('settings').select('*'));
  const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const levels = Array.isArray(s.levels) ? s.levels : [];
  while (levels.length < 4) levels.push({ name: '', min: '' });
  view(`
  <div class="card" id="st-b">
    <div class="stack"><h1>نسخة احتياطية</h1>
      <p class="lead">ملف فيه كل البيانات: الحسابات والبيعات والتحويلات والطلبات والمحتوى وسجل العمليات. نزّل نسخة كل أسبوع واحفظها في مكان آمن (مثلًا Google Drive بتاع الشركة).</p>
      <p class="muted" style="font-size:13.5px">⚠️ الملف فيه أرقام موبايلات وبيانات المسوقين، فما تبعتهوش لحد. الباسوردات مش جواه.</p></div>
    <div class="actions"><button class="btn" id="st-b-btn">نزّل نسخة احتياطية دلوقتي</button><span class="muted" id="st-b-msg"></span></div>
  </div>
  <form class="card" id="st-c" novalidate>
    <h1>الإعدادات</h1>
    <label class="f">العمولة على كل بيعة (جنيه) <span class="opt">(بتسري على البيعات الجديدة بس)</span><input id="st-com" inputmode="decimal" dir="ltr" value="${esc(s.commission)}"></label>
    <button class="btn" id="st-com-btn">احفظ العمولة</button>
  </form>
  <form class="card" id="st-l" novalidate>
    <h2>المستويات</h2>
    <p class="lead">المستوى بيتحسب من عدد بيعات المسوق كلها. أول مستوى لازم يبدأ من 0.</p>
    ${levels.map((l, i) => `<div class="row2"><label class="f">اسم المستوى ${i + 1}<input class="lv-n" value="${esc(l.name)}"></label><label class="f">من كام بيعة<input class="lv-m" inputmode="numeric" dir="ltr" value="${esc(l.min)}"></label></div>`).join('')}
    <div class="err" id="st-l-err" hidden></div>
    <button class="btn" id="st-l-btn">احفظ المستويات</button>
  </form>
  <form class="card" id="st-s" novalidate>
    <h2>الخدمات</h2>
    <label class="f">كل خدمة في سطر <span class="opt">(بتظهر في «بيعة جديدة»)</span><textarea id="st-sv" rows="8">${esc((s.services || []).join('\n'))}</textarea></label>
    <button class="btn" id="st-s-btn">احفظ الخدمات</button>
  </form>`);
  $('#st-b-btn').addEventListener('click', e => busy(e.target, 'بنجهّز…', async () => {
    const data = await rpc('super_backup');
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `clan-sales-backup-${cairoToday()}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('#st-b-msg').textContent = `✓ اتنزّلت: ${num(data.profiles.length)} حساب، ${num(data.sales.length)} بيعة، ${num(data.leads.length)} طلب`;
  }).catch(m => toast(m)));
  $('#st-c').addEventListener('submit', async e => {
    e.preventDefault();
    const v = Number(digits($('#st-com').value));
    if (!(v > 0)) return toast('اكتب رقم صح');
    try { await busy($('#st-com-btn'), 'بنحفظ…', () => rpc('super_set_setting', { p_key: 'commission', p_value: v })); toast('اتحفظ ✓'); ME = null; }
    catch (m) { toast(m); }
  });
  $('#st-l').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#st-l-err'), '');
    const names = $$('.lv-n').map(x => x.value.trim()), mins = $$('.lv-m').map(x => parseInt(digits(x.value), 10));
    const lv = names.map((n, i) => ({ name: n, min: mins[i] })).filter(l => l.name);
    if (!lv.length || lv.some(l => !(l.min >= 0))) return showErr($('#st-l-err'), 'كل مستوى محتاج اسم ورقم');
    lv.sort((a, b) => a.min - b.min);
    if (lv[0].min !== 0) return showErr($('#st-l-err'), 'أول مستوى لازم يبدأ من 0');
    try { await busy($('#st-l-btn'), 'بنحفظ…', () => rpc('super_set_setting', { p_key: 'levels', p_value: lv })); toast('اتحفظ ✓'); }
    catch (m) { showErr($('#st-l-err'), m); }
  });
  $('#st-s').addEventListener('submit', async e => {
    e.preventDefault();
    const list = $('#st-sv').value.split('\n').map(x => x.trim()).filter(Boolean);
    if (!list.length) return toast('اكتب خدمة واحدة على الأقل');
    try { await busy($('#st-s-btn'), 'بنحفظ…', () => rpc('super_set_setting', { p_key: 'services', p_value: list })); SERVICES = list; toast('اتحفظ ✓'); }
    catch (m) { toast(m); }
  });
}

/* ================= طلبات العملاء ================= */
const LEAD_ST = { new: 'جديد', contacted: 'اتكلمنا معاه', negotiating: 'بنتفاوض', won: 'تم الديل ✓', lost: 'مش مهتم' };
const LEAD_CLS = { new: 'mid', contacted: 'mid', negotiating: 'gold', won: 'ok', lost: 'no' };
const leadPill = s => `<span class="pill ${LEAD_CLS[s] || 'mid'}">${esc(LEAD_ST[s] || s)}</span>`;
// مصدر العميل: الفريق بيشوف كل المصادر، والمسوق بيشوف من رابطه أو اتصل بكوده
const SRC_STAFF = { marketer: '👤 المسوق سجّله', link: '🔗 من الرابط', call: '📞 من الكول سنتر' };
const SRC_MK = { link: '🔗 من رابطك', call: '📞 اتصل وقال كودك' };
const srcPill = (s, map) => s && s !== 'marketer' && map[s] ? `<span class="pill gold">${map[s]}</span>` : '';
const chips = arr => `<span class="chips">${(arr || []).map(x => `<span class="chip">${esc(x)}</span>`).join('')}</span>`;
const PICKABLE = () => SERVICES.filter(s => s !== 'أكتر من خدمة');

async function leadsPage() {
  loading();
  const rows = await rpc('my_leads');
  const count = k => rows.filter(r => k === 'open' ? ['new', 'contacted', 'negotiating'].includes(r.status) : r.status === k).length;
  const earned = rows.reduce((a, r) => a + Number(r.commission || 0), 0);
  view(`
  <form class="card" id="lf2" novalidate>
    <div class="stack"><h1>سجّل بيانات عميل</h1><p class="lead">العميل المهتم سجّل بياناته هنا، والفريق هيكلمه ويكمل معاه. العميل بيتحجز باسمك من أول ما تسجّله.</p></div>
    <div class="row2">
      <label class="f">اسم العميل<input id="ld-name" autocomplete="off"></label>
      <label class="f">موبايل العميل (واتساب)<input id="ld-phone" type="tel" inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx"></label>
    </div>
    <div class="row2">
      <label class="f">اسم البيزنس <span class="opt">(اختياري)</span><input id="ld-biz" placeholder="مثلًا: مطعم الريف"></label>
      <label class="f">البلد<input id="ld-country" value="مصر"></label>
    </div>
    <div class="stack" style="font-weight:600;font-size:14px">العميل محتاج إيه؟ <span class="opt">(اختار خدمة أو أكتر)</span>
      <div class="svc-pick" id="ld-svc">${PICKABLE().map((s, i) => `<label><input type="checkbox" value="${esc(s)}" id="svc-${i}">${esc(s)}</label>`).join('')}</div>
    </div>
    <label class="f">ملاحظات للفريق <span class="opt">(اختياري: يكلموه إمتى، ميزانيته...)</span><textarea id="ld-notes" rows="2"></textarea></label>
    <div class="err" id="ld-err" hidden></div>
    <button class="btn gold" id="ld-btn">ابعت للفريق</button>
  </form>
  <div class="card">
    <div class="head"><h2>عملائي</h2><span class="muted">${num(rows.length)} عميل</span></div>
    <div class="stats">
      <div class="stat"><small>لسه شغالين عليهم</small><b>${num(count('open'))}</b></div>
      <div class="stat"><small>تم الديل</small><b>${num(count('won'))}</b></div>
      <div class="stat hl"><small>عمولتك منهم</small><b>${money(earned)}</b></div>
    </div>
    <div class="list">${rows.length ? rows.map(r => `
      <div class="item"><div class="main"><b>${esc(r.client_name)}${r.business ? ' · ' + esc(r.business) : ''}</b>
        <span class="sub"><span class="ltr">${esc(r.client_phone)}</span> · ${esc(r.country)} · اتسجل ${fdate(r.created_at)}${r.source && r.source !== 'marketer' ? ' · ' + srcPill(r.source, SRC_MK) : ''}</span>
        ${chips(r.services)}</div>
        <div class="end">${leadPill(r.status)}${r.commission ? `<span class="amt">+${money(r.commission)}</span>` : ''}</div></div>`).join('')
      : '<p class="empty">لسه ما سجلتش عملا. أول عميل مهتم، سجّله من الفورم اللي فوق.</p>'}</div>
  </div>`);
  $('#lf2').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#ld-err'), '');
    const services = $$('#ld-svc input:checked').map(x => x.value);
    const a = { p_client: $('#ld-name').value.trim(), p_phone: $('#ld-phone').value, p_business: $('#ld-biz').value, p_country: $('#ld-country').value, p_services: services, p_notes: $('#ld-notes').value };
    if (a.p_client.length < 2) return showErr($('#ld-err'), 'اكتب اسم العميل');
    if (normPhone(a.p_phone).length < 8) return showErr($('#ld-err'), 'اكتب رقم موبايل العميل صح');
    if (!services.length) return showErr($('#ld-err'), 'اختار خدمة واحدة على الأقل');
    try { await busy($('#ld-btn'), 'بنبعت…', () => rpc('marketer_add_lead', a)); toast('اتبعت للفريق ✓'); route(); }
    catch (m) { showErr($('#ld-err'), m); }
  });
}

async function aLeadsPage() {
  let st = 'open', off = 0, args = {};
  const team = isAdmin() ? await rpc('staff_team').catch(() => []) : [];
  const staffOpts = sel => `<option value="">مش متوزع</option>${team.filter(t => t.status === 'active').map(t => `<option value="${esc(t.code)}"${t.code === sel ? ' selected' : ''}>${esc(t.name)} (${esc(ROLES[t.role])})</option>`).join('')}`;
  const TABS = [['open', 'لسه مفتوحة'], ['new', 'جديد'], ['contacted', 'اتكلمنا معاه'], ['negotiating', 'بنتفاوض'], ['won', 'تم الديل'], ['lost', 'مش مهتم'], ['', 'الكل']];
  view(`
  <div class="card">
    <div class="stack"><h1>طلبات العملا</h1><p class="lead">${isSuper() ? 'كل العملا اللي المسوقين سجّلوهم.' : isAdmin() ? 'الطلبات اللي لسه ما اتوزعتش، واللي عندك وعند موظفينك.' : 'الطلبات اللي متوزعة عليك.'} افتح أي طلب عشان تغيّر حالته${isAdmin() ? ' أو توزّعه' : ''}.</p></div>
    <div class="seg" id="lt">${TABS.map(([k, l]) => `<button type="button" data-s="${k}"${k === st ? ' class="on"' : ''}>${l} <span class="cnt" data-c="${k}"></span></button>`).join('')}</div>
    <details class="callbox" id="cc">
      <summary><span><b>📞 عميل اتصل وقال كود مسوق؟</b><small class="muted">سجّله هنا، والطلب يتحسب للمسوق ويبقى معاك</small></span></summary>
      <form id="cf" novalidate>
        <label class="f">كود المسوق اللي العميل قاله<input id="cf-code" dir="ltr" autocomplete="off" placeholder="M001"></label>
        <div class="peek" id="cf-peek" hidden></div>
        <div class="row2">
          <label class="f">اسم العميل<input id="cf-name" autocomplete="off"></label>
          <label class="f">موبايل العميل<input id="cf-phone" type="tel" inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx أو +966…"></label>
        </div>
        <div class="row2">
          <label class="f">اسم البيزنس <span class="opt">(اختياري)</span><input id="cf-biz"></label>
          <label class="f">البلد<input id="cf-country" value="مصر"></label>
        </div>
        <div class="stack" style="font-weight:600;font-size:14px">العميل محتاج إيه؟
          <div class="svc-pick" id="cf-svc">${PICKABLE().map(s => `<label><input type="checkbox" value="${esc(s)}">${esc(s)}</label>`).join('')}</div>
        </div>
        <label class="f">ملاحظات الفريق <span class="opt">(مش بتظهر للمسوق)</span><textarea id="cf-notes" rows="2"></textarea></label>
        <div class="err" id="cf-err" hidden></div>
        <button class="btn gold" id="cf-btn">سجّل الطلب</button>
      </form>
    </details>
    <form id="lq" novalidate class="row3" style="align-items:end">
      <label class="f">بحث <span class="opt">(عميل، بيزنس، موبايل)</span><input id="lq-q"></label>
      <label class="f">كود المسوق<input id="lq-code" dir="ltr" placeholder="الكل"></label>
      ${isAdmin() ? `<label class="f">الكول سنتر<select id="lq-as"><option value="">الكل</option><option value="none">مش متوزع</option>${team.map(t => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join('')}</select></label>` : '<span></span>'}
      <button class="btn" id="lq-go" style="display:none">اعرض</button>
    </form>
  </div>
  <div class="card">
    <div class="stats" id="l-sum"></div>
    <div class="err" id="l-err" hidden></div>
    <div class="tablewrap"><table class="tbl" id="l-tbl">
      <thead><tr><th>#</th><th>العميل</th><th>الخدمات</th><th>المسوق</th><th>الكول سنتر</th><th>الحالة</th><th>العمولة</th><th>اتسجل</th><th></th></tr></thead>
      <tbody></tbody></table></div>
    <p class="empty" id="l-empty" hidden>مفيش طلبات هنا.</p>
    <button type="button" class="btn ghost sm" id="l-more" hidden>اعرض أكتر</button>
  </div>`);
  const tbody = $('#l-tbl tbody');
  let data = {};
  const row = r => `
    <tr data-id="${r.id}" class="lrow">
      <td class="ltr c-id">${esc(r.id)}</td>
      <td class="c-client"><b>${esc(r.client_name)}</b> ${srcPill(r.source, SRC_STAFF)}${r.business ? `<div class="sub">${esc(r.business)}</div>` : ''}<div class="sub ltr">${esc(r.client_phone)}</div></td>
      <td data-l="الخدمات">${chips(r.services)}</td>
      <td data-l="المسوق">${esc(firstName(r.marketer_name))} <span class="sub ltr">${esc(r.code)}</span></td>
      <td data-l="الكول سنتر">${r.assigned_name ? esc(firstName(r.assigned_name)) : '<span class="sub">مش متوزع</span>'}</td>
      <td data-l="الحالة" class="c-status">${leadPill(r.status)}</td>
      <td data-l="العمولة" class="amt">${r.commission ? money(r.commission) : '—'}</td>
      <td data-l="اتسجل" class="sub">${fdate(r.created_at)}</td>
      <td class="c-open"><button type="button" class="btn sm ghost" data-open="${r.id}">افتح</button></td>
    </tr>`;
  const editor = r => `
    <tr class="ledit" data-for="${r.id}"><td colspan="9"><div class="ledit-in">
      <div class="stack">
        <span><b>${esc(r.client_name)}</b>${r.business ? ' · ' + esc(r.business) : ''} · <span class="ltr">${esc(r.client_phone)}</span> · ${esc(r.country)}</span>
        ${r.notes ? `<span class="note">ملاحظة المسوق: ${esc(r.notes)}</span>` : ''}
        <span class="sub">المصدر: ${esc(SRC_STAFF[r.source] || SRC_STAFF.marketer)}${r.created_by_name ? ' · سجّله ' + esc(r.created_by_name) : ''} · المسوق ${esc(r.marketer_name)} <span class="ltr">${esc(r.code)}</span></span>
        <span class="sub">اتسجل ${fdatetime(r.created_at)} · آخر تحديث ${fdate(r.updated_at)}${r.closed_at ? ' · اتقفل ' + fdate(r.closed_at) : ''}</span>
      </div>
      <div class="lead-contact">
        <a class="btn wa" data-wa href="${esc(waLink(r.client_phone, leadGreeting(r)))}" target="_blank" rel="noopener">${WA_ICON} واتساب برسالة جاهزة</a>
        <a class="btn ghost" data-call href="tel:${esc(telNumber(r.client_phone))}">${CALL_ICON} اتصل</a>
        <button type="button" class="btn ghost sm" data-copy="${esc(r.client_phone)}">انسخ الرقم</button>
      </div>
      <div class="row3">
        <label class="f">الحالة<select data-f="status">${Object.keys(LEAD_ST).map(k => `<option value="${k}"${k === r.status ? ' selected' : ''}>${LEAD_ST[k]}</option>`).join('')}</select></label>
        ${isAdmin() ? `<label class="f">الكول سنتر<select data-f="assign">${staffOpts(r.assigned_code)}</select></label>` : '<span></span>'}
        <label class="f">الخدمة اللي اتباعت <span class="opt">(لما يتم الديل)</span><select data-f="service">${(r.services.length > 1 ? ['أكتر من خدمة'] : []).concat(r.services, SERVICES.filter(s => !r.services.includes(s) && s !== 'أكتر من خدمة')).map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
      </div>
      <label class="f">ملاحظات الفريق <span class="opt">(مش بتظهر للمسوق)</span><textarea data-f="notes" rows="2">${esc(r.staff_notes || '')}</textarea></label>
      <div class="actions">
        <button type="button" class="btn" data-save="${r.id}">احفظ</button>
        ${r.status !== 'won' ? `<button type="button" class="btn gold" data-won="${r.id}">تم الديل ✓</button>` : ''}
        <span class="muted" style="font-size:13px">${r.status === 'won' ? `البيعة اتسجلت للمسوق${r.commission ? ' وعمولته ' + money(r.commission) : ''}.${isAdmin() ? ' لو غيّرت الحالة، البيعة هتتلغي.' : ''}` : 'لما تدوس «تم الديل»، البيعة والعمولة بتتسجل للمسوق لوحدها.'}</span>
      </div>
    </div></td></tr>`;
  async function run(more) {
    showErr($('#l-err'), '');
    if (!more) { off = 0; args = { p_status: st || null, p_q: $('#lq-q').value.trim() || null, p_code: $('#lq-code').value.trim() || null, p_assigned_code: $('#lq-as') ? ($('#lq-as').value || null) : null }; }
    try {
      const r = await rpc('staff_leads_query', Object.assign({}, args, { lim: 50, off }));
      const c = r.counts || {};
      const open = (c.new || 0) + (c.contacted || 0) + (c.negotiating || 0);
      $$('#lt .cnt').forEach(el => { const k = el.dataset.c; const n = k === 'open' ? open : k === '' ? Object.values(c).reduce((a, b) => a + b, 0) : (c[k] || 0); el.textContent = n ? `(${num(n)})` : ''; });
      if (!more) $('#l-sum').innerHTML = `<div class="stat hl"><small>لسه مفتوحة</small><b>${num(open)}</b></div><div class="stat"><small>تم الديل</small><b>${num(c.won || 0)}</b></div><div class="stat"><small>مش مهتم</small><b>${num(c.lost || 0)}</b></div><div class="stat"><small>عمولات النتايج دي</small><b>${money(r.commission)}</b></div>`;
      r.rows.forEach(x => { data[x.id] = x; });
      const html = r.rows.map(row).join('');
      tbody.innerHTML = more ? tbody.innerHTML + html : html;
      $('#l-empty').hidden = !!tbody.children.length;
      $('#l-more').hidden = r.rows.length < 50;
    } catch (m) { showErr($('#l-err'), m); }
  }
  async function save(id, extra) {
    const ed = $(`tr.ledit[data-for="${id}"]`), r = data[id], g = f => ed.querySelector(`[data-f="${f}"]`);
    const a = { p_id: Number(id), p_status: extra && extra.won ? 'won' : g('status').value, p_staff_notes: g('notes').value, p_service: g('service').value };
    if (g('assign')) a.p_assigned_code = g('assign').value;
    if (a.p_status === r.status) delete a.p_status;
    try { await rpc('staff_update_lead', a); toast(a.p_status === 'won' ? 'تم الديل ✓ العمولة اتسجلت للمسوق' : 'اتحفظ ✓'); await loadMe().catch(() => {}); renderNav('a-leads'); run(false); }
    catch (m) { toast(m); }
  }
  tbody.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) { const id = o.dataset.open, ex = $(`tr.ledit[data-for="${id}"]`); if (ex) { ex.remove(); return; } o.closest('tr').insertAdjacentHTML('afterend', editor(data[id])); return; }
    const cp = e.target.closest('[data-copy]'); if (cp) return copyText(cp.dataset.copy);
    const s = e.target.closest('[data-save]'); if (s) return save(s.dataset.save);
    const w = e.target.closest('[data-won]'); if (w && twoStep(w, 'متأكد إن العميل دفع؟')) return save(w.dataset.won, { won: true });
  });
  $('#lt').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; st = b.dataset.s; $$('#lt button').forEach(x => x.classList.toggle('on', x === b)); run(false); });
  $('#lq').addEventListener('submit', e => { e.preventDefault(); run(false); });
  let tq; $('#lq-q').addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => run(false), 400); });
  $('#lq-code').addEventListener('change', () => run(false));
  if ($('#lq-as')) $('#lq-as').addEventListener('change', () => run(false));
  $('#l-more').addEventListener('click', () => { off += 50; run(true); });

  // الكول سنتر: نتأكد من الكود ونعرض اسم المسوق قبل التسجيل
  let peekSeq = 0;
  const peekCode = async () => {
    const code = $('#cf-code').value.trim(), box = $('#cf-peek'), my = ++peekSeq;
    if (!code) { box.hidden = true; return; }
    try {
      const m = await rpc('staff_find', { p_code: code }); if (my !== peekSeq) return;
      box.className = 'peek ' + (m.status === 'active' ? 'ok' : 'no'); box.hidden = false;
      box.innerHTML = m.status === 'active' ? `✓ المسوق: <b>${esc(m.name)}</b> <span class="ltr">${esc(m.code)}</span> · ${esc(m.gov || '')}` : `⚠️ ${esc(m.name)} (${esc(m.code)}) موقوف. كلّم الأدمن.`;
    } catch (m) { if (my !== peekSeq) return; box.className = 'peek no'; box.hidden = false; box.textContent = m; }
  };
  let tp; $('#cf-code').addEventListener('input', () => { clearTimeout(tp); tp = setTimeout(peekCode, 350); });
  $('#cf').addEventListener('submit', async e => {
    e.preventDefault(); showErr($('#cf-err'), '');
    const services = $$('#cf-svc input:checked').map(x => x.value);
    const a = { p_code: $('#cf-code').value.trim(), p_client: $('#cf-name').value.trim(), p_phone: $('#cf-phone').value, p_business: $('#cf-biz').value,
      p_country: $('#cf-country').value, p_services: services, p_staff_notes: $('#cf-notes').value };
    if (!a.p_code) return showErr($('#cf-err'), 'اكتب كود المسوق اللي العميل قاله');
    if (a.p_client.length < 2) return showErr($('#cf-err'), 'اكتب اسم العميل');
    if (!services.length) return showErr($('#cf-err'), 'اختار خدمة واحدة على الأقل');
    try {
      const r = await busy($('#cf-btn'), 'بنسجّل…', () => rpc('staff_add_lead', a));
      toast(`اتسجل طلب #${r.id} باسم ${firstName(r.marketer)} (${r.code}) ✓`);
      $('#cf').reset(); $('#cf-country').value = 'مصر'; $('#cf-peek').hidden = true; $('#cc').open = false;
      await loadMe().catch(() => {}); renderNav('a-leads'); run(false);
    } catch (m) { showErr($('#cf-err'), m); }
  });
  run(false);
}

/* ---------------- البداية ---------------- */
if (!C || /XXXX/.test(C.SUPABASE_URL)) {
  view(`<div class="card"><h1>الموقع لسه ما اتربطش</h1><p>افتح ملف <b>config.js</b> وحط فيه رابط Supabase والمفتاح (anon key). الطريقة في ملف التركيب.</p></div>`);
} else {
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { ME = null; } });
  route();
}
