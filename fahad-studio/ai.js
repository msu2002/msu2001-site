/* Fahad Studio — smart montage ("AI", fully local, no uploads) (MIT). */
(()=>{
'use strict';
const $=s=>document.querySelector(s),A=()=>window.FahadApp,T=()=>window.FahadTools||{};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function seekTo(v,t){return new Promise(res=>{let d=false;const f=()=>{if(d)return;d=true;v.removeEventListener('seeked',f);res();};v.addEventListener('seeked',f);setTimeout(f,3000);try{v.currentTime=t;}catch{f();}});}
const gray=(cv,cx,v,w,h)=>{cx.drawImage(v,0,0,w,h);const d=cx.getImageData(0,0,w,h).data,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;return g;};
/* ---- analysis of one video source window ---- */
async function analyze(it,opts,cancel){
 const as=it.asset,out={samples:[],audio:null,speech:[],lum:120};
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=as.url;
 await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=()=>rej(new Error('تعذّر فتح '+as.name));v.load();});
 const t0=it.srcIn,t1=Math.min((v.duration||1e9)-.3,it.srcIn+it.srcDur),span=Math.max(.5,t1-t0),step=Math.max(.5,span/48);
 const W=64,H=36,cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d',{willReadFrequently:true});
 let lumSum=0,n=0;
 for(let t=t0;t<t1&&!cancel();t+=step){
  await seekTo(v,t);const a=gray(cv,cx,v,W,H);await seekTo(v,Math.min(t1,t+.18));const b=gray(cv,cx,v,W,H);
  let mo=0,lum=0;for(let i=0;i<a.length;i++){mo+=Math.abs(a[i]-b[i]);lum+=a[i];}mo/=a.length;lum/=a.length;
  let lap=0;for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,l=4*a[i]-a[i-1]-a[i+1]-a[i-W]-a[i+W];lap+=l*l;}lap/=(W*H);
  let face=0,fx=.5,fy=.5;
  if(opts.faces&&T().detectFaces){try{const fs=await T().detectFaces(v);if(fs.length){const m=fs.sort((p,q)=>q.width*q.height-p.width*p.height)[0];face=Math.min(1,.5+m.width*3);fx=m.xCenter;fy=m.yCenter;}}catch{}}
  out.samples.push({t,motion:mo,sharp:lap,lum,face,fx,fy});lumSum+=lum;n++;
 }
 out.step=step;out.lum=n?lumSum/n:120;v.removeAttribute('src');v.load();
 /* audio energy (0.5s windows) */
 if(opts.audio&&as.blob&&as.blob.size<150*1048576){try{
  const buf=await new OfflineAudioContext(1,1,22050).decodeAudioData(await as.blob.arrayBuffer());const d=buf.getChannelData(0),sr=buf.sampleRate,hop=Math.round(sr*.5),arr=[];
  for(let i=0;i+hop<=d.length;i+=hop){let s=0;for(let j=0;j<hop;j+=4){const x=d[i+j];s+=x*x;}arr.push(Math.sqrt(s/(hop/4)));}
  out.audio=arr;}catch{}}
 return out;}
function norm(arr,key){const v=arr.map(s=>s[key]),mx=Math.max(1e-6,...v),mn=Math.min(...v);return s=>mx-mn<1e-6?.5:(s[key]-mn)/(mx-mn);}
function scoreSamples(an,it){const S=an.samples;if(!S.length)return;const nm=norm(S,'motion'),ns=norm(S,'sharp');
 const A2=an.audio;let amax=1e-6;if(A2)amax=Math.max(1e-6,...A2);
 for(const s of S){const au=A2?(A2[Math.min(A2.length-1,Math.floor(s.t*2))]||0)/amax:0;
  let sc=.34*nm(s)+.24*ns(s)+.24*au+.18*s.face;if(s.lum<45||s.lum>225)sc-=.25;if(nm(s)>.97)sc-=.08;s.score=sc;}}
function bestWindow(an,it,d){const S=an.samples;if(!S.length||d>=it.srcDur-.2)return{in:it.srcIn,score:S.length?S.reduce((a,s)=>a+s.score,0)/S.length:.5,face:null};
 const k=Math.max(1,Math.round(d/an.step));let best=-1,bi=0;for(let i=0;i+k<=S.length;i++){let m=0;for(let j=0;j<k;j++)m+=S[i+j].score;m/=k;if(m>best){best=m;bi=i;}}
 const w=S.slice(bi,bi+k),fs=w.filter(s=>s.face>0);return{in:clamp(S[bi].t-.1,it.srcIn,it.srcIn+Math.max(0,it.srcDur-d)),score:best,face:fs.length?{x:fs.reduce((a,s)=>a+s.fx,0)/fs.length,y:fs.reduce((a,s)=>a+s.fy,0)/fs.length}:null};}
function speechRanges(an,asClipStart,srcIn,dur,speed){/* voice present → timeline ranges */
 if(!an.audio)return[];const A2=an.audio,mx=Math.max(1e-6,...A2),thr=Math.max(.02,mx*.18),out=[];let s=null;
 for(let i=0;i<A2.length;i++){const t=i*.5;if(t<srcIn||t>srcIn+dur*speed)continue;const on=A2[i]>thr;if(on&&s==null)s=t;if(!on&&s!=null){out.push([s,t]);s=null;}}
 if(s!=null)out.push([s,Math.min(srcIn+dur*speed,A2.length*.5)]);
 return out.filter(r=>r[1]-r[0]>=.8).map(r=>[asClipStart+(r[0]-srcIn)/speed,asClipStart+(r[1]-srcIn)/speed]);}
/* ---- orchestration ---- */
let cancelled=false;
async function run(o,ui){
 const a=A(),Tt=T(),ST=Tt.STYLES[o.style==='reels'?'fast':o.style],src=Tt.montageSources();let items=src.items;
 if(!items.length){a.toast('أضف مقاطع أولًا.');return;}
 if(o.target&&items.length>1){/* keep all for now; trimmed later */}
 const tr=items.length>1?ST.tr:0;
 /* 1. analysis */
 const ans=[];
 for(let i=0;i<items.length&&!cancelled;i++){const it=items[i];ui(`تحليل المقطع ${i+1} من ${items.length}…`,i/items.length);
  if(it.asset.type==='video'&&o.smart){try{const an=await analyze(it,{faces:o.faces,audio:o.audio||o.duck},()=>cancelled);scoreSamples(an,it);ans.push(an);}catch(e){ans.push(null);}}
  else ans.push(null);}
 if(cancelled)return;
 /* 2. beats */
 let bt=null;const music=src.music;
 if(music&&o.beats&&Tt.beats){ui('تحليل إيقاع الموسيقى…',.9);try{bt=await Tt.beats(music.asset);}catch{}}
 /* 3. order (hook first) */
 let idx=items.map((_,i)=>i);
 const itemScore=i=>{const an=ans[i];return an&&an.samples.length?an.samples.reduce((x,s)=>x+s.score,0)/an.samples.length:.4;};
 if(o.hook&&items.length>2){const best=idx.reduce((b,i)=>itemScore(i)>itemScore(b)?i:b,0);idx=[best,...idx.filter(i=>i!==best)];}
 if(o.target){const keep=[];let acc=0;for(const i of idx){if(acc>=o.target)break;keep.push(i);acc+=items[i].asset.type==='video'?Math.min(items[i].srcDur,ST.seg):ST.img;}idx=keep.length?keep:idx;}
 /* 4. cut points */
 const base=i=>items[i].asset.type==='video'?Math.max(.8,Math.min(items[i].srcDur,ST.seg)):ST.img;
 const cuts=[];let t=0;
 idx.forEach((i,k)=>{let d=base(i);
  if(bt&&bt.length){const minD=d*.7,cand=bt.find(b=>b>=t+minD);if(cand!=null&&cand<t+d*1.8)d=cand-t;}
  if(items[i].asset.type==='video')d=Math.min(d,items[i].srcDur);
  d=Math.max(d,tr+.5);cuts.push(d);t+=d;});
 let totalLen=t+tr;if(o.fit&&music){const T2=Math.min(music.asset.duration,600);if(Math.abs(T2-totalLen)>.1){const k=T2/totalLen;for(let q=0;q<cuts.length;q++)cuts[q]=Math.max(tr+.5,cuts[q]*k);}}
 /* 5. build */
 ui('بناء الخط الزمني…',.97);
 if(o.style==='reels'){const sel=$('#aspect');if(sel&&sel.value!=='720x1280'){sel.value='720x1280';sel.dispatchEvent(new Event('change',{bubbles:true}));await sleep(120);}}
 const hasLut=window.FahadLUT&&FahadLUT.LOOKS&&FahadLUT.LOOKS.some(l=>l.id===ST.lut);
 const speech=[];let sT=0;
 a.edit(()=>{
  const p=a.p;const drop=new Set([...(src.fromTimeline?items.map(i=>i.clipId):[]),...src.musicClipIds]);p.clips=p.clips.filter(c=>!drop.has(c.id));
  let st0=0,lastEnd=0;
  idx.forEach((i,k)=>{const it=items[i],as=it.asset,an=ans[i],d=cuts[k]+(k<idx.length-1?tr:0),c=a.C.clip(as,st0,'v1');c.duration=d;c.fit='cover';
   let face=null;
   if(as.type==='video'){const w=an&&an.samples.length?bestWindow(an,it,d):{in:Math.max(0,it.srcIn+(it.srcDur-d)*.35),face:null};c.in=Math.max(0,Math.min(w.in,(as.duration||1e9)-d-.05));face=w.face;c.volume=music?.28:1;
    if(an&&o.duck&&an.audio)speech.push(...speechRanges(an,st0,c.in,d,1));
    if(o.color&&an){const L=an.lum;if(L<95){c.brightness=+clamp(112/Math.max(40,L),1,1.4).toFixed(2);}else if(L>170){c.brightness=+clamp(150/L,.8,1).toFixed(2);}c.saturation=1.08;}
    if(o.style==='reels'&&face){const iw=as.width||1280,ih=as.height||720,sc=Math.max(a.p.width/iw,a.p.height/ih),dw=iw*sc,off=clamp((.5-face.x)*dw,-(dw-a.p.width)/2,(dw-a.p.width)/2);c.x=+(.5+off/a.p.width).toFixed(3);}}
   const hot=an&&an.samples.length&&an.samples.reduce((x,s)=>x+s.motion,0)/an.samples.length>14;
   let mo=as.type==='video'?(hot?'none':(face?'zoom-in':(k%2?'zoom-in':'none'))):ST.motions[k%ST.motions.length];
   if(mo!=='none'){c.motion=mo;c.motionAmount=as.type==='video'?(face?.22:ST.vm):.55;}
   c.transition=k===0?'fade':ST.trans[(k-1)%ST.trans.length];c.transitionDuration=k===0?.4:tr;
   if(hasLut){c.lut=ST.lut;c.lutStrength=.7;}if(ST.fx!=='none'){c.effect=ST.fx;c.effectStrength=ST.fxs;}
   p.clips.push(c);lastEnd=st0+d;st0+=cuts[k];});
  const total=lastEnd;
  if(music){const m=music.asset;let at=0,kk=0;const placed=[];while(at<total-.2&&kk<8){const c=a.C.clip(m,at,'a1');c.duration=Math.min(m.duration,total-at);c.volume=.85;p.clips.push(c);placed.push(c);at+=c.duration;kk++;}
   if(o.duck&&speech.length){const rs=speech.sort((x,y)=>x[0]-y[0]);for(const [s0,s1] of rs){for(const edge of [s0,s1]){const mc=p.clips.find(c=>c.track==='a1'&&c.start<edge-.05&&c.start+c.duration>edge+.05);if(mc)a.C.split(p,mc.id,edge);}}
    for(const c of p.clips.filter(c=>c.track==='a1'&&c.kind==='audio')){const mid=c.start+c.duration/2;if(rs.some(r=>mid>=r[0]&&mid<=r[1]))c.volume=.18;}}}
  if(o.title&&!p.clips.some(c=>c.kind==='text'&&!c.subtitleOf&&c.start<3.7&&c.start+c.duration>.5)){p.clips.push(a.C.textClip(.5,{text:p.name||'حكايتي',name:'عنوان افتتاحي',duration:Math.min(3.2,cuts[0]-.2),fontSize:o.style==='reels'?64:80,y:.5,animation:ST.title}));}
  if(o.outro){const tt=a.C.textClip(Math.max(0,total-2.6),{text:o.outroText||'شكرًا لكم',name:'ختام',duration:2.4,fontSize:o.style==='reels'?64:84,y:.5,animation:'fade'});const tk=p.tracks.filter(t=>t.kind==='text').find(t=>!p.clips.some(x=>x.track===t.id&&x.start<tt.start+tt.duration&&x.start+x.duration>tt.start));if(tk){tt.track=tk.id;p.clips.push(tt);}}
  a.selected=null;});
 a.seek(0);
 a.toast('تم المونتاج الذكي: '+idx.length+' لقطة'+(bt?' مقصوصة على إيقاع الموسيقى':'')+(speech.length?'، مع خفض الموسيقى أثناء الكلام':'')+'.','success');}
/* ---- dialog ---- */
function css(){if($('#ai-css'))return;const s=document.createElement('style');s.id='ai-css';s.textContent=`#ai-dialog{max-width:520px;width:94vw}#ai-dialog h3{font-size:12px;margin:12px 0 6px;color:#cbd0e3}.ai-opts{display:grid;gap:7px;margin:6px 0}.ai-opts label{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.7}.ai-opts small{display:block;color:var(--muted);font-size:10px}.ai-st{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.ai-st label{border:1px solid var(--line);border-radius:9px;padding:8px;font-size:11px;cursor:pointer;display:flex;flex-direction:column;gap:3px}.ai-st input{display:none}.ai-st label:has(input:checked){border-color:#8d7aff;background:#8d7aff1c}.ai-bar{height:8px;background:#232842;border-radius:5px;overflow:hidden;margin:12px 0 4px}.ai-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7379ec,#9b68e7);transition:width .2s}@media(max-width:700px){.ai-st{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s);}
function open(){const a=A(),Tt=T();const src=Tt.montageSources?Tt.montageSources():null;if(!src||!src.items.length){a.toast('أضف مقاطع فيديو أو صورًا أولًا.');return;}
 css();let d=$('#ai-dialog');if(d)d.remove();d=document.createElement('dialog');d.id='ai-dialog';
 const hasMusic=!!src.music;
 d.innerHTML=`<div class="dialog-head"><h2>🧠 مونتاج ذكي</h2><button class="icon-button" data-ai="close" aria-label="إغلاق">✕</button></div>
<p class="muted">يحلّل مقاطعك على جهازك (حركة، وضوح، إضاءة، صوت، وجوه) ويختار أفضل اللحظات ويقصّها على إيقاع الموسيقى. لا يُرفع شيء إلى الإنترنت.</p>
<div class="ai-st"><label><input type="radio" name="ai-s" value="cinematic" checked><b>سينمائي</b><small>هادئ وأنيق</small></label><label><input type="radio" name="ai-s" value="fast"><b>سريع</b><small>حيوي</small></label><label><input type="radio" name="ai-s" value="calm"><b>هادئ</b><small>ناعم</small></label><label><input type="radio" name="ai-s" value="reels"><b>ريلز عمودي</b><small>9:16 مع تتبع الوجه</small></label></div>
<h3>الذكاء</h3><div class="ai-opts">
<label><input type="checkbox" id="ai-smart" checked><span>اختيار أفضل لقطات كل مقطع<small>بدل أخذ البداية فقط</small></span></label>
<label><input type="checkbox" id="ai-faces" checked><span>أولوية للقطات التي فيها وجوه<small>ويركّز الزوم والتأطير على الوجه</small></span></label>
<label><input type="checkbox" id="ai-beats" ${hasMusic?'checked':'disabled'}><span>قصّ اللقطات على إيقاع الموسيقى</span></label>
<label><input type="checkbox" id="ai-duck" ${hasMusic?'checked':'disabled'}><span>خفض الموسيقى تلقائيًا أثناء الكلام</span></label>
<label><input type="checkbox" id="ai-color" checked><span>تحسين الإضاءة والألوان لكل لقطة</span></label>
<label><input type="checkbox" id="ai-hook"><span>ابدأ بأقوى لقطة (مدخل جذاب)</span></label>
<label><input type="checkbox" id="ai-title" checked><span>عنوان افتتاحي باسم المشروع</span></label>
<label><input type="checkbox" id="ai-outro"><span>بطاقة ختام «شكرًا لكم»</span></label>
<label><input type="checkbox" id="ai-fit" ${hasMusic?'checked':'disabled'}><span>اجعل الطول بطول الموسيقى</span></label></div>
<label class="field">المدة المستهدفة<select id="ai-target"><option value="0">تلقائي</option><option value="15">15 ثانية</option><option value="30">30 ثانية</option><option value="60">دقيقة</option></select></label>
<div class="ai-bar" id="ai-bar" hidden><i></i></div><p class="muted" id="ai-status" style="margin:0"></p>
<div class="dialog-buttons"><button class="button primary" data-ai="go">🧠 ابدأ المونتاج الذكي</button><button class="button" data-ai="close">إلغاء</button></div>`;
 document.body.appendChild(d);
 d.addEventListener('click',async e=>{const b=e.target.closest('[data-ai]');if(!b)return;
  if(b.dataset.ai==='close'){cancelled=true;d.close();return;}
  const g=id=>$(id).checked;b.disabled=true;cancelled=false;$('#ai-bar').hidden=false;
  const o={style:d.querySelector('input[name=ai-s]:checked').value,smart:g('#ai-smart'),faces:g('#ai-faces'),beats:g('#ai-beats'),duck:g('#ai-duck'),audio:g('#ai-smart'),color:g('#ai-color'),hook:g('#ai-hook'),title:g('#ai-title'),outro:g('#ai-outro'),fit:g('#ai-fit'),target:+$('#ai-target').value};
  try{await run(o,(m,p)=>{$('#ai-status').textContent=m;$('#ai-bar>i').style.width=Math.round(p*100)+'%';});d.close();}
  catch(err){$('#ai-status').textContent='تعذّر: '+err.message;a.toast('تعذّر المونتاج الذكي: '+err.message,'error');b.disabled=false;}});
 d.addEventListener('close',()=>{cancelled=true;});
 a.pause?.();d.showModal();}
function addButton(){const g=document.querySelector('.mt-magic')?.parentElement;if(!g||g.querySelector('.ai-btn'))return !!g;
 const b=document.createElement('button');b.className='button compact ai-btn';b.title='مونتاج ذكي يحلّل المقاطع ويقصّ على الإيقاع';b.textContent='🧠 مونتاج ذكي';b.addEventListener('click',open);g.insertBefore(b,g.children[1]||null);return true;}
let n=0;const iv=setInterval(()=>{if(addButton()||++n>80)clearInterval(iv);},250);
const T2=window.FahadTools=window.FahadTools||{};T2.smartMontage=open;
})();
