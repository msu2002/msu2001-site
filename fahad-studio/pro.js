/* Fahad Studio — pro montage toolkit: highlights, smart reframe, scene cuts, word captions,
   auto-zoom, speed ramps, event templates, brand intro/outro, B-roll, multi-platform export (MIT). */
(()=>{
'use strict';
const $=s=>document.querySelector(s),A=()=>window.FahadApp,T=()=>window.FahadTools||{};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const total=(p,skip)=>Math.max(0,...p.clips.filter(x=>x!==skip&&!x.subtitleOf).map(x=>x.start+x.duration));
const overlaps=(p,tid,s,d,skip)=>p.clips.some(x=>x.track===tid&&x!==skip&&x.start<s+d-.001&&x.start+x.duration>s+.001);
let cancelled=false,ui=()=>{};
function seekTo(v,t){return new Promise(res=>{let d=false;const f=()=>{if(d)return;d=true;v.removeEventListener('seeked',f);res();};v.addEventListener('seeked',f);setTimeout(f,3000);try{v.currentTime=t;}catch{f();}});}
const gray=(cx,v,w,h)=>{cx.drawImage(v,0,0,w,h);const d=cx.getImageData(0,0,w,h).data,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;return g;};
async function openVideo(as){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=as.url;await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=()=>rej(new Error('تعذّر فتح '+as.name));v.load();});return v;}
const audioCache=new Map();
async function decodeAudio(as){if(audioCache.has(as.id))return audioCache.get(as.id);let r=null;
 try{if(as.blob&&as.blob.size<200*1048576){const buf=await new OfflineAudioContext(1,1,22050).decodeAudioData(await as.blob.arrayBuffer());r={d:buf.getChannelData(0),sr:buf.sampleRate};}}catch{}
 audioCache.set(as.id,r);return r;}
/* RMS per `hop` seconds over the whole file */
function rmsSeries(au,hop){if(!au)return null;const n=Math.floor(au.d.length/(au.sr*hop)),h=Math.round(au.sr*hop),out=new Float32Array(n);
 for(let i=0;i<n;i++){let s=0,c=0;for(let j=0;j<h;j+=3){const x=au.d[i*h+j];s+=x*x;c++;}out[i]=Math.sqrt(s/Math.max(1,c));}return out;}
/* ---- selection helpers ---- */
function mainVideo(){const a=A(),p=a.p;let c=a.chosen();if(c&&c.kind==='video'&&!c.subtitleOf)return c;
 return p.clips.filter(x=>x.kind==='video'&&x.track==='v1'&&!x.subtitleOf).sort((x,y)=>y.duration-x.duration)[0]||null;}
function videoClips(){const a=A(),p=a.p,c=a.chosen();if(c&&c.kind==='video'&&!c.subtitleOf)return[c];return p.clips.filter(x=>x.kind==='video'&&!x.subtitleOf).sort((x,y)=>x.start-y.start);}
const tl=(c,src)=>c.start+(src-c.in)/(c.speed||1);          /* source time -> timeline time */
const srcT=(c,t)=>c.in+(t-c.start)*(c.speed||1);             /* timeline -> source */
function clipAt(p,base,t){return p.clips.find(x=>x.track===base.track&&x.assetId===base.assetId&&!x.subtitleOf&&x.start<=t+.001&&x.start+x.duration>t+.001);}
/* cut a [t0,t1] timeline slice out of the clip containing it; returns the middle clip */
function slice(a,base,t0,t1){const p=a.p;let c=clipAt(p,base,t0+.01);if(!c)return null;
 if(t0>c.start+.05){const r=a.C.split(p,c.id,t0);if(!r)return null;c=r;}
 if(t1<c.start+c.duration-.05)a.C.split(p,c.id,t1);
 return c;}
function rippleDelete(a,base,ranges){/* ranges: timeline [t1,t2], descending application */
 const p=a.p;let saved=0;
 for(const [t1,t2] of ranges.sort((x,y)=>y[0]-x[0])){const gap=t2-t1,x=clipAt(p,base,t1+.01);if(!x||x.start+x.duration<t2-.001)continue;
  const right=a.C.split(p,x.id,t2);const mid=a.C.split(p,x.id,t1);if(!mid)continue;
  p.clips=p.clips.filter(v=>v.id!==mid.id);
  for(const v of p.clips)if(v.track===base.track&&v.start>=t2-.001&&!v.subtitleOf)v.start=Math.max(0,+(v.start-gap).toFixed(3));
  saved+=gap;}
 return saved;}
/* ---------------------------------------------------------------- 1. highlights */
async function sampleScore(as,srcIn,srcDur,faces,step){
 const v=await openVideo(as),W=64,H=36,cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d',{willReadFrequently:true});
 const t1=Math.min((v.duration||1e9)-.3,srcIn+srcDur),S=[];const n=Math.max(1,Math.floor((t1-srcIn)/step));
 for(let i=0;i<n&&!cancelled;i++){const t=srcIn+i*step;ui('تحليل الفيديو… '+Math.round(i/n*100)+'%',i/n*.85);
  await seekTo(v,t);const a=gray(cx,v,W,H);await seekTo(v,Math.min(t1,t+.15));const b=gray(cx,v,W,H);
  let mo=0,lum=0;for(let k=0;k<a.length;k++){mo+=Math.abs(a[k]-b[k]);lum+=a[k];}mo/=a.length;lum/=a.length;
  let face=0,fx=.5;if(faces&&T().detectFaces){try{const fs=await T().detectFaces(v);if(fs.length){const m=fs.sort((p,q)=>q.width*q.height-p.width*p.height)[0];face=Math.min(1,.5+m.width*3);fx=m.xCenter;}}catch{}}
  S.push({t,mo,lum,face,fx});}
 v.removeAttribute('src');v.load();return S;}
function norm(S,k){const v=S.map(s=>s[k]),mx=Math.max(1e-6,...v),mn=Math.min(...v);return s=>mx-mn<1e-6?.5:(s[k]-mn)/(mx-mn);}
async function highlights(o){const a=A(),c=mainVideo();if(!c){a.toast('أضف فيديو طويلًا إلى المسار الرئيسي أولًا.');return;}
 const as=a.assets.get(c.assetId),srcIn=c.in,srcDur=c.duration*(c.speed||1),L=o.len,N=o.count;
 if(srcDur<L*N*1.2){a.toast('الفيديو قصير لاستخراج '+N+' مقاطع بطول '+L+' ث. قلّل العدد أو المدة.');return;}
 const step=Math.max(1,Math.round(srcDur/360)),S=await sampleScore(as,srcIn,srcDur,o.faces,step);if(cancelled)return;
 ui('تقييم اللحظات…',.9);
 const au=await decodeAudio(as),rs=rmsSeries(au,.5),amax=rs?Math.max(1e-6,...rs):1,nm=norm(S,'mo');
 for(const s of S){const aud=rs?(rs[Math.min(rs.length-1,Math.floor(s.t*2))]||0)/amax:0;s.sc=.38*nm(s)+.38*aud+.24*s.face-(s.lum<40||s.lum>228?.25:0);}
 const k=Math.max(1,Math.round(L/step)),wins=[];for(let i=0;i+k<=S.length;i++){let m=0;for(let j=0;j<k;j++)m+=S[i+j].sc;wins.push({t:S[i].t,sc:m/k});}
 wins.sort((x,y)=>y.sc-x.sc);const pick=[];for(const w of wins){if(pick.length>=N)break;if(pick.every(q=>Math.abs(q.t-w.t)>=L))pick.push(w);}
 pick.sort((x,y)=>x.t-y.t);
 const tr=o.trans?.35:0;
 a.edit(()=>{const p=a.p;const was=p.clips.filter(x=>x.track==='v1'&&x.assetId===c.assetId&&!x.subtitleOf);const off=Math.min(...was.map(x=>x.start));
  p.clips=p.clips.filter(x=>!was.includes(x));let st=off;
  pick.forEach((w,i)=>{const n=a.C.clip(as,st,'v1');n.in=+(w.t).toFixed(3);n.duration=L+(i<pick.length-1?tr:0);n.fit='cover';n.transition=i===0?'none':'fade';n.transitionDuration=tr||.3;p.clips.push(n);st+=L;});
  a.selected=null;});
 a.seek(0);a.toast('استُخرجت '+pick.length+' لقطات بارزة بطول '+L+' ث. استبدلت الفيديو الأصلي (يمكنك التراجع).','success');}
/* ---------------------------------------------------------------- 2. smart reframe */
function kx(c,local){const k=c.xk;if(!k||!k.length)return c.x;const t=c.in+local*(c.speed||1);if(t<=k[0][0])return k[0][1];const e=k[k.length-1];if(t>=e[0])return e[1];
 let lo=0,hi=k.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(k[m][0]<=t)lo=m;else hi=m;}const u=(t-k[lo][0])/(k[hi][0]-k[lo][0]||1),s=u*u*(3-2*u);return k[lo][1]+(k[hi][1]-k[lo][1])*s;}
async function reframe(o){const a=A(),p=a.p,vids=videoClips().filter(c=>c.track==='v1'||o.all);if(!vids.length){a.toast('لا يوجد فيديو لإعادة تأطيره.');return;}
 const target=o.aspect;const sel=$('#aspect');if(sel&&sel.value!==target){sel.value=target;sel.dispatchEvent(new Event('change',{bubbles:true}));await sleep(200);}
 const W=a.p.width,H=a.p.height;let done=0;const plans=[];
 for(const c of vids){if(cancelled)return;const as=a.assets.get(c.assetId);ui('تتبع الوجه في «'+(c.name||'').slice(0,20)+'»…',done/vids.length);
  const iw=as.width||1280,ih=as.height||720,sc=Math.max(W/iw,H/ih),dw=iw*sc,maxOff=Math.max(0,(dw-W)/2);
  const srcDur=c.duration*(c.speed||1),step=Math.max(.5,srcDur/260);const pts=[];
  if(maxOff<2){plans.push({id:c.id,xk:null,x:.5});continue;}
  const v=await openVideo(as);
  for(let t=c.in;t<c.in+srcDur&&!cancelled;t+=step){await seekTo(v,t);let fx=null;if(T().detectFaces){try{const fs=await T().detectFaces(v);if(fs.length){const m=fs.sort((q,r)=>r.width*r.height-q.width*q.height)[0];fx=m.xCenter;}}catch{}}pts.push([t,fx]);
   ui('تتبع الوجه… '+Math.round((t-c.in)/srcDur*100)+'%',(done+(t-c.in)/srcDur)/vids.length);}
  v.removeAttribute('src');v.load();
  /* fill gaps, smooth */
  let last=.5;for(const q of pts){if(q[1]==null)q[1]=null;}
  const vals=pts.map(q=>q[1]);let prev=vals.find(x=>x!=null);if(prev==null)prev=.5;for(let i=0;i<vals.length;i++){if(vals[i]==null)vals[i]=prev;else prev=vals[i];}
  const sm=[];let e=vals[0];for(let i=0;i<vals.length;i++){e=e*.75+vals[i]*.25;sm.push(e);}
  const xk=pts.map((q,i)=>[+q[0].toFixed(3),+clamp(.5+(.5-sm[i])*dw/W,.5-maxOff/W,.5+maxOff/W).toFixed(4)]);
  plans.push({id:c.id,xk,x:xk[0]?xk[0][1]:.5});done++;}
 if(cancelled)return;
 a.edit(()=>{for(const pl of plans){const c=a.p.clips.find(x=>x.id===pl.id);if(!c)continue;c.fit='cover';c.scale=1;c.y=.5;c.x=pl.x;if(pl.xk)c.xk=pl.xk;else delete c.xk;}});
 a.seek(a.current);a.toast('أُعيد تأطير '+plans.length+' مقطع على '+(target==='720x1280'?'9:16':target==='1080x1080'?'1:1':'16:9')+' مع تتبع الوجه المتحرك.','success');}
/* ---------------------------------------------------------------- 3. scene-cut detection */
async function sceneCuts(o){const a=A(),c=mainVideo();if(!c){a.toast('أضف فيديو أولًا.');return;}
 const as=a.assets.get(c.assetId),srcDur=c.duration*(c.speed||1),step=Math.max(.2,srcDur/1500),v=await openVideo(as),W=32,H=18,cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d',{willReadFrequently:true});
 const hist=img=>{const h=new Float32Array(24);cx.drawImage(v,0,0,W,H);const d=cx.getImageData(0,0,W,H).data;for(let i=0;i<W*H;i++){h[d[i*4]>>5]++;h[8+(d[i*4+1]>>5)]++;h[16+(d[i*4+2]>>5)]++;}for(let i=0;i<24;i++)h[i]/=W*H;return h;};
 const diffs=[];let prev=null;
 for(let t=c.in;t<c.in+srcDur&&!cancelled;t+=step){await seekTo(v,t);const h=hist();if(prev){let d=0;for(let i=0;i<24;i++)d+=Math.abs(h[i]-prev[i]);diffs.push([t,d]);}prev=h;ui('كشف تغيّر المشاهد… '+Math.round((t-c.in)/srcDur*100)+'%',(t-c.in)/srcDur);}
 v.removeAttribute('src');v.load();if(cancelled)return;
 const vals=diffs.map(x=>x[1]),mean=vals.reduce((x,y)=>x+y,0)/Math.max(1,vals.length),sd=Math.sqrt(vals.reduce((x,y)=>x+(y-mean)**2,0)/Math.max(1,vals.length)),thr=Math.max(.35,mean+3*sd*(1.4-o.sens)),cuts=[];
 for(const [t,d] of diffs){if(d>thr&&(!cuts.length||t-cuts[cuts.length-1]>=o.minGap))cuts.push(t);}
 if(!cuts.length){a.toast('لم أجد تغيّرًا واضحًا في المشاهد. جرّب رفع الحساسية.');return;}
 a.edit(()=>{for(const st of cuts.sort((x,y)=>y-x)){const t=tl(c,st),x=clipAt(a.p,c,t);if(x)a.C.split(a.p,x.id,t);}a.selected=null;});
 a.toast('قُسّم الفيديو إلى '+(cuts.length+1)+' مشهدًا عند كل تغيّر مشهد.','success');}
/* ---------------------------------------------------------------- 4. word captions + fillers */
const FILLERS={'اه':1,'آه':1,'اها':1,'امم':1,'اممم':1,'ااه':1,'اااه':1,'ايه':1,'إيه':1,'مم':1,'ممم':1,'يعني':2,'طيب':2,'كذا':2};
const wordClean=w=>w.replace(/[ً-ْـ،,.؟?!؛:]/g,'');
function cueWords(cue){const words=cue.text.split(/\s+/).filter(Boolean),len=words.map(w=>Math.max(2,[...w].length)),sum=len.reduce((x,y)=>x+y,0);let acc=0;
 return words.map((w,i)=>{const s=cue.start+(cue.end-cue.start)*acc/sum;acc+=len[i];return{w,s,e:cue.start+(cue.end-cue.start)*acc/sum};});}
function cuesOf(c,a){const as=a.assets.get(c.assetId);return as?.captions?.length?as.captions:null;}
function wordCaptions(o){const a=A(),vids=videoClips();let made=0;
 const todo=vids.map(c=>({c,cues:cuesOf(c,a)})).filter(x=>x.cues);
 if(!todo.length){a.toast('لا توجد كتابة عربية للفيديو بعد. افتح لوحة «الكتابة» واضغط «كتابة الكلام بالعربية» أولًا.');return;}
 a.edit(()=>{const p=a.p;p.clips=p.clips.filter(x=>!x.wordCap);
  for(const {c,cues} of todo){c.captionsEnabled=false;
   for(const cue of cues){for(const wd of cueWords(cue)){const s=Math.max(c.in,wd.s),e=Math.min(c.in+c.duration*(c.speed||1),wd.e);if(e-s<.08)continue;
    const t=a.C.textClip(tl(c,s),{text:wd.w,fontId:p.defaultCaptionFontId||p.defaultFontId||'cairo',fontSize:Math.round(p.width*(o.big?.1:.07)),color:o.color,bold:true,box:o.box,x:.5,y:o.pos,animation:'pop',name:'كلمة: '+wd.w.slice(0,12)});
    t.duration=Math.max(.12,(e-s)/(c.speed||1));t.wordCap=true;p.clips.push(t);made++;}}}});
 a.toast('أُنشئت '+made+' كلمة متتابعة مع إبراز (التوقيت تقريبي حسب طول الكلمة). لإعادة الترجمة العادية احذف كلمات «كلمة:» أو اضغط تراجع.','success');}
function removeFillers(o){const a=A(),c=mainVideo();if(!c){a.toast('أضف فيديو أولًا.');return;}const cues=cuesOf(c,a);
 if(!cues){a.toast('لا توجد كتابة عربية للفيديو بعد. اكتب الكلام أولًا من لوحة «الكتابة».');return;}
 const ranges=[];for(const cue of cues)for(const wd of cueWords(cue)){const lvl=FILLERS[wordClean(wd.w)];if(!lvl||(lvl===2&&!o.strong))continue;
  const s=Math.max(c.in,wd.s-.03),e=Math.min(c.in+c.duration*(c.speed||1),wd.e+.03);if(e-s>=.12)ranges.push([tl(c,s),tl(c,e)]);}
 if(!ranges.length){a.toast('لم أجد كلمات حشو في النص المكتوب.');return;}
 let saved=0;a.edit(()=>{saved=rippleDelete(a,c,ranges);a.selected=null;});
 a.toast('حُذفت '+ranges.length+' كلمة حشو ('+saved.toFixed(1)+' ث). التوقيت مبني على النص لذا راجع النتيجة، والتراجع متاح.','success');}
function removePauses(o){const a=A(),c=mainVideo();if(!c){a.toast('أضف فيديو أولًا.');return;}
 const as=a.assets.get(c.assetId);return decodeAudio(as).then(au=>{if(!au){a.toast('تعذّر قراءة صوت الفيديو.');return;}
  const hop=.1,rs=rmsSeries(au,hop),mx=Math.max(1e-6,...rs),thr=Math.max(.008,mx*.06),runs=[];let s=null;
  const t0=c.in,t1=c.in+c.duration*(c.speed||1);
  for(let i=Math.floor(t0/hop);i<Math.min(rs.length,Math.ceil(t1/hop));i++){const q=rs[i]<thr;if(q&&s==null)s=i*hop;if(!q&&s!=null){if(i*hop-s>=o.min)runs.push([s,i*hop]);s=null;}}
  if(s!=null&&t1-s>=o.min)runs.push([s,t1]);
  const rng=runs.map(([x,y])=>[tl(c,Math.max(t0,x)+.15),tl(c,Math.min(t1,y)-.15)]).filter(r=>r[1]-r[0]>=.2);
  if(!rng.length){a.toast('لا توجد وقفات صامتة أطول من '+o.min+' ث.');return;}
  let saved=0;a.edit(()=>{saved=rippleDelete(a,c,rng);a.selected=null;});a.toast('حُذفت '+rng.length+' وقفة صامتة ووُفّرت '+saved.toFixed(1)+' ث.','success');});}
/* ---------------------------------------------------------------- 5. auto zoom on emphasis */
async function autoZoom(o){const a=A(),c=mainVideo();if(!c){a.toast('أضف فيديو أولًا.');return;}
 const as=a.assets.get(c.assetId),au=await decodeAudio(as);if(!au){a.toast('تعذّر قراءة صوت الفيديو.');return;}
 const hop=.1,rs=rmsSeries(au,hop),t0=c.in,t1=c.in+c.duration*(c.speed||1),i0=Math.floor(t0/hop),i1=Math.min(rs.length,Math.ceil(t1/hop));
 const seg=Array.from(rs.slice(i0,i1)),mean=seg.reduce((x,y)=>x+y,0)/Math.max(1,seg.length),sd=Math.sqrt(seg.reduce((x,y)=>x+(y-mean)**2,0)/Math.max(1,seg.length));
 const thr=mean+sd*(1.6-o.sens*.8),peaks=[];
 for(let i=2;i<seg.length-2;i++){if(seg[i]>thr&&seg[i]>=seg[i-1]&&seg[i]>=seg[i+1]&&seg[i]>mean*1.4){const t=t0+i*hop;if(!peaks.length||t-peaks[peaks.length-1]>=o.gap)peaks.push(t);}}
 if(!peaks.length){a.toast('لم أجد لحظات تأكيد واضحة في الصوت.');return;}
 const list=peaks.slice(0,o.max);let made=0;
 a.edit(()=>{for(const st of list.sort((x,y)=>y-x)){const ta=tl(c,Math.max(t0,st-.2)),tb=Math.min(tl(c,t1),ta+o.len),m=slice(a,c,ta,tb);if(!m)continue;m.motion=o.dir==='out'?'zoom-out':'zoom-in';m.motionAmount=o.amt;m.scale=Math.max(m.scale||1,1.02);made++;}a.selected=null;});
 a.toast('أُضيف تكبير تلقائي عند '+made+' لحظة تأكيد في الكلام.','success');}
/* ---------------------------------------------------------------- 6. speed ramps on beats */
async function speedRamps(o){const a=A(),p=a.p;const music=p.clips.filter(c=>c.kind==='audio'&&!c.videoLink&&!c.subtitleOf).sort((x,y)=>y.duration-x.duration)[0];
 if(!music){a.toast('أضف موسيقى إلى المشروع أولًا.');return;}const mas=a.assets.get(music.assetId);if(!mas||!T().beats){a.toast('تعذّر تحليل الموسيقى.');return;}
 ui('تحليل إيقاع الموسيقى…',.3);const bt=await T().beats(mas);if(cancelled)return;
 const sp=music.speed||1,beats=bt.map(t=>music.start+(t-music.in)/sp).filter(t=>t>music.start+1&&t<music.start+music.duration-4);
 const vids=p.clips.filter(c=>c.track==='v1'&&c.kind==='video'&&!c.subtitleOf);
 const slowD=.6,fastLen=1.8,span=slowD+fastLen,picks=[];
 for(const t of beats){if(picks.length>=o.max)break;if(picks.length&&t-picks[picks.length-1]<o.gap)continue;
  const t0=t-.3,t1=t0+span;const c=vids.find(v=>v.start<=t0&&v.start+v.duration>=t1+.2&&(v.speed||1)===1);if(c)picks.push(t0);}
 if(!picks.length){a.toast('لم أجد موضعًا مناسبًا (يلزم مقطع فيديو بسرعة عادية تحت نبضة قوية).');return;}
 a.edit(()=>{for(const t0 of picks.sort((x,y)=>y-x)){const base=vids.find(v=>v.start<=t0+.01&&v.start+v.duration>=t0+span);if(!base)continue;
  const mid=slice(a,base,t0,t0+span);if(!mid)continue;
  const fast=a.C.split(a.p,mid.id,t0+slowD);if(!fast)continue;
  /* slow-mo: .6s of source shown over 1.2s; then 1.8s of source squeezed into 1.2s => total length unchanged */
  mid.speed=.5;mid.duration=slowD*2;mid.volume=0;fast.speed=1.5;fast.in=mid.in+slowD;fast.duration=fastLen/1.5;fast.volume=0;fast.start=mid.start+mid.duration;
  /* clips after the ramp keep their place: total shifted = +0.6 -0.6 = 0 */}
  a.selected=null;});
 a.toast('أُضيفت '+picks.length+' مؤثرات تبطئة/تسريع على نبض الموسيقى بدون تغيير الطول الكلي (صوت المقطع مكتوم أثناء المؤثر).','success');}
/* ---------------------------------------------------------------- 7+8. templates and brand */
const TPL={
 graduation:{name:'حفل التخرج',c1:'#0d1b3d',c2:'#c9a24a',lut:'teal-orange',fx:'vignette',intro:'حفل تخرج الدفعة',outro:'مبارك للخريجين',font:'cairo'},
 national:{name:'اليوم الوطني',c1:'#0b5a34',c2:'#ffffff',lut:'vivid-pop',fx:'none',intro:'اليوم الوطني',outro:'دام عزك يا وطن',font:'cairo'},
 science:{name:'المعرض العلمي',c1:'#102a56',c2:'#37c5ff',lut:'vivid-pop',fx:'none',intro:'المعرض العلمي',outro:'شكرًا لكل المشاركين',font:'cairo'},
 sports:{name:'اليوم الرياضي',c1:'#7a1620',c2:'#ffb02e',lut:'vivid-pop',fx:'none',intro:'اليوم الرياضي',outro:'روح رياضية عالية',font:'cairo'},
 open:{name:'يوم مفتوح / حفل عام',c1:'#2b1d55',c2:'#c7a6ff',lut:'soft-warm',fx:'vignette',intro:'يوم مفتوح',outro:'شكرًا لحضوركم',font:'cairo'}
};
function backdrop(w,h,c1,c2){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,c1);g.addColorStop(1,'#000000');x.fillStyle=g;x.fillRect(0,0,w,h);
 x.globalAlpha=.16;x.fillStyle=c2;for(let i=0;i<9;i++){x.beginPath();x.arc(w*(.1+.1*i),h*(.2+.07*((i*5)%9)),Math.min(w,h)*(.05+.025*(i%4)),0,Math.PI*2);x.fill();}
 x.globalAlpha=1;x.fillStyle=c2;x.fillRect(w*.25,h*.5-2,w*.5,4);x.fillRect(w*.38,h*.9,w*.24,6);return cv;}
async function bgAsset(cv,name){const a=A(),blob=await new Promise(r=>cv.toBlob(r,'image/png'));const as=await a.loadAsset(new File([blob],name+'.png',{type:'image/png'}),{name,type:'image'});as.overlay=false;a.assets.set(as.id,as);return as;}
function logoAsset(id){const a=A();if(id&&a.assets.get(id))return a.assets.get(id);const lc=a.p.clips.find(c=>c.isLogo);if(lc)return a.assets.get(lc.assetId);return null;}
async function brandKit(o){const a=A(),p=a.p,tp=TPL[o.tpl]||TPL.open;if(!p.clips.some(c=>!c.subtitleOf&&c.kind!=='text')){a.toast('أضف مقاطع إلى المشروع أولًا.');return;}
 const c1=o.c1||tp.c1,c2=o.c2||tp.c2,D=o.intro?3.6:0,E=o.outroOn?3.2:0,W=p.width,H=p.height,logo=logoAsset(o.logo);
 const school=o.school||'مدرستنا',ev=o.event||tp.intro,sub=o.sub||'';
 const bgIn=D?await bgAsset(backdrop(W,H,c1,c2),'خلفية المقدمة'):null,bgOut=E?await bgAsset(backdrop(W,H,c1,c2),'خلفية الختام'):null;
 const tot0=total(p,null),font=p.defaultFontId||'cairo';
 a.edit(()=>{
  if(D)for(const c of p.clips)if(!c.subtitleOf)c.start=+(c.start+D).toFixed(3);
  const T0=tot0+D;
  const txt=(start,dur,text,size,y,color,anim,name)=>{const t=a.C.textClip(start,{text,fontId:font,fontSize:Math.round(W*size),color,bold:true,x:.5,y,animation:anim,name});t.duration=dur;return t;};
  const add=(c)=>{p.clips.push(c);return c;};
  const freeV=(s,d)=>p.tracks.filter(t=>t.kind==='visual'&&t.id!=='v1').find(t=>!overlaps(p,t.id,s,d))||null;
  if(D){const b=a.C.clip(bgIn,0,'v1');b.duration=D+.4;b.fit='cover';b.transition='none';add(b);
   const mainFirst=p.clips.filter(c=>c.track==='v1'&&c.start>=D-.01&&!c.subtitleOf).sort((x,y)=>x.start-y.start)[0];if(mainFirst){mainFirst.transition='fade';mainFirst.transitionDuration=.4;mainFirst.start=+(D-.4).toFixed(3);if(mainFirst.start<0)mainFirst.start=0;}
   const tv=freeV(0,D);if(logo&&tv){const l=a.C.clip(logo,0,tv.id);l.duration=D;l.fit='contain';l.scale=Math.min(.45,.32*(logo.width&&logo.height?Math.max(1,logo.height/logo.width):1));l.y=.36;l.x=.5;l.motion='zoom-in';l.motionAmount=.3;l.transition='fade';l.transitionDuration=.6;l.name='شعار المقدمة';add(l);}
   add(txt(.3,D-.3,school,logo?.062:.075,logo?.62:.42,'#ffffff','rise','اسم المدرسة'));add(txt(.7,D-.7,ev,.05,logo?.74:.56,c2,'fade','عنوان المناسبة'));if(sub)add(txt(1.0,D-1,sub,.03,logo?.84:.68,'#d7dcf0','fade','تفاصيل'));}
  if(E){const b=a.C.clip(bgOut,T0-.4,'v1');b.duration=E+.4;b.fit='cover';b.transition='fade';b.transitionDuration=.5;add(b);
   const tv=freeV(T0,E);if(logo&&tv){const l=a.C.clip(logo,T0,tv.id);l.duration=E;l.fit='contain';l.scale=.3;l.y=.34;l.x=.5;l.transition='fade';l.transitionDuration=.5;l.name='شعار الختام';add(l);}
   add(txt(T0+.2,E-.2,o.outroText||tp.outro,.06,logo?.6:.45,'#ffffff','rise','رسالة الختام'));add(txt(T0+.6,E-.6,school,.04,logo?.74:.6,c2,'fade','اسم المدرسة'));}
  if(o.grade){for(const c of p.clips)if(c.track==='v1'&&c.kind!=='text'&&!c.subtitleOf&&c.assetId!==bgIn?.id&&c.assetId!==bgOut?.id){if(window.FahadLUT&&FahadLUT.LOOKS&&FahadLUT.LOOKS.some(l=>l.id===tp.lut)){c.lut=tp.lut;c.lutStrength=.6;}if(tp.fx!=='none'){c.effect=tp.fx;c.effectStrength=.4;}}}
  for(const c of p.clips)if(c.isLogo&&!c.subtitleOf&&D){/* keep corner logo through the body only */}
  a.selected=null;});
 a.seek(0);a.toast('طُبّقت الهوية: '+(D?'مقدمة ':'')+(E?'وختام ':'')+(o.grade?'وتدرّج ألوان ':'')+'(قالب «'+tp.name+'»).','success');}
/* ---------------------------------------------------------------- 9. B-roll */
function brollCandidates(){const a=A(),p=a.p,used=new Set(p.clips.filter(c=>c.track==='v1').map(c=>c.assetId));
 return[...a.assets.values()].filter(x=>['image','video'].includes(x.type)&&!x.overlay&&!x.scene&&!used.has(x.id)&&!/خلفية|شعار|لقطة مجمدة/.test(x.name||''));}
async function broll(o){const a=A(),p=a.p,c=mainVideo();if(!c){a.toast('أضف فيديو المتحدث إلى المسار الرئيسي أولًا.');return;}
 const ids=o.ids,pool=ids.map(i=>a.assets.get(i)).filter(Boolean);if(!pool.length){a.toast('اختر صورًا أو مقاطع داعمة من القائمة.');return;}
 const as=a.assets.get(c.assetId),au=await decodeAudio(as);if(!au){a.toast('تعذّر قراءة صوت الفيديو لاكتشاف الكلام.');return;}
 const hop=.25,rs=rmsSeries(au,hop),mx=Math.max(1e-6,...rs),thr=Math.max(.015,mx*.14),t0=c.in,t1=c.in+c.duration*(c.speed||1),runs=[];let s=null;
 for(let i=Math.floor(t0/hop);i<Math.min(rs.length,Math.ceil(t1/hop));i++){const on=rs[i]>thr;if(on&&s==null)s=i*hop;if(!on&&s!=null){if(i*hop-s>=1.6)runs.push([s,i*hop]);s=null;}}
 if(s!=null&&t1-s>=1.6)runs.push([s,t1]);
 const starts=[];let last=-1e9;for(const r of runs){const t=tl(c,Math.max(t0,r[0])+.4);if(t-last>=o.gap&&t+1.5<tl(c,t1)){starts.push([t,Math.min(o.len,(tl(c,r[1])-t)+1.2)]);last=t;}}
 if(!starts.length){a.toast('لم أجد مقاطع كلام طويلة بما يكفي لوضع لقطات داعمة.');return;}
 let n=0;a.edit(()=>{for(const [t,d0] of starts.slice(0,o.max)){const d=Math.max(1.5,d0);const tr=p.tracks.filter(x=>x.kind==='visual'&&x.id!=='v1').find(x=>!overlaps(p,x.id,t,d));if(!tr)continue;
  const as2=pool[n%pool.length],b=a.C.clip(as2,t,tr.id);b.duration=d;b.fit='cover';b.scale=1;b.volume=0;b.transition='fade';b.transitionDuration=.4;b.name='لقطة داعمة';
  if(as2.type==='video'){b.in=+Math.min(Math.max(0,(as2.duration||d)-d-.1),n*1.3).toFixed(2);}else{b.motion=['ken-burns','zoom-in','drift'][n%3];b.motionAmount=.5;}
  p.clips.push(b);n++;}a.selected=null;});
 a.toast(n?'وُضعت '+n+' لقطة داعمة فوق الكلام (الصوت الأصلي مستمر).':'لا يوجد مسار فيديو إضافي فارغ.','success');}
/* ---------------------------------------------------------------- 10. multi-platform export */
async function multiExport(o){const a=A();const sel=$('#aspect'),orig=sel.value,name0=a.p.name;const jobs=o.targets;if(!jobs.length){a.toast('اختر منصة واحدة على الأقل.');return;}
 const bar=document.createElement('div');bar.id='pro-run';bar.style.cssText='position:fixed;z-index:300;bottom:14px;left:50%;transform:translateX(-50%);background:#1b1f33;border:1px solid #8775ce;border-radius:12px;padding:10px 16px;color:#fff;font-size:12px;box-shadow:0 10px 40px #000a';document.body.appendChild(bar);
 try{for(let i=0;i<jobs.length;i++){const j=jobs[i];bar.textContent=`تصدير ${i+1} من ${jobs.length}: ${j.label}… أبقِ الصفحة ظاهرة`;
   if(sel.value!==j.aspect){sel.value=j.aspect;sel.dispatchEvent(new Event('change',{bubbles:true}));await sleep(400);}
   $('#export-open').click();await sleep(250);if(!$('#export-dialog').open){throw Error('تعذّر فتح التصدير (قد تكون الكتابة العربية جارية).');}
   $('#export-size').value=String(o.size);const fmts=[...$('#export-format').options];if(o.format){const f=fmts.find(x=>x.value.includes(o.format));if(f)$('#export-format').value=f.value;}
   $('#export-start').click();await sleep(500);
   const t0=Date.now();while(a.exportJob&&Date.now()-t0<3600000){await sleep(400);if(cancelled)throw Error('أُلغي.');}
   const dl=$('#export-download');if(!dl.href||$('#export-result').hidden)throw Error('لم ينتج المتصفح ملفًا لـ '+j.label);
   const link=document.createElement('a');link.href=dl.href;link.download=(name0||'Fahad-Studio')+'-'+j.tag+(dl.download.endsWith('.mp4')?'.mp4':'.webm');document.body.appendChild(link);link.click();link.remove();
   $('#export-dialog').close();await sleep(600);}
  a.toast('اكتمل تصدير '+jobs.length+' نسخ للمنصات.','success');}
 catch(e){a.toast('توقف التصدير: '+e.message,'error');try{$('#export-dialog').open&&$('#export-dialog').close();}catch{}}
 finally{bar.remove();if(sel.value!==orig){sel.value=orig;sel.dispatchEvent(new Event('change',{bubbles:true}));}}}
/* ---------------------------------------------------------------- dialog */
function css(){if($('#pro-css'))return;const s=document.createElement('style');s.id='pro-css';s.textContent=`
#pro-dialog{max-width:640px;width:95vw;max-height:90vh;overflow:auto}#pro-dialog h3{margin:0;font-size:13px}
.pr-card{border:1px solid var(--line);border-radius:12px;background:#171b2c;margin:8px 0;overflow:hidden}
.pr-card>summary{cursor:pointer;padding:11px 13px;display:flex;gap:9px;align-items:center;list-style:none}.pr-card>summary::-webkit-details-marker{display:none}
.pr-card>summary small{display:block;color:var(--muted);font-size:10px;margin-top:2px;font-weight:400}
.pr-card[open]{border-color:#8775ce}.pr-body{padding:4px 13px 13px;display:grid;gap:8px}.pr-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pr-body label.field,.pr-body label.ck{font-size:12px}.pr-body label.ck{display:flex;gap:7px;align-items:center}
.pr-chips{display:flex;gap:6px;flex-wrap:wrap}.pr-chips label{border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:11px;display:flex;gap:5px;align-items:center}
.pr-bar{height:8px;background:#232842;border-radius:5px;overflow:hidden;margin:8px 0 3px}.pr-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7379ec,#9b68e7);transition:width .2s}
.pr-bro{display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:6px}.pr-bro label{position:relative;display:block;border:2px solid var(--line);border-radius:8px;overflow:hidden;height:58px;background:#1c2031 center/cover}.pr-bro input{position:absolute;top:4px;right:4px}
@media(max-width:700px){.pr-row{grid-template-columns:1fr}}`;document.head.appendChild(s);}
const card=(id,ico,title,desc,body,btn)=>`<details class="pr-card" id="pr-${id}"><summary><span style="font-size:20px">${ico}</span><span><h3>${title}</h3><small>${desc}</small></span></summary><div class="pr-body">${body}${btn?`<button class="button primary" data-pr="${id}">${btn}</button>`:''}</div></details>`;
function dialog(){let d=$('#pro-dialog');if(d)d.remove();css();d=document.createElement('dialog');d.id='pro-dialog';
 const cands=brollCandidates(),tpls=Object.entries(TPL).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
 const imgs=[...A().assets.values()].filter(x=>x.type==='image'&&!x.overlay&&!x.scene);
 d.innerHTML=`<div class="dialog-head"><h2>🚀 مونتاج احترافي</h2><button class="icon-button" data-pr="close" aria-label="إغلاق">✕</button></div>
<p class="muted" style="margin:0 0 6px">عشر أدوات ذكية تعمل على جهازك. افتح الأداة، اضبط خياراتها، واضغط تنفيذ. كل شيء قابل للتراجع (Ctrl+Z).</p>
${card('hl','🎬','مقاطع بارزة من فيديو طويل','يستخرج أفضل اللحظات (حركة + صوت + وجوه) ويجمعها في ملخص',`<div class="pr-row"><label class="field">عدد اللقطات<select id="hl-n"><option>3</option><option selected>5</option><option>8</option></select></label><label class="field">طول كل لقطة<select id="hl-l"><option>4</option><option selected>6</option><option>10</option></select></label></div><label class="ck"><input type="checkbox" id="hl-f" checked> أعطِ أولوية للقطات فيها وجوه</label>`,'استخراج الملخص')}
${card('rf','📱','إعادة تأطير ذكية مع تتبع الوجه','يحوّل الفيديو إلى عمودي/مربع ويحرّك الإطار مع الشخص طوال المقطع',`<div class="pr-row"><label class="field">النسبة<select id="rf-a"><option value="720x1280">9:16 عمودي</option><option value="1080x1080">1:1 مربع</option></select></label><label class="ck"><input type="checkbox" id="rf-all"> شمل كل المقاطع</label></div>`,'إعادة التأطير')}
${card('sc','✂️','كشف تغيّر المشاهد','يقسّم المقطع الطويل تلقائيًا عند كل تغيّر في المشهد',`<div class="pr-row"><label class="field">الحساسية<select id="sc-s"><option value=".4">منخفضة</option><option value=".7" selected>متوسطة</option><option value="1">عالية</option></select></label><label class="field">أقل فاصل بين القصّات<select id="sc-g"><option value="1">1 ث</option><option value="2" selected>2 ث</option><option value="4">4 ث</option></select></label></div>`,'اكتشاف وتقسيم')}
${card('cp','💬','كتابة كلمة بكلمة وحذف الحشو والوقفات','يحوّل الترجمة إلى كلمات متتابعة بإبراز، ويحذف «اه/امم» والوقفات الصامتة',`<p class="muted" style="margin:0">يلزم تفريغ الكلام أولًا من لوحة «الكتابة» (محلي).</p><div class="pr-row"><label class="field">لون الكلمة<input type="color" id="cp-c" value="#ffd24a"></label><label class="field">موضع الكلمات<select id="cp-y"><option value=".5">وسط</option><option value=".72" selected>أسفل</option><option value=".28">أعلى</option></select></label></div><div class="pr-chips"><label><input type="checkbox" id="cp-big" checked> حجم كبير</label><label><input type="checkbox" id="cp-box" checked> خلفية للكلمة</label></div><button class="button" data-pr="cp-words">💬 أنشئ الكلمات المتتابعة</button><hr style="border-color:var(--line);width:100%"><div class="pr-chips"><label><input type="checkbox" id="cp-strong"> احذف أيضًا «يعني/طيب/كذا»</label></div><button class="button" data-pr="cp-fill">🧹 احذف كلمات الحشو</button><div class="pr-row"><label class="field">أقل وقفة تُحذف<select id="cp-pm"><option value=".6">0.6 ث</option><option value=".9" selected>0.9 ث</option><option value="1.5">1.5 ث</option></select></label><button class="button" data-pr="cp-pause" style="align-self:end">🤫 احذف الوقفات الصامتة</button></div>`,'')}
${card('az','🔍','تكبير تلقائي عند التأكيد','يكبّر الصورة قليلًا حين يرتفع صوت المتحدث للتأكيد',`<div class="pr-row"><label class="field">الحساسية<select id="az-s"><option value=".3">منخفضة</option><option value=".6" selected>متوسطة</option><option value="1">عالية</option></select></label><label class="field">أقصى عدد<select id="az-m"><option>4</option><option selected>8</option><option>15</option></select></label></div><div class="pr-row"><label class="field">مدة التكبير<select id="az-l"><option value="1.2">1.2 ث</option><option value="1.8" selected>1.8 ث</option><option value="2.6">2.6 ث</option></select></label><label class="field">الاتجاه<select id="az-d"><option value="in">تقريب</option><option value="out">ابتعاد</option></select></label></div>`,'طبّق التكبير')}
${card('sr','⚡','تسريع وتبطئة مع الإيقاع','تبطئة لحظية تحت نبضات الموسيقى القوية ثم تسريع يعوّضها (الطول ثابت)',`<div class="pr-row"><label class="field">أقصى عدد<select id="sr-m"><option>1</option><option selected>3</option><option>6</option></select></label><label class="field">أقل فاصل<select id="sr-g"><option value="6">6 ث</option><option value="10" selected>10 ث</option><option value="20">20 ث</option></select></label></div>`,'طبّق على الإيقاع')}
${card('tp','🏫','قوالب مناسبات المدرسة + هوية المقدمة والختام','مقدمة وختام بشعارك واسم المدرسة وألوان القالب، مع تدرّج لوني للمقاطع',`<div class="pr-row"><label class="field">القالب<select id="tp-t">${tpls}</select></label><label class="field">اسم المدرسة<input id="tp-s" maxlength="60" placeholder="مثال: مدرسة الأمير سلطان"></label></div><div class="pr-row"><label class="field">عنوان المناسبة<input id="tp-e" maxlength="60" placeholder="يملأ تلقائيًا من القالب"></label><label class="field">تفاصيل (تاريخ/مكان)<input id="tp-d" maxlength="80"></label></div><div class="pr-row"><label class="field">اللون الأساسي<input type="color" id="tp-c1" value="#0d1b3d"></label><label class="field">لون التمييز<input type="color" id="tp-c2" value="#c9a24a"></label></div><label class="field">الشعار<select id="tp-l"><option value="">بدون / شعار المشروع تلقائيًا</option>${imgs.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><div class="pr-chips"><label><input type="checkbox" id="tp-i" checked> مقدمة</label><label><input type="checkbox" id="tp-o" checked> ختام</label><label><input type="checkbox" id="tp-g" checked> تدرّج ألوان القالب</label></div>`,'طبّق القالب والهوية')}
${card('br','🖼','لقطات داعمة (B-roll) فوق الكلام','تضع صورك ومقاطعك الداعمة تلقائيًا أثناء حديث المتحدث',cands.length?`<div class="pr-bro" id="br-list">${cands.map(x=>`<label style="background-image:url(${x.thumb||x.url})" title="${esc(x.name)}"><input type="checkbox" value="${x.id}" checked></label>`).join('')}</div><div class="pr-row"><label class="field">مدة كل لقطة<select id="br-l"><option value="2.5">2.5 ث</option><option value="3.5" selected>3.5 ث</option><option value="5">5 ث</option></select></label><label class="field">أقل فاصل بينها<select id="br-g"><option value="5">5 ث</option><option value="8" selected>8 ث</option><option value="14">14 ث</option></select></label></div>`:`<p class="muted" style="margin:0">استورد صورًا أو مقاطع داعمة (غير الفيديو الرئيسي) إلى المكتبة أولًا ثم أعد فتح هذه النافذة.</p>`,cands.length?'ضع اللقطات الداعمة':'')}
${card('ex','📤','تصدير تلقائي لكل منصة','ينتج نسخًا جاهزة: 9:16 (ريلز/تيك توك) و16:9 (يوتيوب) و1:1 (إنستغرام) بضغطة واحدة',`<div class="pr-chips"><label><input type="checkbox" id="ex-916" checked> 9:16 ريلز/تيك توك</label><label><input type="checkbox" id="ex-169" checked> 16:9 يوتيوب</label><label><input type="checkbox" id="ex-11"> 1:1 إنستغرام</label></div><div class="pr-row"><label class="field">الدقة<select id="ex-sz"><option value="720">720p</option><option value="1080" selected>1080p</option></select></label><label class="field">الصيغة<select id="ex-fm"><option value="mp4" selected>MP4 (إن دعمها المتصفح)</option><option value="webm">WebM</option></select></label></div><p class="muted" style="margin:0">التصدير يعمل بزمن حقيقي لكل نسخة، وتنزل الملفات تلقائيًا. تلميح: طبّق «إعادة التأطير» أولًا إن أردت متابعة الوجه في النسخة العمودية.</p>`,'ابدأ التصدير')}
<div class="pr-bar" id="pr-bar" hidden><i></i></div><p class="muted" id="pr-status" style="margin:0"></p>`;
 document.body.appendChild(d);
 d.addEventListener('click',async e=>{const b=e.target.closest('[data-pr]');if(!b)return;const k=b.dataset.pr;if(k==='close'){cancelled=true;d.close();return;}
  const v=id=>$('#'+id),n=id=>+v(id).value,c=id=>v(id).checked;cancelled=false;
  ui=(m,p)=>{$('#pr-status').textContent=m;$('#pr-bar').hidden=false;$('#pr-bar>i').style.width=Math.round((p||0)*100)+'%';};
  const run=async fn=>{b.disabled=true;try{await fn();}catch(err){$('#pr-status').textContent='تعذّر: '+err.message;A().toast('تعذّر: '+err.message,'error');}finally{b.disabled=false;$('#pr-bar').hidden=true;}};
  if(k==='hl')await run(()=>highlights({count:n('hl-n'),len:n('hl-l'),faces:c('hl-f'),trans:true}));
  else if(k==='rf')await run(()=>reframe({aspect:v('rf-a').value,all:c('rf-all')}));
  else if(k==='sc')await run(()=>sceneCuts({sens:n('sc-s'),minGap:n('sc-g')}));
  else if(k==='cp-words')await run(()=>wordCaptions({color:v('cp-c').value,pos:n('cp-y'),big:c('cp-big'),box:c('cp-box')}));
  else if(k==='cp-fill')await run(()=>removeFillers({strong:c('cp-strong')}));
  else if(k==='cp-pause')await run(()=>removePauses({min:n('cp-pm')}));
  else if(k==='az')await run(()=>autoZoom({sens:n('az-s'),max:n('az-m'),len:n('az-l'),dir:v('az-d').value,gap:3,amt:.35}));
  else if(k==='sr')await run(()=>speedRamps({max:n('sr-m'),gap:n('sr-g')}));
  else if(k==='tp')await run(()=>brandKit({tpl:v('tp-t').value,school:v('tp-s').value.trim(),event:v('tp-e').value.trim(),sub:v('tp-d').value.trim(),c1:v('tp-c1').value,c2:v('tp-c2').value,logo:v('tp-l').value,intro:c('tp-i'),outroOn:c('tp-o'),grade:c('tp-g')}));
  else if(k==='br')await run(()=>broll({ids:[...d.querySelectorAll('#br-list input:checked')].map(x=>x.value),len:n('br-l'),gap:n('br-g'),max:12}));
  else if(k==='ex'){const t=[];if(c('ex-916'))t.push({aspect:'720x1280',tag:'9x16',label:'9:16'});if(c('ex-169'))t.push({aspect:'1280x720',tag:'16x9',label:'16:9'});if(c('ex-11'))t.push({aspect:'1080x1080',tag:'1x1',label:'1:1'});
   const o={targets:t,size:n('ex-sz'),format:v('ex-fm').value};d.close();await multiExport(o);}
 });
 d.querySelector('#tp-t').addEventListener('change',e=>{const t=TPL[e.target.value];d.querySelector('#tp-c1').value=t.c1;d.querySelector('#tp-c2').value=t.c2;});
 d.querySelector('#tp-t').dispatchEvent(new Event('change'));
 d.addEventListener('close',()=>{cancelled=true;});
 return d;}
function open(){const a=A();if(!a)return;a.pause?.();cancelled=false;dialog().showModal();}
function addButton(){const g=document.querySelector('.mt-magic')?.parentElement;if(!g||g.querySelector('.pro-btn'))return !!g;
 const b=document.createElement('button');b.className='button compact pro-btn';b.title='عشر أدوات مونتاج احترافي';b.textContent='🚀 احترافي';b.addEventListener('click',open);g.insertBefore(b,g.children[2]||null);return true;}
let nn=0;const iv=setInterval(()=>{if(addButton()||++nn>80)clearInterval(iv);},250);
/* ---------------------------------------------------------------- translation to Arabic + subtitle polish */
const LANGS=[['arabic','العربية (بدون ترجمة)','ar'],['auto','اكتشاف تلقائي للغة','auto'],['english','الإنجليزية','en'],['french','الفرنسية','fr'],['spanish','الإسبانية','es'],['german','الألمانية','de'],['turkish','التركية','tr'],['urdu','الأردية','ur'],['hindi','الهندية','hi'],['persian','الفارسية','fa'],['russian','الروسية','ru'],['indonesian','الإندونيسية','id'],['italian','الإيطالية','it'],['portuguese','البرتغالية','pt'],['chinese','الصينية','zh'],['japanese','اليابانية','ja'],['korean','الكورية','ko']];
const ASR={lang:'arabic',bilingual:false,online:false,style:'dark'};
try{const s=JSON.parse(localStorage.getItem('fahad-asr')||'{}');for(const k of['lang','bilingual','online','style'])if(s[k]!==undefined)ASR[k]=s[k];}catch{}
const saveASR=()=>{try{localStorage.setItem('fahad-asr',JSON.stringify({lang:ASR.lang,bilingual:ASR.bilingual,online:ASR.online,style:ASR.style}));}catch{}};
async function detectLang(text){try{if(window.LanguageDetector){const d=await LanguageDetector.create(),r=await d.detect(text.slice(0,600));if(r&&r[0]&&r[0].confidence>.3)return r[0].detectedLanguage.split('-')[0];}}catch{}
 const s=text.slice(0,500);if(/[Ѐ-ӿ]/.test(s))return'ru';if(/[ऀ-ॿ]/.test(s))return'hi';if(/[぀-ヿ]/.test(s))return'ja';if(/[가-힯]/.test(s))return'ko';if(/[一-鿿]/.test(s))return'zh';if(/[؀-ۿ]/.test(s))return'ar';return'en';}
const trCache={};
function makeTranslator(code){if(!('Translator' in self))return Promise.resolve(null);if(trCache[code])return trCache[code];
 return trCache[code]=(async()=>{try{const av=await Translator.availability({sourceLanguage:code,targetLanguage:'ar'});if(av==='unavailable')return null;
  return await Translator.create({sourceLanguage:code,targetLanguage:'ar',monitor(m){m.addEventListener('downloadprogress',e=>A()?.toast('تنزيل نموذج الترجمة: '+Math.round((e.loaded||0)*100)+'%'));}});}catch{delete trCache[code];return null;}})();}
async function onlineTr(text,code){const cc=code==='zh'?'zh-CN':code;
 const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+cc+'|ar');if(!r.ok)throw Error('خدمة الترجمة عبر الإنترنت غير متاحة الآن.');
 const j=await r.json(),t=j?.responseData?.translatedText||'';if(!t||/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)||j.responseStatus==429)throw Error('استُنفدت حصة الترجمة المجانية عبر الإنترنت لهذا اليوم.');return t;}
const AR_FIX=t=>t.replace(/\s+([،.؟!؛:])/g,'$1').replace(/\s{2,}/g,' ').trim();
function wrapLines(text,max){if(text.includes('\n')||[...text].length<=max)return text;const w=text.split(' ');if(w.length<2)return text;let best=1,bd=1e9;
 for(let i=1;i<w.length;i++){const d=Math.abs([...w.slice(0,i).join(' ')].length-[...w.slice(i).join(' ')].length);if(d<bd){bd=d;best=i;}}return w.slice(0,best).join(' ')+'\n'+w.slice(best).join(' ');}
async function translate(cues,lang,opt={}){const a=A();
 try{let code=LANGS.find(l=>l[0]===lang)?.[2];if(lang==='auto'||!code)code=await detectLang(cues.map(c=>c.text).join(' '));if(code==='ar')return cues;
  const tr=await makeTranslator(code),out=[];let fail=0;
  for(let i=0;i<cues.length;i++){const c=cues[i];let t=null;
   try{if(tr)t=await tr.translate(c.text);else if(ASR.online)t=await onlineTr(c.text,code);else throw Error('NOLOCAL');}
   catch(e){if(e.message==='NOLOCAL')throw Error('الترجمة المحلية غير مدعومة في هذا المتصفح (تتوفر في Chrome وEdge الحديثين على الحاسوب). فعّل خيار «الترجمة عبر الإنترنت» في لوحة الكتابة ثم اضغط «ترجم السطور الحالية».');if(/حصة|غير متاحة/.test(e.message))throw e;fail++;}
   out.push({...c,orig:c.text,text:t?AR_FIX(t):c.text,translated:!!t});}
  if(fail===cues.length)throw Error('فشلت الترجمة.');
  return out.map(c=>({...c,text:ASR.bilingual&&c.translated?c.text+'\n'+c.orig:c.text}));}
 catch(e){a?.toast(e.message+' (حُفظ النص بلغته الأصلية).','error');return cues;}}
function captionAsset(){const a=A();let c=a.chosen();let as=c&&c.kind==='video'?a.assets.get(c.assetId):null;if(as?.captions?.length)return as;
 return[...a.assets.values()].find(x=>x.type==='video'&&x.captions?.length)||null;}
async function translateExisting(){const a=A(),as=captionAsset();if(!as){a.toast('لا توجد سطور مكتوبة. اكتب الكلام أولًا.');return;}
 const lang=ASR.lang==='arabic'?'auto':ASR.lang;a.toast('جارٍ ترجمة '+as.captions.length+' سطرًا إلى العربية…');
 const src=as.captions.map(c=>({...c,text:c.orig||c.text.split('\n').pop()}));
 const out=await translate(src,lang);if(out===src||!out.some(c=>c.translated))return;
 a.edit(()=>{as.captions=out.map((c,i)=>({id:'cue-'+(i+1),start:c.start,end:c.end,text:c.text,orig:c.orig,estimated:c.estimated}));as.transcription={...(as.transcription||{}),status:'complete',language:'ar'};});
 a.toast('تُرجمت السطور إلى العربية. يمكنك الآن تحسين الوضوح.','success');}
const STYLE_PRESETS={dark:{color:'#ffffff',box:true,bold:true,y:.84,k:.052},yellow:{color:'#ffe14a',box:true,bold:true,y:.84,k:.054},big:{color:'#ffffff',box:true,bold:true,y:.8,k:.068}};
function polish(){const a=A(),as=captionAsset();if(!as){a.toast('لا توجد سطور مكتوبة. اكتب الكلام أولًا.');return;}
 const p=a.p,portrait=p.height>p.width,max=portrait?22:34,S=STYLE_PRESETS[ASR.style]||STYLE_PRESETS.dark;
 let cs=as.captions.map(c=>({...c})).sort((x,y)=>x.start-y.start);
 /* merge very short cues into the following one */
 for(let i=0;i<cs.length-1;i++){const c=cs[i],n=cs[i+1];if(c.end-c.start<.8&&n.start-c.end<.35&&!c.text.includes('\n')&&!n.text.includes('\n')&&[...c.text+n.text].length<max*1.6){n.text=c.text+' '+n.text;n.start=c.start;n.orig=(c.orig||'')+' '+(n.orig||'');cs.splice(i,1);i--;}}
 /* split cues that cannot fit in two lines */
 const sp=[];for(const c of cs){const flat=c.text.replace(/\n/g,' ');if([...flat].length>max*2){const w=flat.split(' '),half=Math.ceil(w.length/2),t1=w.slice(0,half).join(' '),t2=w.slice(half).join(' '),mid=c.start+(c.end-c.start)*[...t1].length/[...flat].length;sp.push({...c,text:t1,end:mid},{...c,text:t2,start:mid});}else sp.push({...c,text:flat});}
 cs=sp;
 /* wrap, then give enough reading time (~17 chars/sec) without overlapping the next cue */
 cs.forEach((c,i)=>{c.text=wrapLines(c.text,max);const need=Math.max(1,[...c.text.replace(/\n/g,'')].length/17),nx=cs[i+1]?cs[i+1].start-.04:as.duration;c.end=Math.min(Math.max(c.end,c.start+need),Math.max(c.end,nx),as.duration);if(c.end-c.start<.12)c.end=Math.min(as.duration,c.start+.12);});
 cs=cs.filter(c=>c.end-c.start>=.1);
 a.edit(()=>{as.captions=cs.map((c,i)=>({id:'cue-'+(i+1),start:+c.start.toFixed(3),end:+c.end.toFixed(3),text:c.text,orig:c.orig,estimated:c.estimated}));
  as.captionStyle={...(as.captionStyle||{}),fontSize:Math.round(p.width*S.k),color:S.color,bold:true,box:S.box,x:.5,y:S.y,animation:'fade'};});
 a.toast('حُسّنت الترجمة: أسطر متوازنة (حد أقصى سطران)، وزمن قراءة كافٍ، وخط أكبر وخلفية داكنة.','success');}
function injectAsrUi(){const root=document.querySelector('.caption-controls');if(!root||root.querySelector('.asr-lang'))return;
 const box=document.createElement('div');box.className='asr-lang';box.style.cssText='display:grid;gap:8px;border:1px solid #333b60;border-radius:10px;padding:10px;margin:8px 0;background:#161a2c';
 box.innerHTML=`<strong style="font-size:12px">🌍 لغة كلام الفيديو والترجمة للعربية</strong><label class="field">لغة الكلام في الفيديو<select id="asr-lang">${LANGS.map(l=>`<option value="${l[0]}"${l[0]===ASR.lang?' selected':''}>${l[1]}</option>`).join('')}</select></label><p class="fine-print" style="margin:0">عند اختيار لغة غير العربية يُفرَّغ الكلام بلغته ثم يُترجم تلقائيًا إلى العربية.</p><label class="caption-switch"><input type="checkbox" id="asr-bi"${ASR.bilingual?' checked':''}> أظهر النص الأصلي تحت الترجمة</label><label class="caption-switch"><input type="checkbox" id="asr-on"${ASR.online?' checked':''}> السماح بالترجمة عبر الإنترنت عند عدم توفر ترجمة محلية (يُرسل النص فقط)</label><label class="field">نمط وضوح الترجمة<select id="asr-st"><option value="dark">أبيض على خلفية داكنة</option><option value="yellow">أصفر واضح</option><option value="big">كبير جدًا</option></select></label><div style="display:grid;gap:6px"><button class="button" id="asr-polish">✨ تحسين وضوح الترجمة</button><button class="button" id="asr-tr">🌍 ترجم السطور الحالية إلى العربية</button></div>`;
 root.prepend(box);box.querySelector('#asr-st').value=ASR.style;}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='asr-lang'){ASR.lang=t.value;saveASR();}else if(t.id==='asr-bi'){ASR.bilingual=t.checked;saveASR();}else if(t.id==='asr-on'){ASR.online=t.checked;saveASR();}else if(t.id==='asr-st'){ASR.style=t.value;saveASR();}});
document.addEventListener('click',e=>{const t=e.target.closest('#asr-polish,#asr-tr,[data-tool],[data-action=transcribe]');if(!t)return;
 if(t.id==='asr-polish')polish();else if(t.id==='asr-tr')translateExisting();
 else if(t.dataset.action==='transcribe'){const c=LANGS.find(l=>l[0]===ASR.lang)?.[2];if(c&&c!=='ar'&&c!=='auto')makeTranslator(c);}
 else if(t.dataset.tool==='privacy')T().privacyOpen?.();else if(t.dataset.tool==='smart')T().smartMontage?.();else if(t.dataset.tool==='pro')open();},true);
new MutationObserver(injectAsrUi).observe(document.documentElement,{childList:true,subtree:true});
window.FahadASR=Object.assign(ASR,{translate,polish,translateExisting,LANGS});
const TT=window.FahadTools=window.FahadTools||{};TT.kx=kx;TT.proOpen=open;
TT.pro={highlights,reframe,sceneCuts,wordCaptions,removeFillers,removePauses,autoZoom,speedRamps,brandKit,broll,multiExport,TPL};
})();
