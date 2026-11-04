/* Word meanings (gharib al-Quran) — data: Quranpedia.net meanings dump (v2026-10-31). */
let pending;
export function loadMeanings() {
  if (!pending)
    pending = fetch(new URL("../data/meanings.json", import.meta.url))
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  return pending;
}
export function ayahMeanings(data, sura, ayah) {
  const entry = data?.d?.[`${sura}:${ayah}`];
  if (!entry) return null;
  return { book: data.books[entry[0]] || "", words: entry[1] };
}
export function wordsHTML(esc, words) {
  return words
    .map(
      ([word, meaning]) => `<div class="meaning-item">
        <small class="muted">الكلمة</small><div class="meaning-word" lang="ar" dir="rtl">${esc(word)}</div>
        <hr><small class="muted">المعنى</small><div class="meaning-text" lang="ar" dir="rtl">${esc(meaning)}</div></div>`
    )
    .join("");
}
export function creditHTML(esc, data, book) {
  return `<p class="muted small meaning-source">المصدر: ${esc(book)} — عبر <a href="https://quranpedia.net" target="_blank" rel="noopener noreferrer">الموسوعة القرآنية Quranpedia.net</a> (نسخة ${esc(data?.v || "")}).</p>`;
}

export async function renderMeanings(container, ctx) {
  const esc = v => ctx.escape(String(v ?? ""));
  const surahs = ctx.data.surahs;
  let sura = Number(ctx.routeParams?.sura);
  if (!Number.isInteger(sura) || sura < 1 || sura > 114) sura = 1;
  const surah = surahs[sura - 1];
  const data = await loadMeanings();
  const revel = surah.revelationType === "Meccan" ? "مكية" : surah.revelationType === "Medinan" ? "مدنية" : "";
  const total = surah.ayahs.length;
  let withData = 0;
  let cards = "";
  if (data) {
    for (const verse of surah.ayahs) {
      const m = ayahMeanings(data, sura, verse.number);
      if (!m) continue;
      withData++;
      cards += `<article class="panel meaning-card" data-ayah="${esc(verse.number)}">
        <div class="meaning-side"><span class="meaning-num">${esc(ctx.num(verse.number))}</span>
          <button type="button" class="button button-secondary" data-meaning-tafsir="${esc(verse.number)}">التفسير</button></div>
        <div class="meaning-body">${wordsHTML(esc, m.words)}
          <p class="muted small">المصدر: ${esc(m.book)}</p></div></article>`;
    }
  }
  const options = surahs
    .map(
      s =>
        `<option value="${s.number}"${s.number === sura ? " selected" : ""}>${esc(ctx.num(s.number))}. ${esc(s.name)}</option>`
    )
    .join("");
  container.innerHTML = `<div class="page-heading"><div><span class="eyebrow">المصحف · غريب القرآن</span>
      <h1>معاني كلمات سورة ${esc(surah.name)} حسب الآيات</h1>
      <p>${esc(revel)} · ${esc(ctx.num(total))} آية</p></div>
      <div class="heading-actions">
        <a class="button button-secondary" href="#/quran?sura=${sura}">قراءة السورة</a></div></div>
    <div class="panel meaning-tools">
      <div class="field"><label for="meaning-sura">السورة</label><select id="meaning-sura" class="select" data-meaning-sura>${options}</select></div>
      <div class="form-actions">
        ${sura > 1 ? `<a class="button button-secondary" href="#/meanings?sura=${sura - 1}">السورة السابقة</a>` : ""}
        ${sura < 114 ? `<a class="button button-secondary" href="#/meanings?sura=${sura + 1}">السورة التالية</a>` : ""}
      </div></div>
    ${
      !data
        ? `<div class="notice error">تعذر تحميل بيانات معاني الكلمات. تأكد من رفع الملف data/meanings.json.</div>`
        : withData
          ? `<p class="muted small meaning-count">تُعرض الآيات التي تتوفر لها معانٍ في المصدر: ${esc(ctx.num(withData))} من ${esc(ctx.num(total))} آية.</p><div class="meaning-list">${cards}</div>`
          : `<div class="empty-state"><h2>لا تتوفر معانٍ لكلمات هذه السورة في المصدر</h2></div>`
    }
    ${data ? `<p class="muted small meaning-source">مصدر البيانات: <a href="https://quranpedia.net" target="_blank" rel="noopener noreferrer">الموسوعة القرآنية Quranpedia.net</a> — نسخة ${esc(data.v)}؛ أعمال: ${data.books.map(esc).join("، ")}.</p>` : ""}`;
  const onChange = event => {
    if (event.target.matches("[data-meaning-sura]"))
      ctx.navigate(`#/meanings?sura=${event.target.value}`);
  };
  const onClick = event => {
    const b = event.target.closest("[data-meaning-tafsir]");
    if (b) ctx.openTafsir(sura, Number(b.dataset.meaningTafsir));
  };
  container.addEventListener("change", onChange);
  container.addEventListener("click", onClick);
  return () => {
    container.removeEventListener("change", onChange);
    container.removeEventListener("click", onClick);
  };
}
