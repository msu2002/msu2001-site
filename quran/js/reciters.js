/* Reciter catalog — EveryAyah (verse-by-verse) + mp3quran.net (full surah).
   Every folder/server below was probed for availability. Recording types follow the
   sources' own labels; EveryAyah folders without a style in their name are treated as murattal. */
export const TYPES = { m: "مرتّل", j: "مجوّد", l: "المصحف المعلّم" };
export const MODES = { a: "آية بآية", s: "سورة كاملة" };
const SURAH_BASE = "https://cdn.mp3quran.net/audio/";
const RAW = [["alafasy","مشاري العفاسي",{"m":[{"64":"Alafasy_64kbps","128":"Alafasy_128kbps"},"~mishary-alafasy/r1/"]}],["sudais","عبدالرحمن السديس",{"m":[{"64":"Abdurrahmaan_As-Sudais_64kbps","192":"Abdurrahmaan_As-Sudais_192kbps"},"~abdulrahman-sudais/r1/"]}],["shuraim","سعود الشريم",{"m":[{"64":"Saood_ash-Shuraym_64kbps","128":"Saood_ash-Shuraym_128kbps"},"~saud-shuraim/r1/"]}],["maher","ماهر المعيقلي",{"m":[{"64":"Maher_AlMuaiqly_64kbps","128":"MaherAlMuaiqly128kbps"},"~maher-muaiqly/r1/"],"j":[null,"~maher-muaiqly/r3/"]}],["dosari","ياسر الدوسري",{"m":[{"128":"Yasser_Ad-Dussary_128kbps"},"~yasser-dosari/r1/"]}],["budair","صلاح البدير",{"m":[{"128":"Salah_Al_Budair_128kbps"},"~salah-budair/r1/"]}],["ghamdi","سعد الغامدي",{"m":[{"40":"Ghamadi_40kbps"},"~saad-ghamdi/r1/"]}],["hudhaify","علي الحذيفي",{"m":[{"32":"Hudhaify_32kbps","64":"Hudhaify_64kbps","128":"Hudhaify_128kbps"},"~ali-hudhaifi/r1/"]}],["qasim","عبدالمحسن القاسم",{"m":[{"192":"Muhsin_Al_Qasim_192kbps"},"~abdulmohsen-qasim/r1/"]}],["juhani","عبدالله عواد الجهني",{"m":[{"128":"Abdullaah_3awwaad_Al-Juhaynee_128kbps"},"~abdullah-juhani/r1/"]}],["qahtani","خالد القحطاني",{"m":[{"192":"Khaalid_Abdullaah_al-Qahtaanee_192kbps"},"~khalid-qahtani/r1/"]}],["qatami","ناصر القطامي",{"m":[{"128":"Nasser_Alqatami_128kbps"},"~nasser-qatami/r1/"]}],["shatri","أبو بكر الشاطري",{"m":[{"64":"Abu_Bakr_Ash-Shaatree_64kbps","128":"Abu_Bakr_Ash-Shaatree_128kbps"},"~abubakr-shatri/r1/"]}],["rifai","هاني الرفاعي",{"m":[{"64":"Hani_Rifai_64kbps","192":"Hani_Rifai_192kbps"},"~hani-rifai/r1/"]}],["ajmi","أحمد بن علي العجمي",{"m":[{"128":"ahmed_ibn_ali_al_ajamy_128kbps"},"~ahmad-ajmi/r1/"]}],["basfar","عبدالله بصفر",{"m":[{"32":"Abdullah_Basfar_32kbps","64":"Abdullah_Basfar_64kbps","192":"Abdullah_Basfar_192kbps"},"~abdullah-basfar/r1/"]}],["bukhatir","صلاح بوخاطر",{"m":[{"128":"Salaah_AbdulRahman_Bukhatir_128kbps"},"~salah-bukhatir/r1/"]}],["matroud","عبدالله مطرود",{"m":[{"128":"Abdullah_Matroud_128kbps"},"~abdullah-matrood/r1/"]}],["neana","أحمد نعينع",{"m":[{"128":"Ahmed_Neana_128kbps"},"~ahmad-naina/r1/"]}],["abdulkareem","محمد عبدالكريم",{"m":[{"128":"Muhammad_AbdulKareem_128kbps"},"~muhammad-abdulkareem/r1/"]}],["tunaiji","خليفة الطنيجي",{"m":[{"64":"khalefa_al_tunaiji_64kbps"},"~khalifa-tunaiji/r1/"]}],["abbad","فارس عبّاد",{"m":[{"64":"Fares_Abbad_64kbps"},"~fares-abbad/r1/"]}],["jaber","علي جابر",{"m":[{"64":"Ali_Jaber_64kbps"},"~ali-jaber/r1/"]}],["suwaid","أيمن سويد",{"m":[{"64":"Ayman_Sowaid_64kbps"},null],"l":[null,"server15.mp3quran.net/a-rushdi/Almusshaf-Al-Mo-lim/"]}],["alaqimy","أكرم العلاقمي",{"m":[{"128":"Akram_AlAlaqimy_128kbps"},"~akram-alaqmi/r1/"]}],["salamah","ياسر سلامة",{"m":[{"128":"Yaser_Salamah_128kbps"},"~yasser-salama/r1/"]}],["sahl","سهل ياسين",{"m":[{"128":"Sahl_Yassin_128kbps"},"~sahl-yassin/r1/"]}],["husary","محمود خليل الحصري",{"m":[{"64":"Husary_64kbps","128":"Husary_128kbps"},"~mahmoud-husary/r1/"],"j":[{"64":"Husary_Mujawwad_64kbps","128":"Husary_128kbps_Mujawwad"},"~mahmoud-husary/r2/"],"l":[{"128":"Husary_Muallim_128kbps"},null]}],["abdulbasit","عبدالباسط عبدالصمد",{"m":[{"64":"Abdul_Basit_Murattal_64kbps","192":"Abdul_Basit_Murattal_192kbps"},"~abdulbasit-abdulsamad/r3/"],"j":[{"128":"Abdul_Basit_Mujawwad_128kbps"},"~abdulbasit-abdulsamad/r1/"]}],["minshawi","محمد صديق المنشاوي",{"m":[{"128":"Minshawy_Murattal_128kbps"},"~muhammad-minshawi/r1/"],"j":[{"64":"Minshawy_Mujawwad_64kbps","192":"Minshawy_Mujawwad_192kbps"},"~muhammad-minshawi/r2/"],"l":[null,"~muhammad-minshawi/r3/"]}],["tablawi","محمد الطبلاوي",{"m":[{"64":"Mohammad_al_Tablaway_64kbps","128":"Mohammad_al_Tablaway_128kbps"},"~muhammad-tablawi/r1/"],"j":[null,"~muhammad-tablawi/r2/"]}],["ayyoub","محمد أيوب",{"m":[{"32":"Muhammad_Ayyoub_32kbps","64":"Muhammad_Ayyoub_64kbps","128":"Muhammad_Ayyoub_128kbps"},"~muhammad-ayyub/r1/"]}],["jibreel","محمد جبريل",{"m":[{"64":"Muhammad_Jibreel_64kbps","128":"Muhammad_Jibreel_128kbps"},"~muhammad-jibreel/r1/"]}],["ismail","مصطفى إسماعيل",{"m":[{"48":"Mustafa_Ismail_48kbps"},"~mustafa-ismail/r1/"],"j":[null,"~mustafa-ismail/r2/"]}],["banna","محمود علي البنا",{"m":[{"32":"mahmoud_ali_al_banna_32kbps"},"~mahmoud-banna/r1/"],"j":[null,"~mahmoud-banna/r2/"]}],["souissi","علي حجاج السويسي",{"m":[{"128":"Ali_Hajjaj_AlSuesy_128kbps"},"~ali-souissi/r1/"]}]];
export const CATALOG = RAW.map(([key, name, types]) => ({
  key,
  name,
  recs: Object.fromEntries(
    Object.entries(types).map(([type, [ayah, surah]]) => [
      type,
      {
        a: ayah || null,
        s: surah
          ? surah.startsWith("~")
            ? SURAH_BASE + surah.slice(1)
            : "https://" + surah
          : null,
      },
    ])
  ),
}));
export const DEFAULT_RECITER = "alafasy:m:128:a";
const byKey = new Map(CATALOG.map(r => [r.key, r]));

export function qualitiesOf(rec) {
  return rec?.a ? Object.keys(rec.a).map(Number).sort((x, y) => y - x) : [];
}
export function qualityLabel(kbps) {
  const word = kbps >= 128 ? "عالية" : kbps >= 64 ? "متوسطة" : "خفيفة";
  return `${word} · \u200E${kbps} kbps\u200E`;
}
export function typesOf(reciter) {
  return Object.keys(TYPES).filter(t => reciter.recs[t]);
}
export function modesOf(reciter, type) {
  const rec = reciter.recs[type];
  return { a: !!rec?.a, s: !!rec?.s };
}
export function makeId(key, type, quality, mode) {
  return `${key}:${type}:${mode === "s" ? 0 : quality}:${mode}`;
}
/** Accepts a composite id or a legacy EveryAyah folder name. Returns null if unknown. */
export function resolveReciter(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(":");
  if (parts.length === 4) {
    const [key, type, q, mode] = parts;
    const reciter = byKey.get(key);
    const rec = reciter?.recs[type];
    if (!rec) return null;
    if (mode === "a" && rec.a && rec.a[q]) return build(reciter, type, Number(q), "a");
    if (mode === "s" && rec.s) return build(reciter, type, 0, "s");
    return null;
  }
  for (const reciter of CATALOG)
    for (const [type, rec] of Object.entries(reciter.recs))
      for (const [q, folder] of Object.entries(rec.a || {}))
        if (folder === value) return build(reciter, type, Number(q), "a");
  return null;
}
function build(reciter, type, quality, mode) {
  const rec = reciter.recs[type];
  return {
    id: makeId(reciter.key, type, quality, mode),
    reciter,
    key: reciter.key,
    name: reciter.name,
    type,
    typeLabel: TYPES[type],
    quality,
    mode,
    modeLabel: MODES[mode],
    folder: mode === "a" ? rec.a[quality] : null,
    surahBase: mode === "s" ? rec.s : null,
  };
}
export function isValidReciter(value) {
  return !!resolveReciter(value);
}
export function ayahUrl(sel, sura, ayah) {
  return `https://everyayah.com/data/${sel.folder}/${String(sura).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
}
export function surahUrl(sel, sura) {
  return `${sel.surahBase}${String(sura).padStart(3, "0")}.mp3`;
}
export function describe(sel) {
  const extra = sel.mode === "a" ? ` · ${qualityLabel(sel.quality)}` : "";
  return `${sel.name} — ${sel.typeLabel} · ${sel.modeLabel}${extra}`;
}
