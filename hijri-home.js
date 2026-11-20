/* التقويم الهجري ظاهر مباشرة في الصفحة الرئيسية + شريط الصلاة القادمة — Fahad Al-Jarwan */
(function(){
var U="/hijri/";
var css='#events>*:not(.hj-wrap){display:none!important}'+
'.hj-wrap{display:block;direction:rtl}'+
'.hj-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;margin-bottom:14px}'+
'.hj-eye{font-size:12px;font-weight:800;color:#E8C87A;background:#005C294d;border:1px solid rgba(197,155,63,.4);border-radius:999px;padding:4px 12px}'+
'.hj-head h2{margin:0;font-size:clamp(20px,3.6vw,30px);font-weight:800;color:#FAF7F2;flex:1;min-width:0}'+
'.hj-frame{display:block;width:100%;height:1100px;border:0;background:transparent;color-scheme:dark}'+
'.hj-rib{max-width:64rem;margin:10px auto 0;padding:0 16px;direction:rtl;font-family:inherit}'+
'.hj-rib a{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;justify-content:center;text-decoration:none;color:#FAF7F2;background:linear-gradient(135deg,rgba(0,92,41,.55),rgba(14,28,18,.85));border:1px solid rgba(197,155,63,.45);border-radius:999px;padding:9px 18px;font-weight:700;font-size:14px;line-height:1.5;transition:border-color .2s,box-shadow .2s}'+
'.hj-rib a:hover{border-color:#E8C87A}'+
'.hj-rib b{color:#E8C87A;font-weight:800}'+
'.hj-rib .t{font-variant-numeric:tabular-nums;direction:ltr;font-size:17px;font-weight:800;color:#E8C87A;min-width:5.2em;text-align:center}'+
'.hj-rib .m{opacity:.75;font-weight:500;font-size:12.5px}'+
'.hj-rib.ad a{background:linear-gradient(135deg,#005C29,#C59B3F);border-color:#E8C87A;animation:hjp 1.4s ease infinite}'+
'.hj-rib.ad .t,.hj-rib.ad b{color:#fff}'+
'@keyframes hjp{0%,100%{box-shadow:0 0 0 0 rgba(232,200,122,.5)}50%{box-shadow:0 0 0 10px rgba(232,200,122,0)}}'+
'@media(prefers-reduced-motion:reduce){.hj-rib.ad a{animation:none}}'+
'@media(max-width:520px){.hj-rib a{border-radius:18px;padding:8px 12px;font-size:13px}.hj-rib .m{display:none}}';
function addCss(){if(document.getElementById("hj-css"))return;var s=document.createElement("style");s.id="hj-css";s.textContent=css;document.head.appendChild(s)}
function big(){var ev=document.getElementById("events");if(!ev)return;addCss();var w=ev.querySelector(".hj-wrap");
 if(!w){w=document.createElement("div");w.className="hj-wrap";
  w.innerHTML='<div class="hj-head"><span class="hj-eye">التقويم الهجري</span><h2>التقويم الهجري وأوقات الصلاة والمناسبات</h2></div><iframe id="hj-frame" class="hj-frame" src="'+U+'?embed=1" title="التقويم الهجري وأوقات الصلاة" loading="lazy" scrolling="no"></iframe>';
  ev.appendChild(w);fit()}}
var fitOn=false;function fit(){if(fitOn)return;fitOn=true;setInterval(function(){var f=document.getElementById("hj-frame");if(!f)return;try{var x=f.contentDocument;if(x&&x.body){var h=Math.max(600,Math.ceil(x.body.getBoundingClientRect().height+24));if(Math.abs(h-parseInt(f.style.height||0))>2)f.style.height=h+"px"}}catch(e){}},700)}

/* ===== شريط الصلاة القادمة ===== */
var P=[["Fajr","الفجر"],["Sunrise","الشروق"],["Dhuhr","الظهر"],["Asr","العصر"],["Maghrib","المغرب"],["Isha","العشاء"]];
var T=null,TZ=null,placeName="",ribMade=false;
function ld(k,f){try{var v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
function pad(n){return String(n).padStart(2,"0")}
function today(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function place(){var p=ld("hc_place",null)||{city:"Ar Rass",country:"Saudi Arabia",ar:"الرس"};if(!p.ar&&p.city==="Ar Rass")p.ar="الرس";return p}
function method(){return +ld("hc_method",4)||4}
function nowSec(){try{if(TZ){var q=new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());var g=function(t){return +q.find(function(x){return x.type===t}).value};return g("hour")*3600+g("minute")*60+g("second")}}catch(e){}var n=new Date();return n.getHours()*3600+n.getMinutes()*60+n.getSeconds()}
function hs(s){var a=s.slice(0,5).split(":");return a[0]*3600+a[1]*60}
function fetchT(){var p=place(),m=method(),key=p.city+"|"+m+"|"+today();placeName=p.ar||p.city;
 var c=ld("hc_tm",null);if(c&&c.k===key&&c.t){T=c.t;TZ=c.tz||null;return}
 fetch("https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(p.city)+"&country="+encodeURIComponent(p.country)+"&method="+m).then(function(r){return r.json()}).then(function(j){if(!j||!j.data)return;T=j.data.timings;TZ=j.data.meta&&j.data.meta.timezone||null;try{localStorage.setItem("hc_tm",JSON.stringify({k:key,t:T,tz:TZ}))}catch(e){}}).catch(function(){})}
function hij(){try{return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}catch(e){return""}}
function ribTick(){var el=document.getElementById("hj-rib");if(!el)return;if(!T){el.firstChild.innerHTML='<span>🕌 أوقات الصلاة</span><span class="m">'+hij()+'</span>';return}
 var now=nowSec(),ad=null,nx=null,i,t;
 for(i=0;i<P.length;i++){if(P[i][0]==="Sunrise")continue;t=hs(T[P[i][0]]);if(now>=t&&now-t<90)ad=P[i][1]}
 for(i=0;i<P.length;i++){t=hs(T[P[i][0]]);if(t>now){nx={n:P[i][1],s:t-now};break}}
 if(!nx)nx={n:"الفجر",s:86400-now+hs(T.Fajr)};
 el.classList.toggle("ad",!!ad);
 var inner=ad?'<span>🕌 حان الآن موعد أذان <b>'+ad+'</b> — '+placeName+'</span>':'<span>🕌 الصلاة القادمة: <b>'+nx.n+'</b></span><span class="t">'+pad(Math.floor(nx.s/3600))+":"+pad(Math.floor(nx.s%3600/60))+":"+pad(nx.s%60)+'</span><span class="m">'+placeName+" · "+hij()+"</span>";
 if(el.firstChild._h!==inner){el.firstChild.innerHTML=inner;el.firstChild._h=inner}}
function ribbon(){if(document.getElementById("hj-rib"))return;var main=document.querySelector("main");if(!main||main.children.length<2)return;addCss();
 var d=document.createElement("div");d.id="hj-rib";d.className="hj-rib";d.innerHTML='<a href="#events" aria-label="أوقات الصلاة والتقويم الهجري"></a>';
 d.firstChild.onclick=function(e){var ev=document.getElementById("events");if(ev){e.preventDefault();ev.scrollIntoView({behavior:"smooth",block:"start"})}};
 main.insertBefore(d,main.children[1]);fetchT();ribTick();
 if(!ribMade){ribMade=true;setInterval(ribTick,1000);setInterval(fetchT,600000);addEventListener("storage",function(e){if(e.key==="hc_place"||e.key==="hc_method")fetchT()})}}
function run(){big();ribbon()}
run();new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
