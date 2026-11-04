import { getPrayerSummary } from "./worship.js";

const DAILY_VERSES = [
  [1, 1],
  [1, 2],
  [2, 152],
  [20, 114],
  [94, 5],
  [94, 6],
  [112, 1],
  [113, 1],
  [114, 1],
];
function remaining(time, now) {
  let seconds = Math.max(0, Math.floor((time - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  return [hours, Math.floor(seconds / 60), seconds % 60]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}
function calendarKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function displayTime(date, timeZone) {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function renderHome(container, ctx) {
  const e = ctx.escape,
    icon = ctx.icon,
    num = ctx.num;
  let summary = null,
    lastMinute = -1,
    lastSignature = "",
    dailyLocation = [1, 1];
  function paint(now) {
    const zone = summary?.city.timeZone || "Asia/Riyadh";
    const dayKey = calendarKey(now, zone);
    const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      timeZone: zone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    const gregorian = new Intl.DateTimeFormat("ar-SA", {
      timeZone: zone,
      calendar: "gregory",
      dateStyle: "full",
    }).format(now);
    const index =
      [...dayKey].reduce((n, character) => n + character.charCodeAt(0), 0) %
      DAILY_VERSES.length;
    dailyLocation = DAILY_VERSES[index];
    const [sura, ayah] = dailyLocation;
    const daily = ctx.data.surahs[sura - 1].ayahs[ayah - 1];
    let progress = ctx.store.get("progress", null);
    if (!ctx.data.surahs[progress?.sura - 1]?.ayahs[progress?.ayah - 1])
      progress = null;
    const path = progress
      ? `#/quran?sura=${progress.sura}&ayah=${progress.ayah}`
      : "#/quran";
    let prayerHTML;
    if (summary) {
      const isTomorrow = calendarKey(summary.next.time, zone) !== dayKey;
      prayerHTML = `<div class="prayer-next"><div><small>الصلاة القادمة${isTomorrow ? " · غدًا" : ""}</small><strong>${e(summary.next.label)}</strong><small>${displayTime(summary.next.time, zone)}</small></div><span class="countdown" data-next-countdown>${remaining(summary.next.time, now)}</span></div><div class="prayer-grid">${summary.prayers
        .filter(prayer => prayer.key !== "sunrise")
        .map(
          prayer =>
            `<div class="prayer-cell ${prayer.time.getTime() === summary.next.time.getTime() ? "is-active" : ""}"><span>${e(prayer.label)}</span><strong>${displayTime(prayer.time, zone)}</strong></div>`
        )
        .join(
          ""
        )}</div><p class="prayer-note">${e(summary.methodLabel)} · ${e(summary.city.name)} · أوقات محسوبة، راجع التقويم المحلي.</p>`;
    } else {
      const error =
        getPrayerSummary(ctx.settings, now).error ||
        "اختر المدينة وطريقة الحساب لعرض المواقيت.";
      prayerHTML = `<div class="notice">${e(error)} <a href="#/prayer">مراجعة الإعدادات</a></div>`;
    }
    container.innerHTML = `<div class="home-greeting"><div><span class="eyebrow">رفيقك في القراءة والذكر</span><h1>ابدأ يومك بطمأنينة</h1><div class="home-date"><span>${e(hijri)}</span><span class="dot"></span><span>${e(gregorian)}</span></div></div><a href="#/prayer" class="pill pill-accent">${icon("pin")}${e(summary?.city.name || "اختر المدينة")}</a></div>
      <div class="home-grid">
        <section class="panel home-prayers"><div class="panel-top"><h2 class="panel-title">${icon("clock")}مواقيت الصلاة</h2><a href="#/prayer" class="button-icon" aria-label="تغيير المدينة وطريقة الحساب">${icon("settings")}</a></div>${prayerHTML}</section>
        <section class="panel daily-verse-card"><h2 class="panel-title">${icon("book")}آية اليوم</h2><p class="daily-verse">${e(daily.text)}</p><p class="verse-reference">${e(ctx.data.surahs[sura - 1].name)} · الآية ${num(ayah)}</p><div class="form-actions"><a href="#/quran?sura=${sura}&ayah=${ayah}" class="button button-outline">${icon("book")}المصحف</a><button class="button button-outline" data-home-tafsir>${icon("book")}التفسير</button><button class="button-icon" data-home-play aria-label="استمع إلى آية اليوم">${icon("play")}</button></div></section>
        <a href="#/dhikr?category=morning" class="panel shortcut-card dhikr-shortcut">${icon("sun")}<div><h2>أذكار الصباح</h2><p>ابدأ يومك بذكر الله</p></div><span class="shortcut-arrow">${icon("arrow")}</span></a>
        <a href="${path}" class="panel shortcut-card continue-shortcut">${icon("bookmark")}<div><h2>${progress ? "استكمل القراءة" : "افتح المصحف"}</h2><p>${progress ? `${e(ctx.data.surahs[progress.sura - 1].name)} · الآية ${num(progress.ayah)}` : "١١٤ سورة · النص محفوظ داخل الأداة"}</p></div><span class="shortcut-arrow">${icon("arrow")}</span></a>
        <section class="panel quick-panel"><div class="panel-top"><h2 class="panel-title">${icon("grid")}وصول سريع</h2><a href="#/more" class="button button-link">المزيد ${icon("chevron")}</a></div><div class="quick-tiles"><a class="quick-tile" href="#/quran">${icon("book")}<span>المصحف</span></a><a class="quick-tile" href="#/quran?mode=bookmarks">${icon("bookmark")}<span>علاماتي</span></a><a class="quick-tile" href="#/quran?listen=1">${icon("headphones")}<span>الاستماع</span></a><a class="quick-tile" href="#/tasbih">${icon("beads")}<span>المسبحة</span></a></div><div class="surah-shortcuts"><a href="#/quran?sura=1">الفاتحة</a><a href="#/quran?sura=2">البقرة</a><a href="#/quran?sura=3">آل عمران</a><a href="#/qibla">${icon("compass")} اتجاه القبلة</a><a href="#/quiz">معرفة السور</a></div></section>
      </div>`;
  }
  function tick() {
    const now = new Date(),
      minute = Math.floor(now.getTime() / 60000);
    if (minute !== lastMinute || (summary && summary.next.time <= now)) {
      lastMinute = minute;
      const result = getPrayerSummary(ctx.settings, now);
      summary = result.error ? null : result;
      const signature = `${calendarKey(now, summary?.city.timeZone || "Asia/Riyadh")}:${summary?.next.time.getTime() || result.error}`;
      if (signature !== lastSignature) {
        lastSignature = signature;
        paint(now);
      }
    }
    const counter = container.querySelector("[data-next-countdown]");
    if (counter && summary)
      counter.textContent = remaining(summary.next.time, now);
  }
  function action(event) {
    if (event.target.closest("[data-home-tafsir]"))
      ctx.openTafsir(...dailyLocation);
    if (event.target.closest("[data-home-play]")) ctx.play(...dailyLocation);
  }
  container.addEventListener("click", action);
  tick();
  const timer = setInterval(tick, 1000);
  const onVisibility = () => {
    if (!document.hidden) {
      lastMinute = -1;
      tick();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    clearInterval(timer);
    container.removeEventListener("click", action);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
