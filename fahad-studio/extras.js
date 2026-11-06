/* Fahad Studio — extra tools: logo, lower third, camera/screen recording, beep, beat-sync (MIT). */
(()=>{
'use strict';
const $=s=>document.querySelector(s),A=()=>window.FahadApp;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const total=(p,skip)=>Math.max(0,...p.clips.filter(x=>x!==skip).map(x=>x.start+x.duration));
const overlaps=(p,tid,s,d,skip)=>p.clips.some(x=>x.track===tid&&x!==skip&&x.start<s+d-.001&&x.start+x.duration>s+.001);
function freeTrack(kind,s,d,skip){const p=A().p;return p.tracks.filter(t=>t.kind===kind).find(t=>!overlaps(p,t.id,s,d,skip))||null;}
function wav(f32,sr){const n=f32.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,clamp(f32[i],-1,1)*32767,true);return new Blob([b],{type:'audio/wav'});}
/* ---- logo ---- */
function logo(corner){const a=A(),p=a.p;let c=a.chosen();
 if(!c||c.kind!=='image')c=null;
 const as=c?null:[...a.assets.values()].filter(x=>x.type==='image'&&!x.scene&&!x.overlay).pop();
 if(!c&&!as){a.toast('استورد شعار المدرسة كصورة (PNG) من مكتبة الوسائط ثم أعد المحاولة.');return;}
 const T=total(p,c);if(T<=0){a.toast('أضف مقاطع أولًا.');return;}
 const pos={tr:[.88,.12],tl:[.12,.12],br:[.88,.88],bl:[.12,.88]}[corner]||[.88,.12];
 const tr=p.tracks.filter(t=>t.kind==='visual').find(t=>(!c||t.id!==c.track)&&!overlaps(p,t.id,0,T,c))||null;
 if(!tr&&!c){a.toast('لا يوجد مسار فيديو فارغ. أضف مسار فيديو.','error');return;}
 a.edit(()=>{let k=c;if(!k){k=a.C.clip(as,0,tr.id);p.clips.push(k);}k.start=0;k.duration=T;k.in=0;k.x=pos[0];k.y=pos[1];k.scale=.18;k.opacity=.92;k.fit='contain';k.name='شعار المدرسة';if(tr)k.track=tr.id;a.selected=k.id;});
 a.toast('ثُبّت الشعار طوال الفيديو. عدّل الحجم والشفافية من الخصائص.','success');}
/* ---- lower third ---- */
function lower(name,title){const a=A();if(!name){a.toast('اكتب الاسم أولًا.');return;}
 const p=a.p,s=a.current,d=4,tr=freeTrack('text',s,d);if(!tr){a.toast('لا يوجد مسار نصوص فارغ في هذا الموضع. أضف مسار نصوص.','error');return;}
 a.edit(()=>{const c=a.C.textClip(s,{fontId:p.defaultFontId||'cairo',text:title?name+'\n'+title:name,fontSize:44,y:.84,box:true,animation:'rise',name:'شريط الاسم: '+name.slice(0,20)});c.duration=d;c.track=tr.id;p.clips.push(c);a.selected=c.id;});
 a.toast('أُضيف شريط الاسم عند المؤشر (4 ثوانٍ).','success');}
/* ---- beep ---- */
async function beep(){const a=A(),sr=44100,dur=.7,f=new Float32Array(Math.round(sr*dur));
 for(let i=0;i<f.length;i++){const e=Math.min(1,i/400,(f.length-i)/400);f[i]=Math.sin(2*Math.PI*1000*i/sr)*.35*e;}
 const file=new File([wav(f,sr)],'صفير.wav',{type:'audio/wav'});
 const as=await a.loadAsset(file,{name:'صفير (إخفاء كلمة)',type:'audio'});a.assets.set(as.id,as);
 const s=a.current,tr=freeTrack('audio',s,dur);if(!tr){a.toast('لا يوجد مسار صوت فارغ هنا.','error');return;}
 a.edit(()=>{const c=a.C.clip(as,s,tr.id);c.duration=dur;c.name='صفير';a.p.clips.push(c);a.selected=c.id;});
 a.toast('أُضيف صفير عند المؤشر. اسحبه فوق الكلمة المطلوب إخفاؤها.','success');}
/* ---- recording ---- */
let rec=null;
async function record(kind){const a=A();
 if(rec){a.toast('هناك تسجيل جارٍ.');return;}
 const md=navigator.mediaDevices;if(!md||!(kind==='screen'?md.getDisplayMedia:md.getUserMedia)){a.toast(kind==='screen'?'تسجيل الشاشة غير مدعوم في هذا المتصفح (غير متاح في iPhone/iPad).':'الكاميرا غير متاحة في هذا المتصفح.','error');return;}
 let stream;try{stream=kind==='screen'?await md.getDisplayMedia({video:true,audio:true}):await md.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:true});}
 catch(e){a.toast('لم يُسمح بالوصول: '+(e.message||e.name),'error');return;}
 const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));
 const r=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];r.ondataavailable=e=>e.data.size&&chunks.push(e.data);
 const bar=document.createElement('div');bar.id='rec-bar';bar.innerHTML='<video muted playsinline></video><b>● يسجّل <span>0:00</span></b><button class="button primary">إيقاف وإضافة للمشروع</button>';
 document.body.appendChild(bar);const vv=bar.querySelector('video');vv.srcObject=stream;vv.play().catch(()=>{});
 const t0=Date.now(),iv=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);bar.querySelector('span').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');},500);
 const done=new Promise(res=>{r.onstop=res;});
 stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(r.state!=='inactive')r.stop();});
 bar.querySelector('button').onclick=()=>{if(r.state!=='inactive')r.stop();};
 rec=r;r.start(1000);
 await done;clearInterval(iv);stream.getTracks().forEach(t=>t.stop());bar.remove();rec=null;
 const blob=new Blob(chunks,{type:r.mimeType||mime||'video/webm'});if(!blob.size){a.toast('لم يُسجَّل شيء.','error');return;}
 try{const file=new File([blob],(kind==='screen'?'تسجيل شاشة':'تسجيل كاميرا')+(blob.type.includes('mp4')?'.mp4':'.webm'),{type:blob.type});
  const as=await a.loadAsset(file,{type:'video'});a.assets.set(as.id,as);
  a.edit(()=>{const p=a.p;const s=Math.max(0,p.clips.filter(x=>x.track==='v1').reduce((m,x)=>Math.max(m,x.start+x.duration),0));const c=a.C.clip(as,s,'v1');p.clips.push(c);a.selected=c.id;});
  a.toast('أُضيف التسجيل إلى نهاية المسار الرئيسي.','success');}
 catch(e){a.toast('تعذّر إضافة التسجيل: '+e.message,'error');}}
/* ---- beat sync ---- */
async function beats(as){const buf=await new OfflineAudioContext(1,1,44100).decodeAudioData(await as.blob.arrayBuffer());
 const d=buf.getChannelData(0),sr=buf.sampleRate,hop=512,n=Math.floor(d.length/hop),e=new Float32Array(n);
 for(let i=0;i<n;i++){let s=0;for(let j=0;j<hop;j++){const v=d[i*hop+j];s+=v*v;}e[i]=Math.sqrt(s/hop);}
 const fl=new Float32Array(n);for(let i=1;i<n;i++)fl[i]=Math.max(0,e[i]-e[i-1]);
 const w=Math.round(sr/hop),out=[];let last=-1e9;const minGap=Math.round(.3*sr/hop);
 for(let i=2;i<n-2;i++){let m=0;const a0=Math.max(0,i-w),a1=Math.min(n,i+w);for(let k=a0;k<a1;k++)m+=fl[k];m/=(a1-a0);
  if(fl[i]>m*1.6&&fl[i]>1e-3&&fl[i]>=fl[i-1]&&fl[i]>=fl[i+1]&&i-last>=minGap){out.push(i*hop/sr);last=i;}}
 return out;}
async function beatSync(){const a=A(),p=a.p;
 let mc=a.chosen();if(!mc||mc.kind!=='audio')mc=p.clips.filter(c=>c.kind==='audio'&&!c.videoLink&&!c.subtitleOf).sort((x,y)=>y.duration-x.duration)[0];
 if(!mc){a.toast('أضف مقطع موسيقى أولًا (أو حدّده).');return;}
 const as=a.assets.get(mc.assetId);if(!as||!as.blob){a.toast('تعذّر الوصول إلى ملف الموسيقى.');return;}
 a.toast('جارٍ تحليل إيقاع الموسيقى…');let bt;try{bt=await beats(as);}catch(e){a.toast('تعذّر تحليل الصوت: '+e.message,'error');return;}
 const sp=mc.speed||1,tl=bt.map(t=>mc.start+(t-mc.in)/sp).filter(t=>t>mc.start&&t<mc.start+mc.duration);
 if(tl.length<4){a.toast('لم أجد إيقاعًا واضحًا في هذه الموسيقى.');return;}
 const v1=p.clips.filter(c=>c.track==='v1'&&!['audio','text'].includes(c.kind)&&!c.subtitleOf).sort((x,y)=>x.start-y.start);
 if(v1.length<2){a.toast('تحتاج مقطعين على الأقل في المسار الرئيسي.');return;}
 let moved=0;
 a.edit(()=>{let shift=0;for(let i=0;i<v1.length;i++){const c=v1[i];c.start=+(c.start+shift).toFixed(3);if(i===v1.length-1)break;
   const end=c.start+c.duration;let best=null,bd=.75;for(const t of tl){const dd=Math.abs(t-end);if(dd<bd){bd=dd;best=t;}}
   if(best==null)continue;let delta=best-end;const nd=c.duration+delta;
   const as2=a.assets.get(c.assetId),room=c.kind==='video'&&as2?((as2.duration||1e9)-c.in)/(c.speed||1):1e9;
   if(nd<.8||nd>room)continue;c.duration=+nd.toFixed(3);shift+=+delta.toFixed(3);moved++;}});
 a.toast(moved?'ضُبطت '+moved+' قصّة على إيقاع الموسيقى.':'القصّات متوافقة تقريبًا مع الإيقاع.','success');}

/* ---- logo studio ---- */
const GRID=[['tl',.1,.1,'↖'],['tc',.5,.1,'↑'],['tr',.9,.1,'↗'],['ml',.1,.5,'←'],['mc',.5,.5,'●'],['mr',.9,.5,'→'],['bl',.1,.9,'↙'],['bc',.5,.9,'↓'],['br',.9,.9,'↘']];
function dist(d,i,r,g,b){const dr=d[i]-r,dg=d[i+1]-g,db=d[i+2]-b;return Math.sqrt(dr*dr*.3+dg*dg*.59+db*db*.11)*1.9;}
function processLogo(img,o,maxSide){
 const k=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height)),w=Math.max(2,Math.round((img.naturalWidth||img.width)*k)),h=Math.max(2,Math.round((img.naturalHeight||img.height)*k));
 let cv=document.createElement('canvas');cv.width=w;cv.height=h;let cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,w,h);
 if(o.rm){const im=cx.getImageData(0,0,w,h),d=im.data,N=w*h;
  const samp=[];const add=(x,y)=>{const i=(y*w+x)*4;if(d[i+3]>10)samp.push([d[i],d[i+1],d[i+2]]);};
  for(let t=0;t<Math.min(w,h);t+=Math.max(1,Math.floor(Math.min(w,h)/30))){add(t,0);add(w-1-t,0);add(t,h-1);add(w-1-t,h-1);add(0,t);add(w-1,t);}
  const med=c=>{const a=samp.map(x=>x[c]).sort((p,q)=>p-q);return a[a.length>>1]||255;};const br=med(0),bgc=med(1),bb=med(2);
  const tol=o.tol,bgm=new Uint8Array(N),q=new Int32Array(N);let qh=0,qt=0;
  const isbg=i=>d[i*4+3]<12||dist(d,i*4,br,bgc,bb)<tol;
  const push=i=>{if(!bgm[i]&&isbg(i)){bgm[i]=1;q[qt++]=i;}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(qh<qt){const i=q[qh++],x=i%w,y=(i/w)|0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(y>0)push(i-w);if(y<h-1)push(i+w);}
  if(o.inner)for(let i=0;i<N;i++)if(!bgm[i]&&dist(d,i*4,br,bgc,bb)<tol*.8)bgm[i]=1;
  const out=new Uint8ClampedArray(d);
  for(let i=0;i<N;i++){const p=i*4;
   if(bgm[i]){out[p+3]=0;continue;}
   const x=i%w,y=(i/w)|0;let edge=false;if(x>0&&bgm[i-1]||x<w-1&&bgm[i+1]||y>0&&bgm[i-w]||y<h-1&&bgm[i+w])edge=true;
   if(edge){const dd=dist(d,p,br,bgc,bb),a=Math.min(1,Math.max(0,(dd-tol*.55)/(tol*1.1)));
    if(a<1){const aa=Math.max(.05,a);out[p]=Math.min(255,Math.max(0,(d[p]-(1-aa)*br)/aa));out[p+1]=Math.min(255,Math.max(0,(d[p+1]-(1-aa)*bgc)/aa));out[p+2]=Math.min(255,Math.max(0,(d[p+2]-(1-aa)*bb)/aa));out[p+3]=Math.round(a*d[p+3]);}}}
  if(o.feather>0){const a2=new Uint8ClampedArray(N);for(let pass=0;pass<o.feather;pass++){for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;a2[i]=(out[i*4+3]*4+out[(i-1)*4+3]+out[(i+1)*4+3]+out[(i-w)*4+3]+out[(i+w)*4+3])/8;}for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(out[i*4+3]>0||a2[i]>8)out[i*4+3]=a2[i];}}}
  im.data.set(out);cx.putImageData(im,0,0);
 }
 /* crop to content */
 {const id=cx.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(id[(y*w+x)*4+3]>10){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1>x0&&y1>y0){const cw=x1-x0+1,ch=y1-y0+1,c2=document.createElement('canvas');c2.width=cw;c2.height=ch;c2.getContext('2d').drawImage(cv,x0,y0,cw,ch,0,0,cw,ch);cv=c2;}}
 /* shape / outline / shadow */
 if(o.shape!=='original'||o.ring||o.shadow){const cw=cv.width,ch=cv.height,side=o.shape==='circle'?Math.max(cw,ch):0,bw=side||cw,bh=side||ch,pad=Math.round(Math.max(bw,bh)*(o.shadow?.12:.03)),c3=document.createElement('canvas');c3.width=bw+pad*2;c3.height=bh+pad*2;const x3=c3.getContext('2d');
  if(o.shadow){x3.shadowColor='rgba(0,0,0,.45)';x3.shadowBlur=pad*.7;x3.shadowOffsetY=pad*.25;}
  x3.save();
  if(o.shape==='circle'){x3.beginPath();x3.arc(c3.width/2,c3.height/2,bw/2,0,Math.PI*2);x3.fillStyle=o.bgc||'#ffffff';x3.fill();x3.shadowColor='transparent';x3.clip();}
  else if(o.shape==='rounded'){const r=Math.min(bw,bh)*.18;x3.beginPath();x3.roundRect?x3.roundRect(pad,pad,bw,bh,r):x3.rect(pad,pad,bw,bh);x3.fillStyle=o.bgc||'#ffffff';x3.fill();x3.shadowColor='transparent';x3.clip();}
  const inset=o.shape==='original'?0:Math.round(Math.min(bw,bh)*.1),dw=bw-inset*2,dh=bh-inset*2,sc=Math.min(dw/cw,dh/ch);
  x3.drawImage(cv,pad+(bw-cw*sc)/2,pad+(bh-ch*sc)/2,cw*sc,ch*sc);x3.restore();
  if(o.ring&&o.shape!=='original'){x3.lineWidth=Math.max(2,bw*.035);x3.strokeStyle='#ffffff';x3.beginPath();if(o.shape==='circle')x3.arc(c3.width/2,c3.height/2,bw/2-x3.lineWidth/2,0,Math.PI*2);else x3.rect(pad,pad,bw,bh);x3.stroke();}
  cv=c3;}
 return cv;}
const LS={};
function lclip(){return LS.cid?A().p.clips.find(x=>x.id===LS.cid):null;}
function ensureLogoClip(){let c=lclip();if(c)return c;const a=A(),p=a.p,as=a.assets.get(LS.aid);if(!as)return null;
 const T=Math.max(1,total(p,null)),tr=p.tracks.filter(t=>t.kind==='visual').find(t=>!overlaps(p,t.id,0,T))||null;if(!tr){a.toast('لا يوجد مسار فيديو فارغ. أضف مسار فيديو.','error');return null;}
 a.edit(()=>{const k=a.C.clip(as,0,tr.id);k.duration=T;k.x=.88;k.y=.12;k.scale=.18;k.opacity=.95;k.fit='contain';k.name='شعار المدرسة';k.isLogo=true;p.clips.push(k);a.selected=k.id;LS.cid=k.id;});return lclip();}
function lapply(fn,hist){const c=ensureLogoClip();if(!c)return;const a=A(),id=c.id,run=()=>{const k=a.p.clips.find(x=>x.id===id);if(k)fn(k);};if(hist)a.edit(run);else run();}
function logoCss(){if($('#lg-css'))return;const s=document.createElement('style');s.id='lg-css';s.textContent=`#logo-dialog{max-width:560px;width:94vw}#logo-dialog h3{font-size:12px;margin:14px 0 6px;color:#cbd0e3}
.lg-assets{display:flex;gap:8px;overflow-x:auto;padding:4px 0}.lg-asset{flex:0 0 72px;height:56px;border:2px solid var(--line);border-radius:8px;background:#1c2031 center/cover;padding:0}.lg-asset.on{border-color:#8d7aff}
.lg-grid{display:grid;grid-template-columns:repeat(3,44px);gap:4px}.lg-grid button{height:36px;border:1px solid var(--line);border-radius:7px;background:#1c2031;font-size:15px}.lg-grid button:hover{border-color:#8775ce}
.lg-prev{width:100%;height:150px;border-radius:10px;background:repeating-conic-gradient(#2a2f45 0 25%,#1d2133 0 50%) 0 0/16px 16px;display:grid;place-items:center;overflow:hidden}.lg-prev canvas{max-width:100%;max-height:100%}
.lg-two{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start}.lg-checks{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin:6px 0}.lg-checks label{display:flex;gap:6px;align-items:center}
@media(max-width:700px){.lg-two{grid-template-columns:1fr}}`;document.head.appendChild(s);}
function lgDlg(){let d=$('#logo-dialog');if(d)return d;logoCss();d=document.createElement('dialog');d.id='logo-dialog';
 d.innerHTML=`<div class="dialog-head"><h2>🏷 استوديو الشعار</h2><button class="icon-button" data-lg="close" aria-label="إغلاق">✕</button></div>
<h3>اختر الشعار</h3><div class="lg-assets" id="lg-assets"></div><p class="muted" id="lg-empty" hidden>لا توجد صور. استورد شعارك من مكتبة الوسائط أولًا.</p>
<h3>إزالة الخلفية والشكل</h3>
<div class="lg-prev"><canvas id="lg-prev" width="10" height="10"></canvas></div>
<div class="lg-checks"><label><input type="checkbox" id="lg-rm" checked> إزالة الخلفية تلقائيًا</label><label><input type="checkbox" id="lg-inner"> إزالة الفراغات الداخلية أيضًا</label><label><input type="checkbox" id="lg-shadow"> ظل</label><label><input type="checkbox" id="lg-ring"> إطار أبيض</label></div>
<div class="ex-row"><label class="field"><span>حساسية الإزالة <output id="lg-tol-o"></output></span><input type="range" id="lg-tol" min="6" max="90" value="34"></label><label class="field"><span>نعومة الحواف <output id="lg-fe-o"></output></span><input type="range" id="lg-fe" min="0" max="4" value="1"></label></div>
<div class="ex-row"><label class="field">شكل الشعار<select id="lg-shape"><option value="original">كما هو</option><option value="circle">دائري</option><option value="rounded">مربع بحواف مدورة</option></select></label><label class="field">لون الخلفية خلف الشعار (للدائري/المربع)<input type="color" id="lg-bgc" value="#ffffff"></label></div>
<button class="button" data-lg="process">✨ طبّق المعالجة على الشعار</button>
<h3>الموضع والحجم</h3>
<div class="lg-two"><div class="lg-grid" id="lg-grid">${GRID.map(g=>`<button data-pos="${g[1]},${g[2]}" title="${g[0]}">${g[3]}</button>`).join('')}</div>
<div><label class="field"><span>أفقيًا <output id="lg-x-o"></output></span><input type="range" id="lg-x" min="0" max="100"></label><label class="field"><span>رأسيًا <output id="lg-y-o"></output></span><input type="range" id="lg-y" min="0" max="100"></label></div></div>
<div class="ex-row"><label class="field"><span>الحجم <output id="lg-s-o"></output></span><input type="range" id="lg-s" min="3" max="100"></label><label class="field"><span>الشفافية <output id="lg-o-o"></output></span><input type="range" id="lg-o" min="10" max="100"></label></div>
<div class="ex-row"><label class="field"><span>الدوران <output id="lg-r-o"></output></span><input type="range" id="lg-r" min="-45" max="45"></label><label class="field">حركة الشعار<select id="lg-m"><option value="">ثابت</option><option value="breathe">تنفّس هادئ</option><option value="float">طفو</option><option value="pulse">نبض</option><option value="heartbeat">نبضة قلب</option><option value="tilt">ميلان خفيف</option></select></label></div>
<div class="ex-row"><label class="field">يظهر على<select id="lg-dur"><option value="all">كامل الفيديو</option><option value="head">أول 5 ثوانٍ فقط</option><option value="tail">آخر 5 ثوانٍ فقط</option></select></label><label class="field">دخول الشعار<select id="lg-t"><option value="">بدون</option><option value="fade">تلاشٍ</option></select></label></div>
<div class="dialog-buttons"><button class="button" data-lg="remove">حذف الشعار من الفيديو</button><button class="button primary" data-lg="close">تم</button></div>`;
 document.body.appendChild(d);
 const out=()=>{const c=lclip()||{};const v=(i,x)=>{$(i).value=x;};
  v('#lg-x',Math.round((c.x??.88)*100));v('#lg-y',Math.round((c.y??.12)*100));v('#lg-s',Math.round((c.scale??.18)*100));v('#lg-o',Math.round((c.opacity??.95)*100));v('#lg-r',Math.round(c.rotation||0));v('#lg-m',c.motion||'');v('#lg-t',c.transition||'');
  for(const [i,u] of [['x','%'],['y','%'],['s','%'],['o','%'],['r','°'],['tol',''],['fe','']])$('#lg-'+i+'-o').textContent=$('#lg-'+i).value+u;};
 LS.refresh=out;
 const slider=(id,fn)=>{const el=$(id);el.addEventListener('input',()=>{lapply(k=>fn(k,+el.value),false);out();});el.addEventListener('change',()=>lapply(k=>fn(k,+el.value),true));};
 slider('#lg-x',(k,v)=>{k.x=v/100;});slider('#lg-y',(k,v)=>{k.y=v/100;});slider('#lg-s',(k,v)=>{k.scale=v/100;});slider('#lg-o',(k,v)=>{k.opacity=v/100;});slider('#lg-r',(k,v)=>{k.rotation=v;});
 $('#lg-m').addEventListener('change',e=>lapply(k=>{if(e.target.value)k.motion=e.target.value;else delete k.motion;},true));
 $('#lg-t').addEventListener('change',e=>lapply(k=>{if(e.target.value){k.transition=e.target.value;k.transitionDuration=.7;}else{delete k.transition;}},true));
 $('#lg-dur').addEventListener('change',e=>lapply(k=>{const a=A(),T=Math.max(1,total(a.p,k)),m=e.target.value;if(m==='all'){k.start=0;k.duration=T;}else if(m==='head'){k.start=0;k.duration=Math.min(5,T);}else{k.duration=Math.min(5,T);k.start=Math.max(0,T-k.duration);}},true));
 d.addEventListener('click',e=>{const pb=e.target.closest('[data-pos]');if(pb){const [x,y]=pb.dataset.pos.split(',').map(Number);lapply(k=>{k.x=x;k.y=y;},true);out();return;}
  const as=e.target.closest('.lg-asset');if(as){LS.aid=as.dataset.id;const c=lclip();if(c&&c.assetId!==LS.aid)lapply(k=>{k.assetId=LS.aid;k.isLogo=true;},true);prev();document.querySelectorAll('.lg-asset').forEach(b=>b.classList.toggle('on',b===as));return;}
  const b=e.target.closest('[data-lg]');if(!b)return;const k=b.dataset.lg;
  if(k==='close')d.close();
  else if(k==='remove'){const c=lclip();if(c){A().edit(()=>{const p=A().p;p.clips.splice(p.clips.indexOf(p.clips.find(x=>x.id===c.id)),1);});LS.cid=null;out();A().toast('حُذف الشعار.');}}
  else if(k==='process')processApply();});
 for(const id of ['#lg-rm','#lg-inner','#lg-shadow','#lg-ring','#lg-tol','#lg-fe','#lg-shape','#lg-bgc'])$(id).addEventListener('input',()=>{for(const [i,u] of [['tol',''],['fe','']])$('#lg-'+i+'-o').textContent=$('#lg-'+i).value+u;prev();});
 return d;}
function opts(){return{rm:$('#lg-rm').checked,inner:$('#lg-inner').checked,shadow:$('#lg-shadow').checked,ring:$('#lg-ring').checked,tol:+$('#lg-tol').value,feather:+$('#lg-fe').value,shape:$('#lg-shape').value,bgc:$('#lg-bgc').value};}
function srcAsset(){const a=A(),c=lclip();const id=c?.logoSrc||LS.aid;return a.assets.get(id);}
let pt=0;function prev(){clearTimeout(pt);pt=setTimeout(()=>{const as=A().assets.get(LS.aid);const cv=$('#lg-prev');if(!as||!as.image){return;}
 const src=A().assets.get(lclip()?.logoSrc||LS.aid)||as;const r=processLogo(src.image,opts(),360);cv.width=r.width;cv.height=r.height;cv.getContext('2d').drawImage(r,0,0);},60);}
async function processApply(){const a=A(),as=srcAsset();if(!as||!as.image){a.toast('اختر صورة الشعار أولًا.');return;}
 const r=processLogo(as.image,opts(),1400);const blob=await new Promise(res=>r.toBlob(res,'image/png'));if(!blob){a.toast('تعذّرت المعالجة.','error');return;}
 const na=await a.loadAsset(new File([blob],'شعار معالج.png',{type:'image/png'}),{name:'شعار بلا خلفية',type:'image'});a.assets.set(na.id,na);
 lapply(k=>{if(!k.logoSrc)k.logoSrc=k.assetId&&LS.aid===k.assetId?k.assetId:LS.aid;k.assetId=na.id;},true);
 a.toast('تمت معالجة الشعار. يمكنك تعديل الإعدادات وإعادة التطبيق من الأصل.','success');}
function logoStudio(){const a=A();a.pause?.();const d=lgDlg();
 const imgs=[...a.assets.values()].filter(x=>x.type==='image'&&x.image&&!x.scene&&!x.overlay&&!/شعار معالج|لقطة مجمدة/.test(x.name||''));
 const c0=a.chosen();LS.cid=(c0&&c0.kind==='image'&&c0.isLogo)?c0.id:(a.p.clips.find(x=>x.isLogo)?.id||null);
 const cur=lclip();LS.aid=cur?(cur.logoSrc||cur.assetId):(c0&&c0.kind==='image'?c0.assetId:imgs[imgs.length-1]?.id);
 if(c0&&c0.kind==='image'&&!cur){LS.cid=c0.id;c0.isLogo=true;LS.aid=c0.assetId;}
 $('#lg-assets').innerHTML=imgs.map(x=>`<button class="lg-asset${x.id===LS.aid?' on':''}" data-id="${x.id}" style="background-image:url(${x.thumb||x.url})" title="${(x.name||'').replace(/"/g,'')}"></button>`).join('');
 $('#lg-empty').hidden=imgs.length>0;LS.refresh();prev();d.showModal();}
/* ---- dialog ---- */
function css(){if($('#ex-css'))return;const s=document.createElement('style');s.id='ex-css';s.textContent=`
#extras-dialog{max-width:520px;width:94vw}.ex-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:8px 0}
.ex-card{display:flex;flex-direction:column;gap:5px;text-align:right;padding:12px;border:1px solid var(--line);border-radius:10px;background:#1c2031;min-height:78px}
.ex-card:hover{border-color:#8775ce}.ex-card b{font-size:12px}.ex-card small{font-size:10px;color:var(--muted);line-height:1.7}
#extras-dialog h3{font-size:12px;margin:14px 0 6px;color:#cbd0e3}
.ex-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#rec-bar{position:fixed;z-index:200;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#1b1f33;border:1px solid #c06478;border-radius:14px;padding:10px 14px;box-shadow:0 12px 40px #000a}
#rec-bar video{width:96px;height:60px;object-fit:cover;border-radius:8px;background:#000}#rec-bar b{color:#ff9aa8;font-size:12px;white-space:nowrap}
@media(max-width:700px){.ex-grid,.ex-row{grid-template-columns:1fr}}`;document.head.appendChild(s);}
function dlg(){let d=$('#extras-dialog');if(d)return d;css();d=document.createElement('dialog');d.id='extras-dialog';
 d.innerHTML=`<div class="dialog-head"><h2>✦ أدوات إضافية</h2><button class="icon-button" data-ex="close" aria-label="إغلاق">✕</button></div>
<h3>هوية المدرسة</h3>
<button class="button primary" data-ex="logostudio" style="width:100%">🏷 استوديو الشعار (موضع، حجم، حركة، إزالة الخلفية)</button>
<p class="muted" style="margin:4px 0 0">استورد الشعار كصورة من مكتبة الوسائط ثم افتح الاستوديو.</p>
<h3>شريط الاسم والصفة</h3>
<div class="ex-row"><label class="field">الاسم<input id="ex-name" maxlength="60" placeholder="مثال: الأستاذ فهد"></label><label class="field">الصفة<input id="ex-title" maxlength="60" placeholder="مثال: معلم الحاسب"></label></div>
<button class="button" data-ex="lower">إضافة شريط الاسم عند المؤشر</button>
<h3>تسجيل ومؤثرات</h3>
<div class="ex-grid">
<button class="ex-card" data-ex="cam"><b>🎥 تسجيل بالكاميرا</b><small>يُضاف مباشرة إلى المشروع</small></button>
<button class="ex-card" data-ex="screen"><b>🖥 تسجيل الشاشة</b><small>للشروحات (على الحاسوب)</small></button>
<button class="ex-card" data-ex="beep"><b>🔔 صفير لإخفاء كلمة</b><small>يُضاف عند المؤشر فوق الكلمة</small></button>
<button class="ex-card" data-ex="beat"><b>🎵 مزامنة القصّات مع الإيقاع</b><small>يضبط نقاط القص على نبض الموسيقى</small></button>
</div>
<div class="dialog-buttons"><button class="button primary" data-ex="close">تم</button></div>`;
 document.body.appendChild(d);
 d.addEventListener('click',e=>{const b=e.target.closest('[data-ex]');if(!b)return;const k=b.dataset.ex;
  if(k==='close')d.close();
  else if(k==='logostudio'){d.close();logoStudio();}
  else if(k==='lower'){lower($('#ex-name').value.trim(),$('#ex-title').value.trim());d.close();}
  else if(k==='beep'){d.close();beep();}
  else if(k==='beat'){d.close();beatSync();}
  else if(k==='cam'||k==='screen'){d.close();record(k==='cam'?'camera':'screen');}});
 return d;}
function open(){A()?.pause?.();dlg().showModal();}
function addButton(){const g=document.querySelector('.mt-magic')?.parentElement;if(!g||g.querySelector('.ex-btn'))return !!g;
 const b=document.createElement('button');b.className='button compact ex-btn';b.title='شعار، شريط اسم، تسجيل، صفير، مزامنة الإيقاع';b.textContent='✦ أدوات';b.addEventListener('click',open);g.appendChild(b);return true;}
let n=0;const iv=setInterval(()=>{if(addButton()||++n>80)clearInterval(iv);},250);
const T=window.FahadTools=window.FahadTools||{};T.extrasOpen=open;T.beats=beats;
})();
