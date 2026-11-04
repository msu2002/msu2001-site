(function () {
var W = window.W;
var TOOLS = [
  ['pdf', 'pdf', 'أدوات PDF', 'دمج وتقسيم وترتيب الصفحات وتدويرها، وتحويل الصور إلى PDF والعكس.'],
  ['studio', 'pen', 'التوقيع والختم وإزالة العلامة', 'أضف توقيعك واسمك وختمك على أي صفحة، أو أزل العلامة المائية من الملف.'],
  ['image', 'image', 'تنظيف الصور والمستندات', 'قص وتدوير وتبييض الخلفية وتحويل الصورة إلى مستند ممسوح نظيف.'],
  ['ocr', 'scan', 'استخراج النص العربي', 'حوّل الصور وملفات PDF الممسوحة إلى نص عربي قابل للتحرير والنسخ.']
];
W.register('home', {
  nav: 1, icon: 'home', title: 'الرئيسية', short: 'الرئيسية',
  render: function (v) {
    var name = W.settings().school;
    var h = '<div class="wrap"><div class="hero"><p class="mut">' + (name ? W.esc(name) : 'مساحة عمل المعلم') + '</p><h2>ماذا تريد أن تنجز اليوم؟</h2><p>كل الأدوات تعمل على جهازك مباشرة، ولا يُرفع أي ملف إلى الإنترنت.</p></div>' +
      W.dropZone({ id: 'hdz', title: 'اسحب ملفك هنا لنبدأ', sub: 'PDF أو صور (PNG, JPG, WebP) — وسنقترح لك الأداة المناسبة', btn: 'اختيار ملف' }) +
      '<h3 style="margin:26px 0 12px">الأدوات</h3><div class="grid g3">';
    TOOLS.forEach(function (t) { h += '<a class="tool" href="#/' + t[0] + '"><div class="ti">' + W.ic(t[1]) + '</div><b>' + t[2] + '</b><p>' + t[3] + '</p></a>'; });
    h += '<a class="tool" href="' + W.ROOT + '?old=1"><span class="tag">النسخة السابقة</span><div class="ti">' + W.ic('book') + '</div><b>أدوات المدرسة الأخرى</b><p>التقارير والشواهد، نسخة الطالب والمعلم، التلوين، قوالب المدرسة، والطباعة.</p></a></div>' +
      '<div class="note" style="margin-top:18px;display:flex;gap:10px;align-items:center">' + W.ic('shield') + '<span>خصوصيتك محفوظة: الملفات لا تغادر جهازك، ويمكنك استخدام الأدوات بلا حساب.</span></div></div>';
    v.innerHTML = h;
    W.bindDrop('hdz', 'application/pdf,image/*', true, function (files) {
      W.pending = files; var f = files[0];
      if (W.isPdf(f)) W.go('pdf'); else W.go('studio');
    });
  }
});
})();
