/* ورق · كشف العلامات داخل PDF وإزالتها دون تحويل الصفحة إلى صورة */
(function () {
'use strict';
var PL = window.PDFLib, N = PL.PDFName;

function latin1(u8) { var s = '', CH = 8192; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return s; }
function fromLatin1(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
var WS = ' \t\r\n\f\0', DELIM = '()<>[]{}/%';
function isWs(c) { return WS.indexOf(c) > -1; }

/* ---------- tokenizer ---------- */
function tokenize(s) {
  var toks = [], i = 0, n = s.length;
  function skipStr(j) { /* j at '(' → index after matching ')' */ var d = 0; for (; j < n; j++) { var c = s[j]; if (c === '\\') { j++; continue; } if (c === '(') d++; else if (c === ')') { d--; if (d === 0) return j + 1; } } return n; }
  while (i < n) {
    var c = s[i];
    if (isWs(c)) { i++; continue; }
    if (c === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
    var a = i;
    if (c === '/') { i++; while (i < n && !isWs(s[i]) && DELIM.indexOf(s[i]) < 0) i++; toks.push({ t: 'name', v: s.slice(a + 1, i), a: a, b: i }); continue; }
    if (c === '(') { i = skipStr(i); toks.push({ t: 'str', v: s.slice(a + 1, i - 1), a: a, b: i }); continue; }
    if (c === '<' && s[i + 1] === '<') { var d = 0; while (i < n) { if (s[i] === '(') { i = skipStr(i); continue; } if (s[i] === '<' && s[i + 1] === '<') { d++; i += 2; continue; } if (s[i] === '>' && s[i + 1] === '>') { d--; i += 2; if (d === 0) break; continue; } i++; } toks.push({ t: 'dict', a: a, b: i, v: s.slice(a, i) }); continue; }
    if (c === '<') { i++; while (i < n && s[i] !== '>') i++; i++; toks.push({ t: 'hex', v: s.slice(a + 1, i - 1), a: a, b: i }); continue; }
    if (c === '[') { var dd = 0; while (i < n) { if (s[i] === '(') { i = skipStr(i); continue; } if (s[i] === '[') dd++; else if (s[i] === ']') { dd--; if (dd === 0) { i++; break; } } i++; } toks.push({ t: 'arr', a: a, b: i, v: s.slice(a, i) }); continue; }
    if (c === ']' || c === '>' || c === ')' || c === '{' || c === '}') { i++; continue; }
    while (i < n && !isWs(s[i]) && DELIM.indexOf(s[i]) < 0) i++;
    var w = s.slice(a, i);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) { toks.push({ t: 'num', v: parseFloat(w), a: a, b: i }); continue; }
    if (w === 'BI') { var id = s.indexOf('ID', i); var ei = id < 0 ? -1 : id + 2; var k = ei; while (k > 0 && k < n) { var m = s.indexOf('EI', k); if (m < 0) { k = -1; break; } if (isWs(s[m - 1] || ' ') && (m + 2 >= n || isWs(s[m + 2]) || DELIM.indexOf(s[m + 2]) > -1)) { k = m + 2; break; } k = m + 2; } i = k > 0 ? k : n; toks.push({ t: 'op', v: 'INLINE', a: a, b: i }); continue; }
    toks.push({ t: 'op', v: w, a: a, b: i });
  }
  return toks;
}

/* ---------- matrices ---------- */
function mul(m, n) { return [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]]; }
function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function bboxOf(m, x0, y0, x1, y1, W, H) {
  var p = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x0, y1), apply(m, x1, y1)], xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
  var mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs), mny = Math.min.apply(null, ys), mxy = Math.max.apply(null, ys);
  return { x: mnx / W, y: 1 - mxy / H, w: (mxx - mnx) / W, h: (mxy - mny) / H };
}

/* ---------- page access ---------- */
function pageText(doc, pg) {
  var ctx = doc.context, c = pg.node.get(N.of('Contents')), refs = [], arr = c && ctx.lookup(c), parts = [];
  if (arr instanceof PL.PDFArray) { for (var j = 0; j < arr.size(); j++) refs.push(arr.get(j)); } else if (c) refs.push(c);
  refs.forEach(function (r) { var s = ctx.lookup(r); if (!s || !s.getContents) return; var dec; try { dec = PL.decodePDFRawStream ? PL.decodePDFRawStream(s).decode() : s.getContents(); } catch (e) { dec = s.getContents(); } parts.push(latin1(dec)); });
  return parts.join('\n');
}
function resInfo(doc, pg) {
  var res = pg.node.Resources(), ctx = doc.context, xo = res && res.lookupMaybe(N.of('XObject'), PL.PDFDict), gs = res && res.lookupMaybe(N.of('ExtGState'), PL.PDFDict);
  return {
    xobj: function (name) {
      if (!xo) return null; var ref = xo.get(N.of(name)); if (!ref) return null; var o = ctx.lookup(ref); if (!o || !o.dict) return null;
      var d = o.dict, st = d.get(N.of('Subtype')), sub = st ? String(st).replace('/', '') : '', info = { tag: ref.tag || String(ref), sub: sub };
      if (sub === 'Image') { var w = d.get(N.of('Width')), h = d.get(N.of('Height')); info.fp = (w && w.asNumber ? w.asNumber() : 0) + 'x' + (h && h.asNumber ? h.asNumber() : 0) + ':' + (o.getContents ? o.getContents().length : 0); }
      else if (sub === 'Form') { var bb = d.lookupMaybe(N.of('BBox'), PL.PDFArray), mm = d.lookupMaybe(N.of('Matrix'), PL.PDFArray); info.bbox = bb ? [0, 1, 2, 3].map(function (i) { return bb.lookup(i, PL.PDFNumber).asNumber(); }) : null; info.mat = mm ? [0, 1, 2, 3, 4, 5].map(function (i) { return mm.lookup(i, PL.PDFNumber).asNumber(); }) : null; info.fp = 'f' + (o.getContents ? o.getContents().length : 0); }
      return info;
    },
    alpha: function (name) { if (!gs) return null; var d = gs.lookupMaybe(N.of(name), PL.PDFDict); if (!d) return null; var ca = d.lookupMaybe(N.of('ca'), PL.PDFNumber); return ca ? ca.asNumber() : null; }
  };
}

/* ---------- analyse one page ---------- */
function analysePage(doc, pg) {
  var txt = pageText(doc, pg), toks = tokenize(txt), W = pg.getWidth(), H = pg.getHeight(), R = resInfo(doc, pg);
  var st = { ctm: [1, 0, 0, 1, 0, 0], alpha: 1 }, stack = [], ops = [], recs = [], opStart = 0, bt = null, tm = [1, 0, 0, 1, 0, 0], fs = 12, stringParts = [];
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i];
    if (t.t !== 'op') { continue; }
    /* operands: tokens since previous op */
    var k = i - 1; while (k >= 0 && toks[k].t !== 'op') k--; var opers = toks.slice(k + 1, i), first = opers.length ? opers[0].a : t.a, v = t.v;
    var nums = opers.filter(function (o) { return o.t === 'num'; }).map(function (o) { return o.v; });
    if (v === 'q') stack.push({ ctm: st.ctm.slice(), alpha: st.alpha });
    else if (v === 'Q') { var p = stack.pop(); if (p) st = p; }
    else if (v === 'cm' && nums.length === 6) st.ctm = mul(nums, st.ctm);
    else if (v === 'gs' && opers.length && opers[0].t === 'name') { var al = R.alpha(opers[0].v); if (al !== null) st.alpha = al; }
    else if (v === 'Do' && opers.length && opers[0].t === 'name') {
      var xi = R.xobj(opers[0].v); if (xi) {
        var bb;
        if (xi.sub === 'Image') bb = bboxOf(st.ctm, 0, 0, 1, 1, W, H);
        else { var m = xi.mat ? mul(xi.mat, st.ctm) : st.ctm, b = xi.bbox || [0, 0, 1, 1]; bb = bboxOf(m, b[0], b[1], b[2], b[3], W, H); }
        recs.push({ kind: xi.sub === 'Image' ? 'img' : 'form', fp: xi.fp, bbox: bb, alpha: st.alpha, a: first, b: t.b, page: 0 });
      }
    }
    else if (v === 'BT') { bt = { a: t.a, str: '', ang: 0, size: 12, alpha: st.alpha, scale: 1, hasText: false }; tm = [1, 0, 0, 1, 0, 0]; }
    else if (v === 'Tm' && nums.length === 6) { tm = nums; if (bt) { var full = mul(tm, st.ctm); bt.ang = Math.atan2(full[1], full[0]) * 180 / Math.PI; bt.scale = Math.hypot(full[0], full[1]); bt.alpha = st.alpha; bt.px = full[4]; bt.py = full[5]; } }
    else if (v === 'Tf' && nums.length >= 1 && bt) { bt.size = nums[nums.length - 1]; }
    else if ((v === 'Tj' || v === 'TJ' || v === "'" || v === '"') && bt) { bt.hasText = true; opers.forEach(function (o) { if (o.t === 'str') bt.str += o.v; else if (o.t === 'hex') bt.str += '<' + o.v + '>'; else if (o.t === 'arr') bt.str += o.v; }); }
    else if (v === 'ET' && bt) {
      if (bt.hasText) { var ang = ((bt.ang % 90) + 90) % 90; var tilted = Math.min(ang, 90 - ang) > 8; var sz = bt.size * bt.scale, nch = Math.max(2, printable(bt.str).length || (bt.str.length >> 1)), rad = bt.ang * Math.PI / 180, ex = (bt.px || 0) + Math.cos(rad) * nch * sz * 0.55, ey = (bt.py || 0) + Math.sin(rad) * nch * sz * 0.55, pad = sz * 0.5, tb = { x: (Math.min(bt.px || 0, ex) - pad) / W, y: 1 - (Math.max(bt.py || 0, ey) + pad) / H, w: (Math.abs(ex - (bt.px || 0)) + 2 * pad) / W, h: (Math.abs(ey - (bt.py || 0)) + 2 * pad) / H }; recs.push({ kind: 'text', str: bt.str, ang: Math.round(bt.ang), tilted: tilted, size: sz, alpha: bt.alpha, a: bt.a, b: t.b, bbox: tb }); }
      bt = null;
    }
  }
  return { recs: recs, txt: txt, W: W, H: H };
}
function markedRanges(txt) {
  var out = [], re = /\/Subtype\s*\/Watermark|\/Watermark\s*(?:<<|\/)/g, m, guard = 0;
  while ((m = re.exec(txt)) && guard++ < 500) {
    var start = txt.lastIndexOf('/Artifact', m.index); if (start < 0 || m.index - start > 400) { continue; }
    var tok = /\b(BDC|BMC|EMC)\b/g; tok.lastIndex = m.index; var depth = 0, end = -1, t;
    while ((t = tok.exec(txt))) { if (t[1] === 'EMC') { depth--; if (depth <= 0) { end = tok.lastIndex; break; } } else depth++; }
    if (end > 0) { out.push({ a: start, b: end }); re.lastIndex = end; }
  }
  return out;
}
function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function printable(s) { s = s.replace(/<([0-9a-fA-F\s]+)>/g, function (m, h) { h = h.replace(/\s/g, ''); var o = ''; for (var i = 0; i + 1 < h.length; i += 2) o += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return o; }); var t = s.replace(/\\\d{3}|\\./g, '').replace(/[\[\]()<>]/g, ' ').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim(); return t.length >= 2 ? t.slice(0, 28) : ''; }
function keyOf(r) {
  if (r.kind === 'text') return 't:' + hash(r.str) + ':' + r.ang;
  var b = r.bbox, q = function (v) { return Math.round(v * 40); };
  return (r.kind === 'img' ? 'i:' : 'f:') + r.fp + ':' + q(b.x) + ',' + q(b.y) + ',' + q(b.w) + ',' + q(b.h);
}

/* ---------- public: analyse whole doc ---------- */
async function analyze(bytes, onProgress) {
  var doc = await PL.PDFDocument.load(bytes), pages = doc.getPages(), total = pages.length, map = {};
  for (var p = 0; p < total; p++) {
    var r; try { r = analysePage(doc, pages[p]); } catch (e) { continue; }
    r.recs.forEach(function (rec) { rec.key = keyOf(rec); (map[rec.key] = map[rec.key] || { key: rec.key, kind: rec.kind, pages: [], sample: rec }).pages.push(p + 1); });
    markedRanges(r.txt).forEach(function () { (map['m:wm'] = map['m:wm'] || { key: 'm:wm', kind: 'marked', pages: [], sample: {} }).pages.push(p + 1); });
    if (onProgress && p % 5 === 0) onProgress(p / total);
  }
  var cands = [];
  Object.keys(map).forEach(function (k) {
    var c = map[k], s = c.sample, area = s.bbox && c.kind !== 'text' ? s.bbox.w * s.bbox.h : 0, rep = c.pages.length >= 2 && total > 1, ok = false, label = '';
    if (c.kind === 'marked') { ok = true; label = 'علامة مائية معلَّمة (Artifact)'; }
    else if (c.kind === 'text') { ok = s.tilted || s.alpha < 0.9 || s.size >= 60; label = (s.tilted ? 'نص مائل' : s.alpha < 0.9 ? 'نص شفاف' : 'نص كبير'); var pt = printable(s.str); if (pt) label += ': ' + pt; }
    else { var full = area >= 0.92 && s.alpha >= 0.98; ok = !full && (s.alpha < 0.98 || rep || total === 1); label = (c.kind === 'img' ? 'صورة' : 'شكل') + (s.alpha < 0.98 ? ' شفافة' : '') + (rep ? ' متكررة' : ''); }
    if (ok || c.kind === 'img' || c.kind === 'form') cands.push({ key: k, kind: c.kind, label: label, pages: c.pages, bbox: s.bbox || null, alpha: s.alpha != null ? s.alpha : 1, ang: s.ang || 0, sure: ok, area: area });
  });
  cands.sort(function (a, b) { return b.pages.length - a.pages.length; });
  return cands;
}

/* ---------- public: remove selected candidates from a pdf-lib doc ---------- */
function removeFromDoc(doc, keys, pageFilter) {
  var ctx = doc.context, pages = doc.getPages(), removed = 0, keySet = {}; keys.forEach(function (k) { keySet[k] = 1; });
  pages.forEach(function (pg, idx) {
    if (pageFilter && !pageFilter(idx + 1)) return;
    var r; try { r = analysePage(doc, pg); } catch (e) { return; }
    var ranges = [];
    r.recs.forEach(function (rec) { if (keySet[keyOf(rec)]) ranges.push({ a: rec.a, b: rec.b }); });
    if (keySet['m:wm']) markedRanges(r.txt).forEach(function (x) { ranges.push(x); });
    if (!ranges.length) return;
    ranges.sort(function (x, y) { return y.a - x.a; });
    var out = r.txt, last = Infinity;
    ranges.forEach(function (x) { if (x.b <= last) { out = out.slice(0, x.a) + ' ' + out.slice(x.b); last = x.a; removed++; } });
    var ns = ctx.flateStream(fromLatin1(out)); pg.node.set(N.of('Contents'), ctx.register(ns));
  });
  return removed;
}
window.WM = { analyze: analyze, removeFromDoc: removeFromDoc, keyOf: keyOf };
})();
