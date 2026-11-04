import {
  CATALOG,
  TYPES,
  MODES,
  DEFAULT_RECITER,
  resolveReciter,
  typesOf,
  modesOf,
  qualitiesOf,
  qualityLabel,
  makeId,
  describe,
} from "./reciters.js";

const FAV_KEY = "reciter-favorites";

/**
 * Reciter chooser: name search, favorites, recording type, quality and
 * verse-by-verse / full-surah mode. The chosen recording is one composite id.
 */
export function mountReciterPicker(host, { ctx, value, onSelect }) {
  const esc = v => ctx.escape(String(v ?? ""));
  const norm = v => (ctx.normalize ? ctx.normalize(v) : String(v)).trim();
  const readFavs = () => {
    const list = ctx.store?.get?.(FAV_KEY, []);
    return Array.isArray(list)
      ? list.filter(k => CATALOG.some(r => r.key === k))
      : [];
  };
  let favs = readFavs();
  let sel = resolveReciter(value) || resolveReciter(DEFAULT_RECITER);
  let query = "";

  host.innerHTML = `<div class="reciter-picker">
    <div class="rp-current" data-rp-current aria-live="polite"></div>
    <div class="search-box"><span class="rp-search-icon">${ctx.icon("search")}</span>
      <input class="input" type="search" data-rp-search placeholder="ابحث باسم القارئ…" aria-label="بحث باسم القارئ" autocomplete="off"></div>
    <div class="rp-favs" data-rp-favs></div>
    <ul class="rp-list" data-rp-list role="list"></ul>
    <p class="muted small" data-rp-empty hidden>لا يوجد قارئ بهذا الاسم.</p>
    <div class="rp-options" data-rp-options></div>
    <p class="muted small rp-note">«آية بآية» تُشغَّل فيها كل آية على حدة وتتبّعها الأداة بالتظليل (مصدر EveryAyah). «سورة كاملة» ملف واحد للسورة بلا تتبّع للآيات (مصدر mp3quran.net). المتاح يختلف بحسب التسجيل.</p>
  </div>`;
  const q = s => host.querySelector(s);

  function badges(reciter) {
    const types = typesOf(reciter)
      .map(t => `<span class="pill">${TYPES[t]}</span>`)
      .join("");
    const hasA = typesOf(reciter).some(t => reciter.recs[t].a);
    const hasS = typesOf(reciter).some(t => reciter.recs[t].s);
    const modes = [
      hasA ? `<span class="pill pill-accent">${MODES.a}</span>` : "",
      hasS ? `<span class="pill pill-accent">${MODES.s}</span>` : "",
    ].join("");
    return `<span class="rp-badges">${types}${modes}</span>`;
  }
  function item(reciter) {
    const active = sel.key === reciter.key;
    const fav = favs.includes(reciter.key);
    return `<li class="rp-row${active ? " is-active" : ""}">
      <button type="button" class="rp-pick" data-rp-pick="${esc(reciter.key)}" aria-pressed="${active}">
        <span class="rp-name">${esc(reciter.name)}</span>${badges(reciter)}</button>
      <button type="button" class="button-icon rp-star${fav ? " is-active" : ""}" data-rp-fav="${esc(reciter.key)}"
        aria-pressed="${fav}" aria-label="${fav ? "إزالة " : "إضافة "}${esc(reciter.name)} ${fav ? "من" : "إلى"} المفضلة" title="${fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">${fav ? "★" : "☆"}</button></li>`;
  }
  function renderList() {
    const text = norm(query);
    const shown = CATALOG.filter(
      r => !text || norm(r.name).includes(text)
    );
    shown.sort(
      (a, b) =>
        Number(favs.includes(b.key)) - Number(favs.includes(a.key)) ||
        CATALOG.indexOf(a) - CATALOG.indexOf(b)
    );
    q("[data-rp-list]").innerHTML = shown.map(item).join("");
    q("[data-rp-empty]").hidden = shown.length > 0;
    const favRow = q("[data-rp-favs]");
    const favReciters = favs
      .map(k => CATALOG.find(r => r.key === k))
      .filter(Boolean);
    favRow.hidden = favReciters.length === 0;
    favRow.innerHTML = favReciters.length
      ? `<span class="muted small">المفضلة:</span>` +
        favReciters
          .map(
            r =>
              `<button type="button" class="pill rp-chip${r.key === sel.key ? " pill-accent" : ""}" data-rp-pick="${esc(r.key)}">★ ${esc(r.name)}</button>`
          )
          .join("")
      : "";
  }
  function renderOptions() {
    const reciter = sel.reciter;
    const types = typesOf(reciter);
    const modes = modesOf(reciter, sel.type);
    const quals = qualitiesOf(reciter.recs[sel.type]);
    q("[data-rp-current]").innerHTML =
      `<strong>المحدد:</strong> ${esc(describe(sel))}`;
    q("[data-rp-options]").innerHTML = `
      <div class="field"><label for="rp-type">نوع التسجيل</label>
        <select id="rp-type" class="select" data-rp-type>${types
          .map(
            t =>
              `<option value="${t}"${t === sel.type ? " selected" : ""}>${TYPES[t]}</option>`
          )
          .join("")}</select></div>
      <div class="field"><label for="rp-mode">طريقة الاستماع</label>
        <select id="rp-mode" class="select" data-rp-mode>${["a", "s"]
          .map(
            m =>
              `<option value="${m}"${m === sel.mode ? " selected" : ""}${modes[m] ? "" : " disabled"}>${MODES[m]}${modes[m] ? "" : " — غير متاح لهذا التسجيل"}</option>`
          )
          .join("")}</select></div>
      <div class="field"><label for="rp-quality">الجودة</label>
        <select id="rp-quality" class="select" data-rp-quality${sel.mode === "s" ? " disabled" : ""}>${
          sel.mode === "s"
            ? `<option>يحدّدها المصدر (سورة كاملة)</option>`
            : quals
                .map(
                  k =>
                    `<option value="${k}"${k === sel.quality ? " selected" : ""}>${qualityLabel(k)}</option>`
                )
                .join("")
        }</select>${
          sel.mode === "a" && quals.length < 2
            ? `<small>هذا التسجيل متوفر بجودة واحدة.</small>`
            : ""
        }</div>`;
  }
  function commit(next) {
    if (!next) return;
    sel = next;
    renderList();
    renderOptions();
    onSelect(sel.id);
  }
  function pickReciter(key) {
    const reciter = CATALOG.find(r => r.key === key);
    if (!reciter) return;
    const types = typesOf(reciter);
    const type = types.includes(sel.type) ? sel.type : types[0];
    const modes = modesOf(reciter, type);
    const mode = modes[sel.mode] ? sel.mode : modes.a ? "a" : "s";
    const quals = qualitiesOf(reciter.recs[type]);
    const quality = quals.includes(sel.quality)
      ? sel.quality
      : quals.includes(128)
        ? 128
        : quals[0] || 0;
    commit(resolveReciter(makeId(reciter.key, type, quality, mode)));
  }
  function changeType(type) {
    const reciter = sel.reciter;
    const modes = modesOf(reciter, type);
    const mode = modes[sel.mode] ? sel.mode : modes.a ? "a" : "s";
    const quals = qualitiesOf(reciter.recs[type]);
    const quality = quals.includes(sel.quality)
      ? sel.quality
      : quals.includes(128)
        ? 128
        : quals[0] || 0;
    commit(resolveReciter(makeId(reciter.key, type, quality, mode)));
  }
  function changeMode(mode) {
    const quals = qualitiesOf(sel.reciter.recs[sel.type]);
    const quality = quals.includes(sel.quality)
      ? sel.quality
      : quals.includes(128)
        ? 128
        : quals[0] || 0;
    commit(resolveReciter(makeId(sel.key, sel.type, quality, mode)));
  }
  function toggleFav(key) {
    favs = favs.includes(key) ? favs.filter(k => k !== key) : [...favs, key];
    ctx.store?.set?.(FAV_KEY, favs);
    renderList();
  }

  host.addEventListener("input", event => {
    if (event.target.matches("[data-rp-search]")) {
      query = event.target.value;
      renderList();
    }
  });
  host.addEventListener("change", event => {
    const t = event.target;
    if (t.matches("[data-rp-type]")) changeType(t.value);
    else if (t.matches("[data-rp-mode]")) changeMode(t.value);
    else if (t.matches("[data-rp-quality]"))
      commit(resolveReciter(makeId(sel.key, sel.type, Number(t.value), "a")));
  });
  host.addEventListener("click", event => {
    const pick = event.target.closest("[data-rp-pick]");
    if (pick) return pickReciter(pick.dataset.rpPick);
    const fav = event.target.closest("[data-rp-fav]");
    if (fav) toggleFav(fav.dataset.rpFav);
  });
  renderList();
  renderOptions();
}
