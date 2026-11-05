(function () {
  var W = window.W;
  var base = W.render;
  W.render = function () {
    base();
    var id = W.cur, top = document.querySelector('#top');
    if (!top || !id || id === 'home') return;
    var a = document.createElement('a');
    a.className = 'btn sm homebtn'; a.href = '#/home'; a.setAttribute('aria-label', 'العودة إلى الصفحة الرئيسية');
    a.innerHTML = W.ic('home') + '<span class="hl">الرئيسية</span>';
    top.insertBefore(a, top.firstChild);
  };
  W.buildNav();
  window.addEventListener('hashchange', W.render);
  W.render();
})();
