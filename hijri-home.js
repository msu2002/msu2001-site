/* التقويم الهجري على الصفحة الرئيسية: بطاقة أيقونة + بطاقة كبيرة بدل قسم العد التنازلي — Fahad Al-Jarwan */
(function(){
var U="/hijri/";
var IC='<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M14.4 12.6a3.1 3.1 0 1 0 .9 4.5 2.5 2.5 0 0 1-.9-4.5z"/>';
var css='#events>*:not(.hj-wrap){display:none!important}'+
'.hj-wrap{display:block}'+
'.hj-big{display:flex;align-items:center;gap:24px;padding:30px;border-radius:28px;text-decoration:none;color:#fff;direction:rtl;background:radial-gradient(circle at 85% 0%,#17a35a 0%,#0a4d2b 55%,#06301a 100%);border:1.5px solid rgba(197,155,63,.55);box-shadow:0 18px 44px #0007,inset 0 0 0 1px #ffffff1c;transition:transform .2s}'+
'.hj-big:hover{transform:translateY(-3px)}'+
'.hj-tile{flex:none;width:104px;height:104px;border-radius:32px;padding:24px;background:linear-gradient(135deg,#e8c87a,#a87c1f);box-shadow:0 10px 26px #0006}'+
'.hj-tile svg{width:100%;height:100%;fill:none;stroke:#0a3b20;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}'+
'.hj-body{min-width:0;flex:1}'+
'.hj-eye{display:inline-block;font-size:12px;font-weight:800;color:#E8C87A;background:#0003;border:1px solid rgba(197,155,63,.4);border-radius:999px;padding:4px 12px;margin-bottom:10px}'+
'.hj-big h2{margin:0 0 8px;font-size:clamp(22px,4vw,32px);font-weight:800;line-height:1.35;color:#fff}'+
'.hj-date{font-size:15px;font-weight:700;color:#E8C87A;margin-bottom:8px}'+
'.hj-big p{margin:0 0 14px;font-size:14.5px;line-height:1.8;color:#e6efe8}'+
'.hj-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}'+
'.hj-chips span{font-size:12.5px;padding:4px 12px;border-radius:999px;background:#ffffff1c;border:1px solid #ffffff2e}'+
'.hj-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:999px;background:#E8C87A;color:#0a3b20;font-weight:800;font-size:15px}'+
'@media(max-width:640px){.hj-big{flex-direction:column;align-items:flex-start;padding:22px}.hj-tile{width:84px;height:84px;padding:19px;border-radius:26px}}';
function hdate(){try{var d=new Date();return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d)}catch(e){return""}}
function addCss(){if(document.getElementById("hj-css"))return;var s=document.createElement("style");s.id="hj-css";s.textContent=css;document.head.appendChild(s)}
function big(){var ev=document.getElementById("events");if(!ev)return;addCss();var w=ev.querySelector(".hj-wrap");
 if(!w){w=document.createElement("div");w.className="hj-wrap";
  w.innerHTML='<a class="hj-big" href="'+U+'"><div class="hj-tile"><svg viewBox="0 0 24 24" aria-hidden="true">'+IC+'</svg></div><div class="hj-body"><span class="hj-eye">التقويم الهجري</span><h2>التقويم الهجري وأوقات الصلاة والمناسبات</h2><div class="hj-date"></div><p>تقويم أم القرى بتاريخ اليوم، وأوقات الصلاة لمدينتك، والعد التنازلي لأهم المناسبات والإجازات والعام الدراسي، في صفحة واحدة.</p><div class="hj-chips"><span>أم القرى</span><span>أوقات الصلاة</span><span>العد التنازلي للمناسبات</span><span>العام الدراسي 1448</span></div><span class="hj-btn">افتح التقويم ←</span></div></a>';
  ev.appendChild(w)}
 var d=w.querySelector(".hj-date");var t=hdate();if(d&&d.textContent!==t)d.textContent=t}
function card(){var t=document.getElementById("tools");if(!t||document.getElementById("frm-card14"))return;
 var base=document.getElementById("frm-card12");if(!base||!base.getAttribute("data-ink"))return;var ref=document.getElementById("frm-card13")||base;
 var n=base.cloneNode(true);n.id="frm-card14";n.href=U;n.removeAttribute("rel");n.removeAttribute("target");n.setAttribute("data-ink","hijri");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent="التقويم الهجري وأوقات الصلاة";p.textContent="تاريخ اليوم بتقويم أم القرى، وأوقات الصلاة، والعد التنازلي للمناسبات والإجازات والعام الدراسي.";p.style.display="";v.innerHTML=IC;
 var tl=n.querySelector(".ink-tile");if(tl)tl.style.removeProperty("background");h.style.removeProperty("color");ref.after(n)}
function run(){big()}
run();new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
