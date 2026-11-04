/* Quran website tool — shared utilities. No framework or service account required. */
export const VERSION = "1.0.0";
import { DEFAULT_RECITER, isValidReciter } from "./reciters.js";
export const STORAGE_PREFIX = "quran-tool:v1:";
export const DEFAULT_SETTINGS = Object.freeze({
  theme: "dark",
  fontSize: 30,
  city: "rass",
  location: null,
  method: "UmmAlQura",
  madhab: "Shafi",
  reciter: DEFAULT_RECITER,
  readingMode: "verses",
});

export function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]
  );
}

export function normalizeArabic(text) {
  // Only for the search index. The Quran text shown or copied is never normalized.
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export const arabicNum = number =>
  new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(number);
export function parseNumber(value) {
  return Number(
    String(value)
      .replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
      .replace(/[۰-۹]/g, c => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
  );
}

export const store = {
  failed: false,
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      this.failed = true;
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      this.failed = true;
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch {
      this.failed = true;
      return false;
    }
  },
};

export function validateSettings(input) {
  const result = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== "object") return result;
  if (["dark", "light"].includes(input.theme)) result.theme = input.theme;
  if (Number.isFinite(input.fontSize))
    result.fontSize = Math.max(22, Math.min(46, input.fontSize));
  if (typeof input.city === "string" && input.city.length < 40)
    result.city = input.city;
  if (["UmmAlQura", "MuslimWorldLeague", "Egyptian"].includes(input.method))
    result.method = input.method;
  if (["Shafi", "Hanafi"].includes(input.madhab)) result.madhab = input.madhab;
  if (isValidReciter(input.reciter)) result.reciter = input.reciter;
  if (["verses", "continuous"].includes(input.readingMode))
    result.readingMode = input.readingMode;
  const location = input.location;
  if (
    location &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lon) &&
    Math.abs(location.lat) <= 90 &&
    Math.abs(location.lon) <= 180 &&
    typeof location.timeZone === "string"
  ) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: location.timeZone });
      result.location = {
        lat: location.lat,
        lon: location.lon,
        name: String(location.name || "موقعي").slice(0, 80),
        timeZone: location.timeZone,
      };
    } catch {
      /* invalid timezone: keep manual city */
    }
  }
  return result;
}

let quranPromise;
export function loadQuran() {
  if (!quranPromise)
    quranPromise = fetch(new URL("../data/quran.json", import.meta.url))
      .then(response => {
        if (!response.ok)
          throw new Error(
            "تعذر تحميل ملف القرآن المحلي. ارفع مجلد data كاملًا، ثم أعد المحاولة."
          );
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.surahs) || data.surahs.length !== 114)
          throw new Error("ملف القرآن غير مكتمل: يلزم ١١٤ سورة.");
        let total = 0;
        data.surahs.forEach((sura, index) => {
          if (
            sura.number !== index + 1 ||
            !Array.isArray(sura.ayahs) ||
            !sura.ayahs.length
          )
            throw new Error("بنية بيانات السور غير صحيحة.");
          sura.ayahs.forEach((ayah, i) => {
            if (
              ayah.number !== i + 1 ||
              typeof ayah.text !== "string" ||
              !ayah.text.trim()
            )
              throw new Error("بنية بيانات الآيات غير صحيحة.");
          });
          total += sura.ayahs.length;
        });
        if (total !== 6236)
          throw new Error("ملف الآيات غير مكتمل وفق عدّ المصدر.");
        return data;
      })
      .catch(error => {
        quranPromise = undefined;
        throw error;
      });
  return quranPromise;
}

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  words: '<path d="M4 7h16M4 12h10M4 17h16"/><path d="m18 14 2 2 3-4"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
  moon: '<path d="M21 12.5A9 9 0 1 1 11.5 3 7 7 0 0 0 21 12.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  hand: '<path d="M5 12V9a1.5 1.5 0 0 1 3 0v3-7a1.5 1.5 0 0 1 3 0v7-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7l1-3a1.5 1.5 0 0 1 3 1l-2 7c-1 3-4 4-7 4-4 0-6-2-7-5l-2-4a1.5 1.5 0 0 1 2-2Z"/>',
  settings:
    '<path d="M5 3v5m0 4v9M12 3v10m0 4v4M19 3v2m0 4v12M2 8h6m1 9h6m1-12h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  headphones:
    '<path d="M4 15v-3a8 8 0 0 1 16 0v3M4 14H2v7h5v-7Zm16 0h2v7h-5v-7Z"/>',
  beads:
    '<circle cx="16" cy="5" r="2"/><circle cx="9" cy="7" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="15" cy="18" r="2"/><path d="m18 7 1 5-3 3m3-3 3 3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  chevron: '<path d="m14 6-6 6 6 6"/>',
  back: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M7 4v16M17 4v16" stroke-width="4"/>',
  next: '<path d="m4 5 11 7L4 19Zm15 0v14"/>',
  previous: '<path d="m20 5-11 7 11 7ZM5 5v14"/>',
  repeat:
    '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-3v5a2 2 0 0 1-2 2H3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  trash: '<path d="M3 6h18M9 3h6M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  external: '<path d="M14 3h7v7m0-7L11 13M10 3H3v18h18v-7"/>',
  shield:
    '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  refresh:
    '<path d="M20 4v6h-6M4 20v-6h6M5 8a8 8 0 0 1 14-2M19 16A8 8 0 0 1 5 18"/>',
};
const aliases = {
  location: "pin",
  map: "pin",
  tafsir: "book",
  audio: "headphones",
  dhikr: "hand",
  tasbih: "beads",
  qibla: "compass",
  left: "arrow",
  right: "back",
  menu: "grid",
  save: "bookmark",
  heart: "star",
  reset: "refresh",
  volume: "headphones",
  prayer: "moon",
  light: "sun",
  dark: "moon",
  closeCircle: "close",
};
export function icon(name) {
  const path = iconPaths[aliases[name] || name] || iconPaths.book;
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
export function paintIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(node => {
    node.innerHTML = icon(node.dataset.icon);
  });
}

let toastTimer;
export function notify(message, type = "info") {
  const node = document.getElementById("toast");
  if (!node) return;
  node.textContent = String(message);
  node.dataset.type = type;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => {
      node.hidden = true;
    },
    type === "error" ? 6500 : 3800
  );
}

let dialogCleanup;
export function openDialog(title, html, mount) {
  const dialog = document.getElementById("app-dialog");
  if (typeof dialogCleanup === "function") dialogCleanup();
  document.getElementById("dialog-title").textContent = title;
  const content = document.getElementById("dialog-content");
  content.innerHTML = html;
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  dialogCleanup = mount?.(content);
  return dialog;
}
export function setupDialog() {
  const dialog = document.getElementById("app-dialog");
  document
    .getElementById("dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    if (typeof dialogCleanup === "function") dialogCleanup();
    dialogCleanup = undefined;
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
}
export function downloadJSON(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function validatedBookmarks(entries, data) {
  if (!Array.isArray(entries) || entries.length > 6236)
    throw new Error("قائمة العلامات غير صالحة.");
  const found = new Set();
  return entries
    .map(item => {
      if (
        !Number.isInteger(item.sura) ||
        !Number.isInteger(item.ayah) ||
        !data.surahs[item.sura - 1]?.ayahs[item.ayah - 1]
      )
        throw new Error("توجد علامة تشير إلى آية غير موجودة.");
      return {
        sura: item.sura,
        ayah: item.ayah,
        createdAt:
          typeof item.createdAt === "string"
            ? item.createdAt.slice(0, 60)
            : new Date().toISOString(),
      };
    })
    .filter(item => {
      const key = `${item.sura}:${item.ayah}`;
      if (found.has(key)) return false;
      found.add(key);
      return true;
    });
}
