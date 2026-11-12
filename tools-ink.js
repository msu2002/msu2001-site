/* Ink-style icon cards for the #tools list — white line icons on green tiles. Fahad Al-Jarwan */
(function(){
var ICON={
"pdf-studio":'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17.5l5.6-5.6 1.6 1.6-5.6 5.6H9z"/>',
"digital-contract":'<path d="M12 3l7 3v5.2c0 4.4-3 7.9-7 9.8-4-1.9-7-5.4-7-9.8V6z"/><path d="M8.7 12.2l2.4 2.4 4.3-4.7"/>',
"manahej-form":'<path d="M7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1"/><rect x="8" y="3.5" width="8" height="4" rx="1"/><path d="M8.5 12.5h7M8.5 16.5h4.5"/>',
"msu-library":'<path d="M4 20.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15.5"/><path d="M9 20.5V7.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v13"/><path d="M14.6 9.2l3-.9a1 1 0 0 1 1.2.7l2.3 10.8-3.6.9z"/><path d="M3 20.5h18"/>',
"waraq":'<path d="M3 8.5h18V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 8.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5"/><path d="M3 13.5h18"/><path d="M10.8 12v3h2.4v-3"/>',
"quran":'<path d="M12 6.2c-2.2-1.6-5.2-2.1-8.2-1.5v13c3-.6 6 0 8.2 1.6 2.2-1.6 5.2-2.2 8.2-1.6v-13c-3-.6-6 0-8.2 1.5z"/><path d="M12 6.2v13"/><path d="M7.4 9.8c1.4-.2 2.6 0 3.6.5M7.4 13c1.4-.2 2.6 0 3.6.5M13 10.3c1-.5 2.2-.7 3.6-.5M13 13.5c1-.5 2.2-.7 3.6-.5"/>',
"photo-studio":'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="M3.8 17l5-4.6 3.4 3.1 3-2.6 5 4.4"/><path d="M18 2.4v2.8M16.6 3.8h2.8"/>',
"shawahed":'<rect x="5" y="4.5" width="14" height="17" rx="2.5"/><path d="M9 4.5h6v-1.2a.8.8 0 0 0-.8-.8H9.8a.8.8 0 0 0-.8.8z"/><path d="M8.5 11l1.3 1.3 2.2-2.4M8.5 16l1.3 1.3 2.2-2.4M14 11.2h2.5M14 16.2h2.5"/>',
"shawahed-staff":'<rect x="5" y="4.5" width="14" height="17" rx="2.5"/><path d="M9 4.5h6v-1.2a.8.8 0 0 0-.8-.8H9.8a.8.8 0 0 0-.8.8z"/><circle cx="12" cy="10.2" r="1.9"/><path d="M8.6 17c.5-2 1.9-3 3.4-3s2.9 1 3.4 3"/>',
"rumooz":'<g fill="#fff" stroke="none"><path d="M12.19 5.09A5.44 5.44 0 1 0 13.68 15.53 5.44 5.44 0 0 1 12.19 5.09z"/><path d="M17.62 6.75l.79 1.61 1.78.26-1.29 1.26.3 1.78-1.58-.84-1.59.84.3-1.78-1.29-1.26 1.78-.26z"/></g><g fill="#fff" fill-opacity=".72" stroke="none"><rect x="4.9" y="17.25" width="3" height="3" rx=".75"/><rect x="9" y="17.25" width="3" height="3" rx=".75"/><rect x="13.1" y="17.25" width="3" height="3" rx=".75"/><rect x="17.25" y="17.25" width="3" height="3" rx=".75"/></g>',
"qr":'<rect x="3.4" y="3.4" width="7" height="7" rx="1.7"/><rect x="13.6" y="3.4" width="7" height="7" rx="1.7"/><rect x="3.4" y="13.6" width="7" height="7" rx="1.7"/><path d="M6.5 6.5h.8v.8h-.8zM16.7 6.5h.8v.8h-.8zM6.5 16.7h.8v.8h-.8z"/><path d="M13.6 13.6h3.1M20.6 13.6h-1.4M13.6 17.1h1.7M17.5 17.1h3.1M13.6 20.6h2.7M18.9 20.6h1.7M18.4 13.6v3M16.3 18.8v1.8"/>',
"fahad-studio":'<path d="M4 10.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3.6 7.2l15.3-3.5.7 3.1-15.3 3.5z"/><path d="M7.7 6.7l2.1 3M12.2 5.7l2.1 3M16.7 4.7l2.1 3"/><path d="M10.5 13.4v4.2l3.8-2.1z"/>'
};
var css='#tools.ink-grid{display:grid;grid-template-columns:1fr;gap:14px}'+
'@media(min-width:560px){#tools.ink-grid{grid-template-columns:repeat(2,1fr)}#tools.ink-grid>a[data-ink="pdf-studio"],#tools.ink-grid>a[data-ink="quran"]{grid-column:span 2}}'+
'@media(min-width:900px){#tools.ink-grid{grid-template-columns:repeat(3,1fr)}#tools.ink-grid>a[data-ink="pdf-studio"]{grid-column:span 2}#tools.ink-grid>a[data-ink="quran"]{grid-column:span 1}}'+
'#tools.ink-grid>a[data-ink]{margin-top:0!important;flex-direction:column;align-items:flex-start;gap:16px;position:relative;min-width:0}'+
'#tools.ink-grid>a[data-ink]>div.ink-old{display:none}'+
'#tools.ink-grid>a[data-ink]>div.flex-1{width:100%}'+
'#tools.ink-grid>a[data-ink]>svg.lucide-arrow-left{position:absolute;inset-inline-end:auto;left:18px;top:20px;opacity:.85}'+
'.ink-tile{flex:none;width:84px;height:84px;border-radius:26px;padding:19px;background:radial-gradient(circle at 30% 20%,#17a35a,#0a4d2b);box-shadow:0 10px 26px #0009,inset 0 0 0 1.5px #ffffff26}'+
'.ink-tile svg{width:100%;height:100%;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;filter:url(#ink-rough)}'+
'#tools.ink-grid>a[data-ink="rumooz"] .ink-tile{padding:9px}#tools.ink-grid>a[data-ink="rumooz"] .ink-tile svg{filter:none}';
function key(a){var h=(a.getAttribute('href')||'').replace(/^\.?\/?/,'').replace(/\.html$/,'').replace(/\/$/,'');return ICON[h]?h:null}

var PS={id:"frm-card7",u:"/photo-studio/",k:"فهد فوتو أستديو",t:"فهد فوتو أستديو: تحرير الصور والتصميم",p:"استوديو عربي في المتصفح: تحرير الصور، خطوط عربية بتأثيرات وقوالب جاهزة، توقيع وختم وعلامة مائية وQR، وتصدير PNG وJPG وPDF — بدون حساب وبمعالجة محلية على جهازك."},psOk=0,psTried=0;
function psCheck(){if(psTried)return;psTried=1;fetch(PS.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(PS.k)>-1){psOk=1;apply()}}).catch(function(){})}
function psPut(s){if(!psOk||document.getElementById(PS.id))return;var ref=document.getElementById("frm-card6")||document.getElementById("frm-card5");if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=PS.id;n.href=PS.u;n.setAttribute("data-ink","photo-studio");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=PS.t;p.textContent=PS.p;v.innerHTML=ICON["photo-studio"];ref.after(n)}
var SH={id:"frm-card8",u:"/shawahed/",k:"شواهد",t:"شواهدي الإدارية",p:"سجل متابعة المهام الخاص بي: توثيق الشواهد اليومية بالصور، مقفل برقم سري، مع تصدير PDF وحفظ في مجلد Drive الخاص."},shOk=0,shTried=0;
function shCheck(){if(shTried)return;shTried=1;fetch(SH.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(SH.k)>-1){shOk=1;apply()}}).catch(function(){})}
function shPut(){if(!shOk||document.getElementById(SH.id))return;var ref=document.getElementById(PS.id)||document.getElementById("frm-card6")||document.getElementById("frm-card5");if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=SH.id;n.href=SH.u;n.setAttribute("data-ink","shawahed");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=SH.t;p.textContent=SH.p;v.innerHTML=ICON["shawahed"];ref.after(n)}
var SF={id:"frm-card9",u:"/shawahed-staff/",k:"شواهد الإداريين",t:"شواهد الإداريين",p:"سجل متابعة المهام للإداريين: يكتب كل موظف اسمه ومسماه، ويرفق شواهده بالصور أو ملفات Word وExcel، مقفل برقم سري مع تصدير PDF ومشاركة."},sfOk=0,sfTried=0;
function sfCheck(){if(sfTried)return;sfTried=1;fetch(SF.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(SF.k)>-1){sfOk=1;apply()}}).catch(function(){})}
function sfPut(){if(!sfOk||document.getElementById(SF.id))return;var ref=document.getElementById(SH.id)||document.getElementById(PS.id);if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=SF.id;n.href=SF.u;n.setAttribute("data-ink","shawahed-staff");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=SF.t;p.textContent=SF.p;v.innerHTML=ICON["shawahed-staff"];n.querySelector(".ink-tile").style.setProperty("background","radial-gradient(circle at 30% 20%,#e5313d,#8f0d17)","important");h.style.setProperty("color","#c1121f","important");ref.after(n)}
var RZ={id:"frm-card10",u:"/rumooz/",k:"فهد رموز",t:"فهد رموز: الحروف والرموز العربية",p:"ابحث عن الحروف والرموز العربية وانسخها بنقرة: التشكيل، الرموز الإسلامية، العملات، وأكواد Word وصفحات الويب، مع مربع لتجميع النص وتنظيفه."},rzOk=0,rzTried=0;
function rzCheck(){if(rzTried)return;rzTried=1;fetch(RZ.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(RZ.k)>-1){rzOk=1;apply()}}).catch(function(){})}
function rzPut(){if(!rzOk||document.getElementById(RZ.id))return;var ref=document.getElementById(SF.id)||document.getElementById(SH.id)||document.getElementById(PS.id);if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=RZ.id;n.href=RZ.u;n.setAttribute("data-ink","rumooz");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=RZ.t;p.textContent=RZ.p;v.innerHTML=ICON["rumooz"];n.querySelector(".ink-tile").style.removeProperty("background");h.style.removeProperty("color");ref.after(n)}
var QB={id:"frm-card11",u:"/qr/",k:"باركود الشهادات",t:"باركود الشهادات والصور",p:"اصنع باركود أي رابط بشكل ولون ومقاس تختاره، واختصر الرابط، وضع الباركود على الشهادة أو الصورة أو ملف PDF أو Word، ثم حمّله صورة أو PDF — والمعالجة كلها داخل جهازك."},qbOk=0,qbTried=0;
function qbCheck(){if(qbTried)return;qbTried=1;fetch(QB.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(QB.k)>-1){qbOk=1;apply()}}).catch(function(){})}
function qbPut(){if(!qbOk||document.getElementById(QB.id))return;var ref=document.getElementById(RZ.id)||document.getElementById(SF.id)||document.getElementById(SH.id)||document.getElementById(PS.id);if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=QB.id;n.href=QB.u;n.setAttribute("data-ink","qr");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=QB.t;p.textContent=QB.p;v.innerHTML=ICON["qr"];n.querySelector(".ink-tile").style.removeProperty("background");h.style.removeProperty("color");ref.after(n)}
function apply(){
 var s=document.getElementById('tools');if(!s)return;
 if(!document.getElementById('ink-css')){var st=document.createElement('style');st.id='ink-css';st.textContent=css;document.head.appendChild(st);
  var d=document.createElement('div');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML='<svg width="0" height="0" aria-hidden="true"><filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.1"/></filter></svg>';document.body.appendChild(d)}
 var cards=[].slice.call(s.children).filter(function(c){return c.tagName==='A'});var any=false;
 cards.forEach(function(a){var k=key(a);if(!k)return;any=true;if(a.getAttribute('data-ink'))return;
  a.setAttribute('data-ink',k);
  var old=a.firstElementChild;if(old&&old.tagName==='DIV'&&!old.classList.contains('flex-1'))old.classList.add('ink-old');
  var t=document.createElement('div');t.className='ink-tile';t.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[k]+'</svg>';
  a.insertBefore(t,a.firstChild)});
 if(any)s.classList.add('ink-grid');psCheck();psPut(s);shCheck();shPut();sfCheck();sfPut();rzCheck();rzPut();qbCheck();qbPut()}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();

/* أيقونة «شواهد» المثبّتة أعلى الصفحة الرئيسية + دبوس الموقع — Fahad Al-Jarwan */
(function(){
return; /* أزيل دبوس الموقع بطلب المالك */
var MAP="https://maps.app.goo.gl/WXjmEN62Z4q2gBeR6?g_st=ic";
function add(){
 if(document.getElementById("shw-pin")||!document.body)return;
 var st=document.createElement("style");
 st.textContent="#shw-pin{position:absolute;top:calc(68px + env(safe-area-inset-top,0px));right:12px;z-index:2147482000;display:flex;gap:8px;direction:rtl;font-family:Tajawal,Cairo,system-ui,sans-serif}#shw-pin a{display:flex;align-items:center;gap:8px;height:46px;padding:0 16px 0 12px;border-radius:999px;background:linear-gradient(135deg,#34b3b4,#176b6c);color:#fff;font-weight:800;font-size:15px;text-decoration:none;border:1.5px solid rgba(255,255,255,.55);box-shadow:0 6px 20px rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent}#shw-pin a.m{width:46px;padding:0;justify-content:center;background:linear-gradient(135deg,#d9b04d,#a87c1f)}#shw-pin svg{width:24px;height:24px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#shw-pin a:active{transform:scale(.96)}@media(max-width:420px){#shw-pin a.s span{display:none}#shw-pin a.s{width:46px;padding:0;justify-content:center}}@media print{#shw-pin{display:none!important}}";
 document.head.appendChild(st);
 var d=document.createElement("div");d.id="shw-pin";
 d.innerHTML='<a class="m" href="'+MAP+'" target="_blank" rel="noopener" title="الموقع على الخريطة" aria-label="الموقع على الخريطة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg></a>';
 document.body.appendChild(d);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add);else add();
})();
