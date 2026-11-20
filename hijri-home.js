/* التقويم الهجري ظاهر مباشرة في الصفحة الرئيسية بدل قسم العد التنازلي — Fahad Al-Jarwan */
(function(){
var U="/hijri/";
var css='#events>*:not(.hj-wrap){display:none!important}'+
'.hj-wrap{display:block;direction:rtl}'+
'.hj-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;margin-bottom:14px}'+
'.hj-eye{font-size:12px;font-weight:800;color:#E8C87A;background:#005C294d;border:1px solid rgba(197,155,63,.4);border-radius:999px;padding:4px 12px}'+
'.hj-head h2{margin:0;font-size:clamp(20px,3.6vw,30px);font-weight:800;color:#FAF7F2;flex:1;min-width:0}'+
'.hj-frame{display:block;width:100%;height:1100px;border:0;background:transparent;color-scheme:dark}';
function addCss(){if(document.getElementById("hj-css"))return;var s=document.createElement("style");s.id="hj-css";s.textContent=css;document.head.appendChild(s)}
function big(){var ev=document.getElementById("events");if(!ev)return;addCss();var w=ev.querySelector(".hj-wrap");
 if(!w){w=document.createElement("div");w.className="hj-wrap";
  w.innerHTML='<div class="hj-head"><span class="hj-eye">التقويم الهجري</span><h2>التقويم الهجري وأوقات الصلاة والمناسبات</h2></div><iframe id="hj-frame" class="hj-frame" src="'+U+'?embed=1" title="التقويم الهجري وأوقات الصلاة" scrolling="no"></iframe>';
  ev.appendChild(w);
  addEventListener("message",function(e){if(e.origin!==location.origin||!e.data||!e.data.hjH)return;var f=document.getElementById("hj-frame");if(f)f.style.height=Math.max(600,e.data.hjH)+"px"})}}
function run(){big()}
run();new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
