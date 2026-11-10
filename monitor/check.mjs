// MSU2001 — فاحص تعليق الدراسة (مصادر رسمية مفتوحة فقط). لا يعتبر فشل مصدر دليلًا على عدم وجود تعليق.
import fs from 'node:fs';
const UA = 'MSU2001-monitor/1.0 (+https://msu2001.com)';
const SOURCES = [
  { id: 'qassim', name: 'إدارة تعليم القصيم', url: 'https://sites.moe.gov.sa/Qassim/news/' },
  { id: 'rass', name: 'إدارة تعليم الرس', url: 'https://sites.moe.gov.sa/Rass/' },
  { id: 'moe', name: 'وزارة التعليم', url: 'https://www.moe.gov.sa/' },
];
const KEY = /تعليق\s*الدراس|الدراسة\s*عن\s*بُ?عد|التعليم\s*عن\s*بُ?عد|منصة\s*مدرستي|استئناف\s*الدراس|تعطيل\s*الدراس/;
const UNI = /جامع|الجامعي|الجامعات/;
const CITIES = ['بريدة','عنيزة','الرس','البكيرية','البدائع','المذنب','رياض الخبراء','الأسياح','عيون الجواء','النبهانية','الشماسية','عقلة الصقور','ضرية'];
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\s+/g, ' ').trim();
function items(html, base) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const t = strip(m[2]); if (t.length < 15) continue;
    let u; try { u = new URL(m[1].replace(/&amp;/g, '&'), base).href; } catch { continue; }
    if (!out.has(t)) out.set(t, u);
  }
  for (const m of html.matchAll(/"(?:title|name|headline)"\s*:\s*"((?:[^"\\]|\\.){15,300})"/g)) {
    const t = strip(m[1]); if (t.length >= 15 && !out.has(t)) out.set(t, base);
  }
  return [...out].map(([title, url]) => ({ title, url }));
}
function scopeOf(t) {
  const hit = CITIES.filter(c => t.includes(c));
  if (/جميع\s*(مدارس|الطلاب|الطلبة)|منطقة\s*القصيم|إدارة\s*تعليم\s*القصيم|في\s*القصيم/.test(t) && !hit.length) return { scope: 'region', places: ['منطقة القصيم'] };
  if (hit.length) return { scope: hit.length === 1 && hit[0] === 'الرس' ? 'rass' : 'city', places: hit };
  return { scope: 'unknown', places: [] };
}
const res = { checkedAt: new Date().toISOString(), sources: [], candidates: [] };
for (const s of SOURCES) {
  const r = { id: s.id, name: s.name, url: s.url, ok: false };
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
    const resp = await fetch(s.url, { headers: { 'user-agent': UA, 'accept-language': 'ar' }, signal: ctl.signal }); clearTimeout(tm);
    const html = await resp.text();
    r.status = resp.status; r.ok = resp.ok && html.length > 2000;
    if (r.ok) {
      const its = items(html, s.url); r.itemCount = its.length;
      for (const it of its) if (KEY.test(it.title) && !UNI.test(it.title) && it.title.length < 400)
        res.candidates.push({ source: s.id, sourceName: s.name, title: it.title, url: it.url, ...scopeOf(it.title) });
    } else r.error = 'HTTP ' + resp.status;
  } catch (e) { r.error = String(e.name === 'AbortError' ? 'timeout' : e.message || e).slice(0, 120); }
  res.sources.push(r);
}
const seen = new Set(); res.candidates = res.candidates.filter(c => !seen.has(c.title) && seen.add(c.title)).slice(0, 10);
res.anyOk = res.sources.some(s => s.ok); res.allFailed = !res.anyOk;
const f = process.argv[2] || 'suspension/status.json'; let prev = {}; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
const sig = o => JSON.stringify([o.candidates, (o.sources || []).map(s => [s.id, s.ok, s.error])]);
const age = prev.checkedAt ? (Date.now() - Date.parse(prev.checkedAt)) / 6e4 : 1e9;
if (sig(prev) !== sig(res) || age > 55) { fs.writeFileSync(f, JSON.stringify(res, null, 1) + '\n'); console.log('status.json updated'); } else console.log('no change');
console.log(JSON.stringify(res.sources), res.candidates.length + ' candidates');
