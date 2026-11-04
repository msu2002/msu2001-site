import {
  VERSION,
  store,
  validateSettings,
  loadQuran,
  icon,
  paintIcons,
  escapeHTML,
  normalizeArabic,
  arabicNum,
  notify,
  openDialog,
  setupDialog,
} from "./core.js";
import { createAudioPlayer } from "./audio.js";
import { renderQuran } from "./quran.js";
import { renderHome } from "./home.js";
import {
  renderPrayer,
  renderDhikr,
  renderQibla,
  renderTasbih,
  getPrayerSummary,
} from "./worship.js";
import { renderSettings } from "./settings.js";

const settings = validateSettings(store.get("settings", {}));
const main = document.getElementById("main-content");
let cleanup;
let renderToken = 0;
let audioPlayer;
let sourcePromise;
const ctx = {
  settings,
  store,
  data: null,
  escape: escapeHTML,
  icon,
  num: arabicNum,
  normalize: normalizeArabic,
  notify,
  navigate(path) {
    if (location.hash === path) renderRoute();
    else location.hash = path;
  },
  saveSettings(patch) {
    Object.assign(settings, validateSettings({ ...settings, ...patch }));
    applyAppearance();
    const saved = store.set("settings", settings);
    if (!saved)
      notify(
        "تعذر حفظ الإعدادات على هذا المتصفح. ستبقى لهذه الجلسة فقط.",
        "error"
      );
    return saved;
  },
  openTafsir,
  play(sura, ayah) {
    return audioPlayer?.play(sura, ayah);
  },
  async prepareOffline() {
    if (!window.isSecureContext || !("serviceWorker" in navigator))
      throw new Error(
        "يتطلب الحفظ دون إنترنت فتح الأداة عبر HTTPS في متصفح يدعم Service Worker."
      );
    await navigator.serviceWorker.register(
      new URL("../sw.js", import.meta.url),
      { scope: new URL("../", import.meta.url).pathname }
    );
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "لم يكتمل تجهيز الحفظ. أعد المحاولة بعد التأكد من رفع كل الملفات."
              )
            ),
          25000
        )
      ),
    ]);
    const worker = registration.active;
    if (!worker) throw new Error("لم يُفعَّل الحفظ بعد. أعد فتح الصفحة.");
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        channel.port1.close();
        reject(new Error("انتهت مهلة التحقق من الملفات المحلية."));
      }, 25000);
      channel.port1.onmessage = event => {
        clearTimeout(timeout);
        channel.port1.close();
        if (event.data?.ok) resolve(event.data);
        else reject(new Error(event.data?.error || "لم يكتمل تجهيز الملفات."));
      };
      worker.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2]);
    });
  },
};

function applyAppearance() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty(
    "--reading-size",
    settings.fontSize + "px"
  );
  document
    .querySelectorAll("[data-theme]")
    .forEach(button =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.theme === settings.theme)
      )
    );
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta)
    themeMeta.content = settings.theme === "light" ? "#f4f6f5" : "#08172d";
}
function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    hour12: true,
  }).format(date);
}
function countdown(date) {
  let seconds = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  return [h, Math.floor(seconds / 60), seconds % 60]
    .map(n => String(n).padStart(2, "0"))
    .join(":");
}
function heading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><span class="eyebrow">المصحف · قراءة وذكر</span><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
}
function routeParts() {
  const raw = location.hash.slice(1) || "/home";
  const [path, query = ""] = raw.split("?");
  return {
    route: path.replace(/^\//, ""),
    params: Object.fromEntries(new URLSearchParams(query)),
  };
}
async function renderRoute() {
  if (!ctx.data) return;
  const token = ++renderToken;
  if (typeof cleanup === "function") cleanup();
  cleanup = undefined;
  const { route, params } = routeParts();
  ctx.routeParams = params;
  const navRoute = ["qibla"].includes(route)
    ? "prayer"
    : ["tasbih"].includes(route)
      ? "dhikr"
      : ["more", "quiz"].includes(route)
        ? "home"
        : route;
  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === navRoute)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${{ home: "الرئيسية", quran: "القرآن الكريم", prayer: "مواقيت الصلاة", dhikr: "الأذكار", settings: "الإعدادات", qibla: "اتجاه القبلة", tasbih: "المسبحة", more: "المزيد", quiz: "معرفة السور" }[route] || "المصحف"} — المصحف`;
  window.scrollTo({ top: 0, behavior: "instant" });
  main.innerHTML =
    '<div class="loading-state" role="status"><span class="loading-ring"></span><p>تحميل…</p></div>';
  const view = document.createElement("div");
  view.dataset.view = route;
  view.classList.toggle(
    "continuous",
    route === "quran" && settings.readingMode === "continuous"
  );
  main.replaceChildren(view);
  try {
    const views = {
      home: renderHome,
      quran: renderQuran,
      prayer: renderPrayer,
      dhikr: renderDhikr,
      settings: renderSettings,
      qibla: renderQibla,
      tasbih: renderTasbih,
      more: renderMore,
      quiz: renderQuiz,
    };
    if (!views[route]) {
      main.innerHTML = `<div class="empty-state"><h1>الصفحة غير موجودة</h1><p>اختر أحد تبويبات المصحف.</p><a class="button" href="#/home">الرئيسية</a></div>`;
      return;
    }
    const nextCleanup = await views[route](view, {
      ...ctx,
      routeParams: params,
    });
    if (token !== renderToken) {
      if (typeof nextCleanup === "function") nextCleanup();
      return;
    }
    cleanup = nextCleanup;
    audioPlayer?.refreshHighlight();
  } catch (error) {
    if (token !== renderToken) return;
    main.innerHTML = `<div class="empty-state">${icon("info")}<h2>تعذر فتح هذا القسم</h2><p>${escapeHTML(error.message || "أعد المحاولة بعد التأكد من الملفات والاتصال.")}</p><button class="button" id="retry-view">أعد المحاولة</button></div>`;
    document.getElementById("retry-view").onclick = renderRoute;
  }
}

async function tafsirSource() {
  if (!sourcePromise)
    sourcePromise = fetch(
      new URL("../data/tafsir-source.json", import.meta.url)
    )
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  return (
    (await sourcePromise) || {
      key: "arabic_moyassar",
      title: "التفسير الميسر",
      version: null,
      sourceUrl: "https://quranenc.com",
    }
  );
}
async function openTafsir(sura, ayah) {
  sura = Number(sura);
  ayah = Number(ayah);
  const verse = ctx.data.surahs[sura - 1]?.ayahs[ayah - 1];
  if (!verse) return;
  const controller = new AbortController();
  let active = true;
  openDialog(
    `${ctx.data.surahs[sura - 1].name} · الآية ${arabicNum(ayah)}`,
    `<div class="tafsir-verse">${escapeHTML(verse.text)}</div><div id="tafsir-body" role="status"><span class="loading-ring"></span><p class="muted">تحميل التفسير من QuranEnc…</p></div>`,
    () => () => {
      active = false;
      controller.abort();
    }
  );
  const holder = document.getElementById("tafsir-body");
  const source = await tafsirSource();
  const key = `tafsir:${source.key}:${sura}:${ayah}`;
  const cached = store.get(key, null);
  let result;
  let offline = false;
  let savedLocally = false;
  try {
    if (!navigator.onLine && cached) {
      result = cached;
      offline = true;
      savedLocally = true;
    } else {
      const timeout = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(
          `https://quranenc.com/api/v1/translation/aya/${source.key}/${sura}/${ayah}`,
          { signal: controller.signal, referrerPolicy: "no-referrer" }
        );
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error("المصدر غير متاح الآن.");
      const payload = await response.json();
      const remote = payload.result || payload;
      if (
        Number(remote.sura) !== sura ||
        Number(remote.aya) !== ayah ||
        typeof remote.translation !== "string"
      )
        throw new Error("رد التفسير لا يطابق الآية المحددة.");
      result = {
        ...remote,
        fetchedAt: new Date().toISOString(),
        version: source.version,
        title: source.title,
      };
      savedLocally = store.set(key, result);
    }
    if (!active) return;
    // Remote text is rendered as text only, never as executable HTML.
    holder.innerHTML =
      '<div class="tafsir-text"></div><div class="tafsir-footnotes muted small"></div><p class="tafsir-source"></p>';
    holder.querySelector(".tafsir-text").textContent = result.translation;
    holder.querySelector(".tafsir-footnotes").textContent =
      result.footnotes || "";
    const versionLabel = result.version || source.version;
    holder.querySelector(".tafsir-source").innerHTML =
      `${escapeHTML(result.title || source.title)} · ${escapeHTML(source.publisher || "الناشر وفق QuranEnc")} · <a href="https://quranenc.com" target="_blank" rel="noopener noreferrer">QuranEnc</a> · ${versionLabel ? `الإصدار ${escapeHTML(versionLabel)}` : "الإصدار غير محدد في الرد"}${offline ? " · نسخة محفوظة، قد يكون المصدر قد حدّثها" : " · من المصدر المباشر"}<br>${savedLocally ? "حُفظ" : "جُلب دون حفظ محلي"} بتاريخ ${escapeHTML(result.fetchedAt?.slice(0, 10) || "غير محدد")} · لا يعد التفسير نص القرآن.`;
  } catch (error) {
    if (!active) return;
    if (cached) {
      holder.innerHTML =
        '<div class="notice">تعذر الاتصال بالمصدر. نعرض نسخة محفوظة؛ راجع المصدر للتحديث.</div><div class="tafsir-text"></div><p class="tafsir-source"></p>';
      holder.querySelector(".tafsir-text").textContent = cached.translation;
      holder.querySelector(".tafsir-source").textContent =
        `${cached.title || source.title} — QuranEnc — ${cached.version ? `الإصدار ${cached.version}` : "إصدار غير محدد"} — حُفظ ${cached.fetchedAt?.slice(0, 10) || ""}`;
    } else {
      holder.innerHTML = `<div class="notice error">لم يتوفر تفسير محفوظ لهذه الآية. التفسير يحتاج إنترنت عند أول فتح.</div><div class="form-actions"><button class="button" id="tafsir-retry">إعادة المحاولة</button><a class="button button-secondary" href="https://quranenc.com/ar/browse/arabic_moyassar/${sura}#${ayah}" target="_blank" rel="noopener noreferrer">فتح المصدر ${icon("external")}</a></div>`;
      document
        .getElementById("tafsir-retry")
        .addEventListener("click", () => openTafsir(sura, ayah));
    }
  }
}

function renderMore(container) {
  const tools = [
    [
      "#/qibla",
      "compass",
      "اتجاه القبلة",
      "حساب الاتجاه وطلب الحساس عند توفره",
    ],
    ["#/tasbih", "beads", "المسبحة", "عداد محلي بهدف تختاره"],
    ["#/quiz", "star", "معرفة السور", "أسئلة من بيانات المصحف المرفقة"],
    [
      "#/quran?mode=bookmarks",
      "bookmark",
      "العلامات المرجعية",
      "مواضع محفوظة على هذا المتصفح",
    ],
    [
      "https://quranenc.com/ar/home",
      "book",
      "موسوعة القرآن",
      "مصدر خارجي للتفسير والترجمات",
    ],
    [
      "https://binbaz.org.sa/",
      "external",
      "فتاوى ابن باز",
      "فتح الموقع الرسمي خارج الأداة",
    ],
    [
      "https://mp3quran.net/ar",
      "headphones",
      "مكتبة التلاوات والراديو",
      "خدمة خارجية عبر الإنترنت",
    ],
    [
      "https://dorar.net/",
      "book",
      "موسوعة الحديث",
      "مصدر خارجي للتحقق والمطالعة",
    ],
  ];
  container.innerHTML =
    heading("المزيد", "أدوات داخلية، وروابط مصادر موثوقة تظهر بوصفها خارجية.") +
    `<div class="more-list">${tools.map(([url, name, title, sub]) => `<a class="more-link" href="${escapeHTML(url)}" ${url.startsWith("https:") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${icon(name)}<div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(sub)}</small></div></a>`).join("")}</div><div class="notice" style="margin-top:20px">الموسوعة التاريخية والخطب والفتاوى والراديو ليست قاعدة محتوى محلية مضمّنة. الروابط تفتح خدماتها الخارجية؛ لا يدّعي هذا الإصدار أنه نسخة رسمية أو مطابق لكل صلاحيات تطبيق أندرويد.</div>`;
}

function renderQuiz(container) {
  const suras = ctx.data.surahs;
  const questions = [
    {
      question: "كم عدد سور القرآن الكريم؟",
      choices: [110, 112, 114, 120],
      answer: 114,
      note: "الفهرس المرفق يحتوي ١١٤ سورة.",
    },
    {
      question: "كم عدد آيات سورة الفاتحة وفق عدّ المصدر؟",
      choices: [5, 6, 7, 8],
      answer: suras[0].ayahs.length,
      note: "من بيانات سورة الفاتحة المرفقة.",
    },
    {
      question: "ما ترتيب سورة الإخلاص في المصحف؟",
      choices: [109, 110, 112, 114],
      answer: 112,
      note: "سورة الإخلاص هي السورة رقم ١١٢.",
    },
    {
      question: "كم عدد آيات سورة الكوثر وفق عدّ المصدر؟",
      choices: [3, 4, 5, 6],
      answer: suras[107].ayahs.length,
      note: "من بيانات سورة الكوثر المرفقة.",
    },
    {
      question: "ما ترتيب سورة البقرة في المصحف؟",
      choices: [1, 2, 3, 4],
      answer: 2,
      note: "سورة البقرة هي السورة الثانية.",
    },
  ];
  let questionIndex = 0;
  let score = 0;
  function draw() {
    if (questionIndex >= questions.length) {
      container.innerHTML =
        heading(
          "معرفة السور",
          "أسئلة تعريفية من بيانات المصحف، وليست اختبارًا للإيمان أو للحفظ."
        ) +
        `<div class="panel tasbih-panel">${icon("star")}<h2>انتهت الجولة</h2><div class="tasbih-count">${arabicNum(score)} / ${arabicNum(questions.length)}</div><p class="muted">يمكنك مراجعة أسماء السور وعدد آياتها من الفهرس.</p><div class="form-actions"><button class="button" id="quiz-restart">جولة جديدة</button><a class="button button-secondary" href="#/quran">افتح الفهرس</a></div></div>`;
      document.getElementById("quiz-restart").onclick = () => {
        questionIndex = 0;
        score = 0;
        draw();
      };
      return;
    }
    const q = questions[questionIndex];
    container.innerHTML =
      heading(
        "معرفة السور",
        `السؤال ${arabicNum(questionIndex + 1)} من ${arabicNum(questions.length)}`
      ) +
      `<div class="panel"><h2>${escapeHTML(q.question)}</h2><div class="quiz-options">${q.choices.map(value => `<button class="button button-secondary" data-answer="${value}">${arabicNum(value)}</button>`).join("")}</div><div id="quiz-feedback" class="quiz-result" role="status"></div></div>`;
    let answered = false;
    container.querySelectorAll("[data-answer]").forEach(button =>
      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = Number(button.dataset.answer) === q.answer;
        if (correct) score++;
        container.querySelectorAll("[data-answer]").forEach(b => {
          b.disabled = true;
          if (Number(b.dataset.answer) === q.answer)
            b.classList.add("button-gold");
        });
        document.getElementById("quiz-feedback").innerHTML =
          `<p class="${correct ? "accent" : "gold"}">${correct ? "إجابة صحيحة." : `الإجابة الصحيحة: ${arabicNum(q.answer)}.`} ${escapeHTML(q.note)}</p><button class="button" id="quiz-next" style="margin-top:16px">${questionIndex === questions.length - 1 ? "عرض النتيجة" : "السؤال التالي"}</button>`;
        document.getElementById("quiz-next").onclick = () => {
          questionIndex++;
          draw();
        };
      })
    );
  }
  draw();
}

function updateConnection() {
  const offline = !navigator.onLine;
  document.body.classList.toggle("offline", offline);
  document.getElementById("connection-status").hidden = !offline;
}
async function init() {
  paintIcons();
  setupDialog();
  applyAppearance();
  updateConnection();
  document
    .querySelectorAll("[data-theme]")
    .forEach(button =>
      button.addEventListener("click", () =>
        ctx.saveSettings({ theme: button.dataset.theme })
      )
    );
  document
    .getElementById("global-search")
    .addEventListener("click", () => ctx.navigate("#/quran?mode=search"));
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  try {
    ctx.data = await loadQuran();
    audioPlayer = createAudioPlayer(ctx);
    await renderRoute();
    if (store.failed)
      notify(
        "التخزين المحلي غير متاح. لن تحفظ العلامات والإعدادات بعد إغلاق المتصفح.",
        "error"
      );
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register(new URL("../sw.js", import.meta.url), {
          scope: new URL("../", import.meta.url).pathname,
        })
        .catch(() => {});
  } catch (error) {
    main.innerHTML = `<div class="empty-state">${icon("info")}<h1>تعذر تحميل المصحف</h1><p>${escapeHTML(error.message)}</p><p class="muted small">افتح الأداة من خادم HTTP/HTTPS؛ فتح ملف HTML مباشرة من تطبيق الملفات لا يحمّل وحدات JavaScript.</p><button class="button" id="retry-init">إعادة المحاولة</button></div>`;
    document.getElementById("retry-init").onclick = () => location.reload();
  }
}
init();
