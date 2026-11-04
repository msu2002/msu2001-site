/* ورق · الاستوديو: توقيع/ختم/اسم + إزالة العلامة (محلي بالكامل) */
(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var PL = window.PDFLib, pdfjs = window.pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
var PREVIEW_W = 780;

var S = {
  tab: 'add', kind: null, bytes: null, name: '', pdf: null, pages: 0, cur: 1, img: null,
  baseCache: {}, overlays: [], sel: null, ops: [], undo: [], fonts: [], assets: [],
  set: { kind: 'watermark', mode: 'color', color: [185, 185, 185], tol: 40, grow: 2, scope: 'all', range: '', pick: false },
  show: 'after', resCache: null
};
var KINDS = {
  watermark: { ar: 'علامة', sub: 'نص أو صورة باهتة', col: '#788894', rgb: [185, 185, 185], mode: 'color', scope: 'all' },
  signature: { ar: 'توقيع', sub: 'حبر أزرق أو أسود', col: '#1F3FA8', rgb: [31, 63, 168], mode: 'color', scope: 'cur' },
  stamp: { ar: 'ختم', sub: 'أحمر أو أزرق', col: '#B3261E', rgb: [179, 38, 30], mode: 'color', scope: 'cur' },
  logo: { ar: 'شعار', sub: 'صورة في الترويسة', col: '#1F6F8B', rgb: [31, 111, 139], mode: 'all', scope: 'all' }
};
var uid = function () { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
function msg(t, ms) { var m = $('#msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(msg.t); msg.t = setTimeout(function () { m.style.display = 'none'; }, ms || 3500); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toHex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
function fromHex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function toBlob(c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); }
function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

/* ---------- scope ---------- */
function parseRange(t, total) {
  var set = {}; String(t || '').split(/[,،]/).forEach(function (p) {
    p = p.trim(); var m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { for (var i = +m[1]; i <= Math.min(+m[2], total); i++) set[i] = 1; } else if (/^\d+$/.test(p)) { set[+p] = 1; }
  }); return set;
}
function applies(o, page, total) {
  switch (o.scope) {
    case 'cur': return o.page === page;
    case 'all': return true;
    case 'odd': return page % 2 === 1;
    case 'even': return page % 2 === 0;
    case 'last': return page === total;
    case 'range': return !!parseRange(o.range, total)[page];
  } return false;
}
var SCOPES = [['cur', 'هذه الصفحة'], ['all', 'كل الصفحات'], ['odd', 'الفردية'], ['even', 'الزوجية'], ['last', 'الأخيرة'], ['range', 'نطاق']];

/* ---------- file loading ---------- */
async function openFile(f) {
  if (!f) return;
  try {
    var buf = await f.arrayBuffer();
    S.name = f.name; S.bytes = new Uint8Array(buf); S.baseCache = {}; S.overlays = []; S.ops = []; S.undo = []; S.sel = null; S.cur = 1;
    if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
      S.kind = 'pdf'; S.pdf = await pdfjs.getDocument({ data: S.bytes.slice(), cMapUrl: '../pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '../pdf/standard_fonts/' }).promise;
      S.pages = S.pdf.numPages; S.img = null;
    } else {
      S.kind = 'img'; S.pdf = null; S.pages = 1;
      S.img = await loadImg(URL.createObjectURL(new Blob([S.bytes], { type: f.type || 'image/png' })));
    }
    $('#fname').textContent = f.name + (S.kind === 'pdf' ? ' · ' + S.pages + ' صفحة' : '');
    $('#save').disabled = false; renderAll();
  } catch (e) { console.error(e); msg('تعذر فتح الملف. تأكد أنه PDF أو صورة سليمة وغير محمي بكلمة مرور.'); }
}
async function basePage(p, width) {
  var key = p + '@' + width; if (S.baseCache[key]) return S.baseCache[key];
  var c = document.createElement('canvas');
  if (S.kind === 'img') {
    var sc = width / S.img.naturalWidth; c.width = width; c.height = Math.round(S.img.naturalHeight * sc);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(S.img, 0, 0, c.width, c.height);
  } else {
    var pg = await S.pdf.getPage(p), v1 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: width / v1.width });
    c.width = Math.round(v.width); c.height = Math.round(v.height);
    var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: cx, viewport: v }).promise;
  }
  var keys = Object.keys(S.baseCache); if (keys.length > 6) delete S.baseCache[keys[0]];
  S.baseCache[key] = c; return c;
}

/* ---------- assets ---------- */
function loadAssets() { try { S.assets = JSON.parse(localStorage.getItem('wq-assets') || '[]'); } catch (e) { S.assets = []; } }
function saveAssets() { try { localStorage.setItem('wq-assets', JSON.stringify(S.assets)); } catch (e) { msg('تعذر حفظ العنصر على الجهاز (المساحة ممتلئة).'); } }
function trim(c) {
  var x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, minx = c.width, miny = c.height, maxx = 0, maxy = 0;
  for (var y = 0; y < c.height; y++) for (var i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < minx) minx = i; if (i > maxx) maxx = i; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  if (maxx < minx) return c; var p = 4, o = document.createElement('canvas'); o.width = maxx - minx + 1 + 2 * p; o.height = maxy - miny + 1 + 2 * p;
  o.getContext('2d').drawImage(c, minx, miny, maxx - minx + 1, maxy - miny + 1, p, p, maxx - minx + 1, maxy - miny + 1); return o;
}
function limit(c, max) { if (c.width <= max) return c; var o = document.createElement('canvas'); o.width = max; o.height = Math.round(c.height * max / c.width); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o; }
function addAsset(c, name) { c = limit(trim(c), 900); S.assets.unshift({ id: uid(), name: name, url: c.toDataURL('image/png') }); S.assets = S.assets.slice(0, 40); saveAssets(); renderLeft(); }
function removeBg(c, tol, ink) {
  var w = c.width, h = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, w, h), d = id.data, b = [[], [], []];
  var sample = function (px, py) { var i = (py * w + px) * 4; b[0].push(d[i]); b[1].push(d[i + 1]); b[2].push(d[i + 2]); };
  for (var i = 0; i < w; i += Math.max(1, w >> 5)) { sample(i, 0); sample(i, h - 1); }
  for (var j = 0; j < h; j += Math.max(1, h >> 5)) { sample(0, j); sample(w - 1, j); }
  var bg = b.map(function (a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1]; });
  var t0 = tol * 0.45, t1 = tol * 1.5 + 10;
  for (var k = 0; k < d.length; k += 4) {
    var dd = Math.max(Math.abs(d[k] - bg[0]), Math.abs(d[k + 1] - bg[1]), Math.abs(d[k + 2] - bg[2]));
    var a = Math.max(0, Math.min(1, (dd - t0) / (t1 - t0)));
    if (a <= 0) { d[k + 3] = 0; continue; }
    if (ink) { d[k] = ink[0]; d[k + 1] = ink[1]; d[k + 2] = ink[2]; }
    else for (var q = 0; q < 3; q++) d[k + q] = Math.max(0, Math.min(255, (d[k + q] - (1 - a) * bg[q]) / a));
    d[k + 3] = Math.round(a * 255);
  }
  x.putImageData(id, 0, 0); return c;
}
async function fontFamily(f) {
  if (!f || f.k === 'noto') return 'Waraq';
  var fam = 'WqS_' + f.k; if (!document.fonts.check('16px ' + fam)) {
    var ff = new FontFace(fam, 'url(../fonts/' + f.f400 + ')'); await ff.load(); document.fonts.add(ff);
    if (f.f700) { var fb = new FontFace(fam, 'url(../fonts/' + f.f700 + ')', { weight: '700' }); try { await fb.load(); document.fonts.add(fb); } catch (e) {} }
  } return fam;
}
async function textAsset(txt, fkey, color, bold) {
  var f = S.fonts.filter(function (x) { return x.k === fkey; })[0], fam = await fontFamily(f), size = 150;
  var c = document.createElement('canvas'), x = c.getContext('2d'); x.font = (bold ? 'bold ' : '') + size + 'px ' + fam;
  var w = Math.ceil(x.measureText(txt).width) + 40; c.width = Math.max(60, w); c.height = Math.round(size * 1.9);
  x = c.getContext('2d'); x.font = (bold ? 'bold ' : '') + size + 'px ' + fam; x.fillStyle = color; x.direction = /[؀-ۿ]/.test(txt) ? 'rtl' : 'ltr';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, c.width / 2, c.height / 2); return c;
}

/* ---------- left / right panels ---------- */
var PAD = { col: '#1f3fa8', ctx: null, drawing: false };
function renderLeft() {
  var el = $('#left');
  if (S.tab === 'add') {
    var h = '<h3>عناصري</h3><div class="assets">';
    S.assets.forEach(function (a) { h += '<div class="asset" data-a="' + a.id + '" title="' + esc(a.name) + '"><img src="' + a.url + '"><u data-del="' + a.id + '">حذف</u></div>'; });
    if (!S.assets.length) h += '<div class="note" style="grid-column:1/3">لا توجد عناصر بعد. أنشئ اسمك أو توقيعك أو ختمك من الأقسام أدناه، ثم اضغط عليه لإضافته إلى الصفحة.</div>';
    h += '</div>';
    h += '<div class="card"><b>اكتب اسمي</b><input type="text" id="nm" placeholder="الاسم أو الصفة أو التاريخ"><select id="nf">' +
      S.fonts.map(function (f) { return '<option value="' + f.k + '">' + esc(f.ar) + ' — ' + esc(f.d) + '</option>'; }).join('') +
      '</select><div class="row"><span>اللون</span><input type="color" id="nc" value="#1f3fa8"><label><input type="checkbox" id="nb"> غامق</label><span class="sp"></span><button class="btn" id="nd">تاريخ اليوم</button></div><div id="nprev" style="height:64px;border:1px dashed var(--bd2);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden"></div><button class="btn p" id="nadd">حفظ كعنصر</button></div>';
    h += '<div class="card"><b>توقيع بالرسم</b><button class="btn" id="dr">ارسم توقيعك</button></div>';
    h += '<div class="card"><b>رفع توقيع أو ختم من صورة</b><label class="btn" style="text-align:center">اختيار صورة<input type="file" id="up" accept="image/*" hidden></label>' +
      '<div class="row"><span>إزالة الخلفية</span><input type="range" id="ut" min="5" max="90" value="30"></div>' +
      '<div class="row"><label><input type="checkbox" id="ui"> تلوين الحبر</label><input type="color" id="uc" value="#1f3fa8"></div>' +
      '<div id="upprev" style="min-height:70px;border:1px dashed var(--bd2);border-radius:8px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#f1f5f6 0 25%,#fff 0 50%) 0 0/14px 14px"></div>' +
      '<button class="btn p" id="usave" disabled>حفظ كعنصر</button></div>';
    el.innerHTML = h; bindAdd();
  } else {
    var k = S.set.kind, h2 = '<h3>ماذا تريد إزالته؟</h3><div class="kind">';
    Object.keys(KINDS).forEach(function (kk) { h2 += '<button class="k' + (k === kk ? ' on' : '') + '" data-k="' + kk + '"><span><i class="dot" style="background:' + KINDS[kk].col + '"></i>' + KINDS[kk].ar + '</span><small>' + KINDS[kk].sub + '</small></button>'; });
    h2 += '</div><h3>العمليات (كل واحدة مستقلة)</h3>';
    if (!S.ops.length) h2 += '<div class="note">اسحب مستطيلًا على الصفحة حول العنصر المراد إزالته لتُنشأ عملية.</div>';
    S.ops.forEach(function (o) {
      h2 += '<div class="op' + (o.on ? '' : ' off') + '" data-o="' + o.id + '"><div class="r"><b><i class="dot" style="background:' + KINDS[o.kind].col + '"></i>' + KINDS[o.kind].ar + ' ' + (o.n) + '</b><span><label><input type="checkbox" data-on ' + (o.on ? 'checked' : '') + '> مفعّلة</label> <button class="chip" data-rm>حذف</button></span></div>' +
        '<div class="r"><span style="color:var(--mut)">' + (o.mode === 'color' ? 'اللون المحدد فقط ' : 'كل ما في المنطقة ') + '</span>' + (o.mode === 'color' ? '<span class="dot" style="background:' + toHex(o.color) + ';width:16px;height:16px;margin:0"></span>' : '') + '</div>' +
        '<div class="r"><select data-sc>' + SCOPES.map(function (s) { return '<option value="' + s[0] + '"' + (o.scope === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>' +
        (o.scope === 'range' ? '<input type="text" data-rg value="' + esc(o.range) + '" placeholder="1-3,5" style="width:90px">' : '') + (o.scope === 'cur' ? '<span style="color:var(--mut)">ص ' + o.page + '</span>' : '') + '</div></div>';
    });
    h2 += '<button class="btn" id="struct">إزالة العناصر المنفصلة داخل PDF</button><div class="note">يحذف العلامات والأختام والتواقيع المضافة كعناصر مستقلة داخل الملف، دون تحويل الصفحة إلى صورة.</div>';
    el.innerHTML = h2; bindRem();
  }
}
function renderRight() {
  var el = $('#right');
  if (S.tab === 'add') {
    var o = S.overlays.filter(function (x) { return x.id === S.sel; })[0];
    if (!o) { el.innerHTML = '<div class="note">اضغط عنصرًا من القائمة لإضافته إلى الصفحة، ثم اسحبه لتحريكه وغيّر حجمه من المربع في زاويته. اضغط عنصرًا على الصفحة لتظهر خياراته هنا.</div><div class="note warn">التوقيع صورة مدمجة في الملف وليس توقيعًا رقميًا مشفرًا.</div>'; return; }
    el.innerHTML = '<h3>العنصر المحدد</h3><div class="row">الحجم<input type="range" id="osz" min="3" max="80" value="' + Math.round(o.w * 100) + '"><span>' + Math.round(o.w * 100) + '٪</span></div>' +
      '<div class="row">الشفافية<input type="range" id="oop" min="10" max="100" value="' + Math.round(o.op * 100) + '"><span>' + Math.round(o.op * 100) + '٪</span></div>' +
      '<div class="row">الدوران<input type="range" id="orot" min="-45" max="45" value="' + o.rot + '"><span>' + o.rot + '°</span></div>' +
      '<h3>لون هذا العنصر</h3><div class="row" id="otints"><button class="chip' + (!o.tint ? ' on' : '') + '" data-tint="">الأصلي</button>' + ['#111111', '#1f3fa8', '#0b2a6f', '#0b4f4a', '#b3261e', '#6b3d00'].map(function (c) { return '<button class="sw' + (o.tint === c ? ' on' : '') + '" data-tint="' + c + '" style="background:' + c + ';width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #8aa;padding:0"></button>'; }).join('') + '<input type="color" id="otc" value="' + (o.tint || '#1f3fa8') + '" style="width:30px;height:28px;border:0;padding:0;background:none"></div>' +
      '<h3>التطبيق على</h3><div class="chips">' + SCOPES.map(function (s) { return '<button class="chip' + (o.scope === s[0] ? ' on' : '') + '" data-sc="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      (o.scope === 'range' ? '<input type="text" id="orange" value="' + esc(o.range) + '" placeholder="مثال: 3,5-6">' : '') +
      '<h3>الموضع</h3><div class="chips"><button class="chip" data-pos="br">أسفل اليمين</button><button class="chip" data-pos="bl">أسفل اليسار</button><button class="chip" data-pos="c">المنتصف</button><button class="chip" data-pos="tr">أعلى اليمين</button><button class="chip" data-pos="tl">أعلى اليسار</button></div>' +
      '<button class="btn" id="odup">تكرار العنصر</button><button class="btn" id="odel" style="color:#b3261e">حذف العنصر</button>';
    bindOv(o);
  } else {
    var s = S.set, h = '<h3>طريقة التحديد</h3><div class="note">اسحب مستطيلًا على الصفحة حول العنصر.</div>' +
      '<h3>ما الذي يُزال داخل التحديد؟</h3><div class="chips"><button class="chip' + (s.mode === 'all' ? ' on' : '') + '" data-m="all">كل ما في المنطقة</button><button class="chip' + (s.mode === 'color' ? ' on' : '') + '" data-m="color">اللون المحدد فقط</button></div>';
    if (s.mode === 'color') {
      h += '<div class="row">اللون<span class="dot" style="background:' + toHex(s.color) + ';width:24px;height:24px;margin:0;border:1px solid var(--bd2)"></span><button class="chip' + (s.pick ? ' on' : '') + '" id="pick">التقط من الصفحة</button></div>' +
        '<div class="chips"><button class="chip" data-c="185,185,185">رمادي فاتح</button><button class="chip" data-c="140,140,140">رمادي</button><button class="chip" data-c="30,30,30">أسود</button><button class="chip" data-c="31,63,168">أزرق</button><button class="chip" data-c="179,38,30">أحمر</button><button class="chip" data-c="110,60,150">بنفسجي</button></div>' +
        '<div class="row">الحساسية<input type="range" id="stol" min="5" max="100" value="' + s.tol + '"><span>' + s.tol + '٪</span></div>';
    }
    h += '<div class="row">توسيع الحواف<input type="range" id="sgr" min="0" max="8" value="' + s.grow + '"><span>' + s.grow + ' بكسل</span></div>' +
      '<h3>تطبيق العمليات الجديدة على</h3><select id="ssc">' + SCOPES.map(function (x) { return '<option value="' + x[0] + '"' + (s.scope === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      (s.scope === 'range' ? '<input type="text" id="srg" value="' + esc(s.range) + '" placeholder="1-3,5">' : '') +
      '<h3>العرض</h3><div class="chips"><button class="chip' + (S.show === 'before' ? ' on' : '') + '" data-show="before">قبل</button><button class="chip' + (S.show === 'after' ? ' on' : '') + '" data-show="after">بعد</button></div>' +
      '<div class="note warn">الإزالة تقريبية: تنجح أكثر على الخلفيات البسيطة، وتداخل العلامة مع الحروف قد يترك أثرًا. إن كانت العلامة مدمجة في صورة الصفحة فالصفحة المعالَجة تتحول إلى صورة وتفقد النص القابل للتحديد، وتبقى بقية الصفحات كما هي. استخدمها لمحتواك أو بإذن صاحبه.</div>';
    el.innerHTML = h; bindSet();
  }
}

/* ---------- binding: add tab ---------- */
function bindAdd() {
  var el = $('#left');
  $$('.asset', el).forEach(function (a) { a.onclick = function (e) {
    if (e.target.dataset.del) { S.assets = S.assets.filter(function (x) { return x.id !== e.target.dataset.del; }); saveAssets(); renderLeft(); return; }
    placeAsset(S.assets.filter(function (x) { return x.id === a.dataset.a; })[0]); }; });
  var nprev = $('#nprev', el);
  async function prev() { var t = $('#nm', el).value.trim(); if (!t) { nprev.innerHTML = ''; return null; } var c = await textAsset(t, $('#nf', el).value, $('#nc', el).value, $('#nb', el).checked); c = trim(c); var i = document.createElement('img'); i.src = c.toDataURL(); i.style.maxHeight = '56px'; i.style.maxWidth = '95%'; nprev.innerHTML = ''; nprev.appendChild(i); return c; }
  ['#nm', '#nf', '#nc', '#nb'].forEach(function (s) { $(s, el).oninput = prev; $(s, el).onchange = prev; });
  $('#nd', el).onclick = function () {
    var d = new Date(), h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    $('#nm', el).value = h + 'هـ'; prev(); };
  $('#nadd', el).onclick = async function () { var c = await prev(); if (!c) { msg('اكتب النص أولًا.'); return; } addAsset(c, $('#nm', el).value); msg('تم حفظ العنصر. اضغط عليه لإضافته إلى الصفحة.'); };
  $('#dr', el).onclick = function () { $('#padm').classList.add('open'); initPad(); };
  var upc = null;
  async function upProc() {
    if (!upc) return; var c = document.createElement('canvas'); c.width = upc.naturalWidth; c.height = upc.naturalHeight;
    var max = 1000; if (c.width > max) { c.height = Math.round(c.height * max / c.width); c.width = max; }
    c.getContext('2d').drawImage(upc, 0, 0, c.width, c.height);
    removeBg(c, +$('#ut', el).value, $('#ui', el).checked ? fromHex($('#uc', el).value) : null);
    c = trim(c); upc._out = c; var i = document.createElement('img'); i.src = c.toDataURL(); i.style.maxHeight = '90px'; i.style.maxWidth = '95%'; $('#upprev', el).innerHTML = ''; $('#upprev', el).appendChild(i); $('#usave', el).disabled = false;
  }
  $('#up', el).onchange = async function (e) { var f = e.target.files[0]; if (!f) return; upc = await loadImg(URL.createObjectURL(f)); upc._n = f.name; upProc(); };
  ['#ut', '#ui', '#uc'].forEach(function (s) { $(s, el).oninput = upProc; });
  $('#usave', el).onclick = function () { if (upc && upc._out) { addAsset(upc._out, upc._n || 'صورة'); msg('تم حفظ العنصر بخلفية شفافة.'); } };
}
function initPad() {
  var c = $('#pad'), x = c.getContext('2d'); PAD.ctx = x; x.clearRect(0, 0, c.width, c.height);
  var cols = ['#1f3fa8', '#111111', '#0b4f4a', '#b3261e']; $('#padcols').innerHTML = cols.map(function (k) { return '<button class="sw' + (PAD.col === k ? ' on' : '') + '" data-c="' + k + '" style="background:' + k + '"></button>'; }).join('');
  $$('#padcols .sw').forEach(function (b) { b.onclick = function () { PAD.col = b.dataset.c; initPadCols(); }; });
  function initPadCols() { $$('#padcols .sw').forEach(function (b) { b.classList.toggle('on', b.dataset.c === PAD.col); }); }
  var last = null;
  function pt(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; }
  c.onpointerdown = function (e) { c.setPointerCapture(e.pointerId); PAD.drawing = true; last = pt(e); x.fillStyle = PAD.col; x.beginPath(); x.arc(last[0], last[1], +$('#padw').value, 0, 7); x.fill(); };
  c.onpointermove = function (e) { if (!PAD.drawing) return; var p = pt(e); x.strokeStyle = PAD.col; x.lineWidth = +$('#padw').value * 2; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p; };
  c.onpointerup = function () { PAD.drawing = false; };
  $('#padclr').onclick = function () { x.clearRect(0, 0, c.width, c.height); };
  $('#padx').onclick = function () { $('#padm').classList.remove('open'); };
  $('#pads').onclick = function () { addAsset(c, 'توقيع'); $('#padm').classList.remove('open'); msg('تم حفظ التوقيع.'); };
}
function placeAsset(a) {
  if (!a) return; if (!S.kind) { msg('افتح ملفًا أولًا.'); return; }
  loadImg(a.url).then(function (im) {
    var o = { id: uid(), url: a.url, orig: a.url, tint: '', ar: im.naturalHeight / im.naturalWidth, x: 0.55, y: 0.78, w: 0.28, rot: 0, op: 1, scope: 'cur', page: S.cur, range: '' };
    if (o.ar > 1.2) o.w = 0.18; o.y = Math.min(o.y, 0.95 - o.w * o.ar * 0.7);
    S.overlays.push(o); S.sel = o.id; renderStage(); renderRight();
  });
}
function bindOv(o) {
  var el = $('#right');
  var upd = function () { renderStage(); };
  $('#osz', el).oninput = function (e) { o.w = e.target.value / 100; e.target.nextSibling.textContent = e.target.value + '٪'; upd(); };
  $('#oop', el).oninput = function (e) { o.op = e.target.value / 100; e.target.nextSibling.textContent = e.target.value + '٪'; upd(); };
  $('#orot', el).oninput = function (e) { o.rot = +e.target.value; e.target.nextSibling.textContent = e.target.value + '°'; upd(); };
  function applyTint(c) { o.tint = c; if (!c) { o.url = o.orig; renderStage(); renderRight(); return; }
    loadImg(o.orig).then(function (im) { var cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; var x = cv.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = c; x.fillRect(0, 0, cv.width, cv.height); o.url = cv.toDataURL('image/png'); renderStage(); if (!applyTint.live) renderRight(); }); }
  $$('[data-tint]', el).forEach(function (b) { b.onclick = function () { applyTint(b.dataset.tint); }; });
  var tc = $('#otc', el); if (tc) { tc.oninput = function (e) { applyTint.live = true; applyTint(e.target.value); applyTint.live = false; }; }
  $$('[data-sc]', el).forEach(function (b) { b.onclick = function () { o.scope = b.dataset.sc; if (o.scope === 'cur') o.page = S.cur; renderRight(); upd(); }; });
  var rg = $('#orange', el); if (rg) rg.oninput = function (e) { o.range = e.target.value; upd(); };
  $$('[data-pos]', el).forEach(function (b) { b.onclick = function () { var h = o.w * o.ar * (S.cw / S.ch || 1), m = 0.05, p = b.dataset.pos;
    o.x = p.indexOf('r') > -1 ? 1 - o.w - m : p.indexOf('l') > -1 ? m : (1 - o.w) / 2; o.y = p[0] === 'b' ? 1 - h - m : p[0] === 't' ? m : (1 - h) / 2; upd(); }; });
  $('#odup', el).onclick = function () { var n = JSON.parse(JSON.stringify(o)); n.id = uid(); n.x = Math.min(0.9, o.x + 0.04); n.y = Math.min(0.9, o.y + 0.04); S.overlays.push(n); S.sel = n.id; renderStage(); renderRight(); };
  $('#odel', el).onclick = function () { S.overlays = S.overlays.filter(function (x) { return x !== o; }); S.sel = null; renderStage(); renderRight(); };
}

/* ---------- stage ---------- */
async function renderStage() {
  var st = $('#stage');
  if (!S.kind) { return; }
  var base = await basePage(S.cur, PREVIEW_W); S.cw = base.width; S.ch = base.height;
  var cv = base;
  if (S.tab === 'rem') { cv = await composeRemoval(S.cur, base); }
  var nav = '<div class="nav"><button id="pp">‹</button><span>الصفحة <input type="number" id="pn" min="1" max="' + S.pages + '" value="' + S.cur + '" style="width:56px;border:1px solid var(--bd2);border-radius:6px;padding:3px"> من ' + S.pages + '</span><button id="pnx">›</button></div>';
  st.innerHTML = (S.pages > 1 ? nav : '') + '<div class="sheet" id="sheet" style="width:min(' + base.width + 'px,100%)"></div>';
  var sh = $('#sheet'); var disp = document.createElement('canvas'); disp.width = cv.width; disp.height = cv.height; disp.getContext('2d').drawImage(cv, 0, 0); sh.appendChild(disp);
  var layer = document.createElement('div'); layer.className = 'layer'; sh.appendChild(layer);
  if (S.pages > 1) {
    $('#pp').onclick = function () { go(S.cur - 1); }; $('#pnx').onclick = function () { go(S.cur + 1); }; $('#pn').onchange = function (e) { go(+e.target.value); };
  }
  if (S.tab === 'add') drawOverlays(layer, sh); else drawSelect(layer, sh, base);
}
function go(p) { p = Math.max(1, Math.min(S.pages, p || 1)); S.cur = p; S.sel = null; renderStage(); renderRight(); }
function drawOverlays(layer, sh) {
  S.overlays.forEach(function (o) {
    if (!applies(o, S.cur, S.pages)) return;
    var d = document.createElement('div'); d.className = 'ov' + (o.id === S.sel ? ' sel' : '');
    d.style.cssText = 'left:' + o.x * 100 + '%;top:' + o.y * 100 + '%;width:' + o.w * 100 + '%;opacity:' + o.op + ';transform:rotate(' + o.rot + 'deg)';
    d.innerHTML = '<img src="' + o.url + '"><span class="hd"></span><button class="x" title="حذف">×</button>'; layer.appendChild(d);
    d.onpointerdown = function (e) {
      if (e.target.classList.contains('x')) { S.overlays = S.overlays.filter(function (z) { return z !== o; }); S.sel = null; renderStage(); renderRight(); return; }
      e.preventDefault(); d.setPointerCapture(e.pointerId); var r = sh.getBoundingClientRect(), resize = e.target.classList.contains('hd'), sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y, ow = o.w, moved = false;
      if (S.sel !== o.id) { S.sel = o.id; $$('.ov', layer).forEach(function (n) { n.classList.remove('sel'); }); d.classList.add('sel'); renderRight(); }
      d.onpointermove = function (ev) { moved = true; var dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height;
        if (resize) { o.w = Math.max(0.03, Math.min(0.9, ow + dx)); d.style.width = o.w * 100 + '%'; } else { o.x = ox + dx; o.y = oy + dy; d.style.left = o.x * 100 + '%'; d.style.top = o.y * 100 + '%'; } };
      d.onpointerup = function () { d.onpointermove = null; if (moved && resize) renderRight(); };
    };
  });
  layer.onpointerdown = function (e) { if (e.target === layer && S.sel) { S.sel = null; renderStage(); renderRight(); } };
}

/* ---------- removal engine ---------- */
function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; } return [h, mx ? d / mx : 0, mx]; }
function matcher(color, tol) {
  var t = rgb2hsv(color[0], color[1], color[2]), chrom = t[1] > 0.22, hd = 10 + tol * 0.55, vd = 0.05 + tol / 100 * 0.4;
  return function (r, g, b) {
    var p = rgb2hsv(r, g, b);
    if (chrom) { var dh = Math.abs(p[0] - t[0]); if (dh > 180) dh = 360 - dh; return p[1] > Math.max(0.1, t[1] * 0.3) && dh <= hd && p[2] > 0.15; }
    return p[1] < 0.2 + tol / 400 && Math.abs(p[2] - t[2]) <= vd;
  };
}
function inpaint(data, w, h, mask, excl) {
  var n = w * h, L = [], r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n), k = new Uint8Array(n);
  for (var i = 0; i < n; i++) { r[i] = data[i * 4]; g[i] = data[i * 4 + 1]; b[i] = data[i * 4 + 2]; k[i] = (mask[i] || (excl && excl[i])) ? 0 : 1; }
  L.push({ w: w, h: h, r: r, g: g, b: b, k: k });
  while (L[L.length - 1].w > 1 || L[L.length - 1].h > 1) {
    var P = L[L.length - 1], nw = Math.ceil(P.w / 2), nh = Math.ceil(P.h / 2), N = { w: nw, h: nh, r: new Float32Array(nw * nh), g: new Float32Array(nw * nh), b: new Float32Array(nw * nh), k: new Uint8Array(nw * nh) };
    for (var y = 0; y < nh; y++) for (var x = 0; x < nw; x++) {
      var sr = 0, sg = 0, sb = 0, sk = 0;
      for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) { var px = x * 2 + dx, py = y * 2 + dy; if (px < P.w && py < P.h) { var q = py * P.w + px; if (P.k[q]) { sr += P.r[q]; sg += P.g[q]; sb += P.b[q]; sk++; } } }
      var o = y * nw + x; if (sk) { N.r[o] = sr / sk; N.g[o] = sg / sk; N.b[o] = sb / sk; N.k[o] = 1; }
    } L.push(N);
  }
  var top = L[L.length - 1]; if (!top.k[0]) { top.r[0] = top.g[0] = top.b[0] = 255; top.k[0] = 1; }
  for (var li = L.length - 2; li >= 0; li--) {
    var F = L[li], C = L[li + 1];
    for (var yy = 0; yy < F.h; yy++) for (var xx = 0; xx < F.w; xx++) { var f = yy * F.w + xx; if (!F.k[f]) { var cq = (yy >> 1) * C.w + (xx >> 1); F.r[f] = C.r[cq]; F.g[f] = C.g[cq]; F.b[f] = C.b[cq]; } }
  }
  var F0 = L[0], tr = new Float32Array(n), tg = new Float32Array(n), tb = new Float32Array(n);
  for (var it = 0; it < 6; it++) {
    for (var y2 = 0; y2 < h; y2++) for (var x2 = 0; x2 < w; x2++) { var q2 = y2 * w + x2; if (!mask[q2]) continue; var a = 0, c = 0, d2 = 0, m = 0;
      for (var ey = -1; ey <= 1; ey++) for (var ex = -1; ex <= 1; ex++) { var X = x2 + ex, Y = y2 + ey; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; var z = Y * w + X; a += F0.r[z]; c += F0.g[z]; d2 += F0.b[z]; m++; }
      tr[q2] = a / m; tg[q2] = c / m; tb[q2] = d2 / m; }
    for (var q3 = 0; q3 < n; q3++) if (mask[q3]) { F0.r[q3] = tr[q3]; F0.g[q3] = tg[q3]; F0.b[q3] = tb[q3]; }
  }
  for (var j = 0; j < n; j++) if (mask[j]) { data[j * 4] = F0.r[j]; data[j * 4 + 1] = F0.g[j]; data[j * 4 + 2] = F0.b[j]; data[j * 4 + 3] = 255; }
}
function applyOp(canvas, op) {
  var W = canvas.width, H = canvas.height, f = W / PREVIEW_W, pad = Math.round(24 * f);
  var rx = Math.max(0, Math.floor(op.rect.x * W)), ry = Math.max(0, Math.floor(op.rect.y * H)), rw = Math.min(W - rx, Math.ceil(op.rect.w * W)), rh = Math.min(H - ry, Math.ceil(op.rect.h * H));
  if (rw < 2 || rh < 2) return;
  var x0 = Math.max(0, rx - pad), y0 = Math.max(0, ry - pad), x1 = Math.min(W, rx + rw + pad), y1 = Math.min(H, ry + rh + pad), w = x1 - x0, h = y1 - y0;
  var ctx = canvas.getContext('2d'), id = ctx.getImageData(x0, y0, w, h), d = id.data, mask = new Uint8Array(w * h);
  var match = op.mode === 'color' ? matcher(op.color, op.tol) : null;
  var protect = null, dark = null, tv = rgb2hsv(op.color[0], op.color[1], op.color[2]);
  if (match && tv[2] > 0.35) { /* احمِ حواف النص الداكن من المسح */
    dark = new Uint8Array(w * h); var lim = (tv[2] - 0.22) * 255;
    for (var q = 0; q < w * h; q++) { var mx = Math.max(d[q * 4], d[q * 4 + 1], d[q * 4 + 2]); if (mx < lim) dark[q] = 1; }
    if (tv[1] <= 0.22) protect = new Uint8Array(w * h);
    if (protect) for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) { var hit = 0; for (var ey2 = -1; ey2 <= 1 && !hit; ey2++) for (var ex2 = -1; ex2 <= 1; ex2++) { var X2 = px + ex2, Y2 = py + ey2; if (X2 >= 0 && Y2 >= 0 && X2 < w && Y2 < h && dark[Y2 * w + X2]) { hit = 1; break; } } protect[py * w + px] = hit; }
  }
  for (var y = ry - y0; y < ry - y0 + rh; y++) for (var x = rx - x0; x < rx - x0 + rw; x++) { var i = (y * w + x) * 4; if (!match || (!(protect && protect[y * w + x]) && match(d[i], d[i + 1], d[i + 2]))) mask[y * w + x] = 1; }
  var gr = Math.round(op.grow * f);
  for (var it = 0; it < gr; it++) { var m2 = mask.slice(); for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { if (mask[yy * w + xx] || (dark && dark[yy * w + xx])) continue; var hit = 0; for (var ey = -1; ey <= 1 && !hit; ey++) for (var ex = -1; ex <= 1; ex++) { var X = xx + ex, Y = yy + ey; if (X >= 0 && Y >= 0 && X < w && Y < h && mask[Y * w + X]) { hit = 1; break; } } if (hit) m2[yy * w + xx] = 1; } mask = m2; }
  /* ثبّت الحدود: لا تتجاوز المنطقة الأصلية */
  for (var y3 = 0; y3 < h; y3++) for (var x3 = 0; x3 < w; x3++) { var gx = x3 + x0, gy = y3 + y0; if (gx < rx || gx >= rx + rw || gy < ry || gy >= ry + rh) mask[y3 * w + x3] = 0; }
  inpaint(d, w, h, mask, dark); ctx.putImageData(id, x0, y0);
}
async function composeRemoval(page, base, width) {
  var c = document.createElement('canvas'); c.width = base.width; c.height = base.height; c.getContext('2d').drawImage(base, 0, 0);
  if (S.show === 'before') return c;
  S.ops.forEach(function (o) { if (o.on && applies(o, page, S.pages)) applyOp(c, o); }); return c;
}

/* ---------- removal UI ---------- */
function bindRem() {
  var el = $('#left');
  $$('.k', el).forEach(function (b) { b.onclick = function () { var k = b.dataset.k, K = KINDS[k]; S.set.kind = k; S.set.mode = K.mode; S.set.color = K.rgb.slice(); S.set.scope = K.scope; renderLeft(); renderRight(); }; });
  $$('.op', el).forEach(function (row) {
    var o = S.ops.filter(function (x) { return x.id === row.dataset.o; })[0];
    $('[data-on]', row).onchange = function (e) { o.on = e.target.checked; renderLeft(); renderStage(); };
    $('[data-rm]', row).onclick = function () { S.ops = S.ops.filter(function (x) { return x !== o; }); renderLeft(); renderStage(); };
    $('[data-sc]', row).onchange = function (e) { o.scope = e.target.value; if (o.scope === 'cur') o.page = S.cur; renderLeft(); renderStage(); };
    var rg = $('[data-rg]', row); if (rg) rg.oninput = function (e) { o.range = e.target.value; renderStage(); };
  });
  $('#struct', el).onclick = structural;
}
function bindSet() {
  var el = $('#right');
  $$('[data-m]', el).forEach(function (b) { b.onclick = function () { S.set.mode = b.dataset.m; renderRight(); }; });
  $$('[data-c]', el).forEach(function (b) { b.onclick = function () { S.set.color = b.dataset.c.split(',').map(Number); renderRight(); }; });
  var p = $('#pick', el); if (p) p.onclick = function () { S.set.pick = !S.set.pick; renderRight(); if (S.set.pick) msg('اضغط على الصفحة لالتقاط لون العنصر.'); };
  var t = $('#stol', el); if (t) t.oninput = function (e) { S.set.tol = +e.target.value; e.target.nextSibling.textContent = e.target.value + '٪'; };
  $('#sgr', el).oninput = function (e) { S.set.grow = +e.target.value; e.target.nextSibling.textContent = e.target.value + ' بكسل'; };
  $('#ssc', el).onchange = function (e) { S.set.scope = e.target.value; renderRight(); };
  var rg = $('#srg', el); if (rg) rg.oninput = function (e) { S.set.range = e.target.value; };
  $$('[data-show]', el).forEach(function (b) { b.onclick = function () { S.show = b.dataset.show; renderRight(); renderStage(); }; });
}
function drawSelect(layer, sh, base) {
  var box = null, sx, sy;
  layer.style.cursor = S.set.pick ? 'copy' : 'crosshair';
  layer.onpointerdown = function (e) {
    var r = sh.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (S.set.pick) { var px = Math.round(fx * base.width), py = Math.round(fy * base.height), d = base.getContext('2d').getImageData(Math.max(0, px - 1), Math.max(0, py - 1), 3, 3).data, a = [0, 0, 0];
      for (var i = 0; i < 9; i++) { a[0] += d[i * 4]; a[1] += d[i * 4 + 1]; a[2] += d[i * 4 + 2]; } S.set.color = a.map(function (v) { return Math.round(v / 9); }); S.set.pick = false; S.set.mode = 'color'; renderRight(); renderLeft(); renderStage(); return; }
    e.preventDefault(); layer.setPointerCapture(e.pointerId); sx = fx; sy = fy;
    box = document.createElement('div'); box.style.cssText = 'position:absolute;border:2px dashed ' + KINDS[S.set.kind].col + ';background:rgba(8,127,140,.08);left:' + sx * 100 + '%;top:' + sy * 100 + '%;width:0;height:0'; layer.appendChild(box);
  };
  layer.onpointermove = function (e) { if (!box) return; var r = sh.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    box.style.left = Math.min(sx, fx) * 100 + '%'; box.style.top = Math.min(sy, fy) * 100 + '%'; box.style.width = Math.abs(fx - sx) * 100 + '%'; box.style.height = Math.abs(fy - sy) * 100 + '%'; box._r = { x: Math.min(sx, fx), y: Math.min(sy, fy), w: Math.abs(fx - sx), h: Math.abs(fy - sy) }; };
  layer.onpointerup = function () { if (!box) return; var r = box._r; box.remove(); box = null;
    if (!r || r.w < 0.01 || r.h < 0.01) return;
    var s = S.set, n = S.ops.filter(function (o) { return o.kind === s.kind; }).length + 1;
    S.ops.push({ id: uid(), kind: s.kind, rect: r, mode: s.mode, color: s.color.slice(), tol: s.tol, grow: s.grow, scope: s.scope, range: s.range, page: S.cur, on: true, n: n });
    renderLeft(); renderStage(); };
  /* عرض العمليات المطبقة على الصفحة الحالية */
  S.ops.forEach(function (o) { if (!o.on || !applies(o, S.cur, S.pages)) return; var d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;border:1.5px solid ' + KINDS[o.kind].col + ';opacity:.55;left:' + o.rect.x * 100 + '%;top:' + o.rect.y * 100 + '%;width:' + o.rect.w * 100 + '%;height:' + o.rect.h * 100 + '%'; layer.appendChild(d); });
}

/* ---------- structural removal (pdf-lib) ---------- */
function stripMarked(txt, re) {
  var out = txt, count = 0, guard = 0, m;
  while ((m = re.exec(out)) && guard++ < 500) {
    var start = out.lastIndexOf('/Artifact', m.index); if (start < 0 || m.index - start > 400) { re.lastIndex = m.index + 1; continue; }
    var tok = /\b(BDC|BMC|EMC)\b/g; tok.lastIndex = m.index; var depth = 0, endIdx = -1, t, first = true;
    while ((t = tok.exec(out))) { if (t[1] === 'EMC') { depth--; if (depth <= 0 && !first) { endIdx = tok.lastIndex; break; } if (depth === 0) { endIdx = tok.lastIndex; break; } } else { depth++; first = false; } }
    if (endIdx < 0) { re.lastIndex = m.index + 1; continue; }
    out = out.slice(0, start) + out.slice(endIdx); count++; re.lastIndex = Math.max(0, start - 1);
  }
  return { text: out, count: count };
}
function latin1(u8) { var s = '', CH = 8192; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return s; }
function fromLatin1(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
async function structuralClean(bytes, kind) {
  var doc = await PL.PDFDocument.load(bytes, { ignoreEncryption: false }), ctx = doc.context, removed = 0, N = PL.PDFName;
  var subs = { watermark: ['Watermark'], stamp: ['Stamp'], signature: ['Ink'], logo: [] }[kind] || [];
  doc.getPages().forEach(function (pg) {
    var annots = pg.node.lookupMaybe(N.of('Annots'), PL.PDFArray);
    if (annots && subs.length) { for (var i = annots.size() - 1; i >= 0; i--) { var a = annots.lookupMaybe(i, PL.PDFDict); var st = a && a.get(N.of('Subtype')); if (st && subs.indexOf(st.decodeText ? st.decodeText() : String(st).replace('/', '')) > -1) { annots.remove(i); removed++; } } }
    if (kind === 'watermark') {
      var c = pg.node.get(N.of('Contents')), refs = [], arr = c && ctx.lookup(c);
      if (arr instanceof PL.PDFArray) { for (var j = 0; j < arr.size(); j++) refs.push(arr.get(j)); } else if (c) refs.push(c);
      var parts = [], changed = false;
      refs.forEach(function (r) { var s = ctx.lookup(r); if (!s || !s.getContents) return; var dec; try { dec = PL.decodePDFRawStream ? PL.decodePDFRawStream(s).decode() : s.getContents(); } catch (e) { dec = s.getContents(); } parts.push(latin1(dec)); });
      if (parts.length) {
        var res = stripMarked(parts.join('\n'), /\/Subtype\s*\/Watermark|\/Watermark\s*(?:<<|\/)/g);
        if (res.count) { var ns = ctx.flateStream(fromLatin1(res.text)); pg.node.set(N.of('Contents'), ctx.register(ns)); removed += res.count; changed = true; }
      }
    }
  });
  if (kind === 'watermark') {
    var ocp = doc.catalog.lookupMaybe(N.of('OCProperties'), PL.PDFDict);
    if (ocp) { var ocgs = ocp.lookupMaybe(N.of('OCGs'), PL.PDFArray), D = ocp.lookupMaybe(N.of('D'), PL.PDFDict);
      if (ocgs && D) { var off = D.lookupMaybe(N.of('OFF'), PL.PDFArray); if (!off) { off = ctx.obj([]); D.set(N.of('OFF'), off); }
        for (var q = 0; q < ocgs.size(); q++) { var og = ocgs.lookupMaybe(q, PL.PDFDict), nm = og && og.get(N.of('Name')); var tx = nm && nm.decodeText ? nm.decodeText() : ''; if (/water|علامة|مسودة|draft|confidential/i.test(tx)) { off.push(ocgs.get(q)); removed++; } } } }
  }
  return { bytes: await doc.save(), removed: removed };
}
async function structural() {
  if (S.kind !== 'pdf') { msg('هذه الأداة للملفات PDF فقط.'); return; }
  var kind = S.set.kind; if (kind === 'logo') { msg('الشعار عادة صورة داخل الصفحة؛ استخدم التحديد بالمستطيل.'); return; }
  try {
    var r = await structuralClean(S.bytes, kind);
    if (!r.removed) { msg('لم أجد عناصر «' + KINDS[kind].ar + '» منفصلة داخل الملف. استخدم التحديد بالمستطيل لإزالتها من صورة الصفحة.', 5500); return; }
    S.undo.push({ bytes: S.bytes }); S.bytes = new Uint8Array(r.bytes); S.baseCache = {};
    S.pdf = await pdfjs.getDocument({ data: S.bytes.slice(), cMapUrl: '../pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '../pdf/standard_fonts/' }).promise;
    msg('تمت إزالة ' + r.removed + ' عنصر منفصل من نوع «' + KINDS[kind].ar + '» دون المساس ببقية المحتوى.', 5000); renderStage();
  } catch (e) { console.error(e); msg('تعذرت المعالجة: ' + (e.message || e)); }
}

/* ---------- export ---------- */
async function exportFile() {
  if (!S.kind) return; var btn = $('#save'); btn.disabled = true; var old = btn.textContent; btn.textContent = 'جارٍ الحفظ…';
  try {
    var base = S.name.replace(/\.[^.]+$/, '');
    if (S.kind === 'img') {
      var c = document.createElement('canvas'); c.width = S.img.naturalWidth; c.height = S.img.naturalHeight; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(S.img, 0, 0);
      S.ops.forEach(function (o) { if (o.on) applyOp(c, o); });
      for (var oi = 0; oi < S.overlays.length; oi++) { var o2 = S.overlays[oi], im = await loadImg(o2.url), w = o2.w * c.width, h = w * o2.ar; x.save(); x.globalAlpha = o2.op; x.translate(o2.x * c.width + w / 2, o2.y * c.height + h / 2); x.rotate(o2.rot * Math.PI / 180); x.drawImage(im, -w / 2, -h / 2, w, h); x.restore(); }
      download(await toBlob(c, 'image/png'), base + '-ورق.png'); msg('تم حفظ الصورة.'); return;
    }
    var src = await PL.PDFDocument.load(S.bytes), out = await PL.PDFDocument.create(), total = S.pages, rasterized = 0;
    var hasOps = S.ops.some(function (o) { return o.on; });
    for (var p = 1; p <= total; p++) {
      var page = src.getPage(p - 1), size = page.getSize(), needRaster = hasOps && S.ops.some(function (o) { return o.on && applies(o, p, total); }), target;
      if (needRaster) {
        var pg = await S.pdf.getPage(p), v1 = pg.getViewport({ scale: 1 }), sc = Math.min(3.2, 2400 / Math.max(v1.width, v1.height)) , v = pg.getViewport({ scale: sc }), cc = document.createElement('canvas');
        cc.width = Math.round(v.width); cc.height = Math.round(v.height); var cx = cc.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cc.width, cc.height); await pg.render({ canvasContext: cx, viewport: v }).promise;
        S.ops.forEach(function (o) { if (o.on && applies(o, p, total)) applyOp(cc, o); });
        var jb = await toBlob(cc, 'image/jpeg', 0.93), emb = await out.embedJpg(new Uint8Array(await jb.arrayBuffer()));
        target = out.addPage([size.width, size.height]); target.drawImage(emb, { x: 0, y: 0, width: size.width, height: size.height }); rasterized++;
      } else { var cp = await out.copyPages(src, [p - 1]); target = out.addPage(cp[0]); }
      for (var k = 0; k < S.overlays.length; k++) {
        var ov = S.overlays[k]; if (!applies(ov, p, total)) continue;
        var png = await out.embedPng(await (await fetch(ov.url)).arrayBuffer()), W = target.getWidth(), H = target.getHeight(), iw = ov.w * W, ih = iw * ov.ar, th = -ov.rot * Math.PI / 180;
        var cxm = ov.x * W + iw / 2, cym = H - (ov.y * H + ih / 2), x0 = cxm - (iw / 2 * Math.cos(th) - ih / 2 * Math.sin(th)), y0 = cym - (iw / 2 * Math.sin(th) + ih / 2 * Math.cos(th));
        target.drawImage(png, { x: x0, y: y0, width: iw, height: ih, rotate: PL.degrees(-ov.rot), opacity: ov.op });
      }
    }
    var bytes = await out.save(); download(new Blob([bytes], { type: 'application/pdf' }), base + '-ورق.pdf');
    msg(rasterized ? 'تم الحفظ. تحولت ' + rasterized + ' صفحة معالَجة إلى صورة، وبقية الصفحات كما هي.' : 'تم حفظ الملف.', 5000);
  } catch (e) { console.error(e); msg('تعذر الحفظ: ' + (e.message || e), 6000); }
  finally { btn.disabled = false; btn.textContent = old; }
}

/* ---------- init ---------- */
function renderAll() { $('#drop') && $('#drop').remove(); renderLeft(); renderRight(); renderStage(); }
$$('.tab').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.t; S.sel = null; $$('.tab').forEach(function (t) { t.classList.toggle('on', t === b); }); renderLeft(); renderRight(); renderStage(); }; });
$('#file').onchange = $('#file2').onchange = function (e) { openFile(e.target.files[0]); e.target.value = ''; };
$('#save').onclick = exportFile;
$('#undo').onclick = async function () {
  if (S.tab === 'add' && S.overlays.length) { S.overlays.pop(); S.sel = null; renderStage(); renderRight(); return; }
  if (S.tab === 'rem' && S.ops.length) { S.ops.pop(); renderLeft(); renderStage(); return; }
  var u = S.undo.pop(); if (u) { S.bytes = u.bytes; S.baseCache = {}; S.pdf = await pdfjs.getDocument({ data: S.bytes.slice(), cMapUrl: '../pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '../pdf/standard_fonts/' }).promise; renderStage(); }
};
document.body.addEventListener('dragover', function (e) { e.preventDefault(); });
document.body.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) openFile(e.dataTransfer.files[0]); });
loadAssets();
fetch('../fonts/pro/fonts.json').then(function (r) { return r.json(); }).then(function (j) { S.fonts = j; renderLeft(); renderRight(); }).catch(function () { S.fonts = [{ k: 'noto', ar: 'نوتو سنس', d: '', f400: 'NotoSansArabic.ttf' }]; renderLeft(); });
renderLeft(); renderRight();
window.__studio = S;
})();

(function(){var b=document.getElementById('theme');function set(l){var r=document.documentElement;if(l)r.setAttribute('data-theme','light');else r.removeAttribute('data-theme');b.textContent=l?'☀ نهاري':'☾ ليلي';try{localStorage.setItem('waraq-studio-theme',l?'light':'dark');}catch(e){}}
b.onclick=function(){set(document.documentElement.getAttribute('data-theme')!=='light');};b.textContent=document.documentElement.getAttribute('data-theme')==='light'?'☀ نهاري':'☾ ليلي';})();
