/* ورق — مدير الخطوط: يضيف خطوطًا عربية رسمية محلية ويربطها بكتابة PDF والطباعة والمعاينة */
(function(){
'use strict';
var ROOT=new URL('.',document.currentScript.src).href;
var KEY='waraq-fonts-v1';
var FONTS=[];var custom=[];
var st={key:'noto',bold:false,color:'#111827'};
try{var s=JSON.parse(localStorage.getItem(KEY)||'{}');for(var k in s)st[k]=s[k];}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function byKey(k){for(var i=0;i<FONTS.length;i++)if(FONTS[i].k===k)return FONTS[i];return FONTS[0]||null;}
function url(f,w){return f.blob?f.blob:ROOT+'fonts/'+(w===700?f.f700:f.f400);}
/* ---------- IndexedDB للخطوط الخاصة ---------- */
function idb(){return new Promise(function(res,rej){var r=indexedDB.open('waraq-fonts',1);r.onupgradeneeded=function(){r.result.createObjectStore('f',{keyPath:'id'});};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
function idbAll(){return idb().then(function(db){return new Promise(function(res){var q=db.transaction('f').objectStore('f').getAll();q.onsuccess=function(){res(q.result||[]);};q.onerror=function(){res([]);};});}).catch(function(){return[];});}
function idbPut(o){return idb().then(function(db){return new Promise(function(res,rej){var t=db.transaction('f','readwrite');t.objectStore('f').put(o);t.oncomplete=res;t.onerror=function(){rej(t.error);};});});}
function idbDel(id){return idb().then(function(db){return new Promise(function(res){var t=db.transaction('f','readwrite');t.objectStore('f').delete(id);t.oncomplete=res;});});}
function addCustom(o){var blob=URL.createObjectURL(new Blob([o.buf]));FONTS.push({k:o.id,ar:o.name,en:'خط خاص',d:'مرفوع من جهازك',f400:null,f700:null,blob:blob,buf:o.buf,custom:true});}
/* ---------- تحميل الخط لرسم PDF ---------- */
var loaded=null;
function ensure(){
  var f=byKey(st.key);if(!f)return Promise.resolve();
  var tag=f.k;if(loaded&&loaded.tag===tag)return loaded.p;
  var p=(async function(){
    var fam='WaraqPdfSel';
    document.fonts.forEach(function(x){if(x.family===fam)document.fonts.delete(x);});
    async function get(w){
      var u=url(f,w);
      var buf=f.buf&&w===400?f.buf:await (await fetch(u)).arrayBuffer();
      return buf;
    }
    var r=new FontFace(fam,await get(400),{weight:'400'});await r.load();document.fonts.add(r);
    if(!f.custom){try{var b=new FontFace(fam,await get(700),{weight:'700'});await b.load();document.fonts.add(b);}catch(e){}}
  })();
  loaded={tag:tag,p:p};p.catch(function(){loaded=null;});return p;
}
window.waraqEnsurePdfFont=ensure;
window.waraqPdfStyle=function(){return{family:'WaraqPdfSel,',weight:st.bold?'bold ':'',color:st.color||'#111827'};};
/* ---------- CSS للمعاينة والطباعة ---------- */
function faceCss(fam,f){
  if(!f)return'';
  var c='@font-face{font-family:'+fam+';src:url("'+url(f,400)+'");font-weight:400}';
  if(!f.custom)c+='@font-face{font-family:'+fam+';src:url("'+url(f,700)+'");font-weight:700}';
  else c+='@font-face{font-family:'+fam+';src:url("'+url(f,400)+'");font-weight:700}';
  return c;
}
window.waraqPrintCss=function(){var f=byKey(st.key);return f&&f.k!=='noto'?faceCss('WaraqSel',f):'';};
window.waraqPrintFamily=function(){var f=byKey(st.key);return f&&f.k!=='noto'?'WaraqSel':'';};
window.waraqFontName=function(){var f=byKey(st.key);return f&&f.k!=='noto'&&!f.custom?f.en:'Noto Sans Arabic';};
var styleEl;
function apply(){
  var f=byKey(st.key);
  if(!styleEl){styleEl=document.createElement('style');styleEl.id='waraq-font-style';document.head.appendChild(styleEl);}
  if(!f||f.k==='noto'){styleEl.textContent='';return;}
  styleEl.textContent=faceCss('WaraqSel',f)+'.preview,.preview *:not(svg):not(svg *),.paper-preview,.paper-preview *:not(svg):not(svg *){font-family:WaraqSel,Waraq,Arial,sans-serif!important}';
}
/* ---------- الواجهة ---------- */
var SAMPLE='بسم الله الرحمن الرحيم — شهادة شكر وتقدير ١٤٤٨هـ 0123';
var panel,btn,prevText=SAMPLE;
function css(){
  var c=document.createElement('style');
  c.textContent='#wqf-btn{position:fixed;left:16px;bottom:16px;z-index:2147483000;height:44px;padding:0 16px;border-radius:999px;border:0;background:#087f8c;color:#fff;font:600 15px Waraq,Arial,sans-serif;box-shadow:0 6px 20px rgba(8,127,140,.35);cursor:pointer;display:flex;align-items:center;gap:8px}'+
  '#wqf-btn:hover{background:#066c77}'+
  '#wqf{position:fixed;left:16px;bottom:70px;z-index:2147483001;width:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);background:#fff;border:1px solid #d5e3e0;border-radius:16px;box-shadow:0 18px 60px rgba(10,40,50,.25);display:none;flex-direction:column;font-family:Waraq,Arial,sans-serif;direction:rtl;color:#1a3444}'+
  '#wqf.open{display:flex}#wqf header{padding:14px 16px;border-bottom:1px solid #e2e9ed;display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:16px}'+
  '#wqf header button{border:0;background:none;font-size:20px;cursor:pointer;color:#637781}'+
  '#wqf .wqf-body{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px}'+
  '#wqf .wqf-prev{border:1px solid #e2e9ed;border-radius:12px;padding:12px;background:#f8fbfc}'+
  '#wqf textarea{width:100%;box-sizing:border-box;border:1px solid #d5e3e0;border-radius:8px;padding:6px 8px;font-size:13px;resize:none;height:36px}'+
  '#wqf .wqf-view{font-size:26px;line-height:1.7;margin-top:8px;min-height:54px;word-break:break-word}'+
  '#wqf .wqf-list{display:flex;flex-direction:column;gap:6px}'+
  '#wqf .wqf-item{border:1.5px solid #e2e9ed;border-radius:12px;padding:8px 12px;cursor:pointer;background:#fff;text-align:right;display:flex;flex-direction:column;gap:2px}'+
  '#wqf .wqf-item.on{border-color:#087f8c;background:#e8f5f6}'+
  '#wqf .wqf-item b{font-size:12px;color:#637781;font-weight:500;font-family:Waraq,Arial,sans-serif}'+
  '#wqf .wqf-item span.s{font-size:20px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#wqf .wqf-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}'+
  '#wqf .wqf-c{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #c9d6da;cursor:pointer;padding:0}'+
  '#wqf .wqf-c.on{box-shadow:0 0 0 2px #087f8c}'+
  '#wqf .wqf-note{font-size:12px;color:#637781;line-height:1.7}'+
  '#wqf footer{padding:10px 14px;border-top:1px solid #e2e9ed;display:flex;gap:8px}'+
  '#wqf footer button,#wqf .wqf-up{height:36px;padding:0 14px;border-radius:10px;border:1px solid #d5e3e0;background:#fff;font:600 13px Waraq,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center}';
  document.head.appendChild(c);
}
function ff(f){return f.k==='noto'?'Waraq':'WqF_'+f.k;}
function loadFace(f){
  if(f.k==='noto'||f._face)return;f._face=1;
  var s=document.createElement('style');s.textContent='@font-face{font-family:WqF_'+f.k+';src:url("'+url(f,400)+'")}';document.head.appendChild(s);
}
var COLORS=['#111827','#0b2a6f','#1f3fa8','#0b4f4a','#b3261e','#6b3d00'];
function render(){
  var body=panel.querySelector('.wqf-body');
  var f=byKey(st.key);
  var h='<div class="wqf-prev"><textarea id="wqf-t">'+prevText.replace(/</g,'&lt;')+'</textarea><div class="wqf-view" id="wqf-v" style="font-family:'+ff(f)+',Waraq;font-weight:'+(st.bold?700:400)+';color:'+st.color+'">'+prevText.replace(/</g,'&lt;')+'</div></div>';
  h+='<div class="wqf-row"><label><input type="checkbox" id="wqf-b" '+(st.bold?'checked':'')+'> غامق</label><span>اللون:</span>';
  COLORS.forEach(function(c){h+='<button class="wqf-c'+(st.color===c?' on':'')+'" data-c="'+c+'" style="background:'+c+'"></button>';});
  h+='<input type="color" id="wqf-cc" value="'+st.color+'" style="width:30px;height:28px;border:0;padding:0;background:none"></div>';
  h+='<div class="wqf-note">اللون والغامق يطبّقان على النص الذي تكتبه داخل PDF. الخط المختار يطبّق على النص داخل PDF وعلى النماذج وأوراق الطباعة ومعاينتها.</div>';
  h+='<div class="wqf-list">';
  FONTS.forEach(function(x){loadFace(x);h+='<div class="wqf-item'+(x.k===st.key?' on':'')+'" data-k="'+x.k+'"><b>'+x.ar+' — '+x.d+(x.custom?' <u data-del="'+x.k+'">حذف</u>':'')+'</b><span class="s" style="font-family:'+ff(x)+',Waraq">'+SAMPLE+'</span></div>';});
  h+='</div>';
  body.innerHTML=h;
  body.querySelector('#wqf-t').oninput=function(e){prevText=e.target.value||SAMPLE;body.querySelector('#wqf-v').textContent=prevText;};
  body.querySelector('#wqf-b').onchange=function(e){st.bold=e.target.checked;save();render();};
  body.querySelectorAll('.wqf-c').forEach(function(b){b.onclick=function(){st.color=b.dataset.c;save();render();};});
  body.querySelector('#wqf-cc').oninput=function(e){st.color=e.target.value;save();body.querySelector('#wqf-v').style.color=st.color;};
  body.querySelectorAll('.wqf-item').forEach(function(it){it.onclick=function(ev){
    if(ev.target.dataset&&ev.target.dataset.del){delFont(ev.target.dataset.del);return;}
    st.key=it.dataset.k;save();apply();ensure().catch(function(){});render();};});
}
function delFont(id){if(!confirm('حذف هذا الخط من جهازك؟'))return;idbDel(id).then(function(){FONTS=FONTS.filter(function(x){return x.k!==id;});if(st.key===id){st.key='noto';save();apply();}loaded=null;render();});}
function upload(file){
  var ok=/\.(ttf|otf|woff2?|)$/i.test(file.name);
  if(!ok||file.size>15*1024*1024){alert('اختر ملف خط TTF أو OTF أو WOFF حجمه أقل من 15 ميجابايت.');return;}
  file.arrayBuffer().then(function(buf){
    var id='c'+Date.now();
    var name=file.name.replace(/\.[^.]+$/,'');
    return new FontFace('t'+id,buf).load().then(function(){
      var o={id:id,name:name,buf:buf};return idbPut(o).then(function(){addCustom(o);st.key=id;save();apply();loaded=null;ensure().catch(function(){});render();});
    });
  }).catch(function(){alert('تعذر قراءة الخط. تأكد أنه ملف خط سليم وأنك تملك ترخيص استخدامه.');});
}
function build(){
  css();
  btn=document.createElement('button');btn.id='wqf-btn';btn.type='button';btn.innerHTML='<span style="font-size:18px">Aa</span> الخطوط';
  panel=document.createElement('div');panel.id='wqf';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','الخطوط');
  panel.innerHTML='<header><span>خطوط الكتابة</span><button type="button" aria-label="إغلاق">×</button></header><div class="wqf-body"></div><footer><label class="wqf-up">إضافة خط من جهازك<input type="file" accept=".ttf,.otf,.woff,.woff2" hidden></label><button type="button" id="wqf-reset">الافتراضي</button></footer>';
  document.body.appendChild(panel);document.body.appendChild(btn);
  var sb=document.createElement('a');sb.id='wqs-btn';sb.href=ROOT+'studio/';sb.innerHTML='<span style="font-size:17px">✍</span> الاستوديو';sb.style.cssText='position:fixed;left:128px;bottom:16px;z-index:2147483000;height:44px;padding:0 16px;border-radius:999px;background:#fff;color:#087f8c;border:1.5px solid #087f8c;font:600 15px Waraq,Arial,sans-serif;display:flex;align-items:center;gap:8px;text-decoration:none;box-shadow:0 6px 20px rgba(8,127,140,.2)';document.body.appendChild(sb);
  btn.onclick=function(){panel.classList.toggle('open');if(panel.classList.contains('open'))render();};
  panel.querySelector('header button').onclick=function(){panel.classList.remove('open');};
  panel.querySelector('input[type=file]').onchange=function(e){if(e.target.files[0])upload(e.target.files[0]);e.target.value='';};
  panel.querySelector('#wqf-reset').onclick=function(){st={key:'noto',bold:false,color:'#111827'};save();apply();loaded=null;render();};
}
function init(){
  fetch(ROOT+'fonts/pro/fonts.json').then(function(r){return r.json();}).then(function(j){FONTS=j;return idbAll();}).then(function(list){
    list.forEach(addCustom);if(!byKey(st.key)||byKey(st.key).k!==st.key)st.key='noto';
    apply();if(document.body)build();else document.addEventListener('DOMContentLoaded',build);
  }).catch(function(){});
}
init();
})();

/* ورق · الوضع الليلي للتطبيق الرئيسي (مشترك مع الاستوديو) */
(function(){
  var KEY='waraq-studio-theme';
  function get(){try{var v=localStorage.getItem(KEY);return v==='light'?'light':'dark';}catch(e){return 'dark';}}
  function apply(t){var r=document.documentElement;if(t==='dark')r.setAttribute('data-wq-dark','1');else r.removeAttribute('data-wq-dark');var b=document.getElementById('wqd-btn');if(b)b.innerHTML=t==='dark'?'<span style="font-size:17px">☀</span> نهاري':'<span style="font-size:17px">☾</span> ليلي';}
  var st=document.createElement('style');
  st.textContent='html[data-wq-dark]{filter:invert(.92) hue-rotate(180deg);background:#fff}'+
  'html[data-wq-dark] img,html[data-wq-dark] video,html[data-wq-dark] canvas,html[data-wq-dark] svg image,html[data-wq-dark] iframe,html[data-wq-dark] #wqf-btn,html[data-wq-dark] #wqs-btn,html[data-wq-dark] #wqd-btn,html[data-wq-dark] [style*="background-image"]{filter:invert(1) hue-rotate(180deg)}'+
  'html[data-wq-dark] canvas{filter:none}'+
  '#wqd-btn{position:fixed;left:268px;bottom:16px;z-index:2147483000;height:44px;padding:0 16px;border-radius:999px;border:1.5px solid #087f8c;background:#fff;color:#087f8c;font:600 15px Waraq,Arial,sans-serif;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 6px 20px rgba(8,127,140,.2)}';
  (document.head||document.documentElement).appendChild(st);
  apply(get());
  function mk(){if(document.getElementById('wqd-btn'))return;var b=document.createElement('button');b.id='wqd-btn';b.type='button';b.title='تبديل الوضع الليلي والنهاري';b.onclick=function(){var n=get()==='dark'?'light':'dark';try{localStorage.setItem(KEY,n);}catch(e){}apply(n);};document.body.appendChild(b);apply(get());}
  if(document.body)mk();else document.addEventListener('DOMContentLoaded',mk);
})();
