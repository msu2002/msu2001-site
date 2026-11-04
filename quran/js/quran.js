/**
 * Text-only Quran view. All Quran text is supplied by ctx.data and rendered intact.
 * Opening basmala is rendered only from surah.bismillah, intact and unnumbered.
 * ctx.icon returns trusted, application-owned icon markup (never Quran/tafsir HTML).
 */
const RESULT_PAGE_SIZE = 40;
const MIN_FONT_SIZE = 22;
const MAX_FONT_SIZE = 46;
let viewSequence = 0;

/** Accept Latin, Arabic-Indic and Persian digits without altering Quran text. */
function readInteger(value) {
  const digits = String(value ?? "")
    .trim()
    .replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
  if (!/^\d+$/.test(digits)) return null;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : null;
}

export async function renderQuran(container, ctx) {
  const prefix = `quran-view-${++viewSequence}`;
  const esc = value => ctx.escape(String(value ?? ""));
  const number = value => esc(ctx.num(value));
  const normalize = value => String(ctx.normalize(String(value ?? "")));
  const route = ctx.routeParams || {};
  const originalSize = container.style.getPropertyValue("--reading-size");
  const originalPriority =
    container.style.getPropertyPriority("--reading-size");
  let alive = true;
  let searchTimer = null;
  let progressTimer = null;
  let frame = null;
  let frameIsTimeout = false;
  let observer = null;
  let lastProgress = "";
  let searchIndex = null;
  let normalizedSurahs = null;
  let searchResults = [];
  let renderedSearchCount = 0;
  let pendingProgress = null;
  let appliedSize = "";

  const surahs = (Array.isArray(ctx.data?.surahs) ? ctx.data.surahs : [])
    .filter(
      surah => Number.isInteger(surah.number) && Array.isArray(surah.ayahs)
    )
    .slice()
    .sort((a, b) => a.number - b.number);
  const byNumber = new Map(surahs.map(surah => [surah.number, surah]));
  const ayahsBySurah = new Map(
    surahs.map(surah => [
      surah.number,
      new Map(surah.ayahs.map(ayah => [ayah.number, ayah])),
    ])
  );
  const findAyah = (sura, ayah) => ayahsBySurah.get(sura)?.get(ayah);
  const desktop =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 768px)").matches;
  const initialFont = Number(ctx.settings?.fontSize);
  const requestedSura = readInteger(route.sura);
  const requestedAyah = readInteger(route.ayah);
  const state = {
    mode:
      route.mode === "bookmarks"
        ? "bookmarks"
        : route.mode === "search" || String(route.query ?? "").trim()
          ? "search"
          : byNumber.has(requestedSura)
            ? "reading"
            : "index",
    sura: byNumber.has(requestedSura) ? requestedSura : surahs[0]?.number,
    ayah: null,
    query: String(route.query ?? ""),
    returnMode: byNumber.has(requestedSura) ? "reading" : "index",
    sidebarOpen: Boolean(desktop),
    sidebarQuery: "",
    fontSize: Number.isFinite(initialFont)
      ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, initialFont))
      : 30,
    searchLimit: RESULT_PAGE_SIZE,
    bookmarkLimit: RESULT_PAGE_SIZE,
  };
  state.ayah =
    findAyah(state.sura, requestedAyah)?.number ??
    byNumber.get(state.sura)?.ayahs[0]?.number;

  function notify(message, type = "info") {
    if (alive && typeof ctx.notify === "function") ctx.notify(message, type);
  }

  function getStored(key, fallback) {
    try {
      return ctx.store.get(key, fallback) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      const result = ctx.store.set(key, value);
      if (result === false) {
        notify("تعذر الحفظ على هذا الجهاز.", "error");
        return false;
      }
      if (result && typeof result.catch === "function") {
        result.catch(() => notify("تعذر الحفظ على هذا الجهاز.", "error"));
      }
      return true;
    } catch {
      notify("تعذر الحفظ على هذا الجهاز.", "error");
      return false;
    }
  }

  function readProgress() {
    const entry = getStored("progress", null);
    const sura = readInteger(entry?.sura);
    const ayah = readInteger(entry?.ayah);
    return findAyah(sura, ayah) ? { sura, ayah } : null;
  }

  function readBookmarks() {
    const stored = getStored("bookmarks", []);
    if (!Array.isArray(stored)) return [];
    const seen = new Set();
    return stored.flatMap(entry => {
      const sura = readInteger(entry?.sura);
      const ayah = readInteger(entry?.ayah);
      const key = `${sura}:${ayah}`;
      if (!findAyah(sura, ayah) || seen.has(key)) return [];
      seen.add(key);
      // Persist only the location and timestamp, never source text or metadata.
      const timestamp =
        typeof entry.createdAt === "string"
          ? Date.parse(entry.createdAt)
          : Number(entry.createdAt);
      const date = new Date(timestamp);
      const createdAt = Number.isFinite(date.getTime())
        ? date.toISOString()
        : new Date(0).toISOString();
      return [{ sura, ayah, createdAt }];
    });
  }

  let bookmarks = readBookmarks();
  let bookmarkKeys = new Set(
    bookmarks.map(entry => `${entry.sura}:${entry.ayah}`)
  );

  function icon(name) {
    if (typeof ctx.icon !== "function") return "";
    try {
      return ctx.icon(name) || "";
    } catch {
      return "";
    }
  }

  function path(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "")
        query.set(key, String(value));
    }
    return `#/quran${query.size ? `?${query}` : ""}`;
  }

  function navigate(params) {
    if (alive) ctx.navigate(path(params));
  }

  function revelation(surah) {
    const labels = {
      Meccan: "مكية",
      Medinan: "مدنية",
      meccan: "مكية",
      medinan: "مدنية",
    };
    return labels[surah.revelationType] || surah.revelationType || "";
  }

  function surahInfo(surah) {
    return `${esc(revelation(surah))} · ${number(surah.ayahs.length)} آية`;
  }

  function bookmarkButton(sura, ayah) {
    const saved = bookmarkKeys.has(`${sura}:${ayah}`);
    const label = saved ? "إزالة العلامة المحفوظة" : "حفظ علامة لهذه الآية";
    return `<button type="button" class="button button-icon ${saved ? "button-gold is-active" : "button-secondary"}"
      data-action="bookmark" data-sura="${esc(sura)}" data-ayah="${esc(ayah)}"
      aria-label="${esc(label)}" title="${esc(label)}" aria-pressed="${saved}">
      ${icon("bookmark")}<span class="sr-only">${saved ? "محفوظة" : "حفظ"}</span></button>`;
  }

  function verseActions(sura, ayah) {
    const location = `${byNumber.get(sura)?.name ?? ""}، الآية ${ctx.num(ayah)}`;
    return `<div class="verse-actions">
      ${bookmarkButton(sura, ayah)}
      <button type="button" class="button button-secondary button-icon" data-action="tafsir"
        data-sura="${esc(sura)}" data-ayah="${esc(ayah)}" aria-label="${esc(`تفسير ${location}`)}" title="تفسير الآية">
        ${icon("book")}<span class="sr-only">تفسير</span></button>
      <button type="button" class="button button-secondary button-icon" data-action="meanings"
        data-sura="${esc(sura)}" data-ayah="${esc(ayah)}" aria-label="${esc(`معاني كلمات ${location}`)}" title="معاني الكلمات">
        ${icon("words")}<span class="sr-only">معاني الكلمات</span></button>
      <button type="button" class="button button-secondary button-icon" data-action="play"
        data-sura="${esc(sura)}" data-ayah="${esc(ayah)}" aria-label="${esc(`استماع إلى ${location}`)}" title="استماع إلى الآية">
        ${icon("play")}<span class="sr-only">استماع</span></button>
    </div>`;
  }

  function verseText(ayah) {
    // No normalization, substring highlighting, reversal or generated basmala here.
    return `<span class="verse-text" lang="ar" dir="rtl">${esc(ayah.text)}</span>
      <span class="verse-number" aria-label="${esc(`الآية ${ctx.num(ayah.number)}`)}">${number(ayah.number)}</span>`;
  }

  function surahRows(items, current = null) {
    return items
      .map(
        surah => `<a class="surah-row${surah.number === current ? " is-active" : ""}"
      href="${esc(path({ sura: surah.number, ayah: surah.ayahs[0]?.number || 1 }))}"
      data-action="read" data-sura="${esc(surah.number)}" data-ayah="${esc(surah.ayahs[0]?.number || 1)}"
      ${surah.number === current ? 'aria-current="page"' : ""}>
      <span class="surah-badge">${number(surah.number)}</span>
      <span><strong>${esc(surah.name)}</strong><small class="muted">${surahInfo(surah)}</small></span>
      <span class="muted" lang="en" dir="ltr">${esc(surah.englishName || "")}</span>
    </a>`
      )
      .join("");
  }

  function resumeMarkup() {
    const progress = readProgress();
    if (!progress) return "";
    const surah = byNumber.get(progress.sura);
    return `<a class="button button-gold" data-action="resume" href="${esc(path(progress))}"
      aria-label="${esc(`استكمال سورة ${surah.name} من الآية ${ctx.num(progress.ayah)}`)}">
      ${icon("book")}<span>استكمال: ${esc(surah.name)} · ${number(progress.ayah)}</span></a>`;
  }

  function emptyState(title, description = "") {
    return `<div class="empty-state" role="status"><h3>${esc(title)}</h3>
      ${description ? `<p class="muted">${esc(description)}</p>` : ""}</div>`;
  }

  function applyFont() {
    appliedSize = `${state.fontSize}px`;
    container.style.setProperty("--reading-size", appliedSize);
    const label = container.querySelector("[data-font-size]");
    if (label) label.textContent = ctx.num(state.fontSize);
    const smaller = container.querySelector('[data-action="font-smaller"]');
    const larger = container.querySelector('[data-action="font-larger"]');
    if (smaller) smaller.disabled = state.fontSize <= MIN_FONT_SIZE;
    if (larger) larger.disabled = state.fontSize >= MAX_FONT_SIZE;
  }

  function stopReadingObserver() {
    observer?.disconnect();
    observer = null;
    if (frame !== null) {
      if (frameIsTimeout) clearTimeout(frame);
      else cancelAnimationFrame(frame);
      frame = null;
    }
    if (progressTimer !== null) clearTimeout(progressTimer);
    progressTimer = null;
    if (pendingProgress) {
      const { sura, ayah } = pendingProgress;
      pendingProgress = null;
      persistProgress(sura, ayah);
    }
  }

  function persistProgress(sura, ayah) {
    if (!findAyah(sura, ayah)) return false;
    const key = `${sura}:${ayah}`;
    if (lastProgress === key) return true;
    if (!setStored("progress", { sura, ayah })) return false;
    lastProgress = key;
    return true;
  }

  function saveSelection(sura, ayah) {
    if (!findAyah(sura, ayah)) return false;
    if (progressTimer !== null) clearTimeout(progressTimer);
    progressTimer = null;
    pendingProgress = null;
    const saved = persistProgress(sura, ayah);
    if (state.mode !== "reading" || state.sura !== sura) return saved;
    state.ayah = ayah;
    container.querySelectorAll("[data-verse]").forEach(element => {
      const active = readInteger(element.dataset.ayah) === ayah;
      element.classList.toggle("is-active", active);
      if (active) element.setAttribute("aria-current", "true");
      else element.removeAttribute("aria-current");
    });
    updateSelectedInfo();
    return saved;
  }

  function updateSelectedInfo() {
    const verse = findAyah(state.sura, state.ayah);
    const info = container.querySelector("[data-selected-info]");
    if (!verse || !info) return;
    const details = [`الآية ${ctx.num(verse.number)}`];
    if (verse.juz != null) details.push(`الجزء ${ctx.num(verse.juz)}`);
    if (verse.page != null) details.push(`الصفحة ${ctx.num(verse.page)}`);
    info.textContent = details.join(" · ");
    const jumpInput = container.querySelector("[data-jump-ayah]");
    const jumpSurah = container.querySelector("[data-jump-sura]");
    if (jumpInput && readInteger(jumpSurah?.value) === state.sura)
      jumpInput.value = ctx.num(state.ayah);
  }

  function startReadingObserver(shouldScroll) {
    const run = () => {
      frame = null;
      if (!alive || state.mode !== "reading") return;
      const selected = container.querySelector(
        `[data-verse][data-ayah="${state.ayah}"]`
      );
      if (shouldScroll && selected) {
        selected.scrollIntoView({ block: "center", behavior: "auto" });
        selected.focus({ preventScroll: true });
      }
      persistProgress(state.sura, state.ayah);
      if (typeof IntersectionObserver === "undefined") return;
      const visible = new Map();
      observer = new IntersectionObserver(
        entries => {
          if (!alive || state.mode !== "reading") return;
          for (const entry of entries) {
            if (entry.isIntersecting)
              visible.set(entry.target, entry.boundingClientRect.top);
            else visible.delete(entry.target);
          }
          if (!visible.size) return;
          // Track the reading position without moving the user's selected-verse highlight.
          const element = [...visible.keys()].sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top
          )[0];
          const ayah = readInteger(element.dataset.ayah);
          pendingProgress = { sura: state.sura, ayah };
          if (progressTimer !== null) clearTimeout(progressTimer);
          progressTimer = setTimeout(() => {
            progressTimer = null;
            if (alive && pendingProgress) {
              const next = pendingProgress;
              pendingProgress = null;
              persistProgress(next.sura, next.ayah);
            }
          }, 250);
        },
        { rootMargin: "-18% 0px -58% 0px", threshold: 0 }
      );
      container
        .querySelectorAll("[data-verse]")
        .forEach(element => observer.observe(element));
    };
    frameIsTimeout = typeof requestAnimationFrame !== "function";
    frame = frameIsTimeout ? setTimeout(run, 0) : requestAnimationFrame(run);
  }

  function indexMarkup() {
    const progress = resumeMarkup();
    return `<section class="panel" aria-labelledby="${prefix}-index-title">
      <div class="section-heading"><div><h2 class="panel-title" id="${prefix}-index-title">فهرس السور</h2>
      <p class="muted">${number(surahs.length)} سورة · اختر سورة للقراءة</p></div>${progress}</div>
      <nav class="surah-list" aria-label="فهرس سور القرآن">${surahRows(surahs)}</nav>
    </section>`;
  }

  function readingMarkup() {
    const surah = byNumber.get(state.sura);
    if (!surah) return emptyState("السورة غير موجودة.", "اختر سورة من الفهرس.");
    const position = surahs.findIndex(item => item.number === surah.number);
    const previous = surahs[position - 1];
    const next = surahs[position + 1];
    const routeNotice =
      route.ayah != null && !findAyah(state.sura, requestedAyah)
        ? '<p class="notice" role="status">رقم الآية غير متاح؛ تُعرض بداية السورة.</p>'
        : "";
    return `<div class="reading-layout${state.sidebarOpen ? "" : " is-sidebar-hidden"}" ${state.sidebarOpen ? "" : 'style="grid-template-columns:minmax(0,1fr)"'}>
      <aside class="reading-sidebar panel${state.sidebarOpen ? " is-open" : ""}" id="${prefix}-sidebar" ${state.sidebarOpen ? "" : "hidden"} aria-label="فهرس السور">
        <div class="section-heading"><h2 class="panel-title">السور</h2>
          <button class="button button-secondary" type="button" data-action="close-sidebar" aria-label="إغلاق فهرس السور">إغلاق</button></div>
        <label class="field" for="${prefix}-sidebar-search">تصفية أسماء السور</label>
        <input class="input" type="search" id="${prefix}-sidebar-search" data-sidebar-search
          value="${esc(state.sidebarQuery)}" placeholder="اسم السورة أو رقمها" autocomplete="off">
        <nav class="surah-list" data-sidebar-list aria-label="اختر سورة">${surahRows(filteredSurahs(state.sidebarQuery), state.sura)}</nav>
      </aside>
      <section class="reading-main" aria-labelledby="${prefix}-reading-title">
        <div class="reading-toolbar panel" style="position:sticky;top:var(--reading-toolbar-top,0px);z-index:5">
          <div class="section-heading"><div><h2 class="panel-title" id="${prefix}-reading-title">سورة ${esc(surah.name)}</h2>
            <p class="muted">${surahInfo(surah)}</p><p class="muted" data-selected-info></p></div>
            <button class="button button-secondary" type="button" data-action="toggle-sidebar"
              aria-controls="${prefix}-sidebar" aria-expanded="${state.sidebarOpen}">
              ${icon("grid")}<span data-sidebar-label>${state.sidebarOpen ? "إخفاء فهرس السور" : "إظهار فهرس السور"}</span></button>
          </div>
          <div class="verse-actions" role="group" aria-label="حجم خط القراءة">
            <button class="button button-icon button-secondary" type="button" data-action="font-smaller" aria-label="تصغير خط القرآن" title="تصغير الخط">${icon("minus")}<span class="sr-only">تصغير</span></button>
            <span class="pill">حجم الخط <span data-font-size>${number(state.fontSize)}</span></span>
            <button class="button button-icon button-secondary" type="button" data-action="font-larger" aria-label="تكبير خط القرآن" title="تكبير الخط">${icon("plus")}<span class="sr-only">تكبير</span></button>
            <button class="button button-gold" type="button" data-action="save-progress">حفظ موضع القراءة</button>
            <a class="button button-secondary" href="#/meanings?sura=${esc(surah.number)}">${icon("words")} معاني كلمات السورة</a>
          </div>
          <form data-form="jump" class="verse-actions" aria-label="الانتقال إلى آية محددة">
            <div class="field"><label for="${prefix}-jump-sura">السورة</label>
              <select class="select" id="${prefix}-jump-sura" data-jump-sura>
                ${surahs.map(item => `<option value="${esc(item.number)}" ${item.number === state.sura ? "selected" : ""}>${number(item.number)} · ${esc(item.name)}</option>`).join("")}
              </select></div>
            <div class="field"><label for="${prefix}-jump-ayah">الآية</label>
              <input class="input" id="${prefix}-jump-ayah" data-jump-ayah type="text" inputmode="numeric" pattern="[0-9٠-٩۰-۹]+"
                value="${esc(ctx.num(state.ayah))}" aria-describedby="${prefix}-jump-hint" required autocomplete="off">
              <small class="muted" id="${prefix}-jump-hint" data-jump-hint>من ${number(1)} إلى ${number(surah.ayahs.length)}</small></div>
            <button class="button button-gold" type="submit">انتقل إلى الآية</button>
          </form>
          ${routeNotice}
        </div>
        ${
          typeof surah.bismillah === "string" && surah.bismillah
            ? `<p class="basmala" lang="ar" dir="rtl">${esc(surah.bismillah)}</p>`
            : ""
        }
        <div class="verse-list" aria-label="آيات سورة ${esc(surah.name)}">
          ${surah.ayahs
            .map(
              ayah => `<article class="verse${ayah.number === state.ayah ? " is-active" : ""}"
            data-verse data-sura="${esc(surah.number)}" data-ayah="${esc(ayah.number)}" tabindex="0"
            aria-label="${esc(`سورة ${surah.name}، الآية ${ctx.num(ayah.number)}`)}"
            ${ayah.number === state.ayah ? 'aria-current="true"' : ""}>
            <p class="verse-content">${verseText(ayah)}</p>${verseActions(surah.number, ayah.number)}
          </article>`
            )
            .join("")}
        </div>
        <nav class="verse-actions panel" aria-label="التنقل بين السور">
          ${previous ? `<a class="button button-secondary" data-action="read" data-sura="${esc(previous.number)}" data-ayah="${esc(previous.ayahs[0]?.number || 1)}" href="${esc(path({ sura: previous.number, ayah: previous.ayahs[0]?.number || 1 }))}">السورة السابقة: ${esc(previous.name)}</a>` : ""}
          <a class="button button-secondary" data-action="index" href="#/quran">فهرس السور</a>
          ${next ? `<a class="button button-secondary" data-action="read" data-sura="${esc(next.number)}" data-ayah="${esc(next.ayahs[0]?.number || 1)}" href="${esc(path({ sura: next.number, ayah: next.ayahs[0]?.number || 1 }))}">السورة التالية: ${esc(next.name)}</a>` : ""}
        </nav>
      </section>
    </div>`;
  }

  function buildSearchIndex() {
    if (searchIndex) return;
    normalizedSurahs = surahs.map(surah => ({
      surah,
      names: normalize(`${surah.name} ${surah.englishName || ""}`),
    }));
    searchIndex = surahs.flatMap(surah =>
      surah.ayahs.map(ayah => ({
        type: "ayah",
        surah,
        ayah,
        searchable: normalize(ayah.text),
      }))
    );
  }

  function filteredSurahs(query) {
    const term = normalize(query).trim();
    if (!term) return surahs;
    const numeric = readInteger(query);
    return surahs.filter(
      surah =>
        numeric === surah.number ||
        normalize(`${surah.name} ${surah.englishName || ""}`).includes(term)
    );
  }

  function findSearchResults() {
    const term = normalize(state.query).trim();
    if (!term) {
      searchResults = [];
      return;
    }
    buildSearchIndex();
    const numeric = readInteger(state.query);
    const names = normalizedSurahs
      .filter(
        item => numeric === item.surah.number || item.names.includes(term)
      )
      .map(item => ({ type: "surah", surah: item.surah }));
    searchResults = [
      ...names,
      ...searchIndex.filter(entry => entry.searchable.includes(term)),
    ];
  }

  function resultMarkup(entry) {
    if (entry.type === "surah") {
      return `<div class="search-result"><span class="pill">سورة</span>
        <div class="surah-list">${surahRows([entry.surah])}</div></div>`;
    }
    const surah = entry.surah || byNumber.get(entry.sura);
    const ayah =
      entry.type === "ayah" ? entry.ayah : findAyah(entry.sura, entry.ayah);
    if (!surah || !ayah) return "";
    return `<article class="search-result verse" data-result-sura="${esc(surah.number)}" data-result-ayah="${esc(ayah.number)}">
      <div class="section-heading"><a class="button button-secondary" data-action="read"
        data-sura="${esc(surah.number)}" data-ayah="${esc(ayah.number)}"
        href="${esc(path({ sura: surah.number, ayah: ayah.number }))}">
        سورة ${esc(surah.name)} · الآية ${number(ayah.number)}</a>
        ${ayah.juz != null ? `<span class="pill">الجزء ${number(ayah.juz)}</span>` : ""}</div>
      <p class="verse-content">${verseText(ayah)}</p>${verseActions(surah.number, ayah.number)}
    </article>`;
  }

  function searchMarkup() {
    findSearchResults();
    renderedSearchCount = Math.min(state.searchLimit, searchResults.length);
    if (!normalize(state.query).trim()) {
      return `<section class="panel">${emptyState("ابحث في القرآن الكريم", "اكتب اسم سورة أو كلمة من نص القرآن في حقل البحث.")}</section>`;
    }
    const nameCount = searchResults.filter(
      entry => entry.type === "surah"
    ).length;
    const ayahCount = searchResults.length - nameCount;
    return `<section class="panel" aria-labelledby="${prefix}-results-title">
      <div class="section-heading"><div><h2 class="panel-title" id="${prefix}-results-title">نتائج البحث</h2>
        <p class="muted" role="status">${number(searchResults.length)} نتيجة: ${number(nameCount)} سورة، ${number(ayahCount)} آية</p>
        <p class="muted">البحث عن: ${esc(state.query)}</p></div>
        <button type="button" class="button button-secondary" data-action="clear-search">مسح البحث</button></div>
      <div data-search-results>${searchResults.slice(0, renderedSearchCount).map(resultMarkup).join("")}
        ${searchResults.length ? "" : emptyState("لا توجد نتائج مطابقة.", "جرّب اسم سورة أو كلمة أخرى؛ يُحفظ النص الأصلي كما ورد من المصدر.")}</div>
      <p class="muted" data-search-count role="status">عرض ${number(renderedSearchCount)} من ${number(searchResults.length)} نتيجة</p>
      <button type="button" class="button button-gold" data-action="more-results"
        ${renderedSearchCount >= searchResults.length ? "hidden" : ""}>عرض ${number(RESULT_PAGE_SIZE)} نتيجة أخرى</button>
    </section>`;
  }

  function bookmarksMarkup() {
    const sorted = bookmarks
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const visible = sorted.slice(0, state.bookmarkLimit);
    return `<section class="panel" aria-labelledby="${prefix}-bookmarks-title">
      <div class="section-heading"><div><h2 class="panel-title" id="${prefix}-bookmarks-title">العلامات المحفوظة</h2>
        <p class="muted" role="status">${number(bookmarks.length)} علامة · محفوظة على هذا الجهاز</p></div>${resumeMarkup()}</div>
      ${
        bookmarks.length
          ? visible.map(resultMarkup).join("")
          : emptyState(
              "لا توجد علامات محفوظة بعد.",
              "اضغط حفظ بجانب أي آية للعودة إليها لاحقًا."
            )
      }
      <button type="button" class="button button-gold" data-action="more-bookmarks"
        ${visible.length >= bookmarks.length ? "hidden" : ""}>عرض المزيد من العلامات</button>
    </section>`;
  }

  function updateNavigation() {
    container.querySelectorAll("[data-nav]").forEach(element => {
      const active = element.dataset.nav === state.mode;
      element.classList.toggle("is-active", active);
      if (active) element.setAttribute("aria-current", "page");
      else element.removeAttribute("aria-current");
    });
    const clear = container.querySelector("[data-search-clear]");
    if (clear) clear.hidden = !state.query;
  }

  function renderBody(shouldScroll = false) {
    stopReadingObserver();
    const body = container.querySelector("[data-quran-body]");
    if (!body || !alive) return;
    body.setAttribute("aria-busy", "true");
    if (state.mode === "reading") body.innerHTML = readingMarkup();
    else if (state.mode === "bookmarks") body.innerHTML = bookmarksMarkup();
    else if (state.mode === "search") body.innerHTML = searchMarkup();
    else body.innerHTML = indexMarkup();
    body.setAttribute("aria-busy", "false");
    updateNavigation();
    applyFont();
    if (state.mode === "reading") {
      updateSelectedInfo();
      startReadingObserver(shouldScroll);
    }
  }

  function toggleBookmark(sura, ayah) {
    if (!findAyah(sura, ayah)) return;
    const key = `${sura}:${ayah}`;
    const saved = bookmarkKeys.has(key);
    const next = saved
      ? bookmarks.filter(entry => `${entry.sura}:${entry.ayah}` !== key)
      : [...bookmarks, { sura, ayah, createdAt: new Date().toISOString() }];
    if (!setStored("bookmarks", next)) return;
    bookmarks = next;
    bookmarkKeys = new Set(next.map(entry => `${entry.sura}:${entry.ayah}`));
    if (state.mode === "bookmarks") renderBody();
    else
      container.querySelectorAll('[data-action="bookmark"]').forEach(button => {
        if (
          readInteger(button.dataset.sura) === sura &&
          readInteger(button.dataset.ayah) === ayah
        ) {
          button.outerHTML = bookmarkButton(sura, ayah);
        }
      });
    notify(
      saved ? "أُزيلت العلامة المحفوظة." : "حُفظت الآية في العلامات.",
      "success"
    );
  }

  function clearSearch() {
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = null;
    state.query = "";
    state.mode = state.returnMode;
    const input = container.querySelector("[data-quran-search]");
    if (input) {
      input.value = "";
      input.focus();
    }
    renderBody();
  }

  async function changeFont(delta) {
    const next = Math.min(
      MAX_FONT_SIZE,
      Math.max(MIN_FONT_SIZE, state.fontSize + delta)
    );
    if (next === state.fontSize) return;
    state.fontSize = next;
    applyFont();
    await ctx.saveSettings({ fontSize: next });
  }

  function showMoreResults() {
    const results = container.querySelector("[data-search-results]");
    if (!results) return;
    state.searchLimit += RESULT_PAGE_SIZE;
    const end = Math.min(state.searchLimit, searchResults.length);
    results.insertAdjacentHTML(
      "beforeend",
      searchResults.slice(renderedSearchCount, end).map(resultMarkup).join("")
    );
    renderedSearchCount = end;
    const status = container.querySelector("[data-search-count]");
    if (status)
      status.textContent = `عرض ${ctx.num(end)} من ${ctx.num(searchResults.length)} نتيجة`;
    const more = container.querySelector('[data-action="more-results"]');
    if (more) {
      const remaining = searchResults.length - end;
      more.hidden = remaining <= 0;
      more.textContent = `عرض ${ctx.num(Math.min(RESULT_PAGE_SIZE, remaining))} نتيجة أخرى`;
    }
  }

  async function handleClick(event) {
    const target =
      event.target instanceof Element
        ? event.target
        : event.target?.parentElement;
    if (!target || !container.contains(target)) return;
    const button = target.closest("[data-action]");
    if (!button) {
      const verse = target.closest("[data-verse]");
      if (verse)
        saveSelection(
          readInteger(verse.dataset.sura),
          readInteger(verse.dataset.ayah)
        );
      return;
    }
    if (!container.contains(button) || button.disabled) return;
    if (
      button.tagName === "A" &&
      (event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button > 0)
    )
      return;
    event.preventDefault();
    const sura = readInteger(button.dataset.sura);
    const ayah = readInteger(button.dataset.ayah);
    switch (button.dataset.action) {
      case "index":
        navigate({});
        break;
      case "bookmarks":
        navigate({ mode: "bookmarks" });
        break;
      case "read":
        if (findAyah(sura, ayah)) navigate({ sura, ayah });
        break;
      case "resume": {
        const progress = readProgress();
        if (progress) navigate(progress);
        else notify("لم يُحفظ موضع قراءة بعد.");
        break;
      }
      case "bookmark":
        toggleBookmark(sura, ayah);
        break;
      case "tafsir":
      case "meanings":
      case "play": {
        if (!findAyah(sura, ayah)) return;
        saveSelection(sura, ayah);
        const callback =
          button.dataset.action === "tafsir"
            ? ctx.openTafsir
            : button.dataset.action === "meanings"
              ? ctx.openMeanings
              : ctx.play;
        if (typeof callback !== "function") {
          notify("هذه الأداة غير متاحة حاليًا.", "error");
          return;
        }
        // The host owns audio and tafsir UI. Never insert callback/remote HTML here.
        await callback.call(ctx, sura, ayah);
        break;
      }
      case "font-smaller":
        await changeFont(-2);
        break;
      case "font-larger":
        await changeFont(2);
        break;
      case "save-progress":
        if (saveSelection(state.sura, state.ayah))
          notify("حُفظ موضع القراءة للاستكمال على هذا الجهاز.", "success");
        break;
      case "toggle-sidebar":
      case "close-sidebar": {
        state.sidebarOpen =
          button.dataset.action === "toggle-sidebar"
            ? !state.sidebarOpen
            : false;
        const sidebar = container.querySelector(".reading-sidebar");
        const toggle = container.querySelector(
          '[data-action="toggle-sidebar"]'
        );
        if (sidebar) {
          sidebar.hidden = !state.sidebarOpen;
          sidebar.classList.toggle("is-open", state.sidebarOpen);
        }
        const layout = container.querySelector(".reading-layout");
        if (layout) {
          layout.classList.toggle("is-sidebar-hidden", !state.sidebarOpen);
          if (state.sidebarOpen)
            layout.style.removeProperty("grid-template-columns");
          else
            layout.style.setProperty("grid-template-columns", "minmax(0,1fr)");
        }
        if (toggle) {
          toggle.setAttribute("aria-expanded", String(state.sidebarOpen));
          const label = toggle.querySelector("[data-sidebar-label]");
          if (label)
            label.textContent = state.sidebarOpen
              ? "إخفاء فهرس السور"
              : "إظهار فهرس السور";
          if (!state.sidebarOpen) toggle.focus();
        }
        break;
      }
      case "clear-search":
        clearSearch();
        break;
      case "more-results":
        showMoreResults();
        break;
      case "more-bookmarks":
        state.bookmarkLimit += RESULT_PAGE_SIZE;
        renderBody();
        break;
      default:
        break;
    }
  }

  function handleInput(event) {
    const input = event.target;
    if (!input || !container.contains(input)) return;
    if (input.matches("[data-quran-search]")) {
      state.query = input.value;
      if (state.mode !== "search") state.returnMode = state.mode;
      if (searchTimer !== null) clearTimeout(searchTimer);
      const clear = container.querySelector("[data-search-clear]");
      if (clear) clear.hidden = !state.query;
      searchTimer = setTimeout(() => {
        searchTimer = null;
        if (!alive) return;
        state.mode = state.query.trim() ? "search" : state.returnMode;
        state.searchLimit = RESULT_PAGE_SIZE;
        renderBody();
      }, 180);
    } else if (input.matches("[data-sidebar-search]")) {
      state.sidebarQuery = input.value;
      const list = container.querySelector("[data-sidebar-list]");
      const matches = filteredSurahs(input.value);
      if (list)
        list.innerHTML = matches.length
          ? surahRows(matches, state.sura)
          : emptyState("لا توجد سورة مطابقة.");
    } else if (input.matches("[data-jump-sura]")) {
      const selected = byNumber.get(readInteger(input.value));
      const hint = container.querySelector("[data-jump-hint]");
      if (hint && selected)
        hint.textContent = `من ${ctx.num(1)} إلى ${ctx.num(selected.ayahs.length)}`;
      const verseInput = container.querySelector("[data-jump-ayah]");
      if (verseInput)
        verseInput.value = ctx.num(
          selected?.number === state.sura ? state.ayah : 1
        );
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!form || !container.contains(form) || !form.matches("[data-form]"))
      return;
    event.preventDefault();
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = null;
    if (form.dataset.form === "search") {
      const query = form.querySelector("[data-quran-search]").value.trim();
      navigate(query ? { mode: "search", query } : {});
    } else if (form.dataset.form === "jump") {
      const sura = readInteger(form.querySelector("[data-jump-sura]").value);
      const input = form.querySelector("[data-jump-ayah]");
      const ayah = readInteger(input.value);
      if (!findAyah(sura, ayah)) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        notify(
          `أدخل رقم آية صحيحًا من ${ctx.num(1)} إلى ${ctx.num(byNumber.get(sura)?.ayahs.length || 1)}.`,
          "error"
        );
        return;
      }
      input.removeAttribute("aria-invalid");
      navigate({ sura, ayah });
    }
  }

  function handleKeydown(event) {
    const target = event.target;
    if (!target || !container.contains(target)) return;
    if (event.key === "Escape" && target.matches("[data-quran-search]")) {
      event.preventDefault();
      clearSearch();
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      target.matches("[data-verse]")
    ) {
      event.preventDefault();
      saveSelection(
        readInteger(target.dataset.sura),
        readInteger(target.dataset.ayah)
      );
    } else if (event.key === "Escape" && target.closest(".reading-sidebar")) {
      const button = container.querySelector('[data-action="close-sidebar"]');
      button?.click();
    }
  }

  function onClick(event) {
    handleClick(event).catch(() =>
      notify("تعذر تنفيذ الإجراء؛ حاول مرة أخرى.", "error")
    );
  }

  function onInput(event) {
    try {
      handleInput(event);
    } catch {
      notify("تعذر تحديث البحث.", "error");
    }
  }

  function cleanup() {
    if (!alive) return;
    // Flush the pending reading position before marking this instance inactive.
    stopReadingObserver();
    alive = false;
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = null;
    container.removeEventListener("click", onClick);
    container.removeEventListener("input", onInput);
    container.removeEventListener("submit", handleSubmit);
    container.removeEventListener("keydown", handleKeydown);
    if (container.style.getPropertyValue("--reading-size") === appliedSize) {
      if (originalSize)
        container.style.setProperty(
          "--reading-size",
          originalSize,
          originalPriority
        );
      else container.style.removeProperty("--reading-size");
    }
  }

  if (!surahs.length) {
    container.innerHTML = `<section class="quran-view" dir="rtl" lang="ar">
      <div class="panel" ${ctx.data == null ? 'aria-busy="true"' : ""}>
        ${
          ctx.data == null
            ? emptyState(
                "جارٍ تحميل القرآن الكريم…",
                "سيظهر فهرس السور عند تجهيز البيانات."
              )
            : emptyState(
                "بيانات القرآن غير متاحة.",
                "أعد المحاولة بعد تجهيز ملف بيانات القرآن."
              )
        }
      </div><footer class="muted">مصدر النص: <a href="https://tanzil.net/" target="_blank" rel="noopener noreferrer" dir="ltr">Tanzil</a></footer>
    </section>`;
    return cleanup;
  }

  container.innerHTML = `<section class="quran-view" dir="rtl" lang="ar" aria-label="القرآن الكريم">
    <header class="panel">
      <div class="section-heading"><div><h1 class="panel-title">القرآن الكريم</h1>
        <p class="muted">قراءة وتدبر · مصحف نصي</p></div><span class="pill">${number(surahs.length)} سورة</span></div>
      <label class="field" for="${prefix}-search">ابحث باسم السورة أو في نص القرآن</label>
      <form class="search-box" data-form="search" role="search" aria-label="البحث في السور والقرآن">
        ${icon("search")}
        <input class="input" id="${prefix}-search" data-quran-search type="search" value="${esc(state.query)}"
          placeholder="اسم سورة أو كلمة من القرآن…" autocomplete="off" enterkeyhint="search">
        <button type="submit" class="button button-gold">${icon("search")}<span>بحث</span></button>
        <button type="button" class="button button-secondary" data-action="clear-search" data-search-clear
          aria-label="مسح نص البحث" ${state.query ? "" : "hidden"}>مسح</button>
      </form>
      <nav class="verse-actions" aria-label="أقسام المصحف">
        <a class="button button-secondary" href="#/quran" data-action="index" data-nav="index">فهرس السور</a>
        <a class="button button-secondary" href="#/quran?mode=bookmarks" data-action="bookmarks" data-nav="bookmarks">${icon("bookmark")}<span>العلامات</span></a>
        ${resumeMarkup()}
      </nav>
    </header>
    ${
      route.sura != null && !byNumber.has(requestedSura)
        ? '<p class="notice" role="status">رقم السورة غير متاح؛ اختر سورة من الفهرس.</p>'
        : ""
    }
    <div data-quran-body aria-busy="false"></div>
    <footer class="muted panel"><p>مصدر نص القرآن: <a href="https://tanzil.net/" target="_blank" rel="noopener noreferrer" dir="ltr">Tanzil</a>.</p>
      ${ctx.data.source?.copyrightNotice ? `<p class="small" dir="auto">${esc(ctx.data.source.copyrightNotice)}</p>` : ""}
      <p>النص القرآني معروض كما ورد من المصدر. موضع القراءة والعلامات تُحفظ محليًا على هذا الجهاز.</p></footer>
  </section>`;
  container.addEventListener("click", onClick);
  container.addEventListener("input", onInput);
  container.addEventListener("submit", handleSubmit);
  container.addEventListener("keydown", handleKeydown);
  renderBody(state.mode === "reading" && requestedAyah != null);
  return cleanup;
}
