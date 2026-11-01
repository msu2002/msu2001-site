/* محرر PDF — محرك يعمل بالكامل داخل المتصفح (pdf.js + pdf-lib + JSZip)
   قام بهذا العمل فهد بن عبدالله الجروان */
(function () {
  "use strict";
  const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFRawStream, decodePDFRawStream, rgb, degrees } = PDFLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";

  const APP = "محرر PDF — قام بهذا العمل فهد بن عبدالله الجروان";
  class ApiError extends Error {}
  const FILES = new Map();
  let _id = 0;
  const FONT = '"Noto Naskh Arabic","IBM Plex Sans Arabic","Tajawal","Segoe UI","Geeza Pro","SF Arabic",Tahoma,Arial,sans-serif';

  /* ---------- helpers ---------- */
  const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 80) || "ملف";
  const baseOf = (n) => n.replace(/\.[^.]+$/, "");
  const MIME = { pdf: "application/pdf", zip: "application/zip", png: "image/png", jpg: "image/jpeg" };
  function register(bytes, name, kind) {
    const id = "f" + ++_id;
    FILES.set(id, { id, bytes, name, kind: kind || "pdf", pdf: null, url: null });
    return id;
  }
  function getF(id) {
    const f = FILES.get(id);
    if (!f) throw new ApiError("لم أجد الملف، ارفعه من جديد.");
    return f;
  }
  async function getPdf(id) {
    const f = getF(id);
    if (!f.pdf) f.pdf = await pdfjsLib.getDocument({ data: f.bytes.slice(), isEvalSupported: false }).promise;
    return f.pdf;
  }
  async function loadLib(id) {
    return PDFDocument.load(getF(id).bytes, { updateMetadata: false });
  }
  async function finalize(doc, id, name, kind) {
    doc.setProducer(APP);
    doc.setCreator(APP);
    const bytes = await doc.save();
    return { id: register(bytes, name, kind), name };
  }
  window.dlUrl = function (id) {
    const f = getF(id);
    if (!f.url) f.url = URL.createObjectURL(new Blob([f.bytes], { type: MIME[f.kind] || "application/octet-stream" }));
    return f.url;
  };
  function parsePages(spec, n) {
    spec = (spec || "").trim().replace(/[،؛]/g, ",");
    if (!spec) return [...Array(n).keys()];
    const out = [];
    for (let part of spec.split(",")) {
      part = part.trim();
      if (!part) continue;
      const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
      if (m) {
        let a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : n;
        if (a > b) [a, b] = [b, a];
        for (let i = Math.max(a, 1) - 1; i < Math.min(b, n); i++) out.push(i);
      } else if (/^\d+$/.test(part)) {
        const i = +part;
        if (i >= 1 && i <= n) out.push(i - 1);
      } else throw new ApiError("صيغة الصفحات غير صحيحة: " + part);
    }
    return [...new Set(out)];
  }
  const norm = (s) => String(s || "").normalize("NFKC").replace(/[ً-ٰٟـ]/g, "");
  const hasArabic = (s) => /[֐-ࣿיִ-﻿]/.test(s);
  const toArabicDigits = (s) => String(s).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  function hex2rgb(h, def) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    if (!m) return def || [0, 0, 0];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const canvasBytes = (c, type, q) =>
    new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error("تعذر إنشاء الصورة"))), type, q));
  const newCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new ApiError("تعذر قراءة الصورة")); i.src = src; });
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  async function renderPage(pdf, i, scale, bg) {
    const page = await pdf.getPage(i + 1);
    const vp = page.getViewport({ scale });
    const c = newCanvas(vp.width, vp.height);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = bg || "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return c;
  }
  async function pageSize(pdf, i) {
    const p = await pdf.getPage(i + 1); const v = p.getViewport({ scale: 1 });
    return [v.width, v.height];
  }

  /* ---------- thumbnails (used by the UI) ---------- */
  const THUMBS = new Map();
  window.thumbURL = async function (id, page, dpi) {
    const k = id + ":" + page + ":" + dpi;
    if (THUMBS.has(k)) return THUMBS.get(k);
    const pdf = await getPdf(id);
    const c = await renderPage(pdf, page, dpi / 72);
    const b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    const u = URL.createObjectURL(b); THUMBS.set(k, u); return u;
  };

  /* ---------- text → image (browser shapes Arabic natively) ---------- */
  async function ensureFont(bold, fam) {
    try {
      await Promise.race([document.fonts.load((bold ? "700" : "400") + ' 40px "' + (fam || "Amiri") + '"', "عربي"), new Promise((r) => setTimeout(r, 3000))]);
    } catch (e) {}
  }
  async function textImage(text, size, color, bold, align, angle, fam) {
    await ensureFont(bold, fam);
    const S = 4, px = size * S, lines = String(text).split("\n"), rtl = hasArabic(text);
    const font = (bold ? "700 " : "400 ") + px + "px " + (fam ? '"' + fam + '",' : "") + FONT;
    const m = newCanvas(10, 10).getContext("2d"); m.font = font; m.direction = rtl ? "rtl" : "ltr";
    const lh = px * 1.45, pad = px * 0.25;
    const w = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width), px * 0.5) + pad * 2), h = Math.ceil(lines.length * lh + pad * 2);
    let c = newCanvas(w, h), ctx = c.getContext("2d");
    ctx.font = font; ctx.direction = rtl ? "rtl" : "ltr"; ctx.fillStyle = color || "#000"; ctx.textBaseline = "middle";
    const al = align || (rtl ? "right" : "left");
    ctx.textAlign = al;
    const x = al === "center" ? w / 2 : al === "right" ? w - pad : pad;
    lines.forEach((l, i) => ctx.fillText(l, x, pad + lh * (i + 0.5)));
    if (angle) {
      const r = (angle * Math.PI) / 180, cs = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r));
      const W2 = w * cs + h * sn, H2 = w * sn + h * cs, c2 = newCanvas(W2, H2), x2 = c2.getContext("2d");
      x2.translate(W2 / 2, H2 / 2); x2.rotate(-r); x2.drawImage(c, -w / 2, -h / 2); c = c2;
    }
    return { bytes: await canvasBytes(c, "image/png"), w: c.width / S, h: c.height / S };
  }

  /* ---------- upload / info ---------- */
  async function api_upload(q, body) {
    const bytes = new Uint8Array(body);
    if (bytes.length < 8 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
      const head = String.fromCharCode(...bytes.slice(0, 1024));
      if (head.indexOf("%PDF-") < 0) throw new ApiError("هذا الملف ليس PDF صالحًا.");
    }
    const name = safeName(q.get("name") || "ملف.pdf");
    const id = register(bytes, name, "pdf");
    try { return await info_of(id); }
    catch (e) {
      FILES.delete(id);
      if (e && (e.name === "PasswordException" || /password/i.test(e.message || ""))) throw new ApiError("الملف محمي بكلمة مرور، وهذا غير مدعوم في النسخة الإلكترونية. أزل الحماية أولًا.");
      throw new ApiError("تعذر فتح الملف، قد يكون تالفًا.");
    }
  }
  async function info_of(id) {
    const pdf = await getPdf(id);
    return { id, name: getF(id).name, pages: pdf.numPages, encrypted: false };
  }

  /* ---------- spans for text editing ---------- */
  async function api_spans(q) {
    const pdf = await getPdf(q.get("id")); const pn = +q.get("page") || 0;
    const page = await pdf.getPage(pn + 1), vp = page.getViewport({ scale: 1 }), W = vp.width, H = vp.height;
    const tc = await page.getTextContent();
    const its = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const t = pdfjsLib.Util.transform(vp.transform, it.transform);
      const fh = Math.hypot(t[2], t[3]) || 10;
      its.push({ s: it.str, x: t[4], y: t[5], w: it.width * vp.scale, fh, bold: /bold|black|heavy/i.test(it.fontName || "") });
    }
    its.sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const it of its) {
      const r = rows.find((r) => Math.abs(r.y - it.y) <= 0.4 * Math.max(r.fh, it.fh));
      if (r) r.items.push(it); else rows.push({ y: it.y, fh: it.fh, items: [it] });
    }
    const out = [];
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let grp = [];
      const flush = () => {
        if (!grp.length) return;
        const ar = grp.some((g) => hasArabic(g.s));
        const ord = ar ? [...grp].sort((a, b) => b.x - a.x) : grp;
        let raw = "";
        ord.forEach((g, k) => {
          if (k) { const pv = ord[k - 1], gap = ar ? pv.x - (g.x + g.w) : g.x - (pv.x + pv.w); if (gap > 0.2 * r.fh && !/\s$/.test(raw) && !/^\s/.test(g.s)) raw += " "; }
          raw += g.s;
        });
        const text = norm(raw).replace(/\s+/g, " ").trim();
        const x0 = Math.min(...grp.map((g) => g.x)), x1 = Math.max(...grp.map((g) => g.x + g.w));
        const fh = Math.max(...grp.map((g) => g.fh)), y = r.y;
        const top = y - fh * 0.85, bot = y + fh * 0.25;
        if (text) out.push({ text, bbox: [x0 / W, top / H, x1 / W, bot / H], rect: [x0, top, x1, bot], size: Math.round(fh * 10) / 10, color: "#000000", bold: grp[0].bold });
        grp = [];
      };
      for (const it of r.items) {
        const last = grp[grp.length - 1];
        if (last && it.x - (last.x + last.w) > 1.2 * r.fh) flush();
        grp.push(it);
      }
      flush();
    }
    return { spans: out, w: W, h: H };
  }

  /* ---------- signature ---------- */
  async function op_signature_clean(p) {
    const img = await loadImg(p.data);
    let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, 2400 / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = newCanvas(w, h), ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h), a = d.data, N = w * h, hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) hist[Math.round((a[i * 4] + a[i * 4 + 1] + a[i * 4 + 2]) / 3)]++;
    let acc = 0, paper = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= N * 0.9) { paper = v; break; } }
    const sens = (+p.sensitivity || 50) / 100, hi = Math.max(paper - 8, 60), lo = hi - (30 + 110 * (1 - sens));
    const tint = p.color ? hex2rgb(p.color) : null;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, lum = (a[i] + a[i + 1] + a[i + 2]) / 3;
      let al = Math.min(1, Math.max(0, (hi - lum) / Math.max(hi - lo, 1))); al = Math.pow(al, 0.8);
      if (tint) { a[i] = tint[0]; a[i + 1] = tint[1]; a[i + 2] = tint[2]; } else { a[i] *= 0.9; a[i + 1] *= 0.9; a[i + 2] *= 0.9; }
      const A = Math.round(al * 255); a[i + 3] = A;
      if (A > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    ctx.putImageData(d, 0, 0);
    let out = c;
    if (x1 >= x0) { out = newCanvas(x1 - x0 + 1, y1 - y0 + 1); out.getContext("2d").drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, x1 - x0 + 1, y1 - y0 + 1); }
    return { png: out.toDataURL("image/png"), w: out.width, h: out.height };
  }
  async function op_sign(p) {
    const f = getF(p.id), doc = await loadLib(p.id), n = doc.getPageCount();
    let idx;
    if (p.scope === "all") idx = [...Array(n).keys()];
    else if (p.scope === "last") idx = [n - 1];
    else if (p.scope === "range") idx = parsePages(p.range, n);
    else idx = [Math.min(Math.max(+p.page || 0, 0), n - 1)];
    let img = await loadImg(p.png), cw = img.naturalWidth, ch = img.naturalHeight;
    const ang = +p.angle || 0;
    let c = newCanvas(cw, ch);
    if (ang) {
      const r = (ang * Math.PI) / 180, cs = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r));
      c = newCanvas(cw * cs + ch * sn, cw * sn + ch * cs);
      const x = c.getContext("2d"); x.translate(c.width / 2, c.height / 2); x.rotate(r); x.drawImage(img, -cw / 2, -ch / 2);
    } else c.getContext("2d").drawImage(img, 0, 0);
    const emb = await doc.embedPng(await canvasBytes(c, "image/png")), ratio = c.height / c.width;
    for (const i of idx) {
      const pg = doc.getPage(i), { width: W, height: H } = pg.getSize();
      const w = +p.w * W, x = +p.x * W, y = +p.y * H, hh = w * ratio;
      pg.drawImage(emb, { x, y: H - y - hh, width: w, height: hh });
    }
    const r = await finalize(doc, p.id, baseOf(f.name) + "_موقّع.pdf");
    return { ...r, pages: idx.length };
  }

  /* ---------- merge / split / images ---------- */
  async function op_merge(p) {
    const items = p.items || [];
    if (items.length < 2) throw new ApiError("اختر ملفين على الأقل");
    const out = await PDFDocument.create();
    for (const it of items) {
      const d = await loadLib(it.id), idx = parsePages(it.range, d.getPageCount());
      const pages = await out.copyPages(d, idx); pages.forEach((pg) => out.addPage(pg));
      await tick();
    }
    const name = safeName((p.name || "ملف_مدموج").replace(/\.pdf$/i, "")) + ".pdf";
    return finalize(out, null, name);
  }
  async function op_split(p) {
    const f = getF(p.id), pdf = await getPdf(p.id), n = pdf.numPages, mode = p.mode || "count";
    let groups = [], names = [];
    if (mode === "count") {
      const k = Math.max(parseInt(p.count) || 1, 1);
      for (let i = 0; i < n; i += k) groups.push(Array.from({ length: Math.min(k, n - i) }, (_, j) => i + j));
    } else if (mode === "ranges") {
      for (const part of String(p.ranges || "").replace(/,/g, ";").split(/[;؛\n]/)) { if (part.trim()) { const g = parsePages(part, n); if (g.length) groups.push(g); } }
      if (!groups.length) throw new ApiError("أدخل نطاقات مثل: 1-3 ; 4-6");
    } else if (mode === "size") {
      const tol = +p.tol || 0; let cur = [], last = null;
      for (let i = 0; i < n; i++) {
        const [w, h] = await pageSize(pdf, i), sz = [Math.round(w), Math.round(h)];
        if (last === null || (Math.abs(sz[0] - last[0]) <= tol && Math.abs(sz[1] - last[1]) <= tol)) { cur.push(i); if (last === null) last = sz; }
        else { groups.push(cur); cur = [i]; last = sz; }
      }
      if (cur.length) groups.push(cur);
    } else if (mode === "text") {
      const needle = (p.text || "").trim();
      if (!needle) throw new ApiError("اكتب النص الذي يبدأ عنده كل ملف");
      const nl = norm(needle), texts = [];
      for (let i = 0; i < n; i++) {
        const tc = await (await pdf.getPage(i + 1)).getTextContent();
        texts.push(tc.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
      }
      let starts = [];
      texts.forEach((t, i) => { const tt = norm(t).replace(/[ \t]+/g, " "); if (tt.includes(nl) || tt.includes([...nl].reverse().join(""))) starts.push(i); });
      if (!starts.length) throw new ApiError("لم أجد هذا النص في أي صفحة (الملفات الممسوحة ضوئيًا لا يمكن البحث فيها).");
      if (starts[0] !== 0) starts = [0, ...starts];
      starts.push(n);
      for (let k = 0; k + 1 < starts.length; k++) {
        groups.push(Array.from({ length: starts[k + 1] - starts[k] }, (_, j) => starts[k] + j));
        const first = norm(texts[starts[k]]).split("\n").map((s) => s.trim()).find(Boolean) || "";
        names.push(first.replace(/\s+/g, " ").slice(0, 40));
      }
    } else throw new ApiError("وضع غير معروف");
    const base = baseOf(f.name), src = await loadLib(p.id), zip = new JSZip();
    for (let gi = 0; gi < groups.length; gi++) {
      const nd = await PDFDocument.create(); const pgs = await nd.copyPages(src, groups[gi]); pgs.forEach((x) => nd.addPage(x));
      nd.setProducer(APP);
      const label = names[gi] ? safeName(names[gi]) : "";
      zip.file(`${base}_${String(gi + 1).padStart(2, "0")}${label ? "_" + label : ""}.pdf`, await nd.save());
      await tick();
    }
    const zb = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const name = base + "_مقسّم.zip";
    return { id: register(zb, name, "zip"), name, parts: groups.length };
  }
  async function op_toimages(p) {
    const f = getF(p.id), pdf = await getPdf(p.id), idx = parsePages(p.range, pdf.numPages);
    const fmt = p.format === "jpg" ? "jpg" : "png", dpi = Math.min(Math.max(+p.dpi || 150, 36), 400), base = baseOf(f.name), files = [];
    for (const i of idx) {
      const c = await renderPage(pdf, i, dpi / 72);
      files.push([`${base}_صفحة_${String(i + 1).padStart(3, "0")}.${fmt}`, await canvasBytes(c, fmt === "jpg" ? "image/jpeg" : "image/png", 0.92)]);
      await tick();
    }
    if (files.length === 1) return { id: register(files[0][1], files[0][0], fmt), name: files[0][0], count: 1 };
    const zip = new JSZip(); files.forEach(([n, d]) => zip.file(n, d));
    const name = base + "_صور.zip";
    return { id: register(await zip.generateAsync({ type: "uint8array", compression: "STORE" }), name, "zip"), name, count: files.length };
  }

  /* ---------- edit text ---------- */
  async function op_edittext(p) {
    const f = getF(p.id), doc = await loadLib(p.id), by = {};
    for (const e of p.edits || []) (by[e.page] = by[e.page] || []).push(e);
    for (const pno of Object.keys(by)) {
      const pg = doc.getPage(+pno), H = pg.getSize().height;
      if (pg.getRotation().angle) throw new ApiError("تعديل النص في الصفحات المدوّرة غير مدعوم.");
      for (const e of by[pno]) {
        const [x0, y0, x1, y1] = e.rect;
        pg.drawRectangle({ x: x0 - 1.5, y: H - y1 - 1.5, width: x1 - x0 + 3, height: y1 - y0 + 3, color: rgb(1, 1, 1), borderWidth: 0 });
      }
      for (const e of by[pno]) {
        if (!(e.text || "").trim()) continue;
        const [x0, y0, x1, y1] = e.rect, size = +e.size || 12, hh = y1 - y0;
        const ti = await textImage(e.text, size, e.color, e.bold, e.align || "right", 0, e.font);
        const emb = await doc.embedPng(ti.bytes);
        let x = e.align === "left" ? x0 : e.align === "center" ? (x0 + x1) / 2 - ti.w / 2 : x1 - ti.w;
        const yc = (y0 + y1) / 2, y = H - (yc + ti.h / 2);
        pg.drawImage(emb, { x, y, width: ti.w, height: ti.h });
      }
    }
    const r = await finalize(doc, p.id, baseOf(f.name) + "_معدّل.pdf");
    return { ...r, edits: (p.edits || []).length };
  }

  /* ---------- add text ---------- */
  async function op_addtext(p) {
    const f = getF(p.id), doc = await loadLib(p.id), n = doc.getPageCount(), idx = parsePages(p.range, n);
    const kind = p.kind || "free", text = p.text || "", size = +p.size || 18, opacity = p.opacity == null ? 1 : +p.opacity, angle = +p.angle || 0;
    for (const i of idx) {
      const pg = doc.getPage(i), { width: W, height: H } = pg.getSize();
      let t = text;
      if (kind === "pagenum") {
        let num = String(i + 1), tot = String(n);
        if (p.arabicDigits) { num = toArabicDigits(num); tot = toArabicDigits(tot); }
        t = (text || "{n}").replace(/\{n\}/g, num).replace(/\{total\}/g, tot);
      }
      const ti = await textImage(t, size, p.color, p.bold, "center", kind === "pagenum" ? 0 : angle, p.font);
      const emb = await doc.embedPng(ti.bytes), w = ti.w, h = ti.h;
      const pos = kind === "pagenum" || kind === "footer" ? p.pos || "bottom-center" : kind === "header" ? p.pos || "top-center" : p.pos || "custom";
      const m = 24; let x, y;
      if (pos === "custom") { x = (+p.x || 0.5) * W - w / 2; y = (+p.y || 0.5) * H - h / 2; }
      else {
        const [v, hz] = pos.split("-");
        y = v === "top" ? m : v === "bottom" ? H - h - m : (H - h) / 2;
        x = hz === "left" ? m : hz === "right" ? W - w - m : (W - w) / 2;
      }
      pg.drawImage(emb, { x, y: H - y - h, width: w, height: h, opacity });
      await tick();
    }
    const r = await finalize(doc, p.id, baseOf(f.name) + "_مع_نص.pdf");
    return { ...r, pages: idx.length };
  }

  /* ---------- watermark removal ---------- */
  const u8str = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return s; };
  const strU8 = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  function maskStrings(s) {
    const o = s.split(""); let i = 0; const n = s.length;
    while (i < n) {
      const c = s[i];
      if (c === "(") { let d = 1, j = i + 1; while (j < n && d > 0) { if (s[j] === "\\") { o[j] = "x"; j += 2; continue; } if (s[j] === "(") d++; else if (s[j] === ")") d--; if (d > 0) o[j] = "x"; j++; } i = j; }
      else if (c === "<" && s[i + 1] !== "<") { let j = i + 1; while (j < n && s[j] !== ">") { o[j] = "x"; j++; } i = j + 1; }
      else if (c === "%") { let j = i; while (j < n && s[j] !== "\n" && s[j] !== "\r") { o[j] = " "; j++; } i = j; }
      else i++;
    }
    return o.join("");
  }
  function blockText(src) {
    let out = ""; const re = /\(((?:\\.|[^\\()])*)\)|<([0-9A-Fa-f\s]+)>/g; let m;
    while ((m = re.exec(src))) {
      if (m[1] !== undefined) out += m[1].replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[c] || c));
      else { const h = m[2].replace(/\s+/g, ""); for (let i = 0; i + 1 < h.length; i += 2) { const v = parseInt(h.substr(i, 2), 16); if (v >= 32 && v < 127) out += String.fromCharCode(v); } }
    }
    return out;
  }
  const normKey = (s) => s.toLowerCase().replace(/\s+/g, "");
  function pageContents(doc, page) {
    const ctx = doc.context, c = page.node.Contents(); if (!c) return null;
    const list = c instanceof PDFArray ? c.asArray().map((r) => ctx.lookup(r)) : [c];
    let s = "";
    for (const st of list) {
      try { s += u8str(st instanceof PDFRawStream ? decodePDFRawStream(st).decode() : st.getContents()) + "\n"; } catch (e) { return null; }
    }
    return s;
  }
  function coversPage(mk, idx, W, H) {
    const seg = mk.slice(Math.max(0, idx - 200), idx);
    const m = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+cm\s*$/.exec(seg);
    if (!m) return false;
    const w = Math.hypot(+m[1], +m[2]), h = Math.hypot(+m[3], +m[4]);
    return w * h >= 0.5 * W * H;
  }
  function areaAt(mk, idx, W, H) {
    const seg = mk.slice(Math.max(0, idx - 200), idx);
    const m = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+cm\s*$/.exec(seg);
    if (!m) return null;
    return Math.abs(+m[1] * +m[4] - +m[2] * +m[3]) / (W * H);
  }
  const STAMPRE = /stamp|seal|ختم|أختام|اختام|approved|received|paid|void|معتمد|مستلم/i;
  const STAMP_ANN = new Set(["/Stamp", "/FreeText", "/Ink", "/Square", "/Circle", "/Polygon", "/PolyLine", "/Line", "/Caret", "/Highlight", "/Underline", "/StrikeOut", "/Squiggly"]);
  async function cleanVector(doc, opt, log) {
    const ctx = doc.context, pages = doc.getPages(), n = pages.length;
    function cleanForm(ref, W, H, depth, seen, WMre) {
      if (depth > 3 || seen.has(ref.toString())) return 0; seen.add(ref.toString());
      const st = ctx.lookup(ref); if (!(st instanceof PDFRawStream)) return 0;
      const res = st.dict.lookup(PDFName.of("Resources")), xo = res && res.lookup && res.lookup(PDFName.of("XObject"));
      if (!(xo instanceof PDFDict)) return 0;
      let src; try { src = u8str(decodePDFRawStream(st).decode()); } catch (e) { return 0; }
      const mk = maskStrings(src), ranges = []; let cnt = 0;
      for (const [k, v] of xo.entries()) {
        const o = ctx.lookup(v), dict = o && (o.dict || o), sub = dict && dict.get && dict.get(PDFName.of("Subtype")), ss = sub ? sub.toString() : "";
        const alpha = !!(dict && dict.get && (dict.get(PDFName.of("SMask")) || dict.get(PDFName.of("Mask"))));
        const re = new RegExp(esc(k.toString()) + "\\s+Do\\b", "g"); let m;
        while ((m = re.exec(mk))) {
          const ar = ss === "/Image" ? areaAt(mk, m.index, W, H) : null;
          if (WMre.test(k.toString()) || (opt.stamps && STAMPRE.test(k.toString())) || (ss === "/Image" && alpha && coversPage(mk, m.index, W, H)) || (ss === "/Image" && opt.stamps && alpha && ar !== null && ar <= 0.4) || (ss === "/Image" && opt.allImages && ar !== null && ar >= 0.12 && ar < 0.8)) ranges.push([m.index, m.index + m[0].length]);
        }
        if (ss === "/Form" && !WMre.test(k.toString())) cnt += cleanForm(v, W, H, depth + 1, seen, WMre);
      }
      if (ranges.length) {
        ranges.sort((a, b) => a[0] - b[0]);
        let out = "", pos = 0; for (const [a, b] of ranges) { if (a < pos) continue; out += src.slice(pos, a) + " "; pos = b; } out += src.slice(pos);
        const keep = {}; for (const [k, v] of st.dict.entries()) { const nm = k.decodeText(); if (!["Length", "Filter", "DecodeParms"].includes(nm)) keep[nm] = v; }
        ctx.assign(ref, ctx.flateStream(strU8(out), keep)); cnt += ranges.length;
      }
      return cnt;
    }
    const WM = /watermark|علامة|مائي|مسودة|draft|confidential|سري/i;
    let removed = 0; const touched = new Set();
    /* annotations */
    for (const pg of pages) {
      const an = pg.node.Annots(); if (!an) continue;
      const keep = [];
      for (const r of an.asArray()) {
        const d = ctx.lookup(r, PDFDict), st = d && d.get(PDFName.of("Subtype")), ss = st ? st.toString() : "";
        if (ss === "/Watermark" || (opt.stamps && STAMP_ANN.has(ss))) removed++; else keep.push(r);
      }
      if (keep.length !== an.size()) pg.node.set(PDFName.of("Annots"), ctx.obj(keep));
    }
    /* hidden optional-content groups */
    const ocg = new Set();
    try {
      const props = doc.catalog.lookup(PDFName.of("OCProperties"), PDFDict), arr = props && props.lookup(PDFName.of("OCGs"), PDFArray);
      if (arr) for (const r of arr.asArray()) { const d = ctx.lookup(r, PDFDict), nm = d && d.lookup(PDFName.of("Name")); const t = nm && nm.decodeText ? nm.decodeText() : ""; if (WM.test(t) || (opt.stamps && STAMPRE.test(t))) ocg.add(r.toString()); }
    } catch (e) {}
    /* collect per-page info */
    const info = [], useCount = new Map();
    for (const pg of pages) {
      const res = pg.node.Resources(), x = res && res.lookup(PDFName.of("XObject")), pr = res && res.lookup(PDFName.of("Properties"));
      const xo = [], oc = [];
      if (x instanceof PDFDict) for (const [k, v] of x.entries()) {
        const o = ctx.lookup(v), dict = o && (o.dict || o), st = dict && dict.get && dict.get(PDFName.of("Subtype")), ss = st ? st.toString() : "";
        const alpha = !!(dict && dict.get && (dict.get(PDFName.of("SMask")) || dict.get(PDFName.of("Mask"))));
        const key = v.toString(); xo.push({ name: k.toString(), key, sub: ss, alpha, ref: v });
        useCount.set(key, (useCount.get(key) || 0) + 1);
      }
      if (pr instanceof PDFDict) for (const [k, v] of pr.entries()) if (ocg.has(v.toString())) oc.push(k.toString());
      info.push({ xo, oc });
    }
    /* text keys across pages (for auto-detect of repeated diagonal text) */
    const blocksByPage = [], keyPages = new Map(), contents = [];
    for (let i = 0; i < n; i++) {
      const s = pageContents(doc, pages[i]); contents.push(s);
      const bl = [];
      if (s) {
        const mk = maskStrings(s), re = /\bBT\b[\s\S]*?\bET\b/g; let m;
        while ((m = re.exec(mk))) {
          const src = s.slice(m.index, m.index + m[0].length), txt = blockText(src), tm = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+[-\d.]+\s+Tm/.exec(mk.slice(m.index, m.index + m[0].length));
          let diag = false;
          if (tm) { const a = +tm[1], b = +tm[2], c = +tm[3]; diag = Math.abs(b) > 0.2 * (Math.abs(a) || 1) && Math.abs(c) > 0.2 * (Math.abs(a) || 1); }
          const key = normKey(txt);
          bl.push({ a: m.index, b: m.index + m[0].length, txt, key, diag });
          if (diag && key.length >= 3) { if (!keyPages.has(key)) keyPages.set(key, new Set()); keyPages.get(key).add(i); }
        }
      }
      blocksByPage.push(bl);
    }
    const need = Math.max(2, Math.ceil(n * 0.5));
    const needles = (opt.texts || []).map(normKey).filter(Boolean);
    for (let i = 0; i < n; i++) {
      const s = contents[i]; if (!s) continue;
      const mk = maskStrings(s), ranges = [];
      for (const b of blocksByPage[i]) {
        const byUser = needles.some((nd) => b.key.includes(nd));
        const auto = b.diag && b.key.length >= 3 && (keyPages.get(b.key) || new Set()).size >= need;
        if (byUser || auto) ranges.push([b.a, b.b]);
      }
      /* tagged Artifact watermark blocks (Acrobat style) */
      { const re = /\/Artifact\s*<<[^>]*?\/Subtype\s*\/Watermark[^>]*?>>\s*BDC/g; let m;
        while ((m = re.exec(mk))) {
          const tok = /\b(BDC|BMC|EMC)\b/g; tok.lastIndex = m.index + m[0].length; let d = 1, t, end = -1;
          while ((t = tok.exec(mk))) { if (t[1] === "EMC") d--; else d++; if (d === 0) { end = t.index + 3; break; } }
          if (end > 0) ranges.push([m.index, end]);
        } }
      /* optional content blocks */
      for (const nm of info[i].oc) {
        const re = new RegExp("\\/OC\\s+" + esc(nm) + "\\s+BDC", "g"); let m;
        while ((m = re.exec(mk))) {
          const tok = /\b(BDC|BMC|EMC)\b/g; tok.lastIndex = m.index + m[0].length; let d = 1, t, end = -1;
          while ((t = tok.exec(mk))) { if (t[1] === "EMC") d--; else d++; if (d === 0) { end = t.index + 3; break; } }
          if (end > 0) ranges.push([m.index, end]);
        }
      }
      /* XObjects: named watermark, or repeated images with transparency */
      const { width: PWd, height: PHt } = pages[i].getSize();
      /* does the page have a full-page base image (scan)? remember where it is drawn */
      let baseAt = -1;
      if (opt.allImages) for (const x of info[i].xo) if (x.sub === "/Image" && !x.alpha) {
        const re = new RegExp(esc(x.name) + "\\s+Do\\b", "g"); let m;
        while ((m = re.exec(mk))) { const ar = areaAt(mk, m.index, PWd, PHt); if (ar !== null && ar >= 0.8 && (baseAt < 0 || m.index < baseAt)) baseAt = m.index; }
      }
      for (const x of info[i].xo) {
        const rep = useCount.get(x.key) >= need && n >= 2;
        const kill = WM.test(x.name) || (opt.stamps && STAMPRE.test(x.name)) || (x.sub === "/Image" && rep && (x.alpha || opt.allImages));
        const re = new RegExp(esc(x.name) + "\\s+Do\\b", "g"); let m;
        while ((m = re.exec(mk))) {
          let k2 = kill || (x.sub === "/Image" && x.alpha && coversPage(mk, m.index, PWd, PHt));
          if (!k2 && x.sub === "/Image") {
            const ar = areaAt(mk, m.index, PWd, PHt);
            if (opt.stamps && x.alpha && ar !== null && ar <= 0.4) k2 = true;
            if (opt.allImages && ar !== null && ar >= 0.1 && baseAt >= 0 && m.index > baseAt) k2 = true;
            if (opt.allImages && x.alpha && ar !== null && ar >= 0.1) k2 = true;
          }
          if (k2) ranges.push([m.index, m.index + m[0].length]);
        }
        if (x.sub === "/Form" && !WM.test(x.name)) { const f = cleanForm(x.ref, PWd, PHt, 0, new Set(), WM); if (f) { removed += f; touched.add(i); } }
      }
      if (!ranges.length) continue;
      ranges.sort((a, b) => a[0] - b[0]);
      const merged = []; for (const r of ranges) { const l = merged[merged.length - 1]; if (l && r[0] < l[1]) l[1] = Math.max(l[1], r[1]); else merged.push([...r]); }
      let out = "", pos = 0; for (const [a, b] of merged) { out += s.slice(pos, a) + " "; pos = b; } out += s.slice(pos);
      pages[i].node.set(PDFName.of("Contents"), ctx.register(ctx.flateStream(strU8(out))));
      removed += merged.length; touched.add(i);
    }
    if (removed) log.push(`حُذف ${removed} عنصرًا من طبقات العلامة المائية.`);
    return { removed, touched };
  }
  async function washCanvas(c, lo, hi, tol) {
    const ctx = c.getContext("2d", { willReadFrequently: true }), d = ctx.getImageData(0, 0, c.width, c.height), a = d.data, rng = hi - lo; let ch = 0;
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i], g = a[i + 1], b = a[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn > tol) continue;
      const lu = (r + g + b) / 3; if (lu <= lo) continue;
      const k = lu >= hi ? 1 : (lu - lo) / rng;
      a[i] = r * (1 - k) + 255 * k; a[i + 1] = g * (1 - k) + 255 * k; a[i + 2] = b * (1 - k) + 255 * k; ch++;
    }
    ctx.putImageData(d, 0, 0); return ch;
  }
  async function stampCanvas(c) {
    const ctx = c.getContext("2d", { willReadFrequently: true }), d = ctx.getImageData(0, 0, c.width, c.height), a = d.data; let ch = 0;
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i], g = a[i + 1], b = a[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), chroma = mx - mn;
      if (chroma < 18) continue;
      const k = Math.min(1, (chroma - 18) / 25);
      a[i] = r + (255 - r) * k; a[i + 1] = g + (255 - g) * k; a[i + 2] = b + (255 - b) * k; ch++;
    }
    ctx.putImageData(d, 0, 0); return ch;
  }
  async function op_watermark(p) {
    const f = getF(p.id), log = [], pdf = await getPdf(p.id), n = pdf.numPages;
    const texts = String(p.texts || "").split(/[;؛\n]/).map((s) => s.trim()).filter(Boolean);
    const doc = await loadLib(p.id);
    let vec = 0, touched = new Set();
    try { const cv = await cleanVector(doc, { texts, stamps: !!p.stamps, allImages: !!p.allImages }, log); vec = cv.removed; touched = cv.touched; }
    catch (e) { log.push("تعذّر تنظيف طبقات الملف: " + e.message); }
    let rp = pdf;
    if (vec) { try { rp = await pdfjsLib.getDocument({ data: (await doc.save()).slice(), isEvalSupported: false }).promise; } catch (e) { rp = pdf; } }
    const wash = new Set();
    for (let i = 0; i < n; i++) {
      if (p.aggressive) { wash.add(i); continue; }
      if (p.scan === false && !p.stamps || (touched.has(i) && !p.stamps)) continue;
      const page = await rp.getPage(i + 1);
      const tc = await page.getTextContent(), chars = tc.items.reduce((s, it) => s + (it.str || "").trim().length, 0);
      if (chars > 20) continue;
      const ol = await page.getOperatorList(), O = pdfjsLib.OPS;
      if (ol.fnArray.some((fn) => fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintJpegXObject)) wash.add(i);
    }
    let out = doc;
    if (wash.size) {
      out = await PDFDocument.create();
      for (let i = 0; i < n; i++) {
        if (wash.has(i)) {
          const [W, H] = await pageSize(rp, i), sc = Math.min(200 / 72, 4200 / Math.max(W, H)), c = await renderPage(rp, i, sc);
          if (p.aggressive) await washCanvas(c, 140, 200, 45); else await washCanvas(c, 170, 215, 8);
          if (p.stamps) await stampCanvas(c);
          const emb = await out.embedJpg(await canvasBytes(c, "image/jpeg", 0.92)), pg = out.addPage([W, H]);
          pg.drawImage(emb, { x: 0, y: 0, width: W, height: H });
        } else { const [cp] = await out.copyPages(doc, [i]); out.addPage(cp); }
        await tick();
      }
      log.push(p.aggressive ? `الوضع المتقدم: نُظّفت ${wash.size} صفحة وحُوّلت إلى صور (لا يمكن تحديد نصها بعد ذلك).` : `نُظّفت العلامة الرمادية في ${wash.size} صفحة ممسوحة ضوئيًا.`);
    }
    if (!vec && !wash.size) log.push("لم أجد علامة مائية قابلة للحذف تلقائيًا. جرّب كتابة نص العلامة، أو فعّل «الوضع المتقدم».");
    const r = await finalize(out, p.id, baseOf(f.name) + "_بدون_علامة.pdf");
    return { ...r, log };
  }


  /* ---------- compress PDF ---------- */
  async function op_compresspdf(p) {
    const f = getF(p.id), pdf = await getPdf(p.id), n = pdf.numPages, level = p.level || "medium", before = f.bytes.length;
    let bytes, note;
    if (level === "light") {
      const doc = await loadLib(p.id); doc.setProducer(APP);
      bytes = await doc.save({ useObjectStreams: true });
      note = "ضغط خفيف: يبقى النص قابلًا للتحديد، وقد يكون التوفير قليلًا.";
    } else {
      const cfg = level === "strong" ? { dpi: 96, q: 0.55 } : { dpi: 130, q: 0.72 };
      const out = await PDFDocument.create();
      for (let i = 0; i < n; i++) {
        const [W, H] = await pageSize(pdf, i), c = await renderPage(pdf, i, Math.min(cfg.dpi / 72, 4200 / Math.max(W, H)));
        const emb = await out.embedJpg(await canvasBytes(c, "image/jpeg", cfg.q)), pg = out.addPage([W, H]);
        pg.drawImage(emb, { x: 0, y: 0, width: W, height: H });
        await tick();
      }
      out.setProducer(APP); bytes = await out.save();
      note = "تحوّلت الصفحات إلى صور مضغوطة، لذلك لا يمكن تحديد النص بعد الضغط.";
    }
    const name = baseOf(f.name) + "_مضغوط.pdf";
    let kept = false;
    if (bytes.length >= before) { bytes = f.bytes; kept = true; }
    const log = [`الحجم قبل: ${fmtSize(before)}`, kept ? "الملف أصلًا مضغوط جيدًا، أبقيته كما هو." : `الحجم بعد: ${fmtSize(bytes.length)} (توفير ${Math.round((1 - bytes.length / before) * 100)}٪)`, note];
    return { id: register(bytes, name, "pdf"), name, log };
  }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(2) + " م.ب" : Math.round(b / 1024) + " ك.ب"; }

  /* ---------- image compress / resize (runs directly from the UI) ---------- */
  window.runImageTool = async function (files, o) {
    const fmt = o.format || "jpg", mime = fmt === "png" ? "image/png" : fmt === "webp" ? "image/webp" : "image/jpeg", out = [], log = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImg(url); let w = img.naturalWidth, h = img.naturalHeight, k = 1;
        if (o.mode === "percent") k = Math.min(Math.max(o.percent, 1), 400) / 100;
        else if (o.mode === "exact") { /* handled below */ }
        else { const mw = o.maxW || 0, mh = o.maxH || 0; if (mw && w > mw) k = Math.min(k, mw / w); if (mh && h > mh) k = Math.min(k, mh / h); }
        let nw = Math.round(w * k), nh = Math.round(h * k);
        if (o.mode === "exact") { nw = o.maxW || w; nh = o.keep ? Math.round(nw * h / w) : (o.maxH || h); }
        const c = newCanvas(nw, nh), x = c.getContext("2d");
        if (fmt !== "png") { x.fillStyle = "#fff"; x.fillRect(0, 0, nw, nh); }
        x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, nw, nh);
        const bytes = await canvasBytes(c, mime, (o.quality || 80) / 100);
        const nm = baseOf(safeName(file.name)) + (o.suffix === false ? "" : "_مصغّر") + "." + fmt;
        out.push([nm, bytes]);
        log.push(`${file.name}: ${w}×${h} (${fmtSize(file.size)}) ← ${nw}×${nh} (${fmtSize(bytes.length)})`);
      } finally { URL.revokeObjectURL(url); }
      await tick();
    }
    if (!out.length) throw new ApiError("اختر صورة واحدة على الأقل");
    if (out.length === 1) return { id: register(out[0][1], out[0][0], fmt === "jpg" ? "jpg" : "png"), name: out[0][0], log };
    const zip = new JSZip(); out.forEach(([n, d]) => zip.file(n, d));
    const name = "صور_مضغوطة.zip";
    return { id: register(await zip.generateAsync({ type: "uint8array", compression: "STORE" }), name, "zip"), name, log };
  };

  const OPS = { compresspdf: op_compresspdf, watermark: op_watermark, signature_clean: op_signature_clean, sign: op_sign, merge: op_merge, split: op_split, toimages: op_toimages, edittext: op_edittext, addtext: op_addtext };

  /* ---------- fetch router: the UI talks to /api/* exactly as before, but it is all local ---------- */
  const realFetch = window.fetch.bind(window);
  const J = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
  window.fetch = async function (url, opt) {
    if (typeof url !== "string" || !url.startsWith("/api/")) return realFetch(url, opt);
    const [path, qs] = url.split("?"), q = new URLSearchParams(qs || "");
    try {
      if (path === "/api/ping") return J({ ok: true });
      if (path === "/api/upload") return J(await api_upload(q, opt.body));
      if (path === "/api/psize") { const pdf = await getPdf(q.get("id")); const [w, h] = await pageSize(pdf, +q.get("page") || 0); return J({ w, h }); }
      if (path === "/api/info") return J(await info_of(q.get("id")));
      if (path === "/api/spans") return J(await api_spans(q));
      if (path.startsWith("/api/op/")) {
        const fn = OPS[path.slice(8)]; if (!fn) throw new ApiError("عملية غير معروفة");
        return J(await fn(JSON.parse(opt.body || "{}")));
      }
      return J({ error: "غير موجود" }, 404);
    } catch (e) {
      console.error(e);
      return J({ error: e instanceof ApiError ? e.message : "تعذّر إكمال العملية: " + (e && e.message ? e.message : e) }, 400);
    }
  };
})();
