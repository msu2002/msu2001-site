import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ACCOUNT = 'moe_qsm';
const RIYADH = 'Asia/Riyadh';
const DAY = 86400000;
const localDay = new Intl.DateTimeFormat('sv-SE', { timeZone: RIYADH });
const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  timeZone: RIYADH, year: 'numeric', month: 'numeric', day: 'numeric',
});
const weekdays = ['الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس', 'الجمعه', 'السبت'];
const cities = ['الرس', 'بريدة', 'عنيزة', 'البكيرية', 'البدائع', 'المذنب', 'رياض الخبراء',
  'الأسياح', 'عيون الجواء', 'النبهانية', 'الشماسية', 'عقلة الصقور', 'ضرية'];

function normalize(text) {
  return text.normalize('NFKC')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\p{M}\p{Cf}ـ]/gu, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15))
    .replace(/[^\p{L}\p{N}/-]+/gu, ' ').trim();
}

function decisionDay(text, posted) {
  const today = localDay.format(posted);
  const noon = new Date(today + 'T12:00:00+03:00');
  const tomorrow = new Date(+noon + DAY);
  const dates = [noon, tomorrow];
  if (/(?:بعد غد|حتي يوم|لليومين|لمده|الي يوم|من يوم .+ الي|الي ان)/.test(text)) return null;

  const clues = [];
  if (/(?:^| )(?:اليوم|لهذا اليوم)(?= |$)/.test(text)) clues.push(new Set([today]));
  if (/(?:^| )(?:غدا?|ليوم غدا?)(?= |$)/.test(text)) clues.push(new Set([localDay.format(tomorrow)]));
  for (const match of text.matchAll(/(?<!\d)(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})(?!\d)/g)) {
    const [, first, month, last] = match;
    const [year, day] = first.length === 4 ? [+first, +last] : [+last, +first];
    const matching = dates.filter(date => {
      if (year >= 1900) {
        const [y, m, d] = localDay.format(date).split('-').map(Number);
        return year === y && +month === m && day === d;
      }
      const parts = Object.fromEntries(hijri.formatToParts(date).map(({ type, value }) => [type, +value]));
      return year === parts.year && +month === parts.month && day === parts.day;
    });
    clues.push(new Set(matching.map(date => localDay.format(date))));
  }
  if (!clues.length) return null;

  const namedDays = weekdays.filter(day => new RegExp('(?:^| )' + day + '(?= |$)').test(text));
  const matching = dates.filter(date => clues.every(clue => clue.has(localDay.format(date)))
    && (!namedDays.length || namedDays.length === 1 && namedDays[0] === weekdays[date.getUTCDay()]));
  return matching.length === 1 ? localDay.format(matching[0]) : null;
}

function coverage(text, action) {
  // Weather reports and account hashtags alone do not establish the scope of a decision.
  const places = cities.filter(city => new RegExp('(?:^| )' + normalize(city) + '(?= |$)').test(text));
  if (/باستثناء|عدا |ما خلا|دون سائر|المدارس المحدده|بعض (?:ال)?مدارس|مدارس معينه|مدارس محدده|لبعض|جزئي|مدرسه /.test(text)) {
    return { scope: 'unknown', places: [] };
  }
  const allSchools = /(?:جميع|كافه|عموم) (?:الطلبه .{0,65} )?مدارس (?:منطقه )?القصيم|(?:جميع|كافه) .{0,75}مدارس (?:منطقه )?القصيم|مدارس (?:منطقه )?القصيم (?:كافه|جميعها)/;
  const regionalDecision = /^(?:تحويل|تعليق|ايقاف) (?:الدراسه|التعليم) الحضوري(?:ه)? (?:في|ب) ?منطقه القصيم(?= |$)/;
  if ((allSchools.test(text) || regionalDecision.test(action)) && !places.length
      && !/(?:محافظات|مكاتب التعليم|القطاعات|القطاع|المراكز) /.test(text)) {
    return { scope: 'region', places: [] };
  }

  const localSchools = /(?:في|ب) ?(?:جميع )?(?:مدارس )?محافظه ([\p{L} ]+)/gu;
  const localPlaces = places.filter(city => [...action.matchAll(localSchools)].some(match =>
    (match[1] + ' ').startsWith(normalize(city) + ' ')));
  if (places.length === 1 && localPlaces.length === 1 && !/محافظات|ومحافظه|و محافظه|والمراكز|والمحافظات/.test(text)) {
    return { scope: localPlaces[0] === 'الرس' ? 'rass' : 'city', places: localPlaces };
  }
  return { scope: 'unknown', places: [] };
}

export function classify(post, now) {
  const posted = new Date(post.created_at);
  const text = normalize(post.note_tweet?.text || post.note_post?.text || post.text);
  const decision = /(?:تقرر|قررت (?:اداره |الاداره العامه ل)?تعليم القصيم) ((?:تحويل|تعليق|ايقاف) (?:الدراسه|التعليم)(?: الحضوري(?:ه)?)?)/.exec(text);
  const review = /(?:الغاء|العدول عن|تمديد|تعديل) (?:قرار )?(?:تعليق|تحويل|ايقاف) (?:الدراسه|التعليم)|(?:استئناف|عوده) (?:الدراسه|التعليم) الحضوري|تستانف (?:الدراسه|المدارس)/.test(text);
  const topic = /(?:تعليق|تحويل|ايقاف) (?:الدراسه|التعليم)|(?:دراسه|تعليم|الدراسه|التعليم) عن بعد/.test(text);
  if ((!topic && !review) || /(?:^| )(?:جامعه|الجامعه|الجامعيه|تدريب علي|ورشه عمل)(?= |$)/.test(text)) return null;

  const action = decision ? text.slice(decision.index + decision[0].length - decision[1].length) : '';
  const date = decisionDay(text, posted);
  const today = localDay.format(now);
  if (date ? date < today : localDay.format(new Date(+posted + DAY)) < today) return null;

  const area = coverage(text, action);
  const remote = /^تحويل /.test(action)
    ? /عن بعد|عبر (?:منصه )?مدرستي/.test(action)
    : /(?:الي|وتحويلها(?: الي)?) (?:دراسه |الدراسه |تعليم |التعليم )?عن بعد|(?:وتكون|وستكون) الدراسه عن بعد/.test(action);
  const suspended = /^(?:تعليق|ايقاف) (?:الدراسه|التعليم)(?: |$)/.test(action);
  const uncertain = review || !decision || !date || area.scope === 'unknown' || (!remote && !suspended)
    || /(?:لم يتقرر|عدم تعليق|عدم تحويل|نفي|اشاعه|شائعه|في حال|قد يتم|اقتراح|تجربه|افتراضيا|الاختبارات|الفتره المسائيه|الفتره الصباحيه)/.test(text)
    || (!post.note_tweet?.text && !post.note_post?.text && /…(?:\s+https?:\/\/\S+)?\s*$/.test(post.text));

  return {
    id: post.id,
    publishedAt: posted.toISOString(),
    date,
    ...area,
    status: uncertain ? 'review' : remote ? 'remote' : 'full',
  };
}

export async function poll(token, now = new Date(), fetchPosts = fetch) {
  const url = new URL('https://api.x.com/2/tweets/search/recent');
  url.search = new URLSearchParams({
    query: 'from:' + ACCOUNT + ' -is:retweet',
    'tweet.fields': 'created_at,note_tweet',
    start_time: new Date(+now - 2 * DAY).toISOString().replace(/\.\d+Z$/, 'Z'),
    max_results: '100',
  });
  const seen = new Set();
  const posts = [];
  for (let page = 0; page < 3; page++) {
    const request = () => fetchPosts(url, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    let response = await request();
    if (page === 0 && response.status === 400) {
      // Keep the standard fields usable if this API project rejects the long-post field.
      await response.body?.cancel();
      url.searchParams.set('tweet.fields', 'created_at');
      response = await request();
    }
    if (!response.ok) throw new Error('X HTTP ' + response.status);
    const payload = await response.json();
    const data = payload.data ?? [];
    if (payload.errors?.length || !Array.isArray(data) || payload.meta?.result_count !== data.length) {
      throw new Error('Invalid X response');
    }
    for (const post of data) {
      if (!/^\d{1,19}$/.test(post.id) || !Number.isFinite(Date.parse(post.created_at)) || typeof post.text !== 'string') {
        throw new Error('Incomplete X post');
      }
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const notice = classify(post, now);
      if (notice) posts.push(notice);
    }
    if (!payload.meta.next_token) return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    url.searchParams.set('next_token', payload.meta.next_token);
  }
  throw new Error('X pagination limit reached');
}

async function main(file) {
  const now = new Date();
  const token = process.env.X_BEARER_TOKEN?.trim();
  const snapshot = { status: 'disabled', checkedAt: null, posts: [] };
  if (token) {
    try {
      snapshot.posts = await poll(token, now);
      snapshot.status = 'ok';
      snapshot.checkedAt = now.toISOString();
    } catch (error) {
      snapshot.status = 'unavailable';
      console.warn('::warning::X check failed (' + (/^X HTTP \d+$/.test(error.message) ? error.message : 'response or connection error') + ')');
    }
  }

  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const changed = previous.status !== snapshot.status || JSON.stringify(previous.posts) !== JSON.stringify(snapshot.posts);
  if (changed || (snapshot.status === 'ok' && +now - Date.parse(previous.checkedAt) >= 25 * 60000)) {
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  }
  console.log('X monitoring: ' + snapshot.status + ' (' + snapshot.posts.length + ' relevant posts)');
  if (snapshot.status === 'unavailable') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2] || 'x.json');
}
