const SchoolNotice = (() => {
  const data = 'https://raw.githubusercontent.com/msu2002/msu2001-site/suspension-data/';
  const account = 'https://x.com/moe_qsm';
  const madrasati = 'https://schools.madrasati.sa/';
  const timeZone = 'Asia/Riyadh';
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone });
  const dayLabel = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { timeZone, dateStyle: 'full' });
  const hijriLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { timeZone, dateStyle: 'long' });
  const formatDay = day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return day || '';
    const noon = new Date(day + 'T12:00:00+03:00');
    return dayLabel.format(noon) + ' — ' + hijriLabel.format(noon);
  };
  const read = async url => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };
  const readX = () => read(data + 'x.json').catch(() => null);
  const readMinistry = () => read(data + 'status.json').catch(() => read('/suspension/status.json'));
  const fresh = (snapshot, now = Date.now()) => {
    const age = now - Date.parse(snapshot?.checkedAt);
    return snapshot?.status === 'ok' && Array.isArray(snapshot.posts) && age >= 0 && age < 60 * 60000;
  };
  const covers = (post, city) => post.scope === 'region' || (post.scope === 'rass' && city === 'الرس')
    || (Array.isArray(post.places) ? post.places.includes(city) : String(post.places || '').split(/[،,]/).some(place => place.trim() === city));
  const sourceUrl = id => /^\d{1,19}$/.test(id || '') ? account + '/status/' + id : '';
  function select(snapshot, city, now = Date.now()) {
    if (!fresh(snapshot, now)) return null;
    const today = date.format(now);
    const yesterday = date.format(now - 86400000);
    return snapshot.posts.find(post => sourceUrl(post.id) && (
      post.status === 'review'
        ? (post.date ? post.date >= today : Date.parse(post.publishedAt) >= Date.parse(yesterday + 'T00:00:00+03:00'))
          && (post.scope === 'unknown' || covers(post, city))
        : (post.status === 'remote' || post.status === 'full') && post.date >= today && covers(post, city)
    )) || null;
  }
  const isCurrent = day => /^\d{4}-\d{2}-\d{2}$/.test(day || '') && day >= date.format(new Date());
  const preferX = (post, manualTimestamp) => post && !(Date.parse(manualTimestamp) >= Date.parse(post.publishedAt));

  return { account, madrasati, read, readX, readMinistry, fresh, covers, sourceUrl, select, isCurrent, preferX, formatDay };
})();
