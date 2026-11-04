(function () {
var W = window.W, $ = W.$;
var S, token = 0;
function fresh() { return { files: {}, pages: [], sel: {}, undo: [], busy: false, name: 'ورق', thumbs: {}, nums: false, size: 'a4' }; }
S = fresh();

function snap() { S.undo.push(JSON.stringify(S.pages)); if (S.undo.length > 40) S.undo.shift(); }
function selIds() { return S.pages.filter(function (p) { return S.sel[p.id]; }).map(function (p) { return p.id; }); }
function magic(b) { return b[0] === 0x25 && b[1] === 0x50 ? 'pdf' : 'img'; }

async function addFiles(files) {
  var added = 0;
  for (var i = 0; i < files.length; i++) {
    var f = files[i]; if (!W.isPdf(f) && !W.isImg(f)) { W.toast('«' + f.name + '» ليس PDF ولا صورة، تم تجاهله', true); continue; }
    try {
      var bytes = await W.bytes(f), id = W.uid();
      if (W.isPdf(f)) {
        var doc = await W.pdfOpen(bytes); S.files[id] = { id: id, name: f.name, kind: 'pdf', bytes: bytes, doc: doc };
        for (var p = 1; p <= doc.numPages; p++) S.pages.push({ id: W.uid(), fid: id, pi: p, rot: 0 });
        added += doc.numPages;
      } else {
        var img = await W.loadImg(URL.createObjectURL(new Blob([bytes], { type: f.type || 'image/png' })));
        S.files[id] = { id: id, name: f.name, kind: 'img', bytes: bytes, img: img, type: f.type }; S.pages.push({ id: W.uid(), fid: id, pi: 1, rot: 0 }); added++;
      }
      if (S.name === 'ورق') S.name = f.name.replace(/\.[^.]+$/, '');
    } catch (e) { console.error(e); W.toast('تعذر فتح «' + f.name + '». تأكد أن الملف سليم وغير محمي بكلمة مرور.', true, 5000); }
  }
  if (added) { draw(); W.toast('تمت إضافة ' + W.n(added)); }
}

function thumb(p, host) {
  var key = p.fid + ':' + p.pi, mine = token;
  if (p.blank) { host.innerHTML = '<div style="width:70%;aspect-ratio:1/1.414;background:#fff;border:1px solid #ccd"></div>'; return; }
  var f = S.files[p.fid]; if (!f) return;
  if (f.kind === 'img') { var im = document.createElement('img'); im.src = f.img.src; host.appendChild(im); return; }
  var c = S.thumbs[key]; if (c) { host.appendChild(clone(c)); return; }
  queue.push(function () { if (mine !== token) return Promise.resolve(); return W.pdfPage(f.doc, p.pi, 240).then(function (cv) { S.thumbs[key] = cv; if (mine === token && host.isConnected) { host.innerHTML = ''; host.appendChild(clone(cv)); } }); });
  pump();
}
function clone(c) { var n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; }
var queue = [], running = false;
function pump() { if (running) return; running = true; (function next() { var j = queue.shift(); if (!j) { running = false; return; } j().then(function () { setTimeout(next, 0); }, function () { setTimeout(next, 0); }); })(); }

function draw() {
  var v = $('#pt'); if (!v) return; queue.length = 0; token++;
  if (!S.pages.length) { v.innerHTML = '<div class="wrap" style="max-width:760px">' + W.dropZone({ id: 'pdz', title: 'أضف ملفات PDF أو صورًا', sub: 'يمكنك إضافة عدة ملفات ودمجها وترتيب صفحاتها. الصور تتحول إلى صفحات PDF.', btn: 'اختيار ملفات' }) + '</div>'; W.bindDrop('pdz', 'application/pdf,image/*', true, addFiles); return; }
  var ns = selIds().length, has = ns > 0;
  var h = '<div class="split two"><div class="panel">' +
    '<h4>التصدير</h4><label class="f">اسم الملف<input type="text" id="pn" value="' + W.esc(S.name) + '"></label>' +
    '<div class="note">' + W.n(S.pages.length) + (has ? ' — المحدد: ' + ns : '') + '</div>' +
    '<label class="row" style="gap:8px"><input type="checkbox" id="pnum" ' + (S.nums ? 'checked' : '') + '> ترقيم الصفحات في الأسفل</label>' +
    '<label class="f">حجم صفحات الصور<select id="psz"><option value="a4"' + (S.size === 'a4' ? ' selected' : '') + '>A4 (الصورة في الوسط)</option><option value="img"' + (S.size === 'img' ? ' selected' : '') + '>حسب حجم الصورة</option></select></label>' +
    '<button class="btn p" id="xpdf">' + W.ic('download') + ' حفظ PDF' + (has ? ' (المحدد فقط)' : '') + '</button>' +
    '<button class="btn" id="ximg">' + W.ic('image') + ' حفظ كصور PNG' + (has ? ' (المحدد)' : '') + '</button>' +
    '<h4 style="margin-top:6px">تقسيم</h4><div class="row"><span class="mut">كل</span><input type="number" id="spn" min="1" value="1" style="width:70px"><span class="mut">صفحات في ملف</span></div><button class="btn" id="xspl">' + W.ic('scissors') + ' تقسيم وحفظ الأجزاء</button>' +
    '<div class="note" style="margin-top:auto">اسحب الصفحات لإعادة ترتيبها. اضغط على صفحة لتحديدها ثم استخدم الأزرار بالأعلى.</div></div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0"><div class="bar">' +
    '<button class="btn sm" id="add">' + W.ic('plus') + ' إضافة ملفات</button><button class="btn sm" id="blank">' + W.ic('blank') + ' صفحة بيضاء</button><span style="width:1px;height:22px;background:var(--line2)"></span>' +
    '<button class="btn sm" id="all">' + W.ic('check') + ' ' + (ns === S.pages.length ? 'إلغاء التحديد' : 'تحديد الكل') + '</button>' +
    '<button class="btn sm" id="rot" ' + (has ? '' : 'disabled') + '>' + W.ic('rotate') + ' تدوير</button><button class="btn sm" id="dup" ' + (has ? '' : 'disabled') + '>' + W.ic('copy') + ' تكرار</button><button class="btn sm d" id="del" ' + (has ? '' : 'disabled') + '>' + W.ic('trash') + ' حذف</button>' +
    '<span class="sp"></span><button class="btn sm" id="und" ' + (S.undo.length ? '' : 'disabled') + '>' + W.ic('undo') + ' تراجع</button><button class="btn sm g d" id="clr" title="مسح الكل">' + W.ic('x') + '</button></div>' +
    '<div class="stage" style="align-items:stretch;justify-content:flex-start"><div class="thumbs" id="th"></div></div></div></div>';
  v.innerHTML = h;
  var th = $('#th'), dragId = null;
  S.pages.forEach(function (p, i) {
    var d = document.createElement('div'); d.className = 'th' + (S.sel[p.id] ? ' sel' : ''); d.draggable = true; d.dataset.id = p.id;
    var f = S.files[p.fid];
    d.innerHTML = '<span class="ck">' + W.ic('check') + '</span><div class="cv"></div><div class="n"><b>' + (i + 1) + '</b><span>' + (p.blank ? 'بيضاء' : W.esc((f ? f.name : '').slice(0, 14))) + '</span></div>';
    var cv = $('.cv', d); cv.style.setProperty('--r', p.rot + 'deg'); cv.style.setProperty('--s', p.rot % 180 ? .74 : 1); thumb(p, cv);
    d.onclick = function () { S.sel[p.id] = !S.sel[p.id]; draw(); };
    d.ondragstart = function (e) { dragId = p.id; d.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', p.id); } catch (x) {} };
    d.ondragend = function () { d.classList.remove('drag'); };
    d.ondragover = function (e) { e.preventDefault(); d.classList.add('ov'); };
    d.ondragleave = function () { d.classList.remove('ov'); };
    d.ondrop = function (e) {
      e.preventDefault(); if (!dragId || dragId === p.id) return; snap();
      var group = S.sel[dragId] ? selIds() : [dragId], moving = S.pages.filter(function (x) { return group.indexOf(x.id) > -1; }), rest = S.pages.filter(function (x) { return group.indexOf(x.id) < 0; }), at = rest.findIndex(function (x) { return x.id === p.id; });
      if (at < 0) return; var fromIdx = S.pages.findIndex(function (x) { return x.id === dragId; }), toIdx = S.pages.findIndex(function (x) { return x.id === p.id; });
      rest.splice.apply(rest, [fromIdx < toIdx ? at + 1 : at, 0].concat(moving)); S.pages = rest; draw();
    };
    th.appendChild(d);
  });
  $('#add').onclick = function () { W.pick('application/pdf,image/*', true).then(function (f) { if (f.length) { snap(); addFiles(f); } }); };
  $('#blank').onclick = function () { snap(); S.pages.push({ id: W.uid(), blank: true, rot: 0 }); draw(); };
  $('#all').onclick = function () { var all = selIds().length === S.pages.length; S.sel = {}; if (!all) S.pages.forEach(function (p) { S.sel[p.id] = true; }); draw(); };
  $('#rot').onclick = function () { snap(); S.pages.forEach(function (p) { if (S.sel[p.id]) p.rot = (p.rot + 90) % 360; }); draw(); };
  $('#dup').onclick = function () { snap(); var out = []; S.pages.forEach(function (p) { out.push(p); if (S.sel[p.id]) { var c = JSON.parse(JSON.stringify(p)); c.id = W.uid(); out.push(c); } }); S.pages = out; S.sel = {}; draw(); };
  $('#del').onclick = function () { snap(); S.pages = S.pages.filter(function (p) { return !S.sel[p.id]; }); S.sel = {}; draw(); };
  $('#und').onclick = function () { var u = S.undo.pop(); if (u) { S.pages = JSON.parse(u); S.sel = {}; draw(); } };
  $('#clr').onclick = function () { if (confirm('مسح كل الصفحات؟')) { var n = S.name; S = fresh(); draw(); } };
  $('#pn').oninput = function (e) { S.name = e.target.value; };
  $('#pnum').onchange = function (e) { S.nums = e.target.checked; };
  $('#psz').onchange = function (e) { S.size = e.target.value; };
  $('#xpdf').onclick = function () { run('إعداد الملف…', async function () { var items = pick(); var b = await build(items); W.download(new Blob([b], { type: 'application/pdf' }), (S.name || 'ورق') + '.pdf'); W.toast('تم حفظ الملف (' + W.n(items.length) + ')'); }); };
  $('#ximg').onclick = function () { run('تحويل الصفحات إلى صور…', async function () { var items = pick(), b = await build(items, true), doc = await W.pdfOpen(b); for (var i = 1; i <= doc.numPages; i++) { var c = await W.pdfPage(doc, i, 1700); W.download(await W.blob(c, 'image/png'), (S.name || 'ورق') + '-' + i + '.png'); await new Promise(function (r) { setTimeout(r, 350); }); } W.toast('تم حفظ ' + W.n(doc.numPages) + ' كصور'); }); };
  $('#xspl').onclick = function () { run('تقسيم الملف…', async function () { var n = Math.max(1, +$('#spn').value || 1), items = pick(), parts = Math.ceil(items.length / n); if (parts > 30 && !confirm('سيتم حفظ ' + parts + ' ملفًا. هل تريد المتابعة؟')) return; for (var i = 0; i < parts; i++) { var b = await build(items.slice(i * n, (i + 1) * n)); W.download(new Blob([b], { type: 'application/pdf' }), (S.name || 'ورق') + '-جزء' + (i + 1) + '.pdf'); await new Promise(function (r) { setTimeout(r, 400); }); } W.toast('تم حفظ ' + parts + ' ملف'); }); };
}
function pick() { var s = S.pages.filter(function (p) { return S.sel[p.id]; }); return s.length ? s : S.pages.slice(); }
async function run(msg, fn) { if (S.busy) return; S.busy = true; W.toast(msg, false, 1800); try { await fn(); } catch (e) { console.error(e); W.toast('تعذرت العملية: ' + (e.message || e), true, 6000); } finally { S.busy = false; } }

async function build(items, noNums) {
  await W.lib('pdflib'); var PL = window.PDFLib, out = await PL.PDFDocument.create(), cache = {}, imgCache = {}, A4 = [595.28, 841.89];
  for (var i = 0; i < items.length; i++) {
    var it = items[i], pg;
    if (it.blank) pg = out.addPage(A4);
    else {
      var f = S.files[it.fid];
      if (f.kind === 'pdf') { var src = cache[f.id] || (cache[f.id] = await PL.PDFDocument.load(f.bytes, { ignoreEncryption: true })); var cp = await out.copyPages(src, [it.pi - 1]); pg = cp[0]; out.addPage(pg); }
      else {
        var emb = imgCache[f.id]; if (!emb) {
          var c = document.createElement('canvas'); c.width = f.img.naturalWidth; c.height = f.img.naturalHeight; var cx = c.getContext('2d'), png = /png|webp|gif/i.test(f.type || '');
          if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); } cx.drawImage(f.img, 0, 0);
          var bb = new Uint8Array(await (await W.blob(c, png ? 'image/png' : 'image/jpeg', 0.92)).arrayBuffer());
          emb = imgCache[f.id] = png ? await out.embedPng(bb) : await out.embedJpg(bb);
        }
        var iw = emb.width, ih = emb.height;
        if (S.size === 'a4') { var s = Math.min(A4[0] / iw, A4[1] / ih); if (iw > ih && A4[1] / ih * 0 === 0 && Math.min(A4[1] / iw, A4[0] / ih) > s) { pg = out.addPage([A4[1], A4[0]]); s = Math.min(A4[1] / iw, A4[0] / ih); } else pg = out.addPage(A4); var w = iw * s, h = ih * s; pg.drawImage(emb, { x: (pg.getWidth() - w) / 2, y: (pg.getHeight() - h) / 2, width: w, height: h }); }
        else { pg = out.addPage([iw * 0.75, ih * 0.75]); pg.drawImage(emb, { x: 0, y: 0, width: iw * 0.75, height: ih * 0.75 }); }
      }
    }
    if (it.rot) pg.setRotation(PL.degrees((pg.getRotation().angle + it.rot) % 360));
  }
  if (S.nums && !noNums) { var font = await out.embedFont(PL.StandardFonts.Helvetica); out.getPages().forEach(function (p, i) { var w = p.getWidth(); p.drawText(String(i + 1), { x: w / 2 - 4, y: 18, size: 10, font: font, color: PL.rgb(.3, .3, .3) }); }); }
  return await out.save();
}

W.register('pdf', {
  nav: 1, icon: 'pdf', title: 'أدوات PDF', short: 'أدوات PDF',
  render: function (v) {
    v.innerHTML = '<div id="pt" class="wrap" style="max-width:1400px"></div>'; draw();
    if (W.pending) { var f = W.pending; W.pending = null; addFiles(f); }
  }
});
})();
