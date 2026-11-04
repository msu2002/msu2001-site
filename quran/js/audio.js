import { escapeHTML, icon, formatDuration } from "./core.js";

export const RECITERS = [
  { id: "Alafasy_128kbps", name: "مشاري العفاسي" },
  { id: "Abdurrahmaan_As-Sudais_192kbps", name: "عبدالرحمن السديس" },
  { id: "Saood_ash-Shuraym_128kbps", name: "سعود الشريم" },
  { id: "MaherAlMuaiqly128kbps", name: "ماهر المعيقلي" },
  { id: "Yasser_Ad-Dussary_128kbps", name: "ياسر الدوسري" },
  { id: "Salah_Al_Budair_128kbps", name: "صلاح البدير" },
  { id: "Ghamadi_40kbps", name: "سعد الغامدي" },
  { id: "Hudhaify_128kbps", name: "علي الحذيفي" },
  { id: "Muhsin_Al_Qasim_192kbps", name: "محسن القاسم" },
  { id: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name: "عبدالله عواد الجهني" },
  { id: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", name: "خالد القحطاني" },
  { id: "Nasser_Alqatami_128kbps", name: "ناصر القطامي" },
  { id: "Abu_Bakr_Ash-Shaatree_128kbps", name: "أبو بكر الشاطري" },
  { id: "Hani_Rifai_192kbps", name: "هاني الرفاعي" },
  { id: "ahmed_ibn_ali_al_ajamy_128kbps", name: "أحمد بن علي العجمي" },
  { id: "Abdullah_Basfar_192kbps", name: "عبدالله بصفر" },
  { id: "Salaah_AbdulRahman_Bukhatir_128kbps", name: "صلاح بوخاطر" },
  { id: "Abdullah_Matroud_128kbps", name: "عبدالله مطرود" },
  { id: "Ahmed_Neana_128kbps", name: "أحمد نعينع" },
  { id: "Muhammad_AbdulKareem_128kbps", name: "محمد عبدالكريم" },
  { id: "khalefa_al_tunaiji_64kbps", name: "خليفة الطنيجي" },
  { id: "Fares_Abbad_64kbps", name: "فارس عبّاد" },
  { id: "Ali_Jaber_64kbps", name: "علي جابر" },
  { id: "Ayman_Sowaid_64kbps", name: "أيمن سويد" },
  { id: "Akram_AlAlaqimy_128kbps", name: "أكرم العلاقمي" },
  { id: "Yaser_Salamah_128kbps", name: "ياسر سلامة" },
  { id: "Sahl_Yassin_128kbps", name: "سهل ياسين" },
  { id: "Husary_128kbps", name: "محمود خليل الحصري (مرتل)" },
  { id: "Husary_128kbps_Mujawwad", name: "محمود خليل الحصري (مجوّد)" },
  { id: "Husary_Muallim_128kbps", name: "محمود خليل الحصري (المعلّم)" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "عبدالباسط عبدالصمد (مرتل)" },
  { id: "Abdul_Basit_Mujawwad_128kbps", name: "عبدالباسط عبدالصمد (مجوّد)" },
  { id: "Minshawy_Murattal_128kbps", name: "محمد صديق المنشاوي (مرتل)" },
  { id: "Minshawy_Mujawwad_192kbps", name: "محمد صديق المنشاوي (مجوّد)" },
  { id: "Mohammad_al_Tablaway_128kbps", name: "محمد الطبلاوي" },
  { id: "Muhammad_Ayyoub_128kbps", name: "محمد أيوب" },
  { id: "Muhammad_Jibreel_128kbps", name: "محمد جبريل" },
  { id: "Mustafa_Ismail_48kbps", name: "مصطفى إسماعيل" },
  { id: "mahmoud_ali_al_banna_32kbps", name: "محمود علي البنا" },
  { id: "Ali_Hajjaj_AlSuesy_128kbps", name: "علي حجاج السويسي" },
];

export function createAudioPlayer(ctx) {
  const audio = document.getElementById("recitation");
  const player = document.getElementById("audio-player");
  const title = document.getElementById("audio-title");
  const status = document.getElementById("audio-status");
  const toggle = document.getElementById("audio-toggle");
  const repeatButton = document.getElementById("audio-repeat");
  const seek = document.getElementById("audio-seek");
  let current = null;
  let repeat = false;
  let sequence = 0;
  let activeReciter = RECITERS[0];

  function updateButton() {
    toggle.innerHTML = icon(audio.paused ? "play" : "pause");
    toggle.setAttribute(
      "aria-label",
      audio.paused ? "تشغيل التلاوة" : "إيقاف التلاوة مؤقتًا"
    );
  }
  function setStatus(text) {
    status.textContent = text;
  }
  function clearActive() {
    document
      .querySelectorAll(".verse.is-playing")
      .forEach(el => el.classList.remove("is-playing"));
  }
  function highlight() {
    clearActive();
    if (current)
      document
        .querySelector(
          `[data-sura="${current.sura}"][data-ayah="${current.ayah}"]`
        )
        ?.classList.add("is-playing");
  }

  async function play(sura, ayah) {
    sura = Number(sura);
    ayah = Number(ayah);
    const verse = ctx.data.surahs[sura - 1]?.ayahs[ayah - 1];
    if (!verse) return ctx.notify("تعذر العثور على الآية المحددة.", "error");
    const token = ++sequence;
    audio.pause();
    current = { sura, ayah };
    const reciter =
      RECITERS.find(r => r.id === ctx.settings.reciter) || RECITERS[0];
    activeReciter = reciter;
    title.textContent = `${ctx.data.surahs[sura - 1].name} · الآية ${ctx.num(ayah)}`;
    setStatus(`تحميل · ${reciter.name}`);
    player.hidden = false;
    document.body.classList.add("has-audio");
    audio.src = `https://everyayah.com/data/${reciter.id}/${String(sura).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
    audio.load();
    highlight();
    try {
      await audio.play();
      if (token !== sequence) return;
      setStatus(reciter.name);
    } catch (error) {
      if (token !== sequence) return;
      if (error.name === "NotAllowedError")
        setStatus("اضغط تشغيل لاستئناف الصوت؛ منع المتصفح التشغيل التلقائي.");
      else {
        setStatus("تعذر التشغيل. تحقق من الاتصال ثم اضغط تشغيل.");
        ctx.notify("التلاوة بث خارجي يحتاج إنترنت؛ لم يبدأ التشغيل.", "error");
      }
      updateButton();
    }
    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title.textContent,
        artist: reciter.name,
        album: "تلاوة القرآن — EveryAyah",
      });
    }
  }

  function move(direction) {
    if (!current) return;
    let { sura, ayah } = current;
    ayah += direction;
    if (ayah > ctx.data.surahs[sura - 1].ayahs.length) {
      if (sura === 114) {
        audio.pause();
        setStatus("انتهت التلاوة.");
        return;
      }
      sura++;
      ayah = 1;
    }
    if (ayah < 1) {
      if (sura === 1) return;
      sura--;
      ayah = ctx.data.surahs[sura - 1].ayahs.length;
    }
    play(sura, ayah);
  }

  document
    .getElementById("audio-prev")
    .addEventListener("click", () => move(-1));
  document
    .getElementById("audio-next")
    .addEventListener("click", () => move(1));
  toggle.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setStatus("التشغيل غير متاح. تحقق من المصدر والاتصال.");
      ctx.notify("لم يبدأ الصوت. تحقق من اتصالك وأذون المتصفح.", "error");
    }
  });
  repeatButton.addEventListener("click", () => {
    repeat = !repeat;
    repeatButton.classList.toggle("is-active", repeat);
    repeatButton.setAttribute("aria-pressed", String(repeat));
  });
  document.getElementById("audio-close").addEventListener("click", () => {
    sequence++;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    current = null;
    clearActive();
    player.hidden = true;
    document.body.classList.remove("has-audio");
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration))
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });
  audio.addEventListener("playing", () => {
    updateButton();
    player.classList.add("is-playing");
    setStatus(activeReciter.name);
  });
  audio.addEventListener("pause", () => {
    updateButton();
    player.classList.remove("is-playing");
  });
  audio.addEventListener("waiting", () => setStatus("انتظار تحميل التلاوة…"));
  audio.addEventListener("error", () => {
    if (!current) return;
    setStatus("المصدر غير متاح أو انقطع الاتصال.");
    updateButton();
  });
  audio.addEventListener("timeupdate", () => {
    seek.value =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? String((audio.currentTime / audio.duration) * 100)
        : "0";
    document.getElementById("audio-elapsed").textContent = formatDuration(
      audio.currentTime
    );
    document.getElementById("audio-duration").textContent = formatDuration(
      audio.duration
    );
    if (
      "mediaSession" in navigator &&
      navigator.mediaSession.setPositionState &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: Math.min(audio.currentTime, audio.duration),
        });
      } catch {
        /* unsupported device */
      }
    }
  });
  audio.addEventListener("ended", () => {
    if (repeat) {
      audio.currentTime = 0;
      audio.play().catch(() => setStatus("اضغط تشغيل لتكرار الآية."));
    } else move(1);
  });
  if ("mediaSession" in navigator) {
    const handlers = {
      play: () => audio.play().catch(() => {}),
      pause: () => audio.pause(),
      previoustrack: () => move(-1),
      nexttrack: () => move(1),
      seekto: details => {
        if (typeof details.seekTime === "number")
          audio.currentTime = details.seekTime;
      },
    };
    for (const [key, callback] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(key, callback);
      } catch {
        /* not supported */
      }
    }
  }
  return { play, current: () => current, refreshHighlight: highlight };
}

export function reciterOptions(selected) {
  return RECITERS.map(
    r =>
      `<option value="${r.id}" ${r.id === selected ? "selected" : ""}>${escapeHTML(r.name)}</option>`
  ).join("");
}
