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

  /* رسالة ترحيبية: مرة واحدة في كل جلسة */
  function welcome() {
    try { if (sessionStorage.getItem('waraq-welcome')) return; sessionStorage.setItem('waraq-welcome', '1'); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = '#wlc{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,12,16,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:wlcIn .35s ease}' +
      '#wlc .box{width:min(440px,100%);text-align:center;background:var(--surface);color:var(--ink);border:1px solid var(--line2);border-radius:22px;padding:30px 24px 24px;box-shadow:0 24px 70px rgba(0,0,0,.45);animation:wlcUp .45s cubic-bezier(.2,.8,.2,1)}' +
      '#wlc .mk{width:62px;height:62px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand),var(--brand2));color:var(--brand-ink);font-size:30px}' +
      '#wlc .mk svg{width:32px;height:32px}' +
      '#wlc small{display:block;color:var(--mut);font-size:13px;margin-bottom:6px}' +
      '#wlc h2{margin:0 0 12px;font-size:22px;line-height:1.5}' +
      '#wlc .nm{margin:0 0 6px;font-size:18px;font-weight:700;line-height:1.9;color:var(--brand2)}' +
      ':root:not([data-theme=light]) #wlc .nm{color:var(--brand)}' +
      '#wlc .ln{height:1px;background:var(--line);margin:16px 0}' +
      '#wlc p{margin:0 0 18px;color:var(--mut);font-size:13.5px}' +
      '#wlc.out{opacity:0;transition:opacity .28s}' +
      '@keyframes wlcIn{from{opacity:0}to{opacity:1}}@keyframes wlcUp{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'wlc'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'رسالة ترحيبية');
    d.innerHTML = '<div class="box"><div class="mk">' + W.ic('pdf') + '</div><small>أهلًا بك في ورق</small><h2>إهداء خاص للزملاء</h2>' +
      '<div class="nm">محمد صالح الشعلان</div><div class="nm">معتز عبدالله العواجي</div><div class="ln"></div>' +
      '<p>أدوات تعمل على جهازك مباشرة، ولا يُرفع أي ملف إلى الإنترنت.</p><button class="btn p" type="button" id="wlcgo">ابدأ الاستخدام</button></div>';
    document.body.appendChild(d);
    function close() { d.classList.add('out'); setTimeout(function () { d.remove(); st.remove(); }, 300); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape' || e.key === 'Enter') close(); }
    document.getElementById('wlcgo').onclick = close; d.addEventListener('click', function (e) { if (e.target === d) close(); }); document.addEventListener('keydown', key);
    document.getElementById('wlcgo').focus();
  }
  welcome();
})();
