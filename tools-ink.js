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
'.ink-tile svg{width:100%;height:100%;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;filter:url(#ink-rough)}';
function key(a){var h=(a.getAttribute('href')||'').replace(/^\.?\/?/,'').replace(/\.html$/,'').replace(/\/$/,'');return ICON[h]?h:null}

var PS={id:"frm-card7",u:"/photo-studio/",k:"فهد فوتو أستديو",t:"فهد فوتو أستديو: تحرير الصور والتصميم",p:"استوديو عربي في المتصفح: تحرير الصور، خطوط عربية بتأثيرات وقوالب جاهزة، توقيع وختم وعلامة مائية وQR، وتصدير PNG وJPG وPDF — بدون حساب وبمعالجة محلية على جهازك."},psOk=0,psTried=0;
function psCheck(){if(psTried)return;psTried=1;fetch(PS.u,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(x){if(x.indexOf(PS.k)>-1){psOk=1;apply()}}).catch(function(){})}
function psPut(s){if(!psOk||document.getElementById(PS.id))return;var ref=document.getElementById("frm-card6")||document.getElementById("frm-card5");if(!ref||!ref.getAttribute("data-ink"))return;
 var n=ref.cloneNode(true);n.id=PS.id;n.href=PS.u;n.setAttribute("data-ink","photo-studio");
 var h=n.querySelector("h3"),p=n.querySelector("p"),v=n.querySelector(".ink-tile svg");if(!h||!p||!v)return;
 h.textContent=PS.t;p.textContent=PS.p;v.innerHTML=ICON["photo-studio"];ref.after(n)}
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
 if(any)s.classList.add('ink-grid');psCheck();psPut(s)}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
