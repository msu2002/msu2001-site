(function () {
var W = window.W, $ = W.$, S = null, worker = null, tess = null;
function init() { return { items: [], lang: 'ara', busy: false, text: '', pg: 0, prog: 0, msg: '', cancel: false }; }
async function addFiles(files) {
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    try {
      if (W.isPdf(f)) { var d = await W.pdfOpen(await W.bytes(f)); for (var p = 1; p <= d.numPages; p++) S.items.push({ id: W.uid(), kind: 'pdf', doc: d, p: p, name: f.name + ' — ص' + p }); }
      else if (W.isImg(f)) { var im = await W.loadImg(URL.createObjectURL(f)); S.items.push({ id: W.uid(), kind: 'img', img: im, name: f.name }); }
      else W.toast('«' + f.name + '» غير مدعوم', true);
    } catch (e) { console.error(e); W.toast('تعذر فتح «' + f.name + '»', true); }
  }
  if (S.items.length > 40) { S.items = S.items.slice(0, 40); W.toast('الحد الأقصى 40 صفحة في المرة الواحدة', true); }
  draw();
}
async function pageCanvas(it) {
  if (it.kind === 'pdf') return W.pdfPage(it.doc, it.p, 2200);
  var m = Math.max(it.img.naturalWidth, it.img.naturalHeight), k = m > 3000 ? 3000 / m : (m < 1600 ? Math.min(2, 1600 / m) : 1), c = document.createElement('canvas'); c.width = Math.round(it.img.naturalWidth * k); c.height = Math.round(it.img.naturalHeight * k); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(it.img, 0, 0, c.width, c.height); return c;
}
async function engine() {
  if (worker) return worker;
  if (!tess) { var mod = await import(new URL(W.ROOT + 'ocr/tesseract.esm.min.js', location.href).href); tess = mod.default || mod; }
  var abs = function (p) { return new URL(W.ROOT + p, location.href).href; };
  worker = await tess.createWorker(S.lang, tess.OEM.LSTM_ONLY, { workerPath: abs('ocr/worker.min.js'), corePath: abs('ocr/core/'), langPath: abs('ocr/lang/'), workerBlobURL: false, gzip: true, cacheMethod: 'write', logger: function (m) { if (m.status === 'recognizing text') { S.prog = m.progress || 0; barUpd(); } else if (/loading|initializ/.test(m.status)) { S.msg = 'تجهيز محرك التعرف على النص (أول مرة قد يستغرق دقيقة)…'; barUpd(); } } });
  worker._lang = S.lang; return worker;
}
function barUpd() { var b = $('#obar'), t = $('#omsg'); if (b) b.style.width = Math.round(S.prog * 100) + '%'; if (t) t.textContent = S.msg; }
async function start() {
  if (S.busy || !S.items.length) return; S.busy = true; S.cancel = false; S.text = ''; draw();
  try {
    if (worker && worker._lang !== S.lang) { await worker.terminate(); worker = null; }
    S.msg = 'تجهيز محرك التعرف على النص…'; barUpd(); await engine();
    for (var i = 0; i < S.items.length; i++) {
      if (S.cancel) break; S.pg = i; S.prog = 0; S.msg = 'تحليل ' + (i + 1) + ' من ' + S.items.length + ' — ' + S.items[i].name; barUpd();
      var c = await pageCanvas(S.items[i]), r = await worker.recognize(c), t = (r.data.text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      S.text += (S.items.length > 1 ? (i ? '\n\n' : '') + '— ' + S.items[i].name + ' —\n' : '') + t; var ta = $('#otx'); if (ta) ta.value = S.text;
    }
    W.toast(S.cancel ? 'تم الإيقاف' : 'اكتمل استخراج النص — راجعه قبل الاستخدام');
  } catch (e) { console.error(e); W.toast('تعذر استخراج النص: ' + (e.message || e), true, 6000); try { if (worker) await worker.terminate(); } catch (x) {} worker = null; }
  S.busy = false; draw();
}
function draw() {
  var el = $('#ocr'); if (!el) return;
  if (!S.items.length) { el.innerHTML = '<div class="wrap" style="max-width:760px">' + W.dropZone({ id: 'odz', icon: 'scan', title: 'أضف صورًا أو ملف PDF ممسوحًا', sub: 'سيُستخرج النص العربي ويمكنك تحريره ونسخه وحفظه. المعالجة تتم على جهازك.', btn: 'اختيار ملفات' }) + '<div class="note" style="margin-top:14px">للحصول على أفضل نتيجة: صورة واضحة، وإضاءة متساوية، ونص مستقيم. راجع النص دائمًا بعد الاستخراج فالتعرف الآلي قد يخطئ في بعض الحروف والأرقام.</div></div>'; W.bindDrop('odz', 'application/pdf,image/*', true, addFiles); return; }
  var ta = $('#otx'), keep = ta ? ta.value : S.text; S.text = keep;
  el.innerHTML = '<div class="split two"><div class="panel"><h4>' + W.ic('layers') + ' الصفحات (' + S.items.length + ')</h4><div style="display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:34vh">' + S.items.map(function (it, i) { return '<div class="cand" style="cursor:default"><span style="flex:1"><b style="font-size:13px">' + (i + 1) + '. ' + W.esc(it.name) + '</b></span><button class="btn sm ic g d" data-rm="' + it.id + '" ' + (S.busy ? 'disabled' : '') + '>' + W.ic('x') + '</button></div>'; }).join('') + '</div>' +
    '<button class="btn sm" id="oadd" ' + (S.busy ? 'disabled' : '') + '>' + W.ic('plus') + ' إضافة ملفات</button><label class="f">لغة النص<select id="olang" ' + (S.busy ? 'disabled' : '') + '><option value="ara"' + (S.lang === 'ara' ? ' selected' : '') + '>العربية</option><option value="ara+eng"' + (S.lang === 'ara+eng' ? ' selected' : '') + '>العربية + الإنجليزية</option><option value="eng"' + (S.lang === 'eng' ? ' selected' : '') + '>الإنجليزية</option></select></label>' +
    (S.busy ? '<div class="prog"><i id="obar"></i></div><div class="mut" id="omsg" style="font-size:13px">' + W.esc(S.msg) + '</div><button class="btn d" id="ostop">' + W.ic('x') + ' إيقاف</button>' : '<button class="btn p" id="ogo">' + W.ic('scan') + ' استخراج النص</button>') +
    '<div class="note warn">التعرف الآلي قد يخطئ؛ راجع النص وصحّحه قبل استخدامه.</div></div>' +
    '<div class="panel" style="min-height:420px"><div class="row"><h4 style="flex:1">' + W.ic('text') + ' النص المستخرج (قابل للتحرير)</h4><button class="btn sm" id="ocp">' + W.ic('copy') + ' نسخ</button><button class="btn sm" id="otxt">' + W.ic('download') + ' TXT</button><button class="btn sm" id="odoc">' + W.ic('download') + ' Word</button></div><textarea id="otx" dir="rtl" style="flex:1;min-height:320px;font-size:16px" placeholder="سيظهر النص هنا بعد الاستخراج…">' + W.esc(S.text) + '</textarea></div></div>';
  W.$$('[data-rm]', el).forEach(function (b) { b.onclick = function () { S.items = S.items.filter(function (x) { return x.id !== b.dataset.rm; }); draw(); }; });
  $('#oadd').onclick = function () { W.pick('application/pdf,image/*', true).then(addFiles); };
  $('#olang').onchange = function (e) { S.lang = e.target.value; };
  var g = $('#ogo'); if (g) g.onclick = start; var sp = $('#ostop'); if (sp) sp.onclick = function () { S.cancel = true; if (worker) { worker.terminate(); worker = null; } };
  $('#otx').oninput = function (e) { S.text = e.target.value; };
  $('#ocp').onclick = function () { var t = $('#otx').value; if (!t) return; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { W.toast('تم النسخ'); }, function () { $('#otx').select(); document.execCommand('copy'); W.toast('تم النسخ'); }); };
  $('#otxt').onclick = function () { var t = $('#otx').value; if (!t) return; W.download(new Blob(['﻿' + t], { type: 'text/plain;charset=utf-8' }), 'النص-المستخرج.txt'); };
  $('#odoc').onclick = function () { var t = $('#otx').value; if (!t) return; var h = '<html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;direction:rtl;font-size:14pt;line-height:1.8}p{margin:0 0 8pt}</style></head><body>' + t.split(/\n/).map(function (l) { return '<p>' + (W.esc(l) || '&nbsp;') + '</p>'; }).join('') + '</body></html>'; W.download(new Blob(['﻿' + h], { type: 'application/msword' }), 'النص-المستخرج.doc'); };
}
W.register('ocr', { nav: 1, icon: 'scan', title: 'استخراج النص العربي', short: 'استخراج النص',
  render: function (v) { if (!S) S = init(); v.innerHTML = '<div id="ocr" class="wrap" style="max-width:1300px"></div>'; draw(); if (W.pending) { var f = W.pending; W.pending = null; addFiles(f); } },
  destroy: function () {} });
})();
