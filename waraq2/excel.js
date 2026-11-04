/* ورق — علامة مائية لملفات Excel (xlsx / xlsm): ترويسة للطباعة + خلفية للشاشة */
(function () {
var W = window.W, $ = W.$, S = null;
var NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
var ORDER = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData', 'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter', 'sortState', 'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'drawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst'];

function init() { return { file: null, zip: null, sheets: [], sel: {}, text: W.settings().wm_text || 'معتز بن عبدالله العواجي', color: W.settings().wm_color || '#808080', op: 22, size: 50, angle: -35, font: W.settings().wm_font || 'Tajawal', bold: true, tile: false, ov: true, hdr: false, bg: false, busy: false }; }

function zipPut(z, n, d) { return d === undefined ? z.file(n) : z.file(n, d, { createFolders: false }); }
function loadZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'jszip.min.js'; s.onload = res; s.onerror = function () { rej(new Error('تعذر تحميل مكتبة الضغط')); }; document.head.appendChild(s); });
}

/* ---------- رسم العلامة ---------- */
function setup(ctx, w, o) {
  var px = Math.max(10, w * o.size / 100 * 0.14);
  ctx.font = (o.bold ? '700 ' : '400 ') + px + 'px "' + o.font + '", Tajawal, "Noto Sans Arabic", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
  var c = o.color, r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (o.op / 100) + ')';
  return px;
}
function drawOne(ctx, x, y, o) { ctx.save(); ctx.translate(x, y); ctx.rotate(o.angle * Math.PI / 180); ctx.fillText(o.text, 0, 0); ctx.restore(); }
function drawSingle(ctx, w, h, o) { setup(ctx, w, o); drawOne(ctx, w / 2, h / 2, o); }
function drawTiled(ctx, w, h, o) {
  var px = setup(ctx, w, o), tw = ctx.measureText(o.text).width, sx = tw * 1.25 + px, sy = px * 5, row = 0;
  for (var y = sy / 2; y < h + sy; y += sy, row++) for (var x = (row % 2 ? sx / 2 : 0); x < w + sx; x += sx) drawOne(ctx, x, y, o);
}
function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function headerPng(o) { var c = canvas(780, 1050); (o.tile ? drawTiled : drawSingle)(c.getContext('2d'), 780, 1050, o); return W.blob(c, 'image/png'); }
function ovPng(o) { var c = canvas(600, 450); (o.tile ? drawTiled : drawSingle)(c.getContext('2d'), 600, 450, o); return W.blob(c, 'image/png'); }
function colLetters(a) { var n = 0; for (var i = 0; i < a.length; i++) n = n * 26 + a.charCodeAt(i) - 64; return n; }
function extent(xml) {
  var d = /<dimension ref="([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?"/.exec(xml), lc = d ? colLetters(d[3] || d[1]) : 10, lr = d ? +(d[4] || d[2]) : 30, cw = {};
  (xml.match(/<col\b[^>]*>/g) || []).forEach(function (t) { var a = /min="(\d+)"/.exec(t), b = /max="(\d+)"/.exec(t), w = /width="([\d.]+)"/.exec(t); if (a && b && w) for (var k = +a[1]; k <= Math.min(+b[1], 300); k++) cw[k] = Math.floor(+w[1] * 7 + 5); });
  var W2 = 0; for (var c = 1; c <= lc; c++) W2 += cw[c] || 64;
  var rh = {}; (xml.match(/<row\b[^>]*>/g) || []).forEach(function (t) { var r = /\br="(\d+)"/.exec(t), h = /\bht="([\d.]+)"/.exec(t); if (r && h) rh[r[1]] = +h[1] * 96 / 72; });
  var H = 0; for (var r2 = 1; r2 <= lr; r2++) H += rh[r2] || 20;
  return { w: Math.max(W2, 1000), h: Math.max(H, 800) };
}
function overlay(zip, xml, rels, n, ext, sheetPath) {
  var EMU = 9525, pics = '', k = 0, id0 = 9000;
  for (var y = 0; y < ext.h && k < 300; y += 450) for (var x = 0; x < ext.w && k < 300; x += 600, k++) {
    pics += '<xdr:absoluteAnchor xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="' + NS_REL + '"><xdr:pos x="' + (x * EMU) + '" y="' + (y * EMU) + '"/><xdr:ext cx="' + (600 * EMU) + '" cy="' + (450 * EMU) + '"/>' +
      '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (id0 + k) + '" name="WM ' + (k + 1) + '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdWMI"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
      '<xdr:spPr><a:xfrm><a:off x="' + (x * EMU) + '" y="' + (y * EMU) + '"/><a:ext cx="' + (600 * EMU) + '" cy="' + (450 * EMU) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:absoluteAnchor>';
  }
  var dm = /<drawing\b[^>]*r:id="([^"]+)"/.exec(xml), dpath, dxml, drel, drp;
  if (dm) {
    var rm = new RegExp('<Relationship\\b[^>]*Id="' + dm[1] + '"[^>]*>').exec(rels), tg = rm && /Target="([^"]+)"/.exec(rm[0]);
    if (tg) { dpath = tg[1].charAt(0) === '/' ? tg[1].slice(1) : 'xl/' + tg[1].replace(/^\.\.\//, ''); }
  }
  return { pics: pics, existing: dpath || null, hasDrawing: !!dm };
}
function bgPng(o) { var c = canvas(520, 360); drawSingle(c.getContext('2d'), 520, 360, o); return W.blob(c, 'image/png'); }

/* ---------- تعديل ملف xlsx ---------- */
function put(xml, name, snip) {
  var i = ORDER.indexOf(name);
  for (var k = i + 1; k < ORDER.length; k++) {
    var n = ORDER[k], idx = -1;
    if (n === 'extLst') { idx = xml.lastIndexOf('<extLst'); if (idx > -1 && /<\/(cfRule|dataValidation|x14:)/.test(xml.slice(idx))) idx = -1; }
    else { var m = new RegExp('<' + n + '[\\s>/]').exec(xml); if (m) idx = m.index; }
    if (idx > -1) return xml.slice(0, idx) + snip + xml.slice(idx);
  }
  return xml.replace(/<\/worksheet>\s*$/, snip + '</worksheet>');
}
function dropEl(xml, name) { return xml.replace(new RegExp('<' + name + '(\\s[^>]*)?(/>|>[\\s\\S]*?</' + name + '>)'), ''); }
function addG(txt) {
  if (!txt) return '&amp;C&amp;G';
  if (/&amp;G/.test(txt)) return txt;
  if (/&amp;C/.test(txt)) return txt.replace('&amp;C', '&amp;C&amp;G');
  return txt + '&amp;C&amp;G';
}
function headerFooter(xml) {
  var m = /<headerFooter([^>]*?)(\/>|>([\s\S]*?)<\/headerFooter>)/.exec(xml);
  var attrs = m ? m[1] : '', inner = m && m[3] ? m[3] : '', NAMES = ['oddHeader', 'oddFooter', 'evenHeader', 'evenFooter', 'firstHeader', 'firstFooter'], v = {};
  NAMES.forEach(function (n) { var r = new RegExp('<' + n + '[^>]*>([\\s\\S]*?)</' + n + '>').exec(inner); if (r) v[n] = r[1]; });
  v.oddHeader = addG(v.oddHeader);
  if (/differentOddEven="(1|true)"/.test(attrs)) v.evenHeader = addG(v.evenHeader);
  if (/differentFirst="(1|true)"/.test(attrs)) v.firstHeader = addG(v.firstHeader);
  var ch = NAMES.filter(function (n) { return v[n] != null; }).map(function (n) { return '<' + n + '>' + v[n] + '</' + n + '>'; }).join('');
  var el = '<headerFooter' + attrs + '>' + ch + '</headerFooter>';
  if (m) return xml.slice(0, m.index) + el + xml.slice(m.index + m[0].length);
  return put(xml, 'headerFooter', el);
}
function vml(n) {
  return '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    '<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>' +
    '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/>' +
    '<v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas>' +
    '<v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype>' +
    '<v:shape id="CH" o:spid="_x0000_s1025" type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:520pt;height:700pt;z-index:1"><v:imagedata o:relid="rId1" o:title="watermark"/><o:lock v:ext="edit" rotation="t"/></v:shape></xml>';
}
function relsDoc(items) { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + items + '</Relationships>'; }

async function readWorkbook(zip) {
  var wbx = await zipPut(zip, 'xl/workbook.xml').async('string'), rel = await zipPut(zip, 'xl/_rels/workbook.xml.rels').async('string');
  var rels = {}; (rel.match(/<Relationship\b[^>]*>/g) || []).forEach(function (t) { var id = /\bId="([^"]+)"/.exec(t), tg = /\bTarget="([^"]+)"/.exec(t), ty = /\bType="([^"]+)"/.exec(t); if (id && tg) rels[id[1]] = { t: tg[1], ty: ty ? ty[1] : '' }; });
  var out = [];
  (wbx.match(/<sheet\b[^>]*>/g) || []).forEach(function (t) {
    var nm = /\bname="([^"]*)"/.exec(t), rid = /\br:id="([^"]+)"/.exec(t), st = /\bstate="([^"]+)"/.exec(t); if (!nm || !rid || !rels[rid[1]]) return;
    var r = rels[rid[1]]; if (!/\/worksheet$/.test(r.ty)) return;
    var p = r.t.charAt(0) === '/' ? r.t.slice(1) : 'xl/' + r.t;
    var d = new DOMParser().parseFromString('<a>' + nm[1].replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;') + '</a>', 'text/xml');
    out.push({ name: d.documentElement.textContent || nm[1], path: p, hidden: !!(st && st[1] !== 'visible') });
  });
  return out;
}

async function apply() {
  var o = { text: S.text.trim(), color: S.color, op: S.op, size: S.size, angle: S.angle, font: S.font, bold: S.bold, tile: S.tile };
  var zip = await JSZip.loadAsync(await W.bytes(S.file)), ct = await zipPut(zip, '[Content_Types].xml').async('string');
  var ovBlob = S.ov ? await ovPng(o) : null; if (ovBlob) zipPut(zip, 'xl/media/wm_ov.png', ovBlob);
  var hdrPng = S.hdr ? await headerPng(o) : null, bgBlob = S.bg ? await bgPng(o) : null, n = 0, skipped = [];
  if (hdrPng) zipPut(zip, 'xl/media/wm_hdr.png', hdrPng);
  if (bgBlob) zipPut(zip, 'xl/media/wm_bg.png', bgBlob);
  for (var i = 0; i < S.sheets.length; i++) {
    var sh = S.sheets[i]; if (!S.sel[i]) continue;
    var f = zipPut(zip, sh.path); if (!f) continue;
    var xml = await f.async('string'), rp = sh.path.replace(/([^/]+)$/, '_rels/$1.rels'), relx = zipPut(zip, rp) ? await zipPut(zip, rp).async('string') : relsDoc('');
    n++;
    if (!/<worksheet[^>]*xmlns:r=/.test(xml)) xml = xml.replace(/<worksheet\b/, '<worksheet xmlns:r="' + NS_REL + '"');
    var add = '', hasHF = /<legacyDrawingHF\b/.test(xml);
    if (S.ov) {
      var ov = overlay(zip, xml, relx, n, extent(xml));
      if (ov.hasDrawing && !(ov.existing && zipPut(zip, ov.existing))) skipped.push(sh.name + ' (طبقة)');
      else if (ov.existing) {
        var dx = await zipPut(zip, ov.existing).async('string');
        dx = dx.replace(/<xdr:absoluteAnchor\b[^>]*>[\s\S]*?<\/xdr:absoluteAnchor>/g, function (m0) { return m0.indexOf('name="WM ') > -1 ? '' : m0; });
        var mx = 0; (dx.match(/<(?:\w+:)?cNvPr\b[^>]*\bid="(\d+)"/g) || []).forEach(function (t) { mx = Math.max(mx, +/id="(\d+)"/.exec(t)[1]); });
        var pics2 = ov.pics.replace(/<xdr:cNvPr id="\d+"/g, function () { mx++; return '<xdr:cNvPr id="' + mx + '"'; });
        dx = dx.replace(/<\/((?:\w+:)?wsDr)>\s*$/, function (m0, tg) { return pics2 + '</' + tg + '>'; });
        zipPut(zip, ov.existing, dx);
        var drp = ov.existing.replace(/([^/]+)$/, '_rels/$1.rels'), drx = zipPut(zip, drp) ? await zipPut(zip, drp).async('string') : relsDoc('');
        drx = drx.replace(/<Relationship\b[^>]*Id="rIdWMI"[^>]*\/>/g, '');
        var irel = '<Relationship Id="rIdWMI" Type="' + NS_REL + '/image" Target="../media/wm_ov.png"/>';
        drx = /<\/Relationships>/.test(drx) ? drx.replace('</Relationships>', irel + '</Relationships>') : drx.replace(/<Relationships([^>]*)\/>/, '<Relationships$1>' + irel + '</Relationships>');
        zipPut(zip, drp, drx);
      } else {
        var np = 'xl/drawings/drawingWM' + n + '.xml';
        zipPut(zip, np, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' + ov.pics + '</xdr:wsDr>');
        zipPut(zip, 'xl/drawings/_rels/drawingWM' + n + '.xml.rels', relsDoc('<Relationship Id="rIdWMI" Type="' + NS_REL + '/image" Target="../media/wm_ov.png"/>'));
        ct = ct.replace('</Types>', '<Override PartName="/' + np + '" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
        xml = put(xml, 'drawing', '<drawing r:id="rIdWMD"/>');
        add += '<Relationship Id="rIdWMD" Type="' + NS_REL + '/drawing" Target="../drawings/drawingWM' + n + '.xml"/>';
      }
    }
    if (S.hdr) {
      if (hasHF) skipped.push(sh.name);
      else {
        xml = headerFooter(xml);
        xml = put(xml, 'legacyDrawingHF', '<legacyDrawingHF r:id="rIdWMH"/>');
        var vp = 'xl/drawings/vmlDrawingWM' + n + '.vml';
        zipPut(zip, vp, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + vml(n));
        zipPut(zip, 'xl/drawings/_rels/vmlDrawingWM' + n + '.vml.rels', relsDoc('<Relationship Id="rId1" Type="' + NS_REL + '/image" Target="../media/wm_hdr.png"/>'));
        add += '<Relationship Id="rIdWMH" Type="' + NS_REL + '/vmlDrawing" Target="../drawings/vmlDrawingWM' + n + '.vml"/>';
      }
    }
    if (S.bg) {
      xml = dropEl(xml, 'picture');
      xml = put(xml, 'picture', '<picture r:id="rIdWMB"/>');
      add += '<Relationship Id="rIdWMB" Type="' + NS_REL + '/image" Target="../media/wm_bg.png"/>';
    }
    ['rIdWMH', 'rIdWMB', 'rIdWMD'].forEach(function (id) { if (new RegExp('Id="' + id + '"').test(add)) relx = relx.replace(new RegExp('<Relationship\\b[^>]*Id="' + id + '"[^>]*/>', 'g'), ''); });
    relx = /<\/Relationships>/.test(relx) ? relx.replace('</Relationships>', add + '</Relationships>') : relx.replace(/<Relationships([^>]*)\/>/, '<Relationships$1>' + add + '</Relationships>');
    zipPut(zip, sh.path, xml); zipPut(zip, rp, relx);
  }
  if (!n) throw new Error('اختر ورقة واحدة على الأقل');
  if (!/Extension="png"/i.test(ct)) ct = ct.replace(/(<Types\b[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>');
  if (!/Extension="vml"/i.test(ct)) ct = ct.replace(/(<Types\b[^>]*>)/, '$1<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>');
  zipPut(zip, '[Content_Types].xml', ct);
  var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: S.file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { blob: blob, n: n, skipped: skipped };
}

/* ---------- الواجهة ---------- */
function render(v) {
  if (!S) S = init();
  v.innerHTML = '<div id="xl" style="height:100%"></div>';
  if (W.pending) { var f = W.pending.filter(isX)[0]; W.pending = null; if (f) { open(f); return; } }
  S.zip ? shell() : empty();
}
function isX(f) { return /\.(xlsx|xlsm)$/i.test(f.name); }
function empty() {
  var el = $('#xl'); if (!el) return;
  el.innerHTML = '<div class="wrap" style="max-width:760px">' + W.dropZone({ id: 'xdz', icon: 'grid', title: 'افتح ملف Excel لإضافة علامة مائية', sub: 'ملفات xlsx أو xlsm. تُضاف العلامة على جهازك مباشرة بدون رفع الملف.', btn: 'اختيار ملف Excel' }) +
    '<div class="note" style="margin-top:14px">ملفات xls القديمة غير مدعومة؛ احفظها أولًا بصيغة xlsx من Excel.</div></div>';
  W.bindDrop('xdz', '.xlsx,.xlsm', false, function (fs) { var f = fs.filter(isX)[0]; if (f) open(f); else W.toast('اختر ملف xlsx أو xlsm', true); });
}
async function open(f) {
  try {
    await loadZip(); try { await document.fonts.load('700 40px Tajawal'); } catch (e2) {}
    var zip = await JSZip.loadAsync(await W.bytes(f));
    if (!zipPut(zip, 'xl/workbook.xml')) throw new Error('ليس ملف Excel صالحًا');
    var sheets = await readWorkbook(zip); if (!sheets.length) throw new Error('لا توجد أوراق عمل في الملف');
    S.file = f; S.zip = zip; S.sheets = sheets; S.sel = {}; sheets.forEach(function (s, i) { S.sel[i] = true; });
    shell();
  } catch (e) { console.error(e); W.toast(e.message || 'تعذر فتح الملف', true); }
}
function shell() {
  var el = $('#xl'); if (!el) return;
  el.innerHTML = '<div class="split two"><div class="panel" id="xside"></div><div style="display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0"><div class="stage" id="xstg" style="justify-content:center;align-items:center;padding:16px"><canvas id="xcv" width="720" height="460" style="max-width:100%;height:auto;border-radius:10px;border:1px solid var(--line2);background:#fff"></canvas></div><div class="note">معاينة تقريبية. العلامة الحقيقية: «الخلفية» تظهر على الشاشة، و«الترويسة» تظهر في الطباعة وعرض تخطيط الصفحة.</div></div></div>';
  $('#topx').innerHTML = '<button class="btn sm" id="xfile">' + W.ic('upload') + ' فتح ملف آخر</button>';
  $('#xfile').onclick = function () { W.pick('.xlsx,.xlsm', false).then(function (fs) { if (fs[0]) open(fs[0]); }); };
  side(); draw();
}
var FONTS = [['Tajawal', 'تجوال'], ['Tahoma', 'Tahoma'], ['Arial', 'Arial'], ['Times New Roman', 'Times New Roman'], ['Traditional Arabic', 'Traditional Arabic'], ['Simplified Arabic', 'Simplified Arabic'], ['Courier New', 'Courier New'], ['Georgia', 'Georgia']];
function chk(id, on, lab) { return '<label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + lab + '</span></label>'; }
function side() {
  var el = $('#xside'); if (!el) return;
  el.innerHTML = '<h4>' + W.ic('type') + ' نص العلامة</h4><label class="f"><input type="text" id="xt" value="' + W.esc(S.text) + '" maxlength="80"></label>' +
    '<label class="f">الخط<select id="xf">' + FONTS.map(function (f) { return '<option value="' + f[0] + '"' + (S.font === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></label>' + chk('xbd', S.bold, 'خط عريض') +
    '<div class="row"><label class="f" style="flex:1">اللون<br><input type="color" id="xc" value="' + S.color + '"></label></div>' +
    '<label class="f">الشفافية (الوضوح): <span id="xov">' + S.op + '%</span><input type="range" id="xo" min="6" max="70" value="' + S.op + '"></label>' +
    '<label class="f">الحجم: <span id="xsv">' + S.size + '</span><input type="range" id="xs" min="20" max="100" value="' + S.size + '"></label>' +
    '<label class="f">الميلان: <span id="xav">' + S.angle + '°</span><input type="range" id="xa" min="-80" max="80" value="' + S.angle + '"></label>' +
    '<h4>' + W.ic('layers') + ' مكان الظهور</h4>' + chk('xo2', S.ov, 'فوق البيانات (طبقة تظهر على الشاشة والطباعة)') + chk('xh', S.hdr, 'خلف البيانات في الطباعة (ترويسة)') + chk('xb', S.bg, 'خلف البيانات على الشاشة (خلفية الورقة)') + chk('xtl', S.tile, 'تكرار العلامة في الطباعة') +
    '<h4>' + W.ic('grid') + ' الأوراق</h4><div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow:auto">' + S.sheets.map(function (s, i) { return chk('xsh' + i, S.sel[i], W.esc(s.name) + (s.hidden ? ' <span class="mut">(مخفية)</span>' : '')); }).join('') + '</div>' +
    '<button class="btn p" id="xgo" style="margin-top:6px">' + W.ic('download') + ' إضافة العلامة وحفظ الملف</button><div id="xmsg" class="note" style="display:none"></div>';
  function bind(id, fn) { var e = $('#' + id); if (e) e.oninput = e.onchange = fn; }
  bind('xt', function () { S.text = this.value; W.setSetting('wm_text', S.text); draw(); });
  bind('xf', function () { S.font = this.value; W.setSetting('wm_font', S.font); draw(); });
  bind('xbd', function () { S.bold = this.checked; draw(); });
  bind('xc', function () { S.color = this.value; W.setSetting('wm_color', S.color); draw(); });
  bind('xo', function () { S.op = +this.value; $('#xov').textContent = S.op + '%'; draw(); });
  bind('xs', function () { S.size = +this.value; $('#xsv').textContent = S.size; draw(); });
  bind('xa', function () { S.angle = +this.value; $('#xav').textContent = S.angle + '°'; draw(); });
  bind('xo2', function () { S.ov = this.checked; draw(); });
  bind('xh', function () { S.hdr = this.checked; draw(); });
  bind('xb', function () { S.bg = this.checked; draw(); });
  bind('xtl', function () { S.tile = this.checked; draw(); });
  S.sheets.forEach(function (s, i) { bind('xsh' + i, function () { S.sel[i] = this.checked; }); });
  $('#xgo').onclick = go;
}
function draw() {
  var c = $('#xcv'); if (!c) return; var x = c.getContext('2d'), w = c.width, h = c.height;
  x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#d4d9de'; x.lineWidth = 1; for (var gx = 0; gx <= w; gx += 90) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, h); x.stroke(); } for (var gy = 0; gy <= h; gy += 26) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(w, gy + .5); x.stroke(); }
  var o = { text: S.text || ' ', color: S.color, op: S.op, size: S.size, angle: S.angle, font: S.font, bold: S.bold, tile: S.tile };
  if (S.bg) { var t = canvas(520, 360); drawSingle(t.getContext('2d'), 520, 360, o); var p = x.createPattern(t, 'repeat'); x.fillStyle = p; x.fillRect(0, 0, w, h); }
  if (S.hdr && !S.ov) { var hc = canvas(780, 1050); (o.tile ? drawTiled : drawSingle)(hc.getContext('2d'), 780, 1050, o); x.save(); x.globalAlpha = S.bg ? .7 : 1; var k = Math.min(w / 780, h / 1050 * 1.4); x.drawImage(hc, (w - 780 * k) / 2, (h - 1050 * k) / 2, 780 * k, 1050 * k); x.restore(); }
  drawOv();
}
function drawOv() { var c = $('#xcv'); if (!c || !S.ov) return; var x = c.getContext('2d'), o = { text: S.text || ' ', color: S.color, op: S.op, size: S.size, angle: S.angle, font: S.font, bold: S.bold, tile: S.tile }, t = canvas(600, 450); (o.tile ? drawTiled : drawSingle)(t.getContext('2d'), 600, 450, o); x.fillStyle = x.createPattern(t, 'repeat'); x.fillRect(0, 0, c.width, c.height); }
async function go() {
  if (S.busy) return;
  if (!S.text.trim()) return W.toast('اكتب نص العلامة', true);
  if (!S.ov && !S.hdr && !S.bg) return W.toast('اختر مكان ظهور العلامة', true);
  S.busy = true; var b = $('#xgo'); b.disabled = true; b.textContent = 'جارٍ المعالجة…';
  try {
    var r = await apply();
    W.download(r.blob, S.file.name.replace(/\.(xlsx|xlsm)$/i, '') + '-بعلامة.' + (/\.xlsm$/i.test(S.file.name) ? 'xlsm' : 'xlsx'));
    W.toast('تمت إضافة العلامة إلى ' + r.n + (r.n === 1 ? ' ورقة' : ' أوراق'));
    var m = $('#xmsg'); if (m && r.skipped.length) { m.style.display = ''; m.textContent = 'تعذرت إضافة ترويسة الطباعة في: ' + r.skipped.join('، ') + ' (لها ترويسة بصورة أصلًا)، وأُضيفت الخلفية فقط.'; }
  } catch (e) { console.error(e); W.toast(e.message || 'تعذرت المعالجة', true); }
  S.busy = false; b = $('#xgo'); if (b) { b.disabled = false; b.innerHTML = W.ic('download') + ' إضافة العلامة وحفظ الملف'; }
}

W.register('excel', { nav: 1, icon: 'grid', title: 'علامة مائية لـ Excel', short: 'علامة Excel', render: render, destroy: function () {} });
})();
