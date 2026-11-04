(function () {
var W = window.W, $ = W.$, S = null;
function init() { return { src: null, name: '', hist: [], mode: 'orig', br: 0, ct: 0, th: 150, crop: null, cropOn: false }; }
async function openFile(f) {
  if (!f) return;
  try {
    var im;
    if (W.isPdf(f)) { var d = await W.pdfOpen(await W.bytes(f)), c = await W.pdfPage(d, 1, 1800); if (d.numPages > 1) W.toast('الملف يحتوي ' + W.n(d.numPages) + '؛ فُتحت الصفحة الأولى فقط. استخدم «أدوات PDF» لفصل الصفحات.', false, 5000); S.src = c; }
    else { im = await W.loadImg(URL.createObjectURL(f)); var cv = document.createElement('canvas'), m = Math.max(im.naturalWidth, im.naturalHeight), k = m > 3200 ? 3200 / m : 1; cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); S.src = cv; }
    S.name = f.name.replace(/\.[^.]+$/, ''); S.hist = []; S.crop = null; S.cropOn = false; S.mode = 'orig'; S.br = 0; S.ct = 0; S.th = 150; shell();
  } catch (e) { console.error(e); W.toast('تعذر فتح الملف', true); }
}
function clone(c) { var n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; }
function commit(c) { S.hist.push(S.src); if (S.hist.length > 12) S.hist.shift(); S.src = c; S.crop = null; S.cropOn = false; side(); draw(); }

/* ---------- pixel pipeline ---------- */
function blurBg(g, w, h) {
  var f = Math.max(8, Math.round(Math.max(w, h) / 60)), sw = Math.ceil(w / f), sh = Math.ceil(h / f), s = new Float32Array(sw * sh), cnt = new Float32Array(sw * sh);
  /* خلفية تقريبية: أعلى 40% من القيم في كل خلية (تتجاهل الحبر) */
  var cell = {}; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var k = ((y / f) | 0) * sw + ((x / f) | 0); (cell[k] = cell[k] || []).push(g[y * w + x]); }
  for (var k2 in cell) { var a = cell[k2].sort(function (p, q) { return p - q; }), i0 = Math.floor(a.length * .6), t = 0, n = 0; for (var i = i0; i < a.length; i++) { t += a[i]; n++; } s[k2] = n ? t / n : 255; }
  var t2 = new Float32Array(sw * sh); for (var it = 0; it < 2; it++) { for (var yy = 0; yy < sh; yy++) for (var xx = 0; xx < sw; xx++) { var tt = 0, nn = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = xx + dx, Y = yy + dy; if (X >= 0 && Y >= 0 && X < sw && Y < sh) { tt += s[Y * sw + X]; nn++; } } t2[yy * sw + xx] = tt / nn; } s.set(t2); }
  return { s: s, sw: sw, sh: sh, f: f };
}
function process(src) {
  var c = clone(src), x = c.getContext('2d'), id = x.getImageData(0, 0, c.width, c.height), d = id.data, w = c.width, h = c.height, n = w * h, m = S.mode;
  if (m !== 'orig') {
    var g = new Float32Array(n); for (var i = 0; i < n; i++) g[i] = d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114;
    if (m === 'auto') { var hist = new Uint32Array(256); for (i = 0; i < n; i++) hist[g[i] | 0]++; var lo = 0, hi = 255, acc = 0; for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > n * .01) { lo = i; break; } } acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > n * .01) { hi = i; break; } } var sc = 255 / Math.max(30, hi - lo); for (i = 0; i < n * 4; i += 4) for (var q = 0; q < 3; q++) d[i + q] = Math.max(0, Math.min(255, (d[i + q] - lo) * sc)); }
    else {
      var B = blurBg(g, w, h); var out = new Float32Array(n);
      for (var y = 0; y < h; y++) { var fy = Math.min(B.sh - 1, y / B.f); for (var xx = 0; xx < w; xx++) { var fx = Math.min(B.sw - 1, xx / B.f), x0 = fx | 0, y0 = fy | 0, x1 = Math.min(B.sw - 1, x0 + 1), y1 = Math.min(B.sh - 1, y0 + 1), ax = fx - x0, ay = fy - y0; var bg = (B.s[y0 * B.sw + x0] * (1 - ax) + B.s[y0 * B.sw + x1] * ax) * (1 - ay) + (B.s[y1 * B.sw + x0] * (1 - ax) + B.s[y1 * B.sw + x1] * ax) * ay; var v = Math.min(255, g[y * w + xx] / Math.max(40, bg) * 255); out[y * w + xx] = v; } }
      for (i = 0; i < n; i++) { var v2 = out[i]; if (m === 'bw') v2 = v2 < S.th ? 0 : 255; else { v2 = (v2 - 40) * 255 / 190; v2 = Math.max(0, Math.min(255, v2)); } d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v2; }
    }
  }
  if (S.br || S.ct) { var cf = (259 * (S.ct + 255)) / (255 * (259 - S.ct)); for (i = 0; i < n * 4; i += 4) for (var z = 0; z < 3; z++) d[i + z] = Math.max(0, Math.min(255, cf * (d[i + z] - 128 + S.br * 1.3) + 128)); }
  x.putImageData(id, 0, 0); return c;
}

/* ---------- UI ---------- */
function render(v) { if (!S) S = init(); v.innerHTML = '<div id="im" style="height:100%"></div>'; if (W.pending) { var f = W.pending.filter(function (x) { return W.isImg(x) || W.isPdf(x); })[0]; W.pending = null; if (f) { openFile(f); return; } } S.src ? shell() : empty(); }
function empty() { var el = $('#im'); if (!el) return; el.innerHTML = '<div class="wrap" style="max-width:760px">' + W.dropZone({ id: 'idz', icon: 'image', title: 'افتح صورة أو مستندًا ممسوحًا', sub: 'قص وتدوير وتبييض الخلفية وتحويل الصورة إلى مستند نظيف. PNG أو JPG أو WebP.', btn: 'اختيار صورة' }) + '</div>'; W.bindDrop('idz', 'image/*,application/pdf', false, function (f) { openFile(f[0]); }); }
function shell() { var el = $('#im'); if (!el) return; el.innerHTML = '<div class="split two"><div class="panel" id="iside"></div><div style="display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0"><div class="stage" id="istg" style="justify-content:center"></div></div></div>'; var t = $('#topx'); t.innerHTML = '<button class="btn sm" id="ifile">' + W.ic('upload') + ' فتح صورة أخرى</button><button class="btn sm" id="iund">' + W.ic('undo') + ' تراجع</button>'; $('#ifile').onclick = function () { W.pick('image/*,application/pdf', false).then(function (f) { if (f[0]) openFile(f[0]); }); }; $('#iund').onclick = function () { var p = S.hist.pop(); if (p) { S.src = p; S.crop = null; side(); draw(); } }; side(); draw(); }
function side() {
  var el = $('#iside'); if (!el) return;
  var MODES = [['orig', 'الأصلية'], ['auto', 'تحسين تلقائي'], ['doc', 'مستند نظيف'], ['bw', 'أبيض وأسود']];
  el.innerHTML = '<h4>' + W.ic('wand') + ' المظهر</h4><div class="seg" style="display:flex;flex-wrap:wrap">' + MODES.map(function (m) { return '<button data-m="' + m[0] + '" class="' + (S.mode === m[0] ? 'on' : '') + '" style="flex:1 1 45%;justify-content:center">' + m[1] + '</button>'; }).join('') + '</div>' +
    '<div class="note">«مستند نظيف» يبيّض الخلفية ويعالج الإضاءة غير المتساوية، و«أبيض وأسود» يناسب الطباعة وتصغير الحجم.</div>' +
    (S.mode === 'bw' ? '<label class="f">العتبة: <span id="thv">' + S.th + '</span><input type="range" id="th" min="80" max="220" value="' + S.th + '"></label>' : '') +
    '<label class="f">السطوع: <span id="brv">' + S.br + '</span><input type="range" id="br" min="-100" max="100" value="' + S.br + '"></label><label class="f">التباين: <span id="ctv">' + S.ct + '</span><input type="range" id="ct" min="-100" max="100" value="' + S.ct + '"></label>' +
    '<h4>' + W.ic('crop') + ' التحويل</h4><div class="row"><button class="btn sm" id="rl">' + W.ic('rotate') + ' تدوير ٩٠°</button><button class="btn sm" id="fh">' + W.ic('flip') + ' قلب أفقي</button><button class="btn sm' + (S.cropOn ? ' on' : '') + '" id="cr">' + W.ic('crop') + ' قص</button></div>' +
    (S.cropOn ? '<div class="note">ارسم مستطيل القص على الصورة ثم اضغط «تطبيق القص».</div><button class="btn p sm" id="crok" ' + (S.crop ? '' : 'disabled') + '>' + W.ic('check') + ' تطبيق القص</button>' : '') +
    '<h4>' + W.ic('download') + ' الحفظ</h4><div class="row"><button class="btn p sm" id="xp" style="flex:1">PNG</button><button class="btn p sm" id="xj" style="flex:1">JPG</button><button class="btn p sm" id="xf" style="flex:1">PDF</button></div><div class="note">' + S.src.width + ' × ' + S.src.height + ' بكسل</div>';
  W.$$('[data-m]', el).forEach(function (b) { b.onclick = function () { S.mode = b.dataset.m; side(); draw(); }; });
  function sl(id, key, lab) { var e = $('#' + id); if (!e) return; e.oninput = function () { S[key] = +e.value; $('#' + lab).textContent = e.value; draw(); }; } sl('br', 'br', 'brv'); sl('ct', 'ct', 'ctv'); sl('th', 'th', 'thv');
  $('#rl').onclick = function () { var c = document.createElement('canvas'); c.width = S.src.height; c.height = S.src.width; var x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(Math.PI / 2); x.drawImage(S.src, -S.src.width / 2, -S.src.height / 2); commit(c); };
  $('#fh').onclick = function () { var c = document.createElement('canvas'); c.width = S.src.width; c.height = S.src.height; var x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(S.src, 0, 0); commit(c); };
  $('#cr').onclick = function () { S.cropOn = !S.cropOn; S.crop = null; side(); draw(); };
  var ok = $('#crok'); if (ok) ok.onclick = function () { var r = S.crop, c = document.createElement('canvas'); c.width = Math.max(2, Math.round(r.w * S.src.width)); c.height = Math.max(2, Math.round(r.h * S.src.height)); c.getContext('2d').drawImage(S.src, Math.round(r.x * S.src.width), Math.round(r.y * S.src.height), c.width, c.height, 0, 0, c.width, c.height); commit(c); };
  $('#xp').onclick = function () { W.blob(process(S.src), 'image/png').then(function (b) { W.download(b, S.name + '-ورق.png'); W.toast('تم حفظ الصورة'); }); };
  $('#xj').onclick = function () { W.blob(process(S.src), 'image/jpeg', .92).then(function (b) { W.download(b, S.name + '-ورق.jpg'); W.toast('تم حفظ الصورة'); }); };
  $('#xf').onclick = async function () { try { await W.lib('pdflib'); var PL = window.PDFLib, c = process(S.src), d = await PL.PDFDocument.create(), jb = new Uint8Array(await (await W.blob(c, 'image/jpeg', .92)).arrayBuffer()), im = await d.embedJpg(jb), A = [595.28, 841.89], land = c.width > c.height, pw = land ? A[1] : A[0], ph = land ? A[0] : A[1], s = Math.min(pw / im.width, ph / im.height), p = d.addPage([pw, ph]); p.drawImage(im, { x: (pw - im.width * s) / 2, y: (ph - im.height * s) / 2, width: im.width * s, height: im.height * s }); W.download(new Blob([await d.save()], { type: 'application/pdf' }), S.name + '-ورق.pdf'); W.toast('تم حفظ PDF'); } catch (e) { W.toast('تعذر الحفظ: ' + e.message, true); } };
}
function draw() {
  var st = $('#istg'); if (!st) return; var prev = S.src; if (Math.max(prev.width, prev.height) > 1400) { var k = 1400 / Math.max(prev.width, prev.height), c = document.createElement('canvas'); c.width = Math.round(prev.width * k); c.height = Math.round(prev.height * k); c.getContext('2d').drawImage(prev, 0, 0, c.width, c.height); prev = c; }
  var out = process(prev), availH = Math.max(300, st.clientHeight - 36), availW = Math.max(260, st.clientWidth - 36), fit = Math.min(availW, availH * out.width / out.height, out.width * 1.5);
  st.innerHTML = '<div class="sheet" id="ish" style="width:' + Math.round(fit) + 'px"></div>'; var sh = $('#ish'); sh.appendChild(out); var layer = document.createElement('div'); layer.className = 'layer'; sh.appendChild(layer);
  if (S.cropOn) {
    layer.style.cursor = 'crosshair'; var box = null, sx, sy;
    layer.onpointerdown = function (e) { var r = sh.getBoundingClientRect(); sx = (e.clientX - r.left) / r.width; sy = (e.clientY - r.top) / r.height; e.preventDefault(); layer.setPointerCapture(e.pointerId); box = document.createElement('div'); box.style.cssText = 'position:absolute;border:2px dashed #0a8f9d;background:rgba(10,143,157,.15);box-shadow:0 0 0 9999px rgba(0,0,0,.35)'; layer.innerHTML = ''; layer.appendChild(box); };
    layer.onpointermove = function (e) { if (!box) return; var r = sh.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); S.crop = { x: Math.min(sx, fx), y: Math.min(sy, fy), w: Math.abs(fx - sx), h: Math.abs(fy - sy) }; box.style.left = S.crop.x * 100 + '%'; box.style.top = S.crop.y * 100 + '%'; box.style.width = S.crop.w * 100 + '%'; box.style.height = S.crop.h * 100 + '%'; };
    layer.onpointerup = function () { box = null; if (S.crop && (S.crop.w < .02 || S.crop.h < .02)) S.crop = null; var b = $('#crok'); if (b) b.disabled = !S.crop; };
  }
}
W.register('image', { nav: 1, icon: 'image', title: 'تنظيف الصور والمستندات', short: 'تنظيف الصور', render: render, destroy: function () { var t = $('#topx'); if (t) t.innerHTML = ''; } });
})();
