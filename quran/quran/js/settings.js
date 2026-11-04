import { isValidReciter } from "./reciters.js";
import { mountReciterPicker } from "./reciter-picker.js";
import {
  DEFAULT_SETTINGS,
  store,
  validateSettings,
  validatedBookmarks,
  downloadJSON,
  VERSION,
} from "./core.js";

// This envelope deliberately accepts only this tool's Quran data, never a storage dump.
const BACKUP_APP = "quran-tool";
const BACKUP_SCHEMA = "quran-tool-backup:v1";
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const CITY_IDS = [
  "rass",
  "riyadh",
  "makkah",
  "madinah",
  "jeddah",
  "dammam",
  "cairo",
  "dubai",
  "custom",
];
const CITY_LABELS = {
  rass: "الرس",
  riyadh: "الرياض",
  makkah: "مكة",
  madinah: "المدينة",
  jeddah: "جدة",
  dammam: "الدمام",
  cairo: "القاهرة",
  dubai: "دبي",
  custom: "موقع مخصص",
};
const METHODS = {
  UmmAlQura: "أم القرى",
  MuslimWorldLeague: "رابطة العالم الإسلامي",
  Egyptian: "الهيئة المصرية العامة للمساحة",
};

function exactKeys(value, keys, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${label}: البنية غير صالحة.`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some(key => !keys.includes(key))
  ) {
    throw new Error(`${label}: توجد حقول ناقصة أو غير مسموح بها.`);
  }
}

function isoDate(value, label, allowTimestamp = false) {
  if (
    allowTimestamp &&
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 253402300799999
  ) {
    return new Date(value).toISOString();
  }
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    throw new Error(`${label}: التاريخ غير صالح.`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value)
    throw new Error(`${label}: التاريخ غير صالح.`);
  return value;
}

function strictSettings(value) {
  exactKeys(value, Object.keys(DEFAULT_SETTINGS), "الإعدادات");
  if (
    !["light", "dark"].includes(value.theme) ||
    !Number.isInteger(value.fontSize) ||
    value.fontSize < 22 ||
    value.fontSize > 46 ||
    !["verses", "continuous"].includes(value.readingMode) ||
    !isValidReciter(value.reciter) ||
    !CITY_IDS.includes(value.city) ||
    !Object.hasOwn(METHODS, value.method) ||
    !["Shafi", "Hanafi"].includes(value.madhab)
  ) {
    throw new Error("الإعدادات تتضمن قيمة غير مدعومة.");
  }
  if (value.location !== null) {
    exactKeys(value.location, ["lat", "lon", "name", "timeZone"], "الموقع");
    const { lat, lon, name, timeZone } = value.location;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      typeof timeZone !== "string" ||
      !timeZone.trim() ||
      timeZone.length > 100
    ) {
      throw new Error("إعدادات الموقع غير صالحة.");
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
    } catch {
      throw new Error("المنطقة الزمنية في الإعدادات غير صالحة.");
    }
  } else if (value.city === "custom") {
    throw new Error("الموقع المخصص يحتاج إحداثيات ومنطقة زمنية صحيحة.");
  }
  return validateSettings(value);
}

function versePosition(value, data, label) {
  exactKeys(value, ["sura", "ayah"], label);
  if (
    !Number.isInteger(value.sura) ||
    !Number.isInteger(value.ayah) ||
    value.sura < 1 ||
    value.sura > 114 ||
    value.ayah < 1 ||
    !data.surahs[value.sura - 1]?.ayahs[value.ayah - 1]
  ) {
    throw new Error(`${label}: السورة أو الآية غير موجودة.`);
  }
  return { sura: value.sura, ayah: value.ayah };
}

function strictBookmarks(entries, data, local = false) {
  if (!Array.isArray(entries) || entries.length > 6236)
    throw new Error("قائمة العلامات غير صالحة أو أكبر من الحد المسموح.");
  const checked = entries.map(entry => {
    exactKeys(entry, ["sura", "ayah", "createdAt"], "العلامة");
    const position = versePosition(
      { sura: entry.sura, ayah: entry.ayah },
      data,
      "العلامة"
    );
    return {
      ...position,
      createdAt: isoDate(entry.createdAt, "تاريخ العلامة", local),
    };
  });
  return validatedBookmarks(checked, data);
}

function validateBackup(value, data) {
  exactKeys(
    value,
    [
      "app",
      "schema",
      "version",
      "exportedAt",
      "bookmarks",
      "progress",
      "settings",
    ],
    "ملف النسخة"
  );
  if (
    value.app !== BACKUP_APP ||
    value.schema !== BACKUP_SCHEMA ||
    value.version !== VERSION
  ) {
    throw new Error(
      "هذا الملف ليس نسخة متوافقة من أداة القرآن؛ لا يمكن استيراد ملفات التطبيقات الأخرى."
    );
  }
  isoDate(value.exportedAt, "تاريخ النسخة");
  // Validate every section even when its optional import checkbox is off. No writes here.
  return {
    bookmarks: strictBookmarks(value.bookmarks, data),
    progress:
      value.progress === null
        ? null
        : versePosition(value.progress, data, "موضع القراءة"),
    settings: strictSettings(value.settings),
  };
}

export function renderSettings(container, ctx) {
  const storage = ctx.store || store;
  const e = value => ctx.escape(String(value ?? ""));
  const n = value => e(ctx.num ? ctx.num(value) : value);
  const icon = name => (typeof ctx.icon === "function" ? ctx.icon(name) : "");
  const secure = globalThis.isSecureContext === true;
  const nav = globalThis.navigator;
  const canOffline =
    secure &&
    !!nav &&
    "serviceWorker" in nav &&
    typeof ctx.prepareOffline === "function";
  const canPersist = secure && typeof nav?.storage?.persist === "function";
  let alive = true;
  let busy = false;
  let offlineBusy = false;
  let persistBusy = false;
  const current = validateSettings(ctx.settings);
  const options = (entries, selected) =>
    entries
      .map(
        ([value, label]) =>
          `<option value="${e(value)}"${value === selected ? " selected" : ""}>${e(label)}</option>`
      )
      .join("");

  container.innerHTML = `<div class="page-heading"><div><span class="eyebrow">المصحف · تفضيلاتك على جهازك</span><h1>الإعدادات</h1><p>خصّص القراءة واحفظ نسخة من علاماتك وتقدمك.</p></div><span class="pill">${e(VERSION)}</span></div>
    <div class="notice" data-storage-warning role="alert" hidden>تعذر الوصول إلى التخزين المحلي أو الحفظ فيه. قد تبقى التغييرات لهذه الجلسة فقط؛ لا تعتمد عليها قبل تصدير نسخة.</div>
    <div class="settings-layout">
      <div>
        <section class="panel settings-section" aria-labelledby="qsettings-reading-title">
          <h2 id="qsettings-reading-title">${icon("settings")} القراءة والمظهر</h2>
          <div class="setting-row"><div><label for="qsettings-theme"><strong>المظهر</strong></label><small>مظهر فاتح أو داكن</small></div><select id="qsettings-theme" class="select" data-setting="theme">${options(
            [
              ["light", "فاتح"],
              ["dark", "داكن"],
            ],
            current.theme
          )}</select></div>
          <div class="setting-row"><div><label for="qsettings-font"><strong>حجم خط الآيات</strong></label><small><output data-font-value for="qsettings-font">${n(current.fontSize)}</output> بكسل · من ${n(22)} إلى ${n(46)}</small></div><input id="qsettings-font" type="range" min="22" max="46" step="1" value="${e(current.fontSize)}" data-setting="fontSize"></div>
          <div class="setting-row"><div><label for="qsettings-mode"><strong>طريقة القراءة</strong></label><small>آيات منفصلة أو نص متصل</small></div><select id="qsettings-mode" class="select" data-setting="readingMode">${options(
            [
              ["verses", "آيات منفصلة"],
              ["continuous", "قراءة متصلة"],
            ],
            current.readingMode
          )}</select></div>
          <div class="setting-row reciter-head"><div><strong>القارئ والتلاوة</strong><small>ابحث بالاسم، وأضف المفضلين، واختر نوع التسجيل والجودة وطريقة الاستماع. يُحفظ اختيارك تلقائيًا.</small></div></div>
          <div data-reciter-host></div>
          <p class="muted" data-settings-status role="status" aria-live="polite"></p>
        </section>
        <section class="panel settings-section" aria-labelledby="qsettings-prayer-title">
          <h2 id="qsettings-prayer-title">${icon("clock")} الموقع ومواقيت الصلاة</h2>
          <p class="muted" data-prayer-summary>${e(current.location?.name || CITY_LABELS[current.city] || current.city)} · ${e(METHODS[current.method])}</p>
          <a class="button button-secondary" href="#/prayer">${icon("pin")} تعديل المدينة وطريقة الحساب</a>
          <p class="muted">المواقيت محسوبة؛ راجع تقويم المسجد المحلي. هذه الأداة لا تضمن إشعارات أو تشغيل الأذان عند إغلاق الموقع.</p>
        </section>
        <section class="panel settings-section" aria-labelledby="qsettings-backup-title">
          <h2 id="qsettings-backup-title">${icon("bookmark")} النسخ الاحتياطي</h2>
          <p class="muted">النسخة تتضمن علامات القرآن وموضع متابعة القراءة والإعدادات فقط. لا تشمل النصوص المخزنة مؤقتًا أو التلاوات أو بيانات تطبيقات أخرى. لا توجد مزامنة مع حساب.</p>
          <p class="muted" data-backup-summary></p>
          <div class="form-actions"><button type="button" class="button button-secondary" data-action="export">${icon("download")} تنزيل نسخة JSON</button></div>
          <div class="field"><label for="qsettings-import">اختيار نسخة لاستيرادها (حتى ٢ ميغابايت)</label><input id="qsettings-import" class="input full-width" type="file" accept=".json,application/json" data-backup-file></div>
          <div class="field"><label><input type="checkbox" data-import-settings> تطبيق إعدادات النسخة المستوردة</label></div>
          <div class="field"><label><input type="checkbox" data-import-progress> استبدال موضع متابعة القراءة بموضع النسخة</label></div>
          <p class="muted">تُدمج العلامات دون تكرار، وتبقى علاماتك الحالية. الإعدادات وموضع القراءة لا يتغيران إلا عند اختيار الخانة المقابلة؛ الموضع الفارغ في النسخة لا يمحو الموضع الحالي.</p>
          <div class="form-actions"><button type="button" class="button" data-action="import">${icon("upload")} التحقق والاستيراد</button><button type="button" class="button button-danger" data-action="clear">${icon("trash")} مسح العلامات وموضع القراءة</button></div>
          <p class="notice" data-backup-status role="status" aria-live="polite" hidden></p>
        </section>
      </div>
      <div>
        <section class="panel settings-section" aria-labelledby="qsettings-offline-title">
          <h2 id="qsettings-offline-title">${icon("download")} التثبيت والعمل دون إنترنت</h2>
          <p>على iPhone أو iPad: افتح الأداة في Safari، ثم «مشاركة» ← «إضافة إلى الشاشة الرئيسية». في المتصفحات الأخرى استخدم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إن ظهر في قائمة المتصفح.</p>
          <p class="muted">التثبيت وحده لا يثبت اكتمال الحفظ. تجهيز الملفات المحلية يحفظ محتوى الأداة المتاح، وليس جميع التلاوات أو كل التفاسير الخارجية. قد يمحو المتصفح بيانات الموقع؛ احتفظ بنسخة احتياطية.</p>
          ${canOffline ? `<button type="button" class="button button-secondary full-width" data-action="offline">${icon("download")} تجهيز المحتوى المحلي دون إنترنت</button>` : `<div class="notice">${!secure ? "الحفظ دون إنترنت يتطلب سياقًا آمنًا مثل HTTPS أو localhost." : !nav || !("serviceWorker" in nav) ? "هذا المتصفح لا يدعم Service Worker للحفظ دون إنترنت." : "تجهيز الملفات دون إنترنت غير متاح في هذه النسخة من الصفحة."}</div>`}
          <p class="muted" data-offline-status role="status" aria-live="polite"></p>
          <h3>تخزين المتصفح</h3>
          <p class="muted" data-persist-status role="status" aria-live="polite">جارٍ التحقق من حالة تخزين الموقع…</p>
          ${canPersist ? '<button type="button" class="button button-secondary full-width" data-action="persist">طلب الاحتفاظ ببيانات الموقع</button>' : '<p class="muted">طلب التخزين المستديم غير متاح هنا. لا يعني ذلك أن التخزين المحلي متوقف.</p>'}
        </section>
        <section class="panel settings-section" aria-labelledby="qsettings-privacy-title">
          <h2 id="qsettings-privacy-title">${icon("shield")} الخصوصية والمصادر</h2>
          <div class="source-list">
            <div class="source-item"><strong>على هذا المتصفح</strong><p>العلامات وموضع القراءة والإعدادات محفوظة محليًا. النسخة تُنزّل إلى جهازك، وملف الاستيراد يُقرأ محليًا دون رفعه إلى خادم. لا يلزم حساب.</p></div>
            <div class="source-item"><strong>الموقع الجغرافي</strong><p>يُطلب بإذنك من صفحة الصلاة، ويُستخدم ويُحفظ محليًا لحساب المواقيت والقبلة. لا ترسله الأداة إلى خدمة مواقيت أو حساب؛ قد يستخدم المتصفح أو نظام التشغيل خدمة الموقع الخاصة به.</p></div>
            <div class="source-item"><strong>مصادر خارجية عند الطلب</strong><p>عند فتح التفسير تتصل الأداة بـ QuranEnc، وعند الاستماع تتصل بـ EveryAyah. يمكن أن ترى هذه الخدمات عنوان IP وبيانات طلب الاتصال، وتطبق سياسات الخصوصية الخاصة بها.</p><a href="https://quranenc.com" target="_blank" rel="noopener noreferrer">QuranEnc</a> · <a href="https://everyayah.com" target="_blank" rel="noopener noreferrer">EveryAyah</a></div>
            <div class="source-item"><strong>توثيق المصادر</strong><p><a href="./docs/SOURCES-AR.md" target="_blank" rel="noopener noreferrer">قراءة المصادر والقيود بالعربية</a></p><a href="./docs/SOURCES-AR.md" download="SOURCES-AR.md">تنزيل توثيق المصادر</a></div>
          </div>
          <p class="notice">الإصدار ${e(VERSION)} أداة ويب مستقلة، وليس تطبيق أندرويد الرسمي ولا تابعًا له، ولا يدّعي مطابقة جميع ميزاته أو صلاحياته.</p>
        </section>
      </div>
    </div>`;

  const find = selector => container.querySelector(selector);
  function report(selector, message, error = false, toast = true) {
    if (!alive) return;
    const node = find(selector);
    if (node) {
      node.hidden = false;
      node.textContent = message;
      node.setAttribute("role", error ? "alert" : "status");
      node.classList.toggle("error", error);
    }
    if (toast && typeof ctx.notify === "function")
      ctx.notify(message, error ? "error" : "info");
  }
  function storageWarning() {
    if (alive) find("[data-storage-warning]").hidden = false;
  }
  function assertStorage() {
    if (storage.failed) {
      storageWarning();
      throw new Error(
        "التخزين المحلي غير متاح أو فشل في قراءة البيانات؛ لم يتم تأكيد الحفظ."
      );
    }
  }
  function read(key, fallback) {
    try {
      const result = storage.get(key, fallback);
      assertStorage();
      return result ?? fallback;
    } catch (error) {
      storageWarning();
      throw error;
    }
  }
  async function write(key, value, remove = false) {
    try {
      const result = await (remove
        ? storage.remove(key)
        : storage.set(key, value));
      if (result === false)
        throw new Error("تعذر حفظ البيانات على هذا المتصفح.");
      assertStorage();
    } catch (error) {
      storageWarning();
      throw error;
    }
  }
  function summary() {
    if (!alive) return;
    try {
      const marks = strictBookmarks(read("bookmarks", []), ctx.data, true);
      const raw = read("progress", null);
      const progress =
        raw === null
          ? null
          : versePosition(raw, ctx.data, "موضع القراءة المحلي");
      find("[data-backup-summary]").textContent =
        `${ctx.num ? ctx.num(marks.length) : marks.length} علامة محفوظة${progress ? ` · متابعة القراءة: سورة ${ctx.num ? ctx.num(progress.sura) : progress.sura}، آية ${ctx.num ? ctx.num(progress.ayah) : progress.ayah}` : " · لا يوجد موضع قراءة محفوظ"}.`;
    } catch (error) {
      find("[data-backup-summary]").textContent =
        error.message || "تعذر قراءة البيانات المحلية.";
    }
  }
  function refreshControls() {
    if (!alive) return;
    const settings = validateSettings(ctx.settings);
    container.querySelectorAll("[data-setting]").forEach(node => {
      node.value = String(settings[node.dataset.setting]);
    });
    find("[data-font-value]").textContent = ctx.num
      ? ctx.num(settings.fontSize)
      : String(settings.fontSize);
    find("[data-prayer-summary]").textContent =
      `${settings.location?.name || CITY_LABELS[settings.city] || settings.city} · ${METHODS[settings.method]}`;
  }
  async function saveSettings(patch) {
    try {
      const next = strictSettings({
        ...validateSettings(ctx.settings),
        ...patch,
      });
      const result = await ctx.saveSettings(next);
      if (result === false)
        throw new Error("تعذر حفظ الإعدادات؛ قد تبقى لهذه الجلسة فقط.");
      assertStorage();
      Object.assign(ctx.settings, next);
      refreshControls();
    } catch (error) {
      storageWarning();
      throw error;
    }
  }
  function setBackupBusy(value) {
    busy = value;
    if (!alive) return;
    container
      .querySelectorAll(
        '[data-action="export"], [data-action="import"], [data-action="clear"], [data-backup-file], [data-import-settings], [data-import-progress], [data-setting]'
      )
      .forEach(node => {
        node.disabled = value;
      });
  }
  async function transaction(operations, importedSettings) {
    // Snapshot only the keys being touched; rollback is best effort, not a localStorage-wide reset.
    const snapshots = operations.map(operation => ({
      key: operation.key,
      value: read(operation.key, null),
    }));
    if (importedSettings)
      snapshots.push({ key: "settings", value: read("settings", null) });
    const oldSettings = { ...ctx.settings };
    try {
      for (const operation of operations)
        await write(operation.key, operation.value, operation.remove);
      if (importedSettings) await saveSettings(importedSettings);
    } catch (error) {
      let rollbackFailed = false;
      for (const snapshot of snapshots) {
        try {
          const result = await (snapshot.value === null
            ? storage.remove(snapshot.key)
            : storage.set(snapshot.key, snapshot.value));
          if (result === false) rollbackFailed = true;
        } catch {
          rollbackFailed = true;
        }
      }
      if (importedSettings) {
        Object.assign(ctx.settings, oldSettings);
        // Restore appearance through the same application contract, when possible.
        try {
          const result = await ctx.saveSettings(oldSettings);
          if (result === false) rollbackFailed = true;
        } catch {
          rollbackFailed = true;
        }
        refreshControls();
      }
      storageWarning();
      throw new Error(
        `${error.message || "فشل الحفظ."} ${rollbackFailed ? "تعذر استرجاع بعض القيم؛ تحقق من بياناتك قبل المتابعة." : "جرت محاولة استرجاع القيم السابقة."}`
      );
    }
  }
  function exportBackup() {
    const payload = {
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      bookmarks: strictBookmarks(read("bookmarks", []), ctx.data, true),
      progress: read("progress", null),
      settings: strictSettings(validateSettings(ctx.settings)),
    };
    validateBackup(payload, ctx.data);
    if (new Blob([JSON.stringify(payload, null, 2)]).size > MAX_BACKUP_BYTES)
      throw new Error("النسخة أكبر من الحد المسموح (٢ ميغابايت).");
    // Keep download synchronous in the explicit click gesture; never export automatically.
    downloadJSON(
      `quran-tool-backup-${payload.exportedAt.slice(0, 10)}.json`,
      payload
    );
    report(
      "[data-backup-status]",
      "أُرسل ملف النسخة إلى تنزيلات المتصفح. احتفظ به في مكان آمن؛ قد يتضمن موقعك المحفوظ."
    );
  }
  async function importBackup() {
    const file = find("[data-backup-file]").files?.[0];
    if (!file) throw new Error("اختر ملف نسخة JSON أولًا.");
    if (!file.size || file.size > MAX_BACKUP_BYTES)
      throw new Error("الملف فارغ أو أكبر من الحد المسموح (٢ ميغابايت).");
    const applySettings = find("[data-import-settings]").checked;
    const applyProgress = find("[data-import-progress]").checked;
    const text = await file.text();
    if (!alive) return;
    if (new Blob([text]).size > MAX_BACKUP_BYTES)
      throw new Error("حجم محتوى الملف تجاوز ٢ ميغابايت.");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        "خطأ في قراءة JSON: الملف تالف أو ليس JSON صالحًا. لم تُغيّر أي بيانات."
      );
    }
    const backup = validateBackup(parsed, ctx.data);
    const existing = strictBookmarks(read("bookmarks", []), ctx.data, true);
    const seen = new Set();
    const unique = [...existing, ...backup.bookmarks].filter(entry => {
      const key = `${entry.sura}:${entry.ayah}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const merged = validatedBookmarks(unique, ctx.data);
    const operations = [
      {
        key: "bookmarks",
        value: merged.map(entry => ({
          ...entry,
          createdAt: Date.parse(entry.createdAt),
        })),
      },
    ];
    if (applyProgress && backup.progress)
      operations.push({ key: "progress", value: backup.progress });
    await transaction(operations, applySettings ? backup.settings : null);
    if (!alive) return;
    find("[data-backup-file]").value = "";
    summary();
    const added = merged.length - existing.length;
    report(
      "[data-backup-status]",
      `اكتمل الاستيراد: أُضيفت ${ctx.num ? ctx.num(added) : added} علامة جديدة دون حذف علاماتك.${applySettings ? " طُبقت إعدادات النسخة." : " بقيت إعداداتك الحالية."}${applyProgress && backup.progress ? " حُدّث موضع القراءة." : " بقي موضع القراءة الحالي."}`
    );
  }
  async function clearReadingData() {
    if (
      !globalThis.confirm(
        "هل تريد مسح جميع علامات القرآن وموضع متابعة القراءة من هذا المتصفح؟ ستبقى الإعدادات والنصوص المخزنة مؤقتًا دون تغيير."
      )
    )
      return;
    await transaction([
      { key: "bookmarks", remove: true },
      { key: "progress", remove: true },
    ]);
    summary();
    report(
      "[data-backup-status]",
      "مُسحت العلامات وموضع القراءة فقط. بقيت الإعدادات والنصوص المخزنة مؤقتًا."
    );
  }
  async function offline(button) {
    if (!canOffline || offlineBusy) return;
    offlineBusy = true;
    button.disabled = true;
    report(
      "[data-offline-status]",
      "جارٍ تجهيز الملفات المحلية والتحقق منها…",
      false,
      false
    );
    try {
      const result = await ctx.prepareOffline();
      if (!alive) return;
      if (
        result?.available !== true ||
        !Number.isInteger(result.files) ||
        result.files < 1
      )
        throw new Error(
          "لم تؤكد الأداة اكتمال الملفات. لا يمكن ضمان العمل دون إنترنت."
        );
      const bytes =
        Number.isFinite(result.bytes) && result.bytes >= 0
          ? ` · ${ctx.num ? ctx.num(Math.round(result.bytes / 1024)) : Math.round(result.bytes / 1024)} كيلوبايت`
          : "";
      report(
        "[data-offline-status]",
        `تم التحقق من ${ctx.num ? ctx.num(result.files) : result.files} ملف محلي${bytes}. التلاوات والتفاسير الخارجية ليست مشمولة بالكامل. اختبر فتح الأداة بعد فصل الاتصال.`
      );
    } catch (error) {
      report(
        "[data-offline-status]",
        error.message || "تعذر تجهيز المحتوى دون إنترنت.",
        true
      );
    } finally {
      offlineBusy = false;
      if (alive) button.disabled = false;
    }
  }
  async function storageState() {
    try {
      if (typeof nav?.storage?.persisted !== "function") {
        report(
          "[data-persist-status]",
          "لا يتيح المتصفح معرفة حالة التخزين المستديم. قد تُزال البيانات عند تنظيف الموقع أو في التصفح الخاص.",
          false,
          false
        );
        return;
      }
      const persisted = await nav.storage.persisted();
      let detail = "";
      if (typeof nav.storage.estimate === "function") {
        try {
          const estimate = await nav.storage.estimate();
          if (Number.isFinite(estimate.usage) && estimate.usage >= 0)
            detail = ` الاستخدام التقريبي للموقع: ${ctx.num ? ctx.num(Math.round(estimate.usage / 1024)) : Math.round(estimate.usage / 1024)} كيلوبايت (قد يشمل بيانات أخرى على النطاق).`;
        } catch {
          /* Optional estimate does not change the persistence result. */
        }
      }
      report(
        "[data-persist-status]",
        `${persisted ? "التخزين المستديم مفعّل للموقع؛ لا يغني عن النسخ الاحتياطي." : "التخزين غير مستديم حاليًا؛ قد يمحو المتصفح البيانات تلقائيًا."}${detail}`,
        false,
        false
      );
      if (alive && persisted && find('[data-action="persist"]'))
        find('[data-action="persist"]').hidden = true;
    } catch {
      report(
        "[data-persist-status]",
        "تعذر التحقق من حالة تخزين المتصفح. احتفظ بنسخة احتياطية.",
        true,
        false
      );
    }
  }
  async function persist(button) {
    if (!canPersist || persistBusy) return;
    persistBusy = true;
    button.disabled = true;
    try {
      // This permission request is made only from an explicit user click.
      const granted = await nav.storage.persist();
      if (!alive) return;
      await storageState();
      if (alive)
        ctx.notify?.(
          granted
            ? "سمح المتصفح بالتخزين المستديم للموقع."
            : "لم يمنح المتصفح التخزين المستديم. يبقى النسخ الاحتياطي مهمًا.",
          granted ? "info" : "warning"
        );
    } catch {
      report(
        "[data-persist-status]",
        "تعذر طلب التخزين المستديم من المتصفح.",
        true
      );
    } finally {
      persistBusy = false;
      if (alive) button.disabled = false;
    }
  }
  async function onChange(event) {
    const control = event.target.closest?.("[data-setting]");
    if (!control || !container.contains(control) || busy) return;
    const key = control.dataset.setting;
    if (!["theme", "fontSize", "readingMode", "reciter"].includes(key)) return;
    const value = key === "fontSize" ? Number(control.value) : control.value;
    try {
      await saveSettings({ [key]: value });
      report("[data-settings-status]", "حُفظت تفضيلات القراءة.", false, false);
    } catch (error) {
      report(
        "[data-settings-status]",
        error.message || "تعذر حفظ الإعدادات.",
        true
      );
    }
  }
  function onInput(event) {
    if (event.target.matches?.('[data-setting="fontSize"]'))
      find("[data-font-value]").textContent = ctx.num
        ? ctx.num(Number(event.target.value))
        : event.target.value;
  }
  function onClick(event) {
    const button = event.target.closest?.("[data-action]");
    if (!button || !container.contains(button) || button.disabled || !alive)
      return;
    const action = button.dataset.action;
    if (action === "offline") {
      void offline(button);
      return;
    }
    if (action === "persist") {
      void persist(button);
      return;
    }
    if (busy) return;
    if (action === "export") {
      try {
        exportBackup();
      } catch (error) {
        report(
          "[data-backup-status]",
          error.message || "تعذر تنزيل النسخة.",
          true
        );
      }
      return;
    }
    if (!["import", "clear"].includes(action)) return;
    setBackupBusy(true);
    Promise.resolve()
      .then(() => (action === "import" ? importBackup() : clearReadingData()))
      .catch(error =>
        report(
          "[data-backup-status]",
          error.message || "تعذر إكمال العملية؛ تحقق من التخزين المحلي.",
          true
        )
      )
      .finally(() => setBackupBusy(false));
  }

  const reciterHost = find("[data-reciter-host]");
  if (reciterHost)
    mountReciterPicker(reciterHost, {
      ctx,
      value: current.reciter,
      onSelect: async id => {
        try {
          await saveSettings({ reciter: id });
          report("[data-settings-status]", "حُفظ اختيار القارئ.", false, false);
        } catch (error) {
          report("[data-settings-status]", error.message || "تعذر حفظ الإعدادات.", true);
        }
      },
    });
  container.addEventListener("click", onClick);
  container.addEventListener("change", onChange);
  container.addEventListener("input", onInput);
  summary();
  if (storage.failed) storageWarning();
  void storageState();
  return () => {
    if (!alive) return;
    alive = false;
    container.removeEventListener("click", onClick);
    container.removeEventListener("change", onChange);
    container.removeEventListener("input", onInput);
  };
}
