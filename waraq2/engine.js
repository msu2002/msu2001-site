/* ورق — محرك المعالجة: قص الشفاف، إزالة الخلفية، مطابقة الألوان، الترميم */
(function(){
var W = window.W;
function trim(c) {
  var x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, minx = c.width, miny = c.height, maxx = 0, maxy = 0;
  for (var y = 0; y < c.height; y++) for (var i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < minx) minx = i; if (i > maxx) maxx = i; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  if (maxx < minx) return c; var p = 4, o = document.createElement('canvas'); o.width = maxx - minx + 1 + 2 * p; o.height = maxy - miny + 1 + 2 * p;
  o.getContext('2d').drawImage(c, minx, miny, maxx - minx + 1, maxy - miny + 1, p, p, maxx - minx + 1, maxy - miny + 1); return o;
}
function limit(c, max) { if (c.width <= max) return c; var o = document.createElement('canvas'); o.width = max; o.height = Math.round(c.height * max / c.width); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o; }

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
  var PREVIEW_W = 1000;
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

W.eng = { trim: trim, removeBg: removeBg, applyOp: applyOp, parseRange: parseRange, applies: applies, matcher: matcher, rgb2hsv: rgb2hsv, limit: function(c,max){ if (c.width <= max) return c; var o = document.createElement('canvas'); o.width = max; o.height = Math.round(c.height * max / c.width); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o; } };
})();
