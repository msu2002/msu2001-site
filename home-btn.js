/* زر العودة إلى الصفحة الرئيسية لموقع المدرسة — يُضاف لكل الصفحات الفرعية */
(function () {
  if (window.__msuHomeBtn) return; window.__msuHomeBtn = 1;
  var p = location.pathname.replace(/index\.html$/, '');
  if (p === '/' || p === '') return;
  function add() {
    if (document.getElementById('msu-home-btn') || !document.body) return;
    var st = document.createElement('style');
    st.textContent = '#msu-home-btn{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:10px;z-index:2147483000;display:flex;align-items:center;gap:6px;height:40px;padding:0 13px;border-radius:999px;background:rgba(10,115,128,.94);color:#fff;font:700 13.5px/1 Tajawal,system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.28);-webkit-tap-highlight-color:transparent;direction:rtl}#msu-home-btn:hover{background:rgba(8,95,106,.98)}#msu-home-btn svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}@media (max-width:640px){#msu-home-btn{width:40px;padding:0;justify-content:center}#msu-home-btn span{display:none}}@media print{#msu-home-btn{display:none!important}}';
    document.head.appendChild(st);
    var a = document.createElement('a');
    a.id = 'msu-home-btn'; a.href = '/'; a.title = 'الصفحة الرئيسية'; a.setAttribute('aria-label', 'العودة إلى الصفحة الرئيسية');
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></svg><span>الرئيسية</span>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
