/* Fahad Studio — privacy & background tools (MIT). Face detection and person segmentation run locally (MediaPipe, Apache-2.0). */
(()=>{
'use strict';
const $=s=>document.querySelector(s),A=()=>window.FahadApp;
const MP='vendor/';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hasFilter=(()=>{try{return 'filter' in CanvasRenderingContext2D.prototype;}catch{return false;}})();
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector('script[data-mp="'+src+'"]'))return res();const s=document.createElement('script');s.src=src;s.dataset.mp=src;s.onload=res;s.onerror=()=>rej(new Error('تعذّر تحميل نموذج الكشف المحلي.'));document.head.appendChild(s);});}
/* ---------- detectors ---------- */
let det=null,detResolve=null;
async function getDetector(){
 if(det)return det;
 await loadScript(MP+'face_detection.js');
 const d=new FaceDetection({locateFile:f=>MP+f});
 d.setOptions({model:'short',minDetectionConfidence:.45});
 d.onResults(r=>{if(detResolve){const f=detResolve;detResolve=null;f(r);}});
 await d.initialize();det=d;return d;
}
function detect(el){return new Promise(async(res,rej)=>{detResolve=res;try{await det.send({image:el});}catch(e){detResolve=null;rej(e);}});}
let seg=null,segBusy=false,segFail=false,segReady=false;
const person=document.createElement('canvas'),pctx=person.getContext('2d');
async function initSeg(){
 if(seg||segFail)return;seg='loading';
 try{await loadScript(MP+'selfie_segmentation.js');
  const s=new SelfieSegmentation({locateFile:f=>MP+f});s.setOptions({modelSelection:1});
  s.onResults(r=>{const w=r.image.width||r.image.videoWidth||256,h=r.image.height||r.image.videoHeight||256,k=Math.min(1,640/w);
   person.width=Math.round(w*k);person.height=Math.round(h*k);pctx.save();pctx.clearRect(0,0,person.width,person.height);
   pctx.drawImage(r.image,0,0,person.width,person.height);pctx.globalCompositeOperation='destination-in';
   if(hasFilter)pctx.filter='blur(1.2px)';
   for(let i=0;i<2;i++)pctx.drawImage(r.segmentationMask,0,0,person.width,person.height);pctx.filter='none';pctx.restore();segReady=true;});
  await s.initialize();seg=s;}
 catch(e){segFail=true;seg=null;A()?.toast('تعذّر تشغيل فصل الشخص على هذا الجهاز.','error');}
}
/* ---------- drawing ---------- */
const tc=document.createElement('canvas'),tx=tc.getContext('2d'),wk=document.createElement('canvas'),wx=wk.getContext('2d');
function shapePath(ctx,shape,x,y,w,h){ctx.beginPath();
 if(shape==='rect'){const r=Math.min(w,h)*.12;if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
 else if(shape==='circle'){const r=Math.max(w,h)/2;ctx.arc(x+w/2,y+h/2,r,0,Math.PI*2);}
 else ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);}
function pixelate(ctx,el,sx,sy,sw,sh,x,y,w,h,cells){
 const cw=Math.max(2,Math.round(cells)),ch=Math.max(2,Math.round(cells*h/w));tc.width=cw;tc.height=ch;tx.imageSmoothingEnabled=true;tx.drawImage(el,sx,sy,sw,sh,0,0,cw,ch);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(tc,0,0,cw,ch,x,y,w,h);ctx.imageSmoothingEnabled=true;}
function blurRegion(ctx,el,sx,sy,sw,sh,x,y,w,h,amt){
 if(hasFilter){const px=Math.max(6,w*(.06+amt*.22));ctx.save();ctx.filter='blur('+px.toFixed(1)+'px)';const m=px*2;ctx.drawImage(el,sx-sw*m/w,sy-sh*m/h,sw*(1+2*m/w),sh*(1+2*m/h),x-m,y-m,w+2*m,h+2*m);ctx.restore();}
 else{const c1=Math.max(3,Math.round(18-amt*13));pixelate(ctx,el,sx,sy,sw,sh,x,y,w,h,c1);}
}
function boxAt(tr,s){const a=tr.s;if(!a.length)return null;
 if(s<a[0][0]-.35||s>a[a.length-1][0]+.35)return null;
 let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m][0]<=s)lo=m;else hi=m;}
 const p=a[lo],q=a[hi];
 if(s<=p[0]||q===p)return gap(p,s)?p:null;
 if(s>=q[0])return gap(q,s)?q:null;
 if(q[0]-p[0]>.9)return Math.abs(s-p[0])<Math.abs(q[0]-s)?(s-p[0]<.35?p:null):(q[0]-s<.35?q:null);
 const f=(s-p[0])/(q[0]-p[0]);return [s,p[1]+(q[1]-p[1])*f,p[2]+(q[2]-p[2])*f,p[3]+(q[3]-p[3])*f,p[4]+(q[4]-p[4])*f];}
const gap=(p,s)=>Math.abs(s-p[0])<=.35;
function vfx(lc,el,W,H,c,local){
 const iw=el.videoWidth||el.naturalWidth||el.width,ih=el.videoHeight||el.naturalHeight||el.height;if(!iw||!ih)return;
 const sc=c.fit==='cover'?Math.max(W/iw,H/ih):Math.min(W/iw,H/ih),dw=iw*sc,dh=ih*sc,dx=(W-dw)/2,dy=(H-dh)/2;
 const bg=c.bg;
 if(bg&&bg.mode&&bg.mode!=='none'){
  if(!seg&&!segFail)initSeg();
  if(seg&&seg!=='loading'&&!segBusy){segBusy=true;seg.send({image:el}).catch(()=>{}).finally(()=>{segBusy=false;});}
  if(segReady){
   const amt=clamp(bg.amt??.7,0,1);lc.save();lc.beginPath();lc.rect(dx,dy,dw,dh);lc.clip();
   if(bg.mode==='dim'){lc.fillStyle='rgba(0,0,0,'+(.25+amt*.7).toFixed(2)+')';lc.fillRect(dx,dy,dw,dh);}
   else if(bg.mode==='blur'){blurRegion(lc,el,0,0,iw,ih,dx,dy,dw,dh,amt);}
   else if(bg.mode==='color'){lc.fillStyle=bg.color||'#101426';lc.globalAlpha=1;lc.fillRect(dx,dy,dw,dh);}
   else if(bg.mode==='remove'){lc.clearRect(dx,dy,dw,dh);}
   lc.drawImage(person,0,0,person.width,person.height,dx,dy,dw,dh);lc.restore();
  }else if(bg.mode==='remove'){/* wait for first mask */}
 }
 const f=c.faces;
 if(f&&f.on!==false&&f.tracks?.length){
  const s=(c.in||0)+local*(c.speed||1),pad=f.pad||1.35,amt=clamp(f.amt??.7,0,1);
  for(const tr of f.tracks){if(tr.on===false)continue;const b=boxAt(tr,s);if(!b)continue;
   const w=b[3]*iw*pad,h=b[4]*ih*pad*1.12,cx=b[1]*iw,cy=b[2]*ih;
   const sx=clamp(cx-w/2,0,iw-2),sy=clamp(cy-h/2,0,ih-2),sw=Math.min(w,iw-sx),sh=Math.min(h,ih-sy);
   const x=dx+sx*sc,y=dy+sy*sc,rw=sw*sc,rh=sh*sc;
   lc.save();shapePath(lc,f.shape||'oval',x,y,rw,rh);lc.clip();
   const st=f.style||'blur';
   if(st==='black'){lc.fillStyle='#000';lc.fillRect(x-2,y-2,rw+4,rh+4);}
   else if(st==='pixel')pixelate(lc,el,sx,sy,sw,sh,x,y,rw,rh,Math.max(3,Math.round(22-amt*18)));
   else if(st==='emoji'){lc.fillStyle='#f6c744';lc.fillRect(x-2,y-2,rw+4,rh+4);const fs=Math.max(rw,rh)*.95;lc.font=fs+'px sans-serif';lc.textAlign='center';lc.textBaseline='middle';lc.fillStyle='#000';lc.fillText('🙂',x+rw/2,y+rh/2+fs*.06);}
   else blurRegion(lc,el,sx,sy,sw,sh,x,y,rw,rh,amt);
   lc.restore();}
 }
}
/* ---------- scan ---------- */
let scanCancel=false,scanning=false;
function seekTo(v,t){return new Promise(res=>{let done=false;const fin=()=>{if(done)return;done=true;v.removeEventListener('seeked',fin);res();};v.addEventListener('seeked',fin);setTimeout(fin,3500);v.currentTime=t;});}
async function scan(c,onProgress){
 const a=A(),as=a.assets.get(c.assetId);if(!as||!as.url)throw new Error('تعذّر الوصول إلى ملف الفيديو.');
 await getDetector();
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=as.url;
 await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=()=>rej(new Error('تعذّر فتح الفيديو.'));v.load();});
 const sp=c.speed||1,t0=c.in||0,t1=Math.min((v.duration||1e9)-.05,t0+c.duration*sp),span=Math.max(.1,t1-t0),step=Math.max(.12,span/700);
 const tracks=[],crop=document.createElement('canvas');crop.width=crop.height=72;const cc=crop.getContext('2d');
 let n=0,total=Math.ceil(span/step);
 for(let t=t0;t<=t1&&!scanCancel;t+=step,n++){
  await seekTo(v,t);const r=await detect(v);const ds=(r.detections||[]).map(d=>d.boundingBox||d.boundingBox_).filter(Boolean);
  const used=new Set();
  for(const b of ds){const x=b.xCenter,y=b.yCenter,w=b.width,h=b.height;let best=null,bd=1e9;
   for(const tr of tracks){if(used.has(tr))continue;const l=tr.s[tr.s.length-1];if(t-l[0]>1.2)continue;const dist=Math.hypot((x-l[1])*(v.videoWidth/v.videoHeight),y-l[2]),lim=Math.max(l[3]*(v.videoWidth/v.videoHeight),l[4])*1.1+.02*(t-l[0])/step;if(dist<lim&&dist<bd){bd=dist;best=tr;}}
   if(!best){best={id:'f'+(tracks.length+1),on:true,s:[],best:0,th:null};tracks.push(best);}
   used.add(best);best.s.push([+t.toFixed(3),+x.toFixed(4),+y.toFixed(4),+w.toFixed(4),+h.toFixed(4)]);
   if(w*h>best.best*1.2){best.best=w*h;const vw=v.videoWidth,vh=v.videoHeight,fw=w*vw*1.5,fh=h*vh*1.5,sq=Math.max(fw,fh);cc.fillStyle='#000';cc.fillRect(0,0,72,72);cc.drawImage(v,clamp(x*vw-sq/2,0,vw-1),clamp(y*vh-sq/2,0,vh-1),Math.min(sq,vw),Math.min(sq,vh),0,0,72,72);best.th=crop.toDataURL('image/jpeg',.7);}}
  onProgress&&onProgress(Math.min(1,n/total),tracks.length);
 }
 v.removeAttribute('src');v.load();
 return tracks.filter(t=>t.s.length>=Math.max(3,Math.round(total*.05))).slice(0,24).map(({id,on,s,th},i)=>({id:'f'+(i+1),on:true,s,th}));
}
/* ---------- dialog ---------- */
function css(){if($('#priv-css'))return;const s=document.createElement('style');s.id='priv-css';s.textContent=`
#priv-dialog{max-width:520px;width:94vw}
#priv-dialog h3{font-size:13px;margin:16px 0 8px;color:#cbd0e3}
.pv-faces{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin:8px 0}
.pv-face{position:relative;border:2px solid var(--line);border-radius:10px;overflow:hidden;background:#1c2031;cursor:pointer;aspect-ratio:1;padding:0}
.pv-face img{width:100%;height:100%;object-fit:cover;display:block}
.pv-face.on{border-color:#8d7aff}.pv-face.on:after{content:'مشفّر';position:absolute;bottom:0;left:0;right:0;background:#8d7affd9;color:#fff;font-size:10px;padding:3px;text-align:center}
.pv-face:not(.on) img{opacity:.55}.pv-face:not(.on):after{content:'ظاهر';position:absolute;bottom:0;left:0;right:0;background:#0009;color:#cfd3e8;font-size:10px;padding:3px;text-align:center}
.pv-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pv-bar{height:8px;background:#232842;border-radius:5px;overflow:hidden;margin:10px 0}.pv-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7379ec,#9b68e7);transition:width .2s}
.pv-note{font-size:11px;color:var(--muted);line-height:1.9}
@media(max-width:700px){.pv-row{grid-template-columns:1fr}}`;document.head.appendChild(s);}
function ensureDialog(){let d=$('#priv-dialog');if(d)return d;css();d=document.createElement('dialog');d.id='priv-dialog';
 d.innerHTML=`<div class="dialog-head"><h2>🛡 خصوصية وخلفية</h2><button class="icon-button" data-pv="close" aria-label="إغلاق">✕</button></div>
<p class="pv-note" id="pv-clip"></p>
<h3>إخفاء الوجوه (تلقائي مع التتبع)</h3>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button primary" data-pv="scan">🔍 ابحث عن الوجوه في المقطع</button><button class="button" data-pv="stop" hidden>إيقاف</button><button class="button compact" data-pv="all">تشفير الكل</button><button class="button compact" data-pv="none">إظهار الكل</button><button class="button compact" data-pv="clear">حذف التشفير</button></div>
<div class="pv-bar" id="pv-bar" hidden><i></i></div><p class="pv-note" id="pv-status"></p>
<div class="pv-faces" id="pv-faces"></div>
<div class="pv-row"><label class="field">نوع التشفير<select id="pv-style"><option value="blur">تمويه ضبابي</option><option value="pixel">بكسلة (فسيفساء)</option><option value="black">كتلة سوداء</option><option value="emoji">إيموجي 🙂</option></select></label>
<label class="field">الشكل<select id="pv-shape"><option value="oval">بيضاوي</option><option value="circle">دائرة</option><option value="rect">مستطيل</option></select></label></div>
<div class="pv-row"><label class="field"><span>قوة التشفير <output id="pv-amt-o"></output></span><input type="range" id="pv-amt" min="0" max="100"></label>
<label class="field"><span>حجم المنطقة <output id="pv-pad-o"></output></span><input type="range" id="pv-pad" min="100" max="220"></label></div>
<h3>الخلفية (فصل الشخص)</h3>
<div class="pv-row"><label class="field">الخلفية<select id="pv-bg"><option value="none">بدون تغيير</option><option value="blur">تمويه الخلفية</option><option value="dim">تعتيم الخلفية</option><option value="color">لون ثابت</option><option value="remove">إزالة الخلفية (شفافة)</option></select></label>
<label class="field"><span>الشدة <output id="pv-bamt-o"></output></span><input type="range" id="pv-bamt" min="0" max="100"></label></div>
<label class="field" id="pv-colorf">لون الخلفية<input type="color" id="pv-color" value="#101426"></label>
<p class="pv-note">يتم كل شيء على جهازك دون رفع الفيديو. يحتاج الأمر تحميل نموذج صغير في أول استخدام. إن بدا التتبع غير دقيق في مشهد مزدحم فزد «حجم المنطقة».</p>
<div class="dialog-buttons"><button class="button primary" data-pv="close">تم</button></div>`;
 document.body.appendChild(d);bind(d);return d;}
let cid=null;
const clip=()=>A().p.clips.find(x=>x.id===cid);
function ensure(c,k){if(k==='faces'&&!c.faces)c.faces={on:true,style:'blur',shape:'oval',amt:.7,pad:1.35,tracks:[]};if(k==='bg'&&!c.bg)c.bg={mode:'none',amt:.7,color:'#101426'};}
function refresh(){const c=clip();if(!c)return;const f=c.faces,b=c.bg;
 $('#pv-style').value=f?.style||'blur';$('#pv-shape').value=f?.shape||'oval';$('#pv-amt').value=Math.round((f?.amt??.7)*100);$('#pv-pad').value=Math.round((f?.pad||1.35)*100);
 $('#pv-bg').value=b?.mode||'none';$('#pv-bamt').value=Math.round((b?.amt??.7)*100);$('#pv-color').value=b?.color||'#101426';
 $('#pv-amt-o').textContent=$('#pv-amt').value+'%';$('#pv-pad-o').textContent=$('#pv-pad').value+'%';$('#pv-bamt-o').textContent=$('#pv-bamt').value+'%';
 $('#pv-colorf').hidden=$('#pv-bg').value!=='color';
 const box=$('#pv-faces');box.innerHTML='';
 (f?.tracks||[]).forEach(t=>{const b=document.createElement('button');b.type='button';b.className='pv-face'+(t.on!==false?' on':'');b.dataset.id=t.id;b.innerHTML=(t.th?'<img src="'+t.th+'" alt="">':'')+'';b.title='شخص '+t.id.slice(1);box.appendChild(b);});
 if(f?.tracks?.length)$('#pv-status').textContent='اضغط على الوجه لتبديل: مشفّر ⇄ ظاهر. عدد الأشخاص: '+f.tracks.length;
}
function apply(fn,hist){const a=A();const id=cid;const run=()=>{const c=a.p.clips.find(x=>x.id===id);if(c)fn(c);};if(hist)a.edit(run);else run();}
function bind(d){
 d.addEventListener('click',async e=>{const b=e.target.closest('[data-pv]'),fc=e.target.closest('.pv-face');
  if(fc){apply(c=>{const t=c.faces.tracks.find(x=>x.id===fc.dataset.id);if(t)t.on=t.on===false;},true);refresh();return;}
  if(!b)return;const k=b.dataset.pv;
  if(k==='close'){scanCancel=true;d.close();}
  else if(k==='stop')scanCancel=true;
  else if(k==='all'||k==='none'){apply(c=>{ensure(c,'faces');c.faces.tracks.forEach(t=>t.on=k==='all');},true);refresh();}
  else if(k==='clear'){apply(c=>{delete c.faces;},true);refresh();$('#pv-status').textContent='حُذف تشفير الوجوه.';}
  else if(k==='scan'){const c=clip();if(!c)return;if(scanning)return;scanning=true;scanCancel=false;
   $('#pv-bar').hidden=false;b.hidden=true;d.querySelector('[data-pv=stop]').hidden=false;$('#pv-status').textContent='جاري تحميل نموذج الكشف…';
   try{const tracks=await scan(c,(p,n)=>{$('#pv-bar>i').style.width=Math.round(p*100)+'%';$('#pv-status').textContent='جاري البحث… '+Math.round(p*100)+'% · أشخاص: '+n;});
    if(scanCancel&&!tracks.length)$('#pv-status').textContent='أُوقف البحث.';
    else{apply(cc=>{ensure(cc,'faces');cc.faces.tracks=tracks;cc.faces.on=true;},true);refresh();if(!tracks.length)$('#pv-status').textContent='لم يُعثر على وجوه واضحة في هذا المقطع.';}}
   catch(err){$('#pv-status').textContent=err.message;A().toast(err.message,'error');}
   scanning=false;$('#pv-bar').hidden=true;b.hidden=false;d.querySelector('[data-pv=stop]').hidden=true;}
 });
 const live=(id,fn)=>{const el=$(id);el.addEventListener('input',()=>{apply(fn,false);$('#pv-amt-o').textContent=$('#pv-amt').value+'%';$('#pv-pad-o').textContent=$('#pv-pad').value+'%';$('#pv-bamt-o').textContent=$('#pv-bamt').value+'%';});el.addEventListener('change',()=>{apply(fn,true);refresh();});};
 live('#pv-style',c=>{ensure(c,'faces');c.faces.style=$('#pv-style').value;});
 live('#pv-shape',c=>{ensure(c,'faces');c.faces.shape=$('#pv-shape').value;});
 live('#pv-amt',c=>{ensure(c,'faces');c.faces.amt=$('#pv-amt').value/100;});
 live('#pv-pad',c=>{ensure(c,'faces');c.faces.pad=$('#pv-pad').value/100;});
 live('#pv-bg',c=>{ensure(c,'bg');c.bg.mode=$('#pv-bg').value;if(c.bg.mode==='none')delete c.bg;});
 live('#pv-bamt',c=>{ensure(c,'bg');c.bg.amt=$('#pv-bamt').value/100;});
 live('#pv-color',c=>{ensure(c,'bg');c.bg.color=$('#pv-color').value;});
 d.addEventListener('close',()=>{scanCancel=true;});
}
function open(){const a=A();const c=a?.chosen();if(!c||c.kind!=='video'){a?.toast('حدّد مقطع فيديو في الخط الزمني أولًا.');return;}
 cid=c.id;const d=ensureDialog();$('#pv-clip').textContent='المقطع: '+(c.name||'فيديو');$('#pv-status').textContent='';$('#pv-bar').hidden=true;refresh();a.pause?.();d.showModal();}
function addButton(){const g=document.querySelector('.mt-magic')?.parentElement;if(!g||g.querySelector('.pv-btn'))return !!g;
 const b=document.createElement('button');b.className='button compact pv-btn';b.title='إخفاء الوجوه وتعتيم الخلفية';b.textContent='🛡 خصوصية';b.addEventListener('click',open);g.appendChild(b);return true;}
let n=0;const iv=setInterval(()=>{if(addButton()||++n>80)clearInterval(iv);},250);
const T=window.FahadTools=window.FahadTools||{};T.vfx=vfx;T.privacyOpen=open;T.detectFaces=async el=>{await getDetector();const r=await detect(el);return (r.detections||[]).map(d=>d.boundingBox).filter(Boolean);};
})();
