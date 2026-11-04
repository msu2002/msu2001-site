(function () {
var W = window.W;
W.register('settings', {
  nav: 1, icon: 'gear', title: 'الإعدادات', short: 'الإعدادات',
  render: function (v) {
    var s = W.settings();
    v.innerHTML = '<div class="wrap" style="max-width:760px;display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><h3 style="margin-top:0">المدرسة</h3><label class="f">اسم المدرسة (اختياري)<input type="text" id="sn" value="' + W.esc(s.school || '') + '" placeholder="مثال: ابتدائية المحمدية بالرس"></label><p class="mut" style="margin:8px 0 0;font-size:13px">يظهر في الصفحة الرئيسية وفي الأدوات التي تحتاج اسمًا للمدرسة. يمكنك تركه فارغًا وتغييره متى شئت.</p></div>' +
      '<div class="card"><h3 style="margin-top:0">المظهر</h3><div class="seg" id="th"><button data-t="dark">' + W.ic('moon') + ' ليلي</button><button data-t="light">' + W.ic('sun') + ' نهاري</button></div></div>' +
      '<div class="card"><h3 style="margin-top:0">البيانات المحفوظة على جهازك</h3><p class="mut" style="margin:0 0 10px;font-size:13px">التواقيع والأختام المحفوظة تُخزَّن في متصفحك فقط.</p><button class="btn d" id="clr">' + W.ic('trash') + ' حذف التواقيع والأختام المحفوظة</button></div>' +
      '<div class="note">قام بعمل الأداة: فهد بن عبدالله الجروان</div></div>';
    var sn = W.$('#sn'); sn.oninput = function () { W.setSetting('school', sn.value.trim()); };
    function mark() { W.$$('#th button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === W.theme()); }); } mark();
    W.$$('#th button').forEach(function (b) { b.onclick = function () { W.setTheme(b.dataset.t); mark(); }; });
    W.$('#clr').onclick = function () { try { localStorage.removeItem('waraq2-assets'); } catch (e) {} W.toast('تم حذف العناصر المحفوظة'); };
  }
});
})();
