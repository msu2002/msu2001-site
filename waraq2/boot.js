(function () {
  var W = window.W;
  W.buildNav();
  window.addEventListener('hashchange', W.render);
  W.render();
})();
