(function () {
var W = window.W, $ = W.$, E = function () { return W.eng; };
var S = null, tokenS = 0;
var KINDS = { watermark: { ar: 'علامة', col: '#8a98a3', rgb: [185, 185, 185], mode: 'color', scope: 'all', ic: 'layers' }, signature: { ar: 'توقيع', col: '#3a56d4', rgb: [31, 63, 168], mode: 'color', scope: 'cur', ic: 'pen' }, stamp: { ar: 'ختم', col: '#d64a3f', rgb: [179, 38, 30], mode: 'color', scope: 'cur', ic: 'stamp' }, logo: { ar: 'شعار', col: '#0a8f9d', rgb: [120, 120, 120], mode: 'all', scope: 'all', ic: 'image' }, name: { ar: 'اسم', col: '#8e5bd6', rgb: [30, 30, 30], mode: 'color', scope: 'cur', ic: 'type' } };
var SCOPES = [['cur', 'هذه الصفحة'], ['all', 'كل الصفحات'], ['odd', 'الفردية'], ['even', 'الزوجية'], ['last', 'الأخيرة'], ['range', 'نطاق']];
var TINTS = ['#111111', '#1f3fa8', '#0b2a6f', '#0b4f4a', '#b3261e', '#6b3d00'];
var PREV = 1000;
function init() { return { mode: 'add', kind: null, bytes: null, name: '', doc: null, pages: 0, cur: 1, img: null, zoom: 1, cache: {}, ov: [], sel: null, ops: [], hist: [], bhist: [], cands: null, csel: {}, set: { kind: 'watermark', mode: 'color', color: [185, 185, 185], tol: 40, grow: 2, scope: 'all', range: '', pick: false }, show: 'after', fonts: [], assets: loadAssets(), nm: { text: '', font: 'noto', color: '#1f3fa8', bold: false } }; }
function loadAssets() { try { return JSON.parse(localStorage.getItem('waraq2-assets') || '[]'); } catch (e) { return []; } }
function saveAssets() { try { localStorage.setItem('waraq2-assets', JSON.stringify(S.assets)); } catch (e) { W.toast('تعذر حفظ العنصر: مساحة التخزين ممتلئة', true); } }
function snap() { S.hist.push({ ov: S.ov.map(function (o) { return Object.assign({}, o); }), ops: S.ops.map(function (o) { return Object.assign({}, o); }) }); if (S.hist.length > 50) S.hist.shift(); }

/* ---------- file ---------- */
async function openFile(f) {
  if (!f) return;
  try {
    var bytes = await W.bytes(f); S.name = f.name; S.bytes = bytes; S.cache = {}; S.ov = []; S.ops = []; S.hist = []; S.bhist = []; S.sel = null; S.cur = 1; S.cands = null; S.csel = {}; S.zoom = 1;
    if (W.isPdf(f)) { S.kind = 'pdf'; S.doc = await W.pdfOpen(bytes); S.pages = S.doc.numPages; S.img = null; scan(); }
    else if (W.isImg(f)) { S.kind = 'img'; S.doc = null; S.pages = 1; S.img = await W.loadImg(URL.createObjectURL(new Blob([bytes], { type: f.type || 'image/png' }))); }
    else { W.toast('الملف ليس PDF ولا صورة', true); return; }
    shell();
  } catch (e) { console.error(e); W.toast('تعذر فتح الملف. تأكد أنه سليم وغير محمي بكلمة مرور.', true, 5000); }
}
async function scan() {
  var b = S.bytes; try { await W.lib('wm'); var c = await window.WM.analyze(b); if (S.bytes !== b) return; S.cands = c; S.csel = {}; c.forEach(function (x) { var ar = x.bbox ? x.bbox.w * x.bbox.h : 0; S.csel[x.key] = x.def = !!x.sure && (x.kind === 'marked' || x.kind === 'text' || x.alpha < 0.98 || ar > 0.25); }); } catch (e) { console.error(e); S.cands = []; }
  if (S.mode === 'rem') { side(); stage(); }
}
async function base(p) {
  if (S.cache[p]) return S.cache[p];
  var c;
  if (S.kind === 'img') { c = document.createElement('canvas'); var sc = PREV / S.img.naturalWidth; c.width = PREV; c.height = Math.round(S.img.naturalHeight * sc); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(S.img, 0, 0, c.width, c.height); }
  else c = await W.pdfPage(S.doc, p, PREV);
  var k = Object.keys(S.cache); if (k.length > 6) delete S.cache[k[0]]; return (S.cache[p] = c);
}

/* ---------- shell ---------- */
function render(v) {
  if (!S) S = init();
  v.innerHTML = '<div id="sd" style="height:100%"></div>';
  loadFonts();
  if (W.pending) { var f = W.pending[0]; W.pending = null; if (f) { openFile(f); return; } }
  S.kind ? shell() : empty();
}
function empty() {
  var sd = $('#sd'); if (!sd) return;
  sd.innerHTML = '<div class="wrap" style="max-width:760px">' + W.dropZone({ id: 'sdz', icon: 'pen', title: 'افتح ملفًا لإضافة توقيع أو ختم أو إزالة علامة', sub: 'PDF أو صورة. كل شيء يتم على جهازك ولا يتغير الملف الأصلي.', btn: 'اختيار ملف' }) +
    '<div class="grid g3" style="margin-top:16px"><div class="card"><b>' + W.ic('pen') + ' توقيع واسم وختم</b><p class="mut" style="margin:6px 0 0;font-size:13.5px">ارسم توقيعك أو اكتب اسمك بخط رسمي أو ارفع صورة الختم، ثم حرّكه على الصفحة وتحكم بلونه وحجمه.</p></div><div class="card"><b>' + W.ic('eraser') + ' إزالة العلامة</b><p class="mut" style="margin:6px 0 0;font-size:13.5px">كشف تلقائي للعلامات داخل ملفات PDF، وإزالة يدوية للعلامة أو التوقيع أو الختم أو الشعار كلٌّ على حدة.</p></div></div></div>';
  W.bindDrop('sdz', 'application/pdf,image/*', false, function (f) { openFile(f[0]); });
}
function shell() {
  var sd = $('#sd'); if (!sd) return;
  sd.innerHTML = '<div class="split two"><div class="panel" id="side"></div><div style="display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0"><div class="row" id="sbar"></div><div class="stage" id="stg"></div></div></div>' + padModal() + imgModal();
  bindModals(); top(); side(); stage();
}
function top() {
  var t = $('#topx'); if (!t) return;
  t.innerHTML = '<span class="mut" style="font-size:13px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + W.esc(S.name) + (S.kind === 'pdf' ? ' · ' + W.n(S.pages) : '') + '</span>' +
    '<button class="btn sm" id="tfile">' + W.ic('upload') + ' فتح ملف آخر</button><button class="btn sm" id="tund">' + W.ic('undo') + ' تراجع</button><button class="btn sm p" id="tsave">' + W.ic('download') + ' حفظ نسخة جديدة</button>';
  $('#tfile').onclick = function () { W.pick('application/pdf,image/*', false).then(function (f) { if (f[0]) openFile(f[0]); }); };
  $('#tund').onclick = undo; $('#tsave').onclick = exportFile;
}
async function undo() {
  if (S.mode === 'add' && S.hist.length) { var h = S.hist.pop(); S.ov = h.ov; S.sel = null; side(); stage(); return; }
  if (S.mode === 'rem' && S.hist.length && S.ops.length) { var h2 = S.hist.pop(); S.ops = h2.ops; side(); stage(); return; }
  var b = S.bhist.pop(); if (b) { S.bytes = b; S.cache = {}; S.doc = await W.pdfOpen(S.bytes); S.pages = S.doc.numPages; S.cands = null; scan(); side(); stage(); }
}

/* ---------- side panel ---------- */
function side() {
  var el = $('#side'); if (!el) return;
  var h = '<div class="seg" style="align-self:stretch;display:flex"><button data-m="add" style="flex:1;justify-content:center" class="' + (S.mode === 'add' ? 'on' : '') + '">' + W.ic('pen') + ' توقيع وختم</button><button data-m="rem" style="flex:1;justify-content:center" class="' + (S.mode === 'rem' ? 'on' : '') + '">' + W.ic('eraser') + ' إزالة العلامة</button></div>';
  h += S.mode === 'add' ? addPanel() : remPanel();
  el.innerHTML = h;
  W.$$('[data-m]', el).forEach(function (b) { b.onclick = function () { S.mode = b.dataset.m; S.sel = null; side(); stage(); }; });
  S.mode === 'add' ? bindAdd(el) : bindRem(el);
}
function addPanel() {
  var n = S.nm, h = '<h4>' + W.ic('type') + ' اكتب اسمك</h4><label class="f"><input type="text" id="nt" placeholder="الاسم الذي سيظهر على الملف" value="' + W.esc(n.text) + '"></label>' +
    '<select id="nf">' + S.fonts.map(function (f) { return '<option value="' + f.k + '"' + (n.font === f.k ? ' selected' : '') + '>' + W.esc(f.ar) + '</option>'; }).join('') + '</select>' +
    '<div class="row">' + ['#1f3fa8', '#111111', '#0b4f4a', '#b3261e'].map(function (c) { return '<button class="sw' + (n.color === c ? ' on' : '') + '" data-nc="' + c + '" style="background:' + c + '" aria-label="لون"></button>'; }).join('') + '<input type="color" id="ncc" value="' + n.color + '"><label class="row" style="gap:5px;margin-inline-start:auto"><input type="checkbox" id="nb" ' + (n.bold ? 'checked' : '') + '> عريض</label></div>' +
    '<div id="npv" style="min-height:58px;border:1px dashed var(--line2);border-radius:10px;display:grid;place-items:center;background:#fff"></div>' +
    '<div class="row"><button class="btn sm p" id="nadd" style="flex:1">' + W.ic('plus') + ' أضف إلى الصفحة</button><button class="btn sm" id="nsave" title="حفظ في عناصري">' + W.ic('save') + '</button></div>' +
    '<h4>' + W.ic('pen') + ' التوقيع والختم</h4><div class="row"><button class="btn sm" id="dr" style="flex:1">' + W.ic('pen') + ' ارسم توقيعك</button><button class="btn sm" id="upi" style="flex:1">' + W.ic('image') + ' ارفع صورة ختم</button></div>' +
    '<h4>' + W.ic('layers') + ' عناصري المحفوظة</h4>';
  h += S.assets.length ? '<div class="assets">' + S.assets.map(function (a) { return '<div class="asset" data-a="' + a.id + '" title="اضغط لإضافته"><img src="' + a.url + '" alt=""><u data-del="' + a.id + '" title="حذف">' + W.ic('x') + '</u></div>'; }).join('') + '</div>' : '<div class="note">لا توجد عناصر محفوظة بعد. ارسم توقيعك أو ارفع ختمك مرة واحدة وسيبقى هنا لتستخدمه دائمًا.</div>';
  return h;
}
async function fontFam(f) {
  if (!f || f.k === 'noto') return 'Tajawal';
  var fam = 'WqS_' + f.k; if (!document.fonts.check('16px ' + fam)) { var ff = new FontFace(fam, 'url(' + W.ROOT + 'fonts/' + f.f400 + ')'); await ff.load(); document.fonts.add(ff); if (f.f700) { try { var fb = new FontFace(fam, 'url(' + W.ROOT + 'fonts/' + f.f700 + ')', { weight: '700' }); await fb.load(); document.fonts.add(fb); } catch (e) {} } } return fam;
}
async function textCanvas() {
  var n = S.nm, t = n.text.trim(); if (!t) return null; var f = S.fonts.filter(function (x) { return x.k === n.font; })[0], fam = await fontFam(f), size = 150, c = document.createElement('canvas'), x = c.getContext('2d'), font = (n.bold ? 'bold ' : '') + size + 'px ' + fam;
  x.font = font; c.width = Math.max(60, Math.ceil(x.measureText(t).width) + 40); c.height = Math.round(size * 1.9); x = c.getContext('2d'); x.font = font; x.fillStyle = n.color; x.direction = /[؀-ۿ]/.test(t) ? 'rtl' : 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, c.width / 2, c.height / 2); return E().trim(c);
}
function bindAdd(el) {
  var n = S.nm;
  async function pv() { var c = await textCanvas(), b = $('#npv'); if (!b) return null; b.innerHTML = ''; if (!c) { b.innerHTML = '<span class="mut" style="font-size:12px">المعاينة تظهر هنا</span>'; return null; } var i = document.createElement('img'); i.src = c.toDataURL(); i.style.cssText = 'max-width:94%;max-height:54px'; b.appendChild(i); return c; }
  pv();
  $('#nt').oninput = function (e) { n.text = e.target.value; pv(); }; $('#nf').onchange = function (e) { n.font = e.target.value; pv(); }; $('#nb').onchange = function (e) { n.bold = e.target.checked; pv(); }; $('#ncc').oninput = function (e) { n.color = e.target.value; pv(); };
  W.$$('[data-nc]', el).forEach(function (b) { b.onclick = function () { n.color = b.dataset.nc; $('#ncc').value = n.color; W.$$('[data-nc]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); pv(); }; });
  $('#nadd').onclick = async function () { var c = await pv(); if (!c) { W.toast('اكتب الاسم أولًا', true); return; } place({ url: c.toDataURL('image/png'), ar: c.height / c.width }); };
  $('#nsave').onclick = async function () { var c = await pv(); if (!c) { W.toast('اكتب الاسم أولًا', true); return; } addAsset(c, n.text); W.toast('تم حفظ الاسم في عناصري'); };
  $('#dr').onclick = function () { $('#padm').classList.add('open'); initPad(); };
  $('#upi').onclick = function () { W.pick('image/*', false).then(function (f) { if (f[0]) openImgModal(f[0]); }); };
  W.$$('.asset', el).forEach(function (a) { a.onclick = function (e) { var d = e.target.closest('[data-del]'); if (d) { S.assets = S.assets.filter(function (x) { return x.id !== d.dataset.del; }); saveAssets(); side(); return; } var as = S.assets.filter(function (x) { return x.id === a.dataset.a; })[0]; if (as) W.loadImg(as.url).then(function (im) { place({ url: as.url, ar: im.naturalHeight / im.naturalWidth }); }); }; });
}
function addAsset(c, name) { c = E().limit(E().trim(c), 900); S.assets.unshift({ id: W.uid(), name: name, url: c.toDataURL('image/png') }); S.assets = S.assets.slice(0, 40); saveAssets(); side(); }
function place(a) {
  snap(); var o = { id: W.uid(), url: a.url, orig: a.url, tint: '', ar: a.ar, w: a.ar > 1.2 ? 0.18 : 0.28, x: 0, y: 0, rot: 0, op: 1, scope: 'cur', page: S.cur, range: '' };
  o.x = 0.5 - o.w / 2; o.y = Math.max(0.02, 0.5 - o.w * a.ar * (S.cw / S.ch) / 2); S.ov.push(o); S.sel = o.id; S.mode = 'add'; stage(); W.toast('أُضيف إلى الصفحة — اسحبه لتحريكه');
}

/* ---------- removal panel ---------- */
function remPanel() {
  var s = S.set, k = KINDS[s.kind], h = '';
  if (S.kind === 'pdf') {
    h += '<h4>' + W.ic('wand') + ' علامات اكتُشفت تلقائيًا في الملف</h4>';
    if (!S.cands) h += '<div class="note">جارٍ فحص الملف…</div>';
    else if (!S.cands.length) h += '<div class="note">لم تُكتشف علامات منفصلة داخل الملف. إن كانت العلامة جزءًا من صورة الصفحة فاستخدم التحديد اليدوي بالأسفل.</div>';
    else {
      var sure = S.cands.filter(function (c) { return c.def; });
      var row = function (c) { var pos = c.bbox ? (c.bbox.y + c.bbox.h / 2 < .33 ? 'أعلى الصفحة' : c.bbox.y + c.bbox.h / 2 > .66 ? 'أسفل الصفحة' : 'وسط الصفحة') : ''; return '<label class="cand" data-ck="' + W.esc(c.key) + '"><input type="checkbox" data-wk="' + W.esc(c.key) + '" ' + (S.csel[c.key] ? 'checked' : '') + '><span><b>' + W.esc(c.label) + '</b><small>' + (pos ? pos + ' — ' : '') + (c.pages.length === S.pages ? 'في كل الصفحات' : 'في ' + W.n(c.pages.length) + ': ' + c.pages.slice(0, 8).join('، ') + (c.pages.length > 8 ? '…' : '')) + '</small></span></label>'; };
      if (sure.length) { sure.forEach(function (c) { h += row(c); }); }
      else h += '<div class="note">لا علامات واضحة. العناصر الأخرى في الملف (صور وأشكال) بالأسفل إن أردت حذف أحدها.</div>';
      var rest = S.cands.filter(function (c) { return !c.def; });
      if (rest.length) { h += '<h4 style="margin-top:4px">' + W.ic('layers') + ' عناصر أخرى داخل الملف (شعار، ختم، توقيع، صور)</h4><div class="note">كل عنصر مستقل: حدّد ما تريد حذفه فقط، ويظهر مؤطّرًا على الصفحة.</div>'; rest.forEach(function (c) { h += row(c); }); }
      h += '<button class="btn p" id="wgo">' + W.ic('eraser') + ' إزالة المحدد من الملف</button><div class="note">تُحذف من بنية الملف نفسها فيبقى النص قابلًا للتحديد وتبقى الجودة. المحدد يظهر مؤطّرًا بالأحمر على الصفحة.</div>';
    }
  }
  h += '<h4>' + W.ic('crop') + ' إزالة يدوية بالتحديد</h4><div class="note">اختر نوع العنصر ثم ارسم مستطيلًا حوله على الصفحة. كل نوع عملية مستقلة لا تؤثر في غيرها.</div><div class="seg" style="display:flex;flex-wrap:wrap">';
  Object.keys(KINDS).forEach(function (kk) { h += '<button data-k="' + kk + '" class="' + (s.kind === kk ? 'on' : '') + '" style="flex:1;justify-content:center;padding:7px 8px">' + W.ic(KINDS[kk].ic) + ' ' + KINDS[kk].ar + '</button>'; });
  h += '</div><div class="seg" style="display:flex"><button data-md="color" class="' + (s.mode === 'color' ? 'on' : '') + '" style="flex:1;justify-content:center">اللون المحدد فقط</button><button data-md="all" class="' + (s.mode === 'all' ? 'on' : '') + '" style="flex:1;justify-content:center">كل ما في المنطقة</button></div>';
  if (s.mode === 'color') h += '<div class="row"><span class="mut">اللون</span><span style="width:28px;height:28px;border-radius:8px;border:1px solid var(--line2);background:rgb(' + s.color.join(',') + ')"></span><button class="chip' + (s.pick ? ' on' : '') + '" id="pick">التقط من الصفحة</button></div><div class="row">' + [['رمادي فاتح', '185,185,185'], ['رمادي', '140,140,140'], ['أسود', '30,30,30'], ['أزرق', '31,63,168'], ['أحمر', '179,38,30']].map(function (c) { return '<button class="chip" data-c="' + c[1] + '">' + c[0] + '</button>'; }).join('') + '</div><label class="f">الحساسية: ' + s.tol + '٪<input type="range" id="tol" min="5" max="100" value="' + s.tol + '"></label>';
  h += '<label class="f">توسيع الحواف: ' + s.grow + ' بكسل<input type="range" id="grow" min="0" max="8" value="' + s.grow + '"></label><label class="f">تطبيق على<select id="ssc">' + SCOPES.map(function (x) { return '<option value="' + x[0] + '"' + (s.scope === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' + (s.scope === 'range' ? '<input type="text" id="srg" value="' + W.esc(s.range) + '" placeholder="مثال: 1-3,5">' : '');
  h += '<div class="seg"><button data-sh="before" class="' + (S.show === 'before' ? 'on' : '') + '">قبل</button><button data-sh="after" class="' + (S.show === 'after' ? 'on' : '') + '">بعد</button></div>';
  if (S.ops.length) { h += '<h4>العمليات اليدوية</h4>'; S.ops.forEach(function (o) { h += '<div class="cand" data-o="' + o.id + '"><input type="checkbox" data-on ' + (o.on ? 'checked' : '') + '><span style="flex:1"><b><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + KINDS[o.kind].col + ';margin-left:6px"></i>' + KINDS[o.kind].ar + ' ' + o.n + '</b><small>' + (SCOPES.filter(function (x) { return x[0] === o.scope; })[0] || [0, ''])[1] + (o.scope === 'cur' ? ' (ص ' + o.page + ')' : '') + '</small></span><button class="btn sm ic g d" data-rm title="حذف">' + W.ic('trash') + '</button></div>'; }); }
  h += '<div class="note warn">الإزالة اليدوية تقريبية: تنجح أكثر على الخلفيات البسيطة، والصفحة المعالَجة تتحول عند الحفظ إلى صورة وتفقد النص القابل للتحديد، وبقية الصفحات تبقى كما هي. استخدمها لمحتواك أو بإذن صاحبه.</div>';
  return h;
}
function bindRem(el) {
  var s = S.set;
  W.$$('[data-wk]', el).forEach(function (cb) { cb.onchange = function () { S.csel[cb.dataset.wk] = cb.checked; stage(); }; });
  var g = $('#wgo'); if (g) g.onclick = applyWm;
  W.$$('[data-k]', el).forEach(function (b) { b.onclick = function () { var K = KINDS[b.dataset.k]; s.kind = b.dataset.k; s.mode = K.mode; s.color = K.rgb.slice(); s.scope = K.scope; side(); }; });
  W.$$('[data-md]', el).forEach(function (b) { b.onclick = function () { s.mode = b.dataset.md; side(); }; });
  W.$$('[data-c]', el).forEach(function (b) { b.onclick = function () { s.color = b.dataset.c.split(',').map(Number); side(); }; });
  var p = $('#pick'); if (p) p.onclick = function () { s.pick = !s.pick; side(); if (s.pick) W.toast('اضغط على الصفحة لالتقاط لون العنصر'); };
  var t = $('#tol'); if (t) t.oninput = function (e) { s.tol = +e.target.value; t.parentNode.firstChild.textContent = 'الحساسية: ' + s.tol + '٪'; };
  $('#grow').oninput = function (e) { s.grow = +e.target.value; e.target.parentNode.firstChild.textContent = 'توسيع الحواف: ' + s.grow + ' بكسل'; };
  $('#ssc').onchange = function (e) { s.scope = e.target.value; side(); };
  var r = $('#srg'); if (r) r.oninput = function (e) { s.range = e.target.value; };
  W.$$('[data-sh]', el).forEach(function (b) { b.onclick = function () { S.show = b.dataset.sh; side(); stage(); }; });
  W.$$('[data-o]', el).forEach(function (row) { var o = S.ops.filter(function (x) { return x.id === row.dataset.o; })[0]; $('[data-on]', row).onchange = function (e) { o.on = e.target.checked; stage(); }; $('[data-rm]', row).onclick = function () { snap(); S.ops = S.ops.filter(function (x) { return x !== o; }); side(); stage(); }; });
}
async function applyWm() {
  var keys = Object.keys(S.csel).filter(function (k) { return S.csel[k]; }); if (!keys.length) { W.toast('حدّد عنصرًا واحدًا على الأقل', true); return; }
  try {
    await W.lib('wm'); var doc = await window.PDFLib.PDFDocument.load(S.bytes), n = window.WM.removeFromDoc(doc, keys); if (!n) { W.toast('لم يتغير شيء في الملف', true); return; }
    S.bhist.push(S.bytes); S.bytes = new Uint8Array(await doc.save()); S.cache = {}; S.cands = null; S.doc = await W.pdfOpen(S.bytes);
    W.toast('تمت إزالة ' + n + ' عنصر مع بقاء النص كما هو', false, 5000); side(); stage(); scan();
  } catch (e) { console.error(e); W.toast('تعذرت الإزالة: ' + (e.message || e), true); }
}

/* ---------- stage ---------- */
async function stage() {
  var st = $('#stg'), bar = $('#sbar'); if (!st) return; var my = ++tokenS;
  var b = await base(S.cur); if (my !== tokenS) return; S.cw = b.width; S.ch = b.height;
  var cv = b; if (S.mode === 'rem' && S.show !== 'before') { cv = document.createElement('canvas'); cv.width = b.width; cv.height = b.height; cv.getContext('2d').drawImage(b, 0, 0); S.ops.forEach(function (o) { if (o.on && E().applies(o, S.cur, S.pages)) E().applyOp(cv, o); }); }
  var sc = st.scrollTop, sl = st.scrollLeft, availH = Math.max(300, st.clientHeight - 36), availW = Math.max(260, st.clientWidth - 36), fit = Math.min(availW, availH * b.width / b.height), wpx = Math.round(Math.max(240, Math.min(fit * S.zoom, 3200)));
  var nav = '<div class="bar" style="align-self:center">' + (S.pages > 1 ? '<button class="btn sm ic g" id="pp" title="السابقة">' + W.ic('chevr') + '</button><span>صفحة <input type="number" id="pn" min="1" max="' + S.pages + '" value="' + S.cur + '"> من ' + S.pages + '</span><button class="btn sm ic g" id="pnx" title="التالية">' + W.ic('chev') + '</button><span style="width:1px;height:22px;background:var(--line2)"></span>' : '') +
    '<button class="btn sm ic g" id="zo" title="تصغير">' + W.ic('zoomout') + '</button><span id="zl" style="min-width:44px;text-align:center">' + Math.round(S.zoom * 100) + '٪</span><button class="btn sm ic g" id="zi" title="تكبير">' + W.ic('zoomin') + '</button><button class="btn sm g" id="zf">' + W.ic('fit') + ' ملاءمة</button></div>';
  st.innerHTML = nav + '<div class="sheet" id="sh" style="width:' + wpx + 'px"></div>';
  var sh = $('#sh'), d = document.createElement('canvas'); d.width = cv.width; d.height = cv.height; d.getContext('2d').drawImage(cv, 0, 0); sh.appendChild(d);
  var layer = document.createElement('div'); layer.className = 'layer'; sh.appendChild(layer);
  $('#zo').onclick = function () { S.zoom = Math.max(.5, +(S.zoom - .25).toFixed(2)); stage(); }; $('#zi').onclick = function () { S.zoom = Math.min(3, +(S.zoom + .25).toFixed(2)); stage(); }; $('#zf').onclick = function () { S.zoom = 1; stage(); };
  if (S.pages > 1) { $('#pp').onclick = function () { go(S.cur - 1); }; $('#pnx').onclick = function () { go(S.cur + 1); }; $('#pn').onchange = function (e) { go(+e.target.value); }; }
  S.mode === 'add' ? drawOv(layer, sh) : drawSel(layer, sh, b);
  st.scrollTop = sc; st.scrollLeft = sl; selBar();
}
function go(p) { S.cur = Math.max(1, Math.min(S.pages, p || 1)); S.sel = null; stage(); }

/* ---------- selected overlay bar ---------- */
function selBar() {
  var bar = $('#sbar'); if (!bar) return; var o = S.mode === 'add' ? S.ov.filter(function (x) { return x.id === S.sel; })[0] : null;
  if (!o) { bar.innerHTML = '<div class="note" style="flex:1">' + (S.mode === 'add' ? (S.ov.length ? 'اضغط على عنصر لتعديله، أو اسحبه لتحريكه. الأسهم تحرّك العنصر المحدد (مع Shift أسرع) و Delete يحذفه.' : 'أضف اسمك أو توقيعك أو ختمك من اللوحة الجانبية، ثم حرّكه إلى مكانه على الصفحة.') : 'ارسم مستطيلًا حول ما تريد إزالته. يمكنك تكبير الصفحة للدقة.') + '</div>'; return; }
  bar.innerHTML = '<div class="bar" style="width:100%"><label class="row" style="gap:6px">الحجم<input type="range" id="osz" min="3" max="90" value="' + Math.round(o.w * 100) + '" style="width:90px"></label><label class="row" style="gap:6px">الشفافية<input type="range" id="oop" min="15" max="100" value="' + Math.round(o.op * 100) + '" style="width:80px"></label><label class="row" style="gap:6px">التدوير<input type="range" id="orot" min="-180" max="180" value="' + o.rot + '" style="width:80px"></label>' +
    '<span style="width:1px;height:22px;background:var(--line2)"></span><span class="mut" style="font-size:12px">اللون</span><button class="chip' + (!o.tint ? ' on' : '') + '" data-t="">الأصلي</button>' + TINTS.map(function (c) { return '<button class="sw' + (o.tint === c ? ' on' : '') + '" data-t="' + c + '" style="background:' + c + '"></button>'; }).join('') + '<input type="color" id="otc" value="' + (o.tint || '#1f3fa8') + '">' +
    '<span style="width:1px;height:22px;background:var(--line2)"></span><select id="osc" style="width:auto;padding:5px 8px">' + SCOPES.map(function (x) { return '<option value="' + x[0] + '"' + (o.scope === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' + (o.scope === 'range' ? '<input type="text" id="org" value="' + W.esc(o.range) + '" placeholder="1-3,5" style="width:90px">' : '') +
    '<span class="sp"></span><button class="btn sm ic" id="ocen" title="توسيط">' + W.ic('grid') + '</button><button class="btn sm ic" id="odup" title="تكرار">' + W.ic('copy') + '</button><button class="btn sm ic d" id="odel" title="حذف">' + W.ic('trash') + '</button></div>';
  var upd = function () { stage(); };
  $('#osz').oninput = function (e) { o.w = e.target.value / 100; liveOv(o); }; $('#oop').oninput = function (e) { o.op = e.target.value / 100; liveOv(o); }; $('#orot').oninput = function (e) { o.rot = +e.target.value; liveOv(o); };
  $('#osz').onchange = $('#oop').onchange = $('#orot').onchange = function () { snap(); };
  function tint(c) { o.tint = c; if (!c) { o.url = o.orig; stage(); return; } W.loadImg(o.orig).then(function (im) { var cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; var x = cv.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = c; x.fillRect(0, 0, cv.width, cv.height); o.url = cv.toDataURL('image/png'); liveOv(o, true); }); }
  W.$$('[data-t]', bar).forEach(function (b) { b.onclick = function () { snap(); tint(b.dataset.t); W.$$('[data-t]', bar).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
  $('#otc').oninput = function (e) { tint(e.target.value); };
  $('#osc').onchange = function (e) { snap(); o.scope = e.target.value; if (o.scope === 'cur') o.page = S.cur; selBar(); stage(); };
  var r = $('#orange') || $('#orange'); var rg = $('#org'); if (rg) rg.oninput = function (e) { o.range = e.target.value; stage(); };
  $('#ocen').onclick = function () { snap(); o.x = .5 - o.w / 2; o.y = Math.max(0, .5 - o.w * o.ar * (S.cw / S.ch) / 2); stage(); };
  $('#odup').onclick = function () { snap(); var n = Object.assign({}, o); n.id = W.uid(); n.x = Math.min(.9, o.x + .04); n.y = Math.min(.9, o.y + .04); S.ov.push(n); S.sel = n.id; stage(); };
  $('#odel').onclick = function () { snap(); S.ov = S.ov.filter(function (x) { return x !== o; }); S.sel = null; stage(); };
}
function liveOv(o, full) { var el = $('.ovl[data-id="' + o.id + '"]'); if (!el || full) { stage(); return; } el.style.width = o.w * 100 + '%'; el.style.left = o.x * 100 + '%'; el.style.top = o.y * 100 + '%'; el.style.opacity = o.op; el.style.transform = 'rotate(' + o.rot + 'deg)'; }
function visible(o) { return E().applies(o, S.cur, S.pages); }
function drawOv(layer, sh) {
  S.ov.forEach(function (o) {
    if (!visible(o)) return;
    var d = document.createElement('div'); d.className = 'ovl' + (o.id === S.sel ? ' sel' : ''); d.dataset.id = o.id; d.style.cssText = 'left:' + o.x * 100 + '%;top:' + o.y * 100 + '%;width:' + o.w * 100 + '%;opacity:' + o.op + ';transform:rotate(' + o.rot + 'deg)';
    d.innerHTML = '<img src="' + o.url + '" alt=""><span class="hd"></span>'; layer.appendChild(d);
    d.onpointerdown = function (e) {
      e.preventDefault(); e.stopPropagation(); d.setPointerCapture(e.pointerId); var r = sh.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y, ow = o.w, resize = e.target.classList.contains('hd'), moved = false, wasSel = S.sel === o.id;
      if (!wasSel) { S.sel = o.id; W.$$('.ovl', layer).forEach(function (n) { n.classList.remove('sel'); }); d.classList.add('sel'); selBar(); }
      d.onpointermove = function (ev) { if (!moved) { snap(); } moved = true; var dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height; if (resize) { o.w = Math.max(.03, Math.min(.95, ow + dx)); d.style.width = o.w * 100 + '%'; var z = $('#osz'); if (z) z.value = Math.round(o.w * 100); } else { o.x = ox + dx; o.y = oy + dy; d.style.left = o.x * 100 + '%'; d.style.top = o.y * 100 + '%'; } };
      d.onpointerup = function () { d.onpointermove = null; };
    };
  });
  layer.onpointerdown = function (e) { if (e.target === layer && S.sel) { S.sel = null; stage(); } };
}
document.addEventListener('keydown', function (e) {
  if (W.cur !== 'studio' || !S || S.mode !== 'add' || !S.sel || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
  var o = S.ov.filter(function (x) { return x.id === S.sel; })[0]; if (!o) return; var st = e.shiftKey ? .02 : .004, h = true;
  if (e.key === 'ArrowLeft') o.x -= st; else if (e.key === 'ArrowRight') o.x += st; else if (e.key === 'ArrowUp') o.y -= st; else if (e.key === 'ArrowDown') o.y += st; else if (e.key === '+' || e.key === '=') o.w = Math.min(.95, o.w * 1.05); else if (e.key === '-') o.w = Math.max(.03, o.w / 1.05);
  else if (e.key === 'Delete' || e.key === 'Backspace') { snap(); S.ov = S.ov.filter(function (x) { return x !== o; }); S.sel = null; } else h = false;
  if (h) { e.preventDefault(); stage(); }
});

/* ---------- manual selection ---------- */
function drawSel(layer, sh, b) {
  layer.style.overflow = 'hidden'; var box = null, sx, sy, s = S.set; layer.style.cursor = s.pick ? 'copy' : 'crosshair';
  layer.onpointerdown = function (e) {
    var r = sh.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (s.pick) { var px = Math.round(fx * b.width), py = Math.round(fy * b.height), dd = b.getContext('2d').getImageData(Math.max(0, px - 1), Math.max(0, py - 1), 3, 3).data, a = [0, 0, 0]; for (var i = 0; i < 9; i++) { a[0] += dd[i * 4]; a[1] += dd[i * 4 + 1]; a[2] += dd[i * 4 + 2]; } s.color = a.map(function (v) { return Math.round(v / 9); }); s.pick = false; s.mode = 'color'; side(); stage(); return; }
    e.preventDefault(); layer.setPointerCapture(e.pointerId); sx = fx; sy = fy; box = document.createElement('div'); box.style.cssText = 'position:absolute;border:2px dashed ' + KINDS[s.kind].col + ';background:rgba(10,143,157,.1);left:' + sx * 100 + '%;top:' + sy * 100 + '%;width:0;height:0'; layer.appendChild(box);
  };
  layer.onpointermove = function (e) { if (!box) return; var r = sh.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); box.style.left = Math.min(sx, fx) * 100 + '%'; box.style.top = Math.min(sy, fy) * 100 + '%'; box.style.width = Math.abs(fx - sx) * 100 + '%'; box.style.height = Math.abs(fy - sy) * 100 + '%'; box._r = { x: Math.min(sx, fx), y: Math.min(sy, fy), w: Math.abs(fx - sx), h: Math.abs(fy - sy) }; };
  layer.onpointerup = function () { if (!box) return; var r = box._r; box.remove(); box = null; if (!r || r.w < .01 || r.h < .01) return; snap(); var n = S.ops.filter(function (o) { return o.kind === s.kind; }).length + 1; S.ops.push({ id: W.uid(), kind: s.kind, rect: r, mode: s.mode, color: s.color.slice(), tol: s.tol, grow: s.grow, scope: s.scope, range: s.range, page: S.cur, on: true, n: n }); side(); stage(); };
  if (S.cands) S.cands.forEach(function (c) { if (S.csel[c.key] || c.pages.indexOf(S.cur) < 0 || !c.bbox || c.bbox.w * c.bbox.h > .6) return; var d = document.createElement('div'); d.title = 'اضغط لتحديد «' + c.label + '» للإزالة'; d.style.cssText = 'position:absolute;cursor:pointer;border:1.5px dashed rgba(10,143,157,.85);border-radius:3px;left:' + c.bbox.x * 100 + '%;top:' + c.bbox.y * 100 + '%;width:' + c.bbox.w * 100 + '%;height:' + c.bbox.h * 100 + '%'; d.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); S.csel[c.key] = true; side(); stage(); }; layer.appendChild(d); });
  if (S.cands) S.cands.forEach(function (c) { if (!S.csel[c.key] || c.pages.indexOf(S.cur) < 0 || !c.bbox) return; var d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #e5484d;background:rgba(229,72,77,.13);border-radius:3px;left:' + c.bbox.x * 100 + '%;top:' + c.bbox.y * 100 + '%;width:' + c.bbox.w * 100 + '%;height:' + c.bbox.h * 100 + '%'; layer.appendChild(d); });
  S.ops.forEach(function (o) { if (!o.on || !E().applies(o, S.cur, S.pages)) return; var d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;border:1.5px solid ' + KINDS[o.kind].col + ';opacity:.6;left:' + o.rect.x * 100 + '%;top:' + o.rect.y * 100 + '%;width:' + o.rect.w * 100 + '%;height:' + o.rect.h * 100 + '%'; layer.appendChild(d); });
}

/* ---------- modals: signature pad & image ---------- */
function padModal() { return '<div class="modal" id="padm"><div class="box"><b style="font-size:17px">' + W.ic('pen') + ' ارسم توقيعك</b><canvas id="pad" width="1200" height="440" style="width:100%;height:220px;background:#fff;border-radius:12px;touch-action:none;cursor:crosshair;border:1px solid var(--line2)"></canvas><div class="row"><span class="mut">اللون</span><span id="padc" class="row"></span><span class="mut">السماكة</span><input type="range" id="padw" min="2" max="14" value="5" style="width:110px"><button class="btn sm" id="padclr">مسح</button><span class="sp"></span><button class="btn sm" id="padx">إلغاء</button><button class="btn sm p" id="pads">' + W.ic('save') + ' حفظ واستخدام</button></div></div></div>'; }
function imgModal() { return '<div class="modal" id="imgm"><div class="box"><b style="font-size:17px">' + W.ic('stamp') + ' تجهيز الختم أو الصورة</b><div id="ipv" style="min-height:160px;border:1px dashed var(--line2);border-radius:12px;display:grid;place-items:center;background:repeating-conic-gradient(var(--surface2) 0 25%,var(--surface) 0 50%) 0 0/16px 16px;padding:8px"></div><label class="f">إزالة الخلفية: <span id="itv">30</span>٪<input type="range" id="it" min="5" max="90" value="30"></label><label class="row" style="gap:8px"><input type="checkbox" id="ii"> تلوين الحبر بلون واحد</label><div class="row"><input type="color" id="ic" value="#1f3fa8"><span class="sp"></span><button class="btn sm" id="ix">إلغاء</button><button class="btn sm p" id="isv">' + W.ic('save') + ' حفظ واستخدام</button></div></div></div>'; }
var PAD = { col: '#1f3fa8', on: false }, IM = { src: null, out: null };
function initPad() {
  var c = $('#pad'), x = c.getContext('2d'), last; x.clearRect(0, 0, c.width, c.height);
  function cols() { $('#padc').innerHTML = ['#1f3fa8', '#111111', '#0b4f4a', '#b3261e'].map(function (k) { return '<button class="sw' + (PAD.col === k ? ' on' : '') + '" data-c="' + k + '" style="background:' + k + '"></button>'; }).join(''); W.$$('#padc .sw').forEach(function (b) { b.onclick = function () { PAD.col = b.dataset.c; cols(); }; }); } cols();
  function pt(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; }
  c.onpointerdown = function (e) { c.setPointerCapture(e.pointerId); PAD.on = true; last = pt(e); x.fillStyle = PAD.col; x.beginPath(); x.arc(last[0], last[1], +$('#padw').value, 0, 7); x.fill(); };
  c.onpointermove = function (e) { if (!PAD.on) return; var p = pt(e); x.strokeStyle = PAD.col; x.lineWidth = +$('#padw').value * 2; x.lineCap = x.lineJoin = 'round'; x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p; };
  c.onpointerup = function () { PAD.on = false; };
}
function bindModals() {
  $('#padclr').onclick = function () { var c = $('#pad'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
  $('#padx').onclick = function () { $('#padm').classList.remove('open'); };
  $('#pads').onclick = function () { var c = E().trim($('#pad')); addAsset(c, 'توقيع'); $('#padm').classList.remove('open'); W.loadImg(c.toDataURL('image/png')).then(function (im) { place({ url: c.toDataURL('image/png'), ar: im.naturalHeight / im.naturalWidth }); }); };
  function up() { if (!IM.src) return; var c = document.createElement('canvas'); c.width = IM.src.naturalWidth; c.height = IM.src.naturalHeight; c.getContext('2d').drawImage(IM.src, 0, 0); var m = Math.max(c.width, c.height); if (m > 1400) c = E().limit(c, 1400); E().removeBg(c, +$('#it').value, $('#ii').checked ? [parseInt($('#ic').value.substr(1, 2), 16), parseInt($('#ic').value.substr(3, 2), 16), parseInt($('#ic').value.substr(5, 2), 16)] : null); IM.out = E().trim(c); $('#itv').textContent = $('#it').value; var i = document.createElement('img'); i.src = IM.out.toDataURL(); i.style.cssText = 'max-width:100%;max-height:200px'; $('#ipv').innerHTML = ''; $('#ipv').appendChild(i); }
  ['#it', '#ii', '#ic'].forEach(function (s) { $(s).oninput = up; });
  $('#ix').onclick = function () { $('#imgm').classList.remove('open'); };
  $('#isv').onclick = function () { if (!IM.out) return; var c = IM.out; addAsset(c, 'ختم'); $('#imgm').classList.remove('open'); place({ url: c.toDataURL('image/png'), ar: c.height / c.width }); };
  IM.up = up;
}
function openImgModal(f) { W.loadImg(URL.createObjectURL(f)).then(function (im) { IM.src = im; $('#imgm').classList.add('open'); IM.up(); }); }
async function loadFonts() { if (S.fonts.length) return; try { S.fonts = await (await fetch(W.ROOT + 'fonts/pro/fonts.json')).json(); } catch (e) { S.fonts = [{ k: 'noto', ar: 'تجوال (افتراضي)', f400: '' }]; } if (S.kind && S.mode === 'add') side(); }

/* ---------- export ---------- */
async function exportFile() {
  if (!S.kind) return; var btn = $('#tsave'); btn.disabled = true;
  try {
    var base0 = S.name.replace(/\.[^.]+$/, '');
    if (S.kind === 'img') {
      var c = document.createElement('canvas'); c.width = S.img.naturalWidth; c.height = S.img.naturalHeight; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(S.img, 0, 0);
      S.ops.forEach(function (o) { if (o.on) E().applyOp(c, o); });
      for (var oi = 0; oi < S.ov.length; oi++) { var o2 = S.ov[oi], im = await W.loadImg(o2.url), w = o2.w * c.width, h = w * o2.ar; x.save(); x.globalAlpha = o2.op; x.translate(o2.x * c.width + w / 2, o2.y * c.height + h / 2); x.rotate(o2.rot * Math.PI / 180); x.drawImage(im, -w / 2, -h / 2, w, h); x.restore(); }
      W.download(await W.blob(c, 'image/png'), base0 + '-ورق.png'); W.toast('تم حفظ الصورة'); return;
    }
    await W.lib('pdflib'); var PL = window.PDFLib, src = await PL.PDFDocument.load(S.bytes), out = await PL.PDFDocument.create(), total = S.pages, ras = 0, hasOps = S.ops.some(function (o) { return o.on; });
    for (var p = 1; p <= total; p++) {
      var page = src.getPage(p - 1), size = page.getSize(), need = hasOps && S.ops.some(function (o) { return o.on && E().applies(o, p, total); }), target;
      if (need) {
        var pg = await S.doc.getPage(p), v1 = pg.getViewport({ scale: 1 }), sc = Math.min(3.2, 2400 / Math.max(v1.width, v1.height)), v = pg.getViewport({ scale: sc }), cc = document.createElement('canvas'); cc.width = Math.round(v.width); cc.height = Math.round(v.height); var cx = cc.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cc.width, cc.height); await pg.render({ canvasContext: cx, viewport: v }).promise;
        S.ops.forEach(function (o) { if (o.on && E().applies(o, p, total)) E().applyOp(cc, o); });
        var jb = await W.blob(cc, 'image/jpeg', .93), emb = await out.embedJpg(new Uint8Array(await jb.arrayBuffer())); target = out.addPage([size.width, size.height]); target.drawImage(emb, { x: 0, y: 0, width: size.width, height: size.height }); ras++;
      } else { var cp = await out.copyPages(src, [p - 1]); target = out.addPage(cp[0]); }
      for (var k = 0; k < S.ov.length; k++) {
        var ov = S.ov[k]; if (!E().applies(ov, p, total)) continue;
        var png = await out.embedPng(await (await fetch(ov.url)).arrayBuffer()), Wd = target.getWidth(), Hd = target.getHeight(), iw = ov.w * Wd, ih = iw * ov.ar, th = -ov.rot * Math.PI / 180, cxm = ov.x * Wd + iw / 2, cym = Hd - (ov.y * Hd + ih / 2);
        target.drawImage(png, { x: cxm - (iw / 2 * Math.cos(th) - ih / 2 * Math.sin(th)), y: cym - (iw / 2 * Math.sin(th) + ih / 2 * Math.cos(th)), width: iw, height: ih, rotate: PL.degrees(-ov.rot), opacity: ov.op });
      }
    }
    W.download(new Blob([await out.save()], { type: 'application/pdf' }), base0 + '-ورق.pdf');
    W.toast(ras ? 'تم الحفظ. ' + (ras === 1 ? 'تحوّلت صفحة واحدة معالَجة إلى صورة' : 'تحوّلت ' + W.n(ras) + ' معالَجة إلى صور') + '، وبقية الصفحات كما هي.' : 'تم حفظ الملف', false, 5000);
  } catch (e) { console.error(e); W.toast('تعذر الحفظ: ' + (e.message || e), true, 6000); } finally { btn.disabled = false; }
}

W.register('studio', { nav: 1, icon: 'pen', title: 'التوقيع والختم وإزالة العلامة', short: 'التوقيع والختم', render: render, destroy: function () { var t = $('#topx'); if (t) t.innerHTML = ''; } });
})();
