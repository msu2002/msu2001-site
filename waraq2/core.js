/* ورق — النواة: الأيقونات والتوجيه والأدوات المشتركة */
(function () {
'use strict';
var W = window.W = { routes: {}, order: [], pending: null, ROOT: '../waraq/' };
var P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  eraser: '<path d="M20 20H8.5L3.6 15.1a2 2 0 0 1 0-2.8L13 3a2 2 0 0 1 2.8 0l5.2 5.2a2 2 0 0 1 0 2.8L12 20"/><path d="M8 11l6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  scan: '<path d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  merge: '<path d="M6 3v6a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6V3"/><path d="M12 15v6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  zoomin: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
  zoomout: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
  fit: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
  stamp: '<path d="M5 21h14M6 17h12v-2a4 4 0 0 0-3-3.9V8a3 3 0 1 0-6 0v3.1A4 4 0 0 0 6 15z"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  wand: '<path d="M15 4l1.2 2.8L19 8l-2.8 1.2L15 12l-1.2-2.8L11 8l2.8-1.2z"/><path d="M5 19l9-9M17 15l.7 1.6L19.3 17l-1.6.7L17 19.3l-.7-1.6L14.7 17l1.6-.7z"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  flip: '<path d="M12 3v18M8 7L3 12l5 5V7zM16 7l5 5-5 5V7z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  clip: '<path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13.7 4.2a3.7 3.7 0 0 1 5.2 5.2L10.3 18a1.8 1.8 0 0 1-2.6-2.6l8-8"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  blank: '<rect x="5" y="3" width="14" height="18" rx="2"/>',
  chev: '<path d="M15 6l-6 6 6 6"/>', chevr: '<path d="M9 6l6 6-6 6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  text: '<path d="M5 5h14M12 5v15M8 20h8"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
  save: '<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7M8 21v-7h8v7"/>'
};
W.ic = function (n, c) { return '<svg class="i ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.more) + '</svg>'; };
var $ = W.$ = function (s, r) { return (r || document).querySelector(s); };
W.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
W.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
W.uid = function () { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
W.n = function (n) { return n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتان' : n >= 3 && n <= 10 ? n + ' صفحات' : n + ' صفحة'; };

W.toast = function (m, err, ms) {
  var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = m; $('#toasts').appendChild(t);
  setTimeout(function () { t.style.opacity = 0; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, ms || 3600);
};
W.settings = function () { try { return JSON.parse(localStorage.getItem('waraq2-settings') || '{}'); } catch (e) { return {}; } };
W.setSetting = function (k, v) { var s = W.settings(); s[k] = v; try { localStorage.setItem('waraq2-settings', JSON.stringify(s)); } catch (e) { W.toast('تعذر الحفظ على الجهاز', true); } };
W.theme = function () { try { return localStorage.getItem('waraq-studio-theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } };
W.setTheme = function (t) {
  var r = document.documentElement; if (t === 'light') r.setAttribute('data-theme', 'light'); else r.removeAttribute('data-theme');
  try { localStorage.setItem('waraq-studio-theme', t); } catch (e) {}
  var b = $('#themebtn'); if (b) b.innerHTML = W.ic(t === 'dark' ? 'sun' : 'moon') + '<span class="lbl">' + (t === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي') + '</span>';
};

/* ---------- lazy libs ---------- */
var LIBS = { pdflib: 'studio/pdf-lib.min.js', pdfjs: 'studio/pdf.min.js', wm: null }, loading = {};
function script(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('تعذر تحميل ' + src)); }; document.head.appendChild(s); }); }
W.lib = function (name) {
  if (loading[name]) return loading[name];
  var p;
  if (name === 'pdflib') p = window.PDFLib ? Promise.resolve() : script(W.ROOT + LIBS.pdflib);
  else if (name === 'pdfjs') p = window.pdfjsLib ? Promise.resolve().then(setW) : script(W.ROOT + LIBS.pdfjs).then(setW);
  else if (name === 'wm') p = W.lib('pdflib').then(function () { return window.WM ? 0 : script('wm.js'); });
  else p = Promise.resolve();
  function setW() { window.pdfjsLib.GlobalWorkerOptions.workerSrc = W.ROOT + 'studio/pdf.worker.min.js'; }
  return (loading[name] = p);
};
W.pdfOpen = function (bytes) { return W.lib('pdfjs').then(function () { return window.pdfjsLib.getDocument({ data: bytes.slice(), cMapUrl: W.ROOT + 'pdf/cmaps/', cMapPacked: true, standardFontDataUrl: W.ROOT + 'pdf/standard_fonts/' }).promise; }); };
W.pdfPage = function (doc, n, width, rot) {
  return doc.getPage(n).then(function (pg) {
    var v1 = pg.getViewport({ scale: 1, rotation: rot || 0 }), v = pg.getViewport({ scale: width / v1.width, rotation: rot || 0 }), c = document.createElement('canvas');
    c.width = Math.round(v.width); c.height = Math.round(v.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    return pg.render({ canvasContext: x, viewport: v }).promise.then(function () { return c; });
  });
};
W.bytes = function (f) { return f.arrayBuffer().then(function (b) { return new Uint8Array(b); }); };
W.download = function (blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 5000); };
W.blob = function (c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); };
W.loadImg = function (src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('تعذرت قراءة الصورة')); }; i.src = src; }); };
W.isPdf = function (f) { return /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name); };
W.isImg = function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name); };
W.pick = function (accept, multiple) {
  return new Promise(function (res) { var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.onchange = function () { res([].slice.call(i.files)); }; i.click(); });
};
W.drop = function (el, cb) {
  ['dragenter', 'dragover'].forEach(function (e) { el.addEventListener(e, function (ev) { ev.preventDefault(); el.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { el.addEventListener(e, function (ev) { ev.preventDefault(); el.classList.remove('over'); }); });
  el.addEventListener('drop', function (ev) { var f = [].slice.call(ev.dataTransfer.files); if (f.length) cb(f); });
};
W.dropZone = function (o) {
  return '<div class="drop" id="' + (o.id || 'dz') + '"><div class="big">' + W.ic(o.icon || 'upload') + '</div><h3>' + o.title + '</h3><p>' + (o.sub || '') + '</p><button class="btn p" type="button">' + W.ic('plus') + ' ' + (o.btn || 'اختيار ملفات') + '</button></div>';
};
W.bindDrop = function (id, accept, multiple, cb) {
  var el = $('#' + id); if (!el) return; W.drop(el, cb); el.onclick = function (e) { W.pick(accept, multiple).then(function (f) { if (f.length) cb(f); }); };
};

/* ---------- router ---------- */
W.register = function (id, o) { W.routes[id] = o; if (o.nav) W.order.push(id); };
W.cur = null;
W.go = function (id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; else W.render(); };
W.render = function () {
  var id = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0]; if (!W.routes[id]) id = 'home';
  if (W.cur && W.routes[W.cur] && W.routes[W.cur].destroy) { try { W.routes[W.cur].destroy(); } catch (e) {} }
  W.cur = id; var r = W.routes[id];
  W.$$('.nv[data-r]').forEach(function (a) { a.classList.toggle('on', a.dataset.r === id); });
  $('#top').innerHTML = '<h1>' + W.ic(r.icon) + ' ' + r.title + '</h1><span class="sp"></span><span id="topx"></span>';
  var v = $('#view'); v.innerHTML = ''; v.scrollTop = 0; document.title = r.title + ' — ورق';
  try { r.render(v); } catch (e) { console.error(e); v.innerHTML = '<div class="empty"><h3>تعذر فتح هذه الصفحة</h3><p>' + W.esc(e.message) + '</p></div>'; }
};
W.buildNav = function () {
  var h = '<a class="logo" href="#/home"><i>' + W.ic('pdf') + '</i><span><b>ورق</b><small>أدوات المعلم</small></span></a>';
  W.order.forEach(function (id) { var r = W.routes[id]; if (id === 'settings') return; h += '<a class="nv" data-r="' + id + '" href="#/' + id + '">' + W.ic(r.icon) + '<span class="lbl">' + r.short + '</span></a>'; });
  h += '<div class="nv-foot"><div class="nv-sep"></div><a class="nv" data-r="settings" href="#/settings">' + W.ic('gear') + '<span class="lbl">الإعدادات</span></a><button class="nv" id="themebtn" type="button"></button><div class="credit">المعالجة كلها على جهازك.<br>قام بعمل الأداة: فهد بن عبدالله الجروان</div></div>';
  $('#nav').innerHTML = h;
  $('#themebtn').onclick = function () { W.setTheme(W.theme() === 'dark' ? 'light' : 'dark'); };
  W.setTheme(W.theme());
};
})();
