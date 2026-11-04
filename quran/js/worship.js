import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  Qibla,
} from "../vendor/adhan.js";

export const CITIES = Object.freeze([
  {
    id: "rass",
    name: "الرس",
    lat: 25.8697,
    lon: 43.4973,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "riyadh",
    name: "الرياض",
    lat: 24.7136,
    lon: 46.6753,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "makkah",
    name: "مكة",
    lat: 21.3891,
    lon: 39.8579,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "madinah",
    name: "المدينة",
    lat: 24.5247,
    lon: 39.5692,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "jeddah",
    name: "جدة",
    lat: 21.4858,
    lon: 39.1925,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "dammam",
    name: "الدمام",
    lat: 26.4207,
    lon: 50.0888,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "cairo",
    name: "القاهرة",
    lat: 30.0444,
    lon: 31.2357,
    timeZone: "Africa/Cairo",
  },
  {
    id: "dubai",
    name: "دبي",
    lat: 25.2048,
    lon: 55.2708,
    timeZone: "Asia/Dubai",
  },
]);
// Cairo's canonical IANA identifier is Africa/Cairo, not the nonexistent Asia/Cairo.
const METHODS = {
  UmmAlQura: "أم القرى",
  MuslimWorldLeague: "رابطة العالم الإسلامي",
  Egyptian: "الهيئة المصرية العامة للمساحة",
};
const PRAYERS = [
  ["fajr", "الفجر"],
  ["sunrise", "الشروق"],
  ["dhuhr", "الظهر"],
  ["asr", "العصر"],
  ["maghrib", "المغرب"],
  ["isha", "العشاء"],
];
const CATEGORIES = {
  morning: "أذكار الصباح",
  evening: "أذكار المساء",
  sleep: "أذكار النوم",
  general: "أذكار عامة",
};
let instanceId = 0;

function validZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone.trim())
    throw new Error("أدخل منطقة زمنية صحيحة مثل Asia/Riyadh.");
  new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
  return timeZone.trim();
}
function resolveLocation(settings = {}) {
  if (settings.location != null) {
    const value = settings.location;
    const lat = value.lat,
      lon = value.lon;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      throw new Error(
        "الإحداثيات غير صالحة. اختر مدينة أو صحّح الموقع المحفوظ."
      );
    }
    return {
      name: String(value.name || "موقعي").slice(0, 100),
      lat,
      lon,
      timeZone: validZone(value.timeZone),
    };
  }
  const city = CITIES.find(item => item.id === (settings.city || "rass"));
  if (!city) throw new Error("اختر مدينة صحيحة أو أدخل موقعاً مخصصاً.");
  return {
    name: city.name,
    lat: city.lat,
    lon: city.lon,
    timeZone: city.timeZone,
  };
}
function calendarParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const pick = type => Number(parts.find(part => part.type === type).value);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}
function dayKey(date = new Date(), timeZone) {
  const p = calendarParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
function browserZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
function prayerParameters(settings) {
  const method = settings.method || "UmmAlQura";
  const madhab = settings.madhab || "Shafi";
  if (!Object.hasOwn(METHODS, method))
    throw new Error("طريقة حساب الصلاة غير معروفة.");
  if (!["Shafi", "Hanafi"].includes(madhab))
    throw new Error("اختيار المذهب غير صحيح.");
  const parameters = CalculationMethod[method]();
  parameters.madhab = Madhab[madhab];
  return { parameters, methodLabel: METHODS[method] };
}
function calculateDay(city, date, parameters) {
  const times = new PrayerTimes(
    new Coordinates(city.lat, city.lon),
    date,
    parameters
  );
  return PRAYERS.map(([key, label]) => ({ key, label, time: times[key] }));
}
function validTimes(prayers) {
  return prayers.every(
    prayer =>
      prayer.time instanceof Date && Number.isFinite(prayer.time.getTime())
  );
}

/** Pure synchronous summary; errors are returned as {error: string}, never thrown. */
export function getPrayerSummary(settings = {}, now = new Date()) {
  try {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
      throw new Error("التاريخ المطلوب غير صالح.");
    settings = settings || {};
    const city = resolveLocation(settings);
    const { parameters, methodLabel } = prayerParameters(settings);
    const { year, month, day } = calendarParts(now, city.timeZone);
    // Adhan reads the host-local year/month/day. This Date is a calendar carrier,
    // NOT an instant representing midnight in the selected city.
    const date = new Date(year, month - 1, day);
    const prayers = calculateDay(city, date, parameters);
    if (!validTimes(prayers))
      throw new Error(
        "تعذر حساب المواقيت لهذا الموقع والتاريخ؛ راجع تقويم المسجد المحلي، خاصة في المناطق القطبية."
      );
    let nextPrayer = prayers.find(
      prayer => prayer.key !== "sunrise" && prayer.time > now
    );
    if (!nextPrayer) {
      const tomorrow = calculateDay(
        city,
        new Date(year, month - 1, day + 1),
        parameters
      );
      if (!validTimes(tomorrow))
        throw new Error("تعذر حساب مواقيت الغد لهذا الموقع.");
      nextPrayer = tomorrow.find(
        prayer => prayer.key !== "sunrise" && prayer.time > now
      );
    }
    if (!nextPrayer)
      throw new Error(
        "تعذر تحديد الصلاة القادمة؛ راجع الإحداثيات والمنطقة الزمنية."
      );
    return {
      city,
      prayers,
      next: { label: nextPrayer.label, time: nextPrayer.time },
      methodLabel,
    };
  } catch (error) {
    return {
      error:
        error instanceof RangeError
          ? "المنطقة الزمنية غير صالحة؛ استخدم اسم IANA مثل Africa/Cairo."
          : String(error.message || error),
    };
  }
}

function scope() {
  let alive = true;
  const cleanups = [];
  return {
    get alive() {
      return alive;
    },
    add(fn) {
      cleanups.push(fn);
      return fn;
    },
    on(node, type, fn, options) {
      node.addEventListener(type, fn, options);
      cleanups.push(() => node.removeEventListener(type, fn, options));
    },
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      cleanups.push(() => clearInterval(id));
      return id;
    },
    cleanup() {
      if (!alive) return;
      alive = false;
      cleanups
        .splice(0)
        .reverse()
        .forEach(fn => {
          try {
            fn();
          } catch {
            /* best-effort teardown */
          }
        });
    },
  };
}
function escape(ctx, value) {
  return ctx.escape(String(value ?? ""));
}
function number(ctx, value) {
  return escape(ctx, ctx.num ? ctx.num(value) : value);
}
function timeLabel(date, zone) {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
function dateLabel(date, zone) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: zone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
function report(ctx, node, message, error = false) {
  if (node) {
    node.textContent = message;
    node.setAttribute("role", error ? "alert" : "status");
  }
  if (error && ctx.notify) ctx.notify(message, "error");
}
function storageGet(ctx, key, fallback) {
  try {
    return ctx.store.get(key, fallback) ?? fallback;
  } catch {
    return fallback;
  }
}
function storageSet(ctx, key, value, node) {
  try {
    if (ctx.store.set(key, value) === false)
      throw new Error("Storage unavailable");
    return true;
  } catch {
    report(
      ctx,
      node,
      "تعذر حفظ التقدم على هذا الجهاز. يبقى العداد في هذه الصفحة فقط.",
      true
    );
    return false;
  }
}
function confirmed(message) {
  return typeof window.confirm === "function" && window.confirm(message);
}

function locationMarkup(ctx, settings, prayer = false) {
  const prefix = `worship-${++instanceId}`;
  let city;
  try {
    city = resolveLocation(settings);
  } catch {
    city = { name: "", lat: "", lon: "", timeZone: browserZone() };
  }
  const custom = settings.location != null;
  return `<section class="panel" aria-label="إعدادات الموقع${prayer ? " والصلاة" : ""}">
    <h2 class="panel-title">الموقع${prayer ? " وطريقة الحساب" : ""}</h2>
    <div class="prayer-grid">
      <label class="field" for="${prefix}-city">المدينة<select class="select" id="${prefix}-city" data-city>
        ${CITIES.map(item => `<option value="${item.id}" ${!custom && (settings.city || "rass") === item.id ? "selected" : ""}>${escape(ctx, item.name)}</option>`).join("")}
        <option value="custom" ${custom || (settings.city && !CITIES.some(item => item.id === settings.city)) ? "selected" : ""}>موقع مخصص</option>
      </select></label>
      ${
        prayer
          ? `<label class="field" for="${prefix}-method">طريقة الحساب<select class="select" id="${prefix}-method" data-method>${Object.entries(
              METHODS
            )
              .map(
                ([key, label]) =>
                  `<option value="${key}" ${(settings.method || "UmmAlQura") === key ? "selected" : ""}>${label}</option>`
              )
              .join("")}</select></label>
      <label class="field" for="${prefix}-madhab">وقت العصر<select class="select" id="${prefix}-madhab" data-madhab><option value="Shafi" ${(settings.madhab || "Shafi") === "Shafi" ? "selected" : ""}>الجمهور — شافعي</option><option value="Hanafi" ${settings.madhab === "Hanafi" ? "selected" : ""}>حنفي</option></select></label>`
          : ""
      }
    </div>
    <button type="button" class="button button-secondary" data-geolocation>استخدام موقعي الحالي</button>
    <p class="muted">لا يُطلب موقعك إلا عند الضغط. الموقع الجغرافي لا يحدد المنطقة الزمنية؛ نستخدم منطقة جهازك، ويمكن تعديلها أدناه.</p>
    <details data-custom ${custom ? "open" : ""}><summary class="section-heading">إدخال موقع أو تعديل المنطقة الزمنية</summary>
      <form data-location-form>
        <div class="prayer-grid">
          <label class="field" for="${prefix}-name">اسم الموقع<input class="input" id="${prefix}-name" name="name" maxlength="100" required value="${escape(ctx, city.name)}"></label>
          <label class="field" for="${prefix}-lat">خط العرض<input class="input" id="${prefix}-lat" name="lat" type="number" step="any" min="-90" max="90" required dir="ltr" value="${escape(ctx, city.lat)}"></label>
          <label class="field" for="${prefix}-lon">خط الطول<input class="input" id="${prefix}-lon" name="lon" type="number" step="any" min="-180" max="180" required dir="ltr" value="${escape(ctx, city.lon)}"></label>
          <label class="field" for="${prefix}-zone">المنطقة الزمنية IANA<input class="input" id="${prefix}-zone" name="timeZone" required dir="ltr" placeholder="Asia/Riyadh" value="${escape(ctx, city.timeZone)}"></label>
        </div>
        <button class="button" type="submit">حفظ الموقع المخصص</button>
      </form>
    </details><p class="notice" data-location-status role="status" aria-live="polite"></p>
  </section>`;
}
function bindLocation(container, ctx, state, lifetime, changed) {
  const status = container.querySelector("[data-location-status]");
  const form = container.querySelector("[data-location-form]");
  let pending = false,
    locating = false,
    locationRequest = 0;
  const controls = [
    ...container.querySelectorAll(
      "[data-city], [data-method], [data-madhab], [data-geolocation], [data-location-form] input, [data-location-form] button"
    ),
  ];
  function syncControls(updateFields = false) {
    container.querySelector("[data-city]").value = state.location
      ? "custom"
      : state.city || "rass";
    for (const key of ["method", "madhab"]) {
      const select = container.querySelector(`[data-${key}]`);
      if (select)
        select.value = state[key] || (key === "method" ? "UmmAlQura" : "Shafi");
    }
    if (updateFields) {
      try {
        for (const [key, value] of Object.entries(resolveLocation(state)))
          form.elements[key].value = String(value);
      } catch {
        /* Preserve editable invalid fields for correction. */
      }
    }
  }
  async function commit(patch) {
    if (pending || !lifetime.alive) return;
    pending = true;
    controls.forEach(control => {
      control.disabled = true;
    });
    try {
      const saved = await ctx.saveSettings(patch);
      if (!lifetime.alive) return;
      Object.assign(state, patch);
      syncControls(
        Object.hasOwn(patch, "city") || Object.hasOwn(patch, "location")
      );
      report(
        ctx,
        status,
        saved === false
          ? "طُبقت الإعدادات لهذه الجلسة فقط؛ تعذر حفظها على الجهاز."
          : "تم حفظ الإعدادات.",
        saved === false
      );
      changed();
    } catch {
      if (lifetime.alive) {
        syncControls();
        report(ctx, status, "تعذر حفظ الإعدادات. حاول مرة أخرى.", true);
      }
    } finally {
      pending = false;
      if (lifetime.alive) {
        controls.forEach(control => {
          control.disabled = false;
        });
        container.querySelector("[data-geolocation]").disabled = locating;
      }
    }
  }
  lifetime.on(container.querySelector("[data-city]"), "change", event => {
    locationRequest++; // Ignore an older geolocation result after a user selection.
    if (event.target.value === "custom") {
      container.querySelector("[data-custom]").open = true;
      form.elements.name.focus();
      report(
        ctx,
        status,
        "أدخل الموقع والمنطقة الزمنية ثم اضغط حفظ. لم يتغير الموقع بعد."
      );
    } else commit({ city: event.target.value, location: null });
  });
  for (const key of ["method", "madhab"]) {
    const select = container.querySelector(`[data-${key}]`);
    if (select)
      lifetime.on(select, "change", event =>
        commit({ [key]: event.target.value })
      );
  }
  lifetime.on(form, "submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const location = {
      name: form.elements.name.value.trim(),
      lat: Number(form.elements.lat.value),
      lon: Number(form.elements.lon.value),
      timeZone: form.elements.timeZone.value.trim(),
    };
    try {
      resolveLocation({ location });
    } catch (error) {
      report(
        ctx,
        status,
        error instanceof RangeError
          ? "اسم المنطقة الزمنية غير صالح؛ للقاهرة استخدم Africa/Cairo."
          : error.message,
        true
      );
      return;
    }
    locationRequest++;
    commit({ city: "custom", location });
  });
  const geoButton = container.querySelector("[data-geolocation]");
  lifetime.on(geoButton, "click", () => {
    if (locating) return;
    if (!window.isSecureContext) {
      report(
        ctx,
        status,
        "تحديد الموقع يتطلب اتصال HTTPS أو localhost. يمكنك اختيار مدينة أو إدخال الإحداثيات.",
        true
      );
      return;
    }
    if (!navigator.geolocation) {
      report(
        ctx,
        status,
        "هذا المتصفح لا يدعم تحديد الموقع. اختر مدينة أو أدخل الإحداثيات.",
        true
      );
      return;
    }
    locating = true;
    geoButton.disabled = true;
    const request = ++locationRequest;
    report(ctx, status, "بانتظار إذن الموقع…");
    navigator.geolocation.getCurrentPosition(
      position => {
        locating = false;
        if (!lifetime.alive) return;
        geoButton.disabled = false;
        if (request !== locationRequest) return;
        const location = {
          name: "موقعي الحالي",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          timeZone: browserZone(),
        };
        for (const [key, value] of Object.entries(location))
          form.elements[key].value = String(value);
        container.querySelector("[data-city]").value = "custom";
        container.querySelector("[data-custom]").open = true;
        commit({ city: "custom", location });
      },
      error => {
        locating = false;
        if (!lifetime.alive) return;
        geoButton.disabled = false;
        if (request !== locationRequest) return;
        const messages = {
          1: "تم رفض إذن الموقع. اختر مدينة أو أدخل موقعك يدوياً.",
          2: "تعذر تحديد موقعك. تحقق من خدمات الموقع أو اختر مدينة.",
          3: "انتهت مهلة تحديد الموقع. حاول مرة أخرى أو اختر مدينة.",
        };
        report(
          ctx,
          status,
          messages[error.code] || "تعذر تحديد الموقع. استخدم الاختيار اليدوي.",
          true
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function renderPrayer(container, ctx) {
  const lifetime = scope();
  const state = { ...ctx.settings };
  container.innerHTML = `<section class="panel"><h1 class="panel-title">مواقيت الصلاة</h1><p class="muted">مواقيت محسوبة بحسب الموقع والمنطقة الزمنية المختارين.</p><div data-prayer-output></div></section>${locationMarkup(ctx, state, true)}
    <p class="notice">المواقيت حسابية وقد تختلف عن تقويم المسجد المحلي. لا يوفر هذا القسم أذاناً أو تنبيهاً موثوقاً عندما تكون الصفحة مغلقة أو في الخلفية.</p>`;
  const output = container.querySelector("[data-prayer-output]");
  let summary,
    signature = "",
    lastMinute = "";
  function refresh(force = false) {
    if (!lifetime.alive) return;
    const now = new Date();
    const minute = String(Math.floor(now.getTime() / 60000));
    if (
      force ||
      minute !== lastMinute ||
      !summary ||
      (!summary.error && summary.next.time <= now)
    ) {
      lastMinute = minute;
      summary = getPrayerSummary(state, now);
    }
    if (summary.error) {
      output.innerHTML = `<p class="empty-state" role="alert">${escape(ctx, summary.error)}</p>`;
      return;
    }
    const { city, prayers, next, methodLabel } = summary;
    const nextKey = `${dayKey(now, city.timeZone)}:${city.name}:${city.lat}:${city.lon}:${city.timeZone}:${methodLabel}:${state.madhab}:${next.time.getTime()}`;
    if (force || signature !== nextKey) {
      signature = nextKey;
      output.innerHTML = `<p class="section-heading">${escape(ctx, city.name)} · ${escape(ctx, dateLabel(now, city.timeZone))}</p>
        <p class="muted">${escape(ctx, city.timeZone)} · ${escape(ctx, methodLabel)} · العصر: ${state.madhab === "Hanafi" ? "حنفي" : "الجمهور"}</p>
        <div class="prayer-countdown"><span>الصلاة القادمة: ${escape(ctx, next.label)}</span><strong data-countdown aria-label="الوقت المتبقي"></strong><span>${escape(ctx, timeLabel(next.time, city.timeZone))} · ${escape(ctx, dateLabel(next.time, city.timeZone))}</span></div>
        <div class="prayer-grid">${prayers.map(prayer => `<div class="prayer-row prayer-cell ${prayer.key !== "sunrise" && prayer.time.getTime() === next.time.getTime() ? "is-active" : ""}"><span>${prayer.label}${prayer.key === "sunrise" ? " (ليس صلاة مفروضة)" : ""}</span><strong>${escape(ctx, timeLabel(prayer.time, city.timeZone))}</strong></div>`).join("")}</div>`;
    }
    const seconds = Math.max(
      0,
      Math.ceil((next.time.getTime() - now.getTime()) / 1000)
    );
    const hours = Math.floor(seconds / 3600),
      minutes = Math.floor((seconds % 3600) / 60),
      rest = seconds % 60;
    output.querySelector("[data-countdown]").textContent = [
      hours,
      minutes,
      rest,
    ]
      .map(n => String(n).padStart(2, "0"))
      .join(":");
  }
  bindLocation(container, ctx, state, lifetime, () => refresh(true));
  refresh(true);
  lifetime.interval(refresh, 1000);
  return () => lifetime.cleanup();
}

export function renderDhikr(container, ctx) {
  const lifetime = scope();
  const abort = new AbortController();
  lifetime.add(() => abort.abort());
  let category = Object.hasOwn(CATEGORIES, ctx.routeParams?.category)
    ? ctx.routeParams.category
    : "morning";
  let items = [],
    currentDay = "",
    progress = {},
    source = null;
  container.innerHTML = `<section class="panel"><h1 class="panel-title">الأذكار</h1><p class="muted">مختارات موثقة من حصن المسلم، وليست الكتاب كاملاً. تقدم كل فئة محفوظ لهذا اليوم على جهازك.</p>
    <div data-categories role="group" aria-label="فئة الأذكار">${Object.entries(
      CATEGORIES
    )
      .map(
        ([key, label]) =>
          `<button type="button" class="button button-secondary" data-category="${key}" aria-pressed="${key === category}">${label}</button>`
      )
      .join("")}</div>
    <p class="muted" data-dhikr-summary role="status" aria-live="polite">جارٍ تحميل الأذكار…</p>
    <button type="button" class="button button-secondary" data-reset-category>تصفير تقدم هذه الفئة</button>
    <p class="notice" data-dhikr-status role="status" aria-live="polite"></p><div data-dhikr-list></div><p class="muted" data-dhikr-source></p></section>`;
  const list = container.querySelector("[data-dhikr-list]");
  const status = container.querySelector("[data-dhikr-status]");
  const summary = container.querySelector("[data-dhikr-summary]");
  const reset = container.querySelector("[data-reset-category]");
  reset.disabled = true;
  function localDay() {
    return dayKey(new Date(), browserZone());
  }
  function storageKey() {
    return `worship:dhikr:${currentDay}:${category}`;
  }
  function loadProgress() {
    currentDay = localDay();
    const saved = storageGet(ctx, storageKey(), {});
    progress =
      saved && typeof saved === "object" && !Array.isArray(saved)
        ? { ...saved }
        : {};
  }
  function countFor(item) {
    const value = Number(progress[item.id]);
    return Math.max(
      0,
      Math.min(item.count, Number.isFinite(value) ? Math.floor(value) : 0)
    );
  }
  function selectedItems() {
    return items.filter(item => item.category === category);
  }
  function updateSummary() {
    const selected = selectedItems(),
      done = selected.filter(item => countFor(item) >= item.count).length;
    summary.textContent = `${CATEGORIES[category]} · ${ctx.num ? ctx.num(done) : done} من ${ctx.num ? ctx.num(selected.length) : selected.length} مكتملة · ${currentDay} بتوقيت جهازك (${browserZone()})`;
    for (const button of container.querySelectorAll("[data-category]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.category === category)
      );
      button.classList.toggle(
        "is-active",
        button.dataset.category === category
      );
    }
  }
  function card(item) {
    const count = countFor(item),
      complete = count >= item.count;
    return `<article class="dhikr-card" data-id="${escape(ctx, item.id)}"><h2 class="panel-title">${escape(ctx, item.title)}</h2><p class="dhikr-text">${escape(ctx, item.text)}</p><p class="muted">${escape(ctx, item.reference)}</p>
      <progress value="${count}" max="${item.count}" aria-label="تقدم ${escape(ctx, item.title)}"></progress>
      <button type="button" class="counter-button ${complete ? "is-active" : ""}" data-increment="${escape(ctx, item.id)}" ${complete ? "disabled" : ""} aria-label="${complete ? "اكتمل" : "زيادة عداد"} ${escape(ctx, item.title)}">${complete ? "اكتمل" : "قرأت"} · ${number(ctx, count)} / ${number(ctx, item.count)}</button>
      <button type="button" class="button button-secondary" data-reset-item="${escape(ctx, item.id)}">تصفير هذا الذكر</button></article>`;
  }
  function draw() {
    list.innerHTML =
      selectedItems().map(card).join("") ||
      '<p class="empty-state">لا توجد أذكار في هذه الفئة.</p>';
    updateSummary();
  }
  function ensureDay() {
    if (currentDay !== localDay()) {
      loadProgress();
      draw();
      return true;
    }
    return false;
  }
  lifetime.on(container.querySelector("[data-categories]"), "click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    loadProgress();
    if (items.length) draw();
  });
  lifetime.on(list, "click", event => {
    const button = event.target.closest("[data-increment], [data-reset-item]");
    if (!button || !list.contains(button)) return;
    const id = button.dataset.increment || button.dataset.resetItem;
    // Capture the clicked item before ensureDay redraws and detaches its button.
    ensureDay();
    const item = selectedItems().find(value => value.id === id);
    if (!item) return;
    if (button.hasAttribute("data-reset-item")) {
      if (!confirmed("تصفير عداد هذا الذكر لليوم؟")) return;
      progress[id] = 0;
    } else progress[id] = Math.min(item.count, countFor(item) + 1);
    storageSet(ctx, storageKey(), progress, status);
    const oldCard = list.querySelector(`[data-id="${id}"]`);
    if (oldCard) {
      const counter = oldCard.querySelector("[data-increment]"),
        value = countFor(item),
        complete = value >= item.count;
      oldCard.querySelector("progress").value = value;
      counter.textContent = `${complete ? "اكتمل" : "قرأت"} · ${ctx.num ? ctx.num(value) : value} / ${ctx.num ? ctx.num(item.count) : item.count}`;
      counter.disabled = complete;
      counter.classList.toggle("is-active", complete);
      counter.setAttribute(
        "aria-label",
        `${complete ? "اكتمل" : "زيادة عداد"} ${item.title}`
      );
    }
    updateSummary();
  });
  lifetime.on(reset, "click", () => {
    ensureDay();
    if (!confirmed(`تصفير جميع عدادات ${CATEGORIES[category]} لهذا اليوم؟`))
      return;
    progress = {};
    storageSet(ctx, storageKey(), progress, status);
    draw();
  });
  async function load() {
    try {
      const response = await fetch(
        new URL("../data/adhkar.json", import.meta.url),
        { signal: abort.signal }
      );
      if (!response.ok) throw new Error("download");
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.source) throw new Error("schema");
      const ids = new Set();
      items = data.items.filter(item => {
        if (
          !item ||
          typeof item.id !== "string" ||
          !/^[a-z0-9-]+$/.test(item.id) ||
          ids.has(item.id) ||
          !Object.hasOwn(CATEGORIES, item.category) ||
          !Number.isInteger(item.count) ||
          item.count < 1 ||
          item.count > 1000 ||
          !["title", "text", "reference"].every(
            key => typeof item[key] === "string" && item[key]
          )
        )
          return false;
        ids.add(item.id);
        return true;
      });
      if (!items.length) throw new Error("empty");
      if (!lifetime.alive) return;
      source = data.source;
      container.querySelector("[data-dhikr-source]").textContent =
        `المصدر: ${source.name} · الترخيص: ${source.license} · ${items.length} ذكرًا مختارًا.`;
      reset.disabled = false;
      loadProgress();
      draw();
      lifetime.interval(ensureDay, 30000);
      lifetime.on(document, "visibilitychange", () => {
        if (!document.hidden) ensureDay();
      });
    } catch (error) {
      if (!lifetime.alive || error.name === "AbortError") return;
      summary.textContent = "تعذر تحميل الأذكار.";
      list.innerHTML =
        '<div class="empty-state"><p>تعذر تحميل ملف الأذكار المحلي. تحقق من اتصالك وتوفر الملف.</p><button type="button" class="button" data-retry>إعادة المحاولة</button></div>';
    }
  }
  lifetime.on(list, "click", event => {
    if (event.target.closest("[data-retry]")) {
      summary.textContent = "جارٍ تحميل الأذكار…";
      list.textContent = "";
      load();
    }
  });
  load();
  return () => lifetime.cleanup();
}

export function renderQibla(container, ctx) {
  const lifetime = scope();
  const state = { ...ctx.settings };
  let bearing = null,
    heading = null,
    listening = false,
    requesting = false,
    sensorTimer;
  container.innerHTML = `<section class="panel"><h1 class="panel-title">اتجاه القبلة</h1><p class="muted" data-qibla-location></p>
    <div class="qibla-dial" role="img" aria-label="اتجاه القبلة بالنسبة للشمال" data-dial><span class="pill">الشمال N</span><div class="qibla-arrow" data-arrow aria-hidden="true">↑</div></div>
    <p class="section-heading" data-bearing></p><p class="notice" data-sensor-status role="status" aria-live="polite">السهم ثابت بالنسبة للشمال؛ ليس بوصلة حية حتى يتوفر حساس اتجاه مناسب.</p>
    <button type="button" class="button button-gold" data-sensor>تشغيل بوصلة الجهاز</button>
    <p class="muted">زاوية القبلة محسوبة من الشمال الجغرافي باتجاه عقارب الساعة. وجّه أعلى الجهاز للشمال عند الاستخدام اليدوي. الحساس اختياري ولا يعمل على كل الأجهزة، بما فيها بعض أجهزة iPad؛ قد يتأثر بالمغناطيس والمعادن. ضع الجهاز أفقياً، وعايره وقارن ببوصلة موثوقة.</p></section>${locationMarkup(ctx, state)}`;
  const arrow = container.querySelector("[data-arrow]"),
    dial = container.querySelector("[data-dial]");
  const sensorStatus = container.querySelector("[data-sensor-status]"),
    sensorButton = container.querySelector("[data-sensor]");
  function drawArrow() {
    if (bearing == null) {
      arrow.hidden = true;
      return;
    }
    arrow.hidden = false;
    const angle = (((bearing - (heading ?? 0)) % 360) + 360) % 360;
    arrow.style.transform = `rotate(${angle}deg)`;
    dial.setAttribute(
      "aria-label",
      `القبلة ${Math.round(bearing)} درجة من الشمال${heading == null ? "؛ سهم ثابت" : "؛ قراءة حساس تقريبية"}`
    );
  }
  function refresh() {
    try {
      const city = resolveLocation(state);
      bearing = Qibla(new Coordinates(city.lat, city.lon));
      if (!Number.isFinite(bearing))
        throw new Error("تعذر حساب اتجاه القبلة لهذا الموقع.");
      container.querySelector("[data-qibla-location]").textContent =
        `${city.name} · ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}`;
      container.querySelector("[data-bearing]").textContent =
        `${ctx.num ? ctx.num(Math.round(bearing * 10) / 10) : bearing.toFixed(1)}° من الشمال الجغرافي`;
    } catch (error) {
      bearing = null;
      container.querySelector("[data-bearing]").textContent =
        error instanceof RangeError
          ? "اختر منطقة زمنية صحيحة للموقع."
          : error.message;
    }
    drawArrow();
  }
  function orientation(event) {
    let value = null;
    if (
      typeof event.webkitCompassHeading === "number" &&
      Number.isFinite(event.webkitCompassHeading)
    ) {
      if (
        typeof event.webkitCompassAccuracy === "number" &&
        (event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 45)
      ) {
        report(
          ctx,
          sensorStatus,
          "دقة البوصلة منخفضة؛ عاير الجهاز وابتعد عن المعادن."
        );
        return;
      }
      value = event.webkitCompassHeading;
    } else if (
      event.absolute === true &&
      typeof event.alpha === "number" &&
      Number.isFinite(event.alpha)
    )
      value = 360 - event.alpha;
    if (value == null) return;
    const screenAngle =
      typeof screen.orientation?.angle === "number"
        ? screen.orientation.angle
        : typeof window.orientation === "number"
          ? window.orientation
          : 0;
    heading = (((value + screenAngle) % 360) + 360) % 360;
    clearTimeout(sensorTimer);
    report(
      ctx,
      sensorStatus,
      `قراءة حساس تقريبية: ${Math.round(heading)}°؛ قد يكون مرجع الحساس مغناطيسياً، ولا نضمن دقته أو الشمال الحقيقي.`
    );
    drawArrow();
  }
  function stopSensor(showMessage = true) {
    window.removeEventListener("deviceorientation", orientation);
    window.removeEventListener("deviceorientationabsolute", orientation);
    clearTimeout(sensorTimer);
    listening = false;
    heading = null;
    sensorButton.textContent = "تشغيل بوصلة الجهاز";
    if (showMessage)
      report(ctx, sensorStatus, "توقفت البوصلة. السهم ثابت بالنسبة للشمال.");
    drawArrow();
  }
  lifetime.add(() => stopSensor(false));
  lifetime.on(sensorButton, "click", async () => {
    if (listening) {
      stopSensor();
      return;
    }
    if (requesting) return;
    if (!window.isSecureContext) {
      report(
        ctx,
        sensorStatus,
        "حساس الاتجاه يتطلب اتصال HTTPS. استخدم الزاوية اليدوية.",
        true
      );
      return;
    }
    const Sensor = window.DeviceOrientationEvent;
    if (!Sensor) {
      report(
        ctx,
        sensorStatus,
        "حساس الاتجاه غير مدعوم على هذا الجهاز. استخدم الزاوية اليدوية.",
        true
      );
      return;
    }
    requesting = true;
    sensorButton.disabled = true;
    try {
      // iOS permission must be requested directly inside this user-click handler.
      if (typeof Sensor.requestPermission === "function") {
        const permission = await Sensor.requestPermission();
        if (!lifetime.alive) return;
        if (permission !== "granted") {
          report(
            ctx,
            sensorStatus,
            "تم رفض إذن حساس الاتجاه. يمكنك استخدام زاوية القبلة يدوياً.",
            true
          );
          return;
        }
      }
      if (!lifetime.alive) return;
      window.addEventListener("deviceorientation", orientation);
      window.addEventListener("deviceorientationabsolute", orientation);
      listening = true;
      sensorButton.textContent = "إيقاف بوصلة الجهاز";
      report(ctx, sensorStatus, "بانتظار قراءة اتجاه مطلقة؛ ضع الجهاز أفقياً.");
      sensorTimer = setTimeout(() => {
        if (lifetime.alive && heading == null)
          report(
            ctx,
            sensorStatus,
            "لم يصل اتجاه مطلق من الحساس. قد يكون غير متاح أو محجوباً؛ استخدم الزاوية اليدوية."
          );
      }, 8000);
    } catch {
      if (lifetime.alive)
        report(
          ctx,
          sensorStatus,
          "تعذر تشغيل البوصلة أو طلب الإذن. استخدم الزاوية اليدوية.",
          true
        );
    } finally {
      requesting = false;
      if (lifetime.alive) sensorButton.disabled = false;
    }
  });
  bindLocation(container, ctx, state, lifetime, refresh);
  refresh();
  return () => lifetime.cleanup();
}

export function renderTasbih(container, ctx) {
  const lifetime = scope();
  const key = "worship:tasbih";
  const saved = storageGet(ctx, key, {});
  let target = [33, 99, 100].includes(saved?.target) ? saved.target : 33;
  let count = Number.isFinite(Number(saved?.count))
    ? Math.max(0, Math.min(target, Math.floor(Number(saved.count))))
    : 0;
  let vibrate = saved?.vibrate === true;
  const prefix = `tasbih-${++instanceId}`;
  container.innerHTML = `<section class="panel"><h1 class="panel-title">السبحة</h1><p class="muted">عداد شخصي محفوظ على جهازك. اختيار الهدف أداة تنظيم، وليس حكماً بأن كل ذكر يُكرر بهذا العدد.</p>
    <label class="field" for="${prefix}-target">الهدف<select class="select" id="${prefix}-target" data-target>${[33, 99, 100].map(value => `<option value="${value}" ${value === target ? "selected" : ""}>${number(ctx, value)}</option>`).join("")}</select></label>
    <div class="tasbih-count" data-count role="status" aria-live="polite" aria-atomic="true"></div>
    <button type="button" class="counter-button button-gold" data-tap aria-label="زيادة عداد السبحة">تسبيحة</button>
    <button type="button" class="button button-secondary" data-reset>تصفير العداد</button>
    <label class="field" for="${prefix}-vibration"><input id="${prefix}-vibration" type="checkbox" data-vibration ${vibrate ? "checked" : ""}> اهتزاز خفيف عند النقر (إن كان مدعوماً)</label>
    <p class="muted">الاهتزاز اختياري وقد لا يعمل على جهازك أو متصفحك.</p><p class="notice" data-tasbih-status role="status" aria-live="polite"></p></section>`;
  const tap = container.querySelector("[data-tap]"),
    status = container.querySelector("[data-tasbih-status]");
  function draw() {
    container.querySelector("[data-count]").textContent =
      `${ctx.num ? ctx.num(count) : count} / ${ctx.num ? ctx.num(target) : target}`;
    tap.disabled = count >= target;
    tap.textContent = count >= target ? "اكتمل الهدف" : "تسبيحة";
    tap.classList.toggle("is-active", count >= target);
  }
  function persist() {
    storageSet(ctx, key, { count, target, vibrate }, status);
  }
  lifetime.on(tap, "click", () => {
    count = Math.min(target, count + 1);
    persist();
    draw();
    if (vibrate && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(15);
      } catch {
        /* optional enhancement */
      }
    }
  });
  lifetime.on(container.querySelector("[data-reset]"), "click", () => {
    if (!confirmed("تصفير عداد السبحة؟")) return;
    count = 0;
    persist();
    draw();
  });
  lifetime.on(container.querySelector("[data-target]"), "change", event => {
    const nextTarget = Number(event.target.value);
    if (!confirmed("تغيير الهدف سيصفّر العداد الحالي. هل تريد المتابعة؟")) {
      event.target.value = String(target);
      return;
    }
    target = nextTarget;
    count = 0;
    persist();
    draw();
  });
  lifetime.on(container.querySelector("[data-vibration]"), "change", event => {
    vibrate = event.target.checked;
    persist();
  });
  draw();
  return () => lifetime.cleanup();
}
