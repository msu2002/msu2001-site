/* مفتاح السلسلة: تبديل الوضع الليلي/النهاري على طريقة المفاتيح القديمة.
   يعمل مع منطق الموقع (يضغط زر التبديل الأصلي حتى تبقى الحالة متزامنة)،
   وإن لم يجده يبدّل الصنف dark/light بنفسه ويحفظ الاختيار. */
(function () {
  if (window.__pullTheme) return;
  window.__pullTheme = true;
  var KEY = "saudi_civilization_theme";
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isDark() { return !root.classList.contains("light"); }

  var css = document.createElement("style");
  css.textContent =
    "button[aria-label^=\"التبديل إلى الوضع\"],button[title^=\"التبديل إلى الوضع\"]{display:none!important}" +
    "#pullTheme{position:fixed;top:0;left:max(10px,env(safe-area-inset-left,0px));z-index:2147483000;width:84px;height:150px;" +
    "touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;direction:ltr;-webkit-tap-highlight-color:transparent;outline:none}" +
    "#pullTheme:active{cursor:grabbing}" +
    "#pullTheme svg{width:100%;height:100%;overflow:visible;display:block;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))}" +
    "#pullTheme:focus-visible .pt-plate{stroke:#fff;stroke-width:2}" +
    "#pullTheme .pt-sun,#pullTheme .pt-moon{transition:opacity .5s,filter .5s}" +
    "#pullTheme[data-mode=dark] .pt-sun{opacity:.38;filter:none}" +
    "#pullTheme[data-mode=dark] .pt-moon{opacity:1;filter:drop-shadow(0 0 5px #cfe0ff)}" +
    "#pullTheme[data-mode=light] .pt-moon{opacity:.38;filter:none}" +
    "#pullTheme[data-mode=light] .pt-sun{opacity:1;filter:drop-shadow(0 0 6px #ffd54a)}" +
    "@media(max-width:480px){#pullTheme{transform:scale(.82);transform-origin:top left}}";
  document.head.appendChild(css);

  var el = document.createElement("div");
  el.id = "pullTheme";
  el.setAttribute("role", "switch");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", "تبديل الوضع الليلي والنهاري");
  el.title = "اسحب السلسلة للتبديل بين الليلي والنهاري";
  el.innerHTML =
    '<svg viewBox="0 0 84 150" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="ptBrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9cf8f"/><stop offset=".5" stop-color="#c79a47"/><stop offset="1" stop-color="#8f6a28"/></linearGradient>' +
    '<linearGradient id="ptCork" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b98a"/><stop offset="1" stop-color="#b8935f"/></linearGradient>' +
    '<linearGradient id="ptHandle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2a"/><stop offset=".35" stop-color="#555"/><stop offset=".7" stop-color="#1a1a1a"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>' +
    '</defs>' +
    '<rect class="pt-plate" x="2" y="2" width="80" height="40" rx="9" fill="url(#ptBrass)" stroke="#6e4f1c" stroke-width="1.5"/>' +
    '<rect x="7" y="7" width="70" height="30" rx="6" fill="url(#ptCork)" stroke="#8a6a3c" stroke-width="1"/>' +
    '<g class="pt-sun" transform="translate(26 22)"><circle r="6" fill="#ffc83d" stroke="#b97a00" stroke-width="1"/>' +
    '<g stroke="#e59a00" stroke-width="1.8" stroke-linecap="round">' +
    '<path d="M0-11v-3M0 11v3M-11 0h-3M11 0h3M-7.8-7.8l-2.1-2.1M7.8 7.8l2.1 2.1M-7.8 7.8l-2.1 2.1M7.8-7.8l2.1-2.1"/></g></g>' +
    '<g class="pt-moon" transform="translate(58 22)"><path d="M3-9A10 10 0 1 0 9 5 8 8 0 0 1 3-9z" fill="#f4f1d8" stroke="#8d8a6a" stroke-width="1"/>' +
    '<path d="M-12-8l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM10-9l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z" fill="#fff6b0" transform="translate(2 0) scale(.8)"/></g>' +
    '<circle cx="9" cy="39" r="2" fill="#6e4f1c"/><circle cx="75" cy="39" r="2" fill="#6e4f1c"/>' +
    '<rect x="39" y="38" width="6" height="8" rx="2" fill="#7d5a22"/>' +
    '<path class="pt-rope" d="M42 44 L42 88" stroke="#d8c8a6" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="3 1.6"/>' +
    '<path class="pt-rope2" d="M42 44 L42 88" stroke="#8c7b58" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1.6 3" stroke-dashoffset="1.5"/>' +
    '<g class="pt-handle" transform="translate(42 88)">' +
    '<rect x="-6" y="-2" width="12" height="26" rx="6" fill="url(#ptHandle)" stroke="#000" stroke-width="1"/>' +
    '<rect x="-3.5" y="2" width="2" height="17" rx="1" fill="#fff" opacity=".28"/></g>' +
    '</svg>';
  document.body.appendChild(el);

  var rope = el.querySelector(".pt-rope"), rope2 = el.querySelector(".pt-rope2"), handle = el.querySelector(".pt-handle");
  var REST = 88, MAX = 50, TRIG = 22;
  var pull = 0, vel = 0, sway = 0, swayV = 0, dragging = false, startY = 0, startX = 0, raf = 0, moved = false;

  function paint() {
    var y = REST + pull, x = 42 + sway;
    var d = "M42 44 Q" + (42 + sway * 0.4) + " " + (44 + (y - 44) * 0.5) + " " + x + " " + y;
    rope.setAttribute("d", d); rope2.setAttribute("d", d);
    handle.setAttribute("transform", "translate(" + x + " " + y + ")");
  }
  function mode() { el.setAttribute("data-mode", isDark() ? "dark" : "light"); el.setAttribute("aria-checked", isDark() ? "true" : "false"); }

  function step() {
    if (!dragging) {
      vel += (-pull) * 0.22; vel *= 0.82; pull += vel;
    }
    swayV += (-sway) * 0.12; swayV *= 0.9; sway += swayV;
    paint();
    if (dragging || Math.abs(pull) > 0.05 || Math.abs(vel) > 0.05 || Math.abs(sway) > 0.05) raf = requestAnimationFrame(step);
    else { pull = vel = sway = swayV = 0; paint(); raf = 0; }
  }
  function run() { if (!raf) raf = requestAnimationFrame(step); }

  function nativeBtn() {
    var bs = document.querySelectorAll("button[aria-label],button[title]");
    for (var i = 0; i < bs.length; i++) {
      var t = (bs[i].getAttribute("aria-label") || "") + " " + (bs[i].getAttribute("title") || "");
      if (t.indexOf("التبديل إلى الوضع") > -1) return bs[i];
    }
    return null;
  }
  function toggle() {
    var b = nativeBtn();
    if (b) { b.click(); }
    else {
      var next = isDark() ? "light" : "dark";
      root.classList.remove("dark", "light"); root.classList.add(next); root.style.colorScheme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
    }
    setTimeout(mode, 30);
  }
  function tug(strong) {
    if (reduce) return;
    vel = strong ? 9 : 6; swayV = (Math.random() - .5) * 3; run();
  }

  el.addEventListener("pointerdown", function (e) {
    dragging = true; moved = false; startY = e.clientY; startX = e.clientX;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    run(); e.preventDefault();
  });
  el.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dy = e.clientY - startY, dx = e.clientX - startX;
    if (Math.abs(dy) > 3 || Math.abs(dx) > 3) moved = true;
    var target = Math.max(0, Math.min(MAX, dy));
    pull = target > TRIG ? TRIG + (target - TRIG) * 0.5 : target;
    sway = Math.max(-8, Math.min(8, dx * 0.25));
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    var fired = pull >= TRIG * 0.9 || !moved;
    if (fired) { toggle(); if (!moved) { pull = 0; tug(true); } }
    vel = 0; run();
  }
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", function () { dragging = false; run(); });
  el.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); tug(true); }
  });

  new MutationObserver(mode).observe(root, { attributes: true, attributeFilter: ["class"] });
  mode(); paint();
})();
