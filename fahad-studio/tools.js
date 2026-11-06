/* Fahad Studio — extra timeline tools (CapCut / Premiere style): tools menu, trim, ripple delete, freeze frame, speed, flip, markers, multi-select, copy/paste, tracks, shortcuts. */
(function(){
'use strict';
const A=()=>window.FahadApp,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let tool='select',multi=new Set(),clipboard=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const busy=()=>{const a=A();return !a||a.exportJob||a.loading;};
const isSub=c=>!!c.subtitleOf;
const targets=()=>{const a=A();const ids=new Set(multi);if(a.selected)ids.add(a.selected);return [...ids].map(id=>a.p.clips.find(c=>c.id===id)).filter(Boolean);};
const srcDur=c=>['video','audio'].includes(c.kind)?(A().assets.get(c.assetId)?.duration||3600):3600;
function refresh(){A().renderTimeline();}
function removeClips(ids){const a=A(),p=a.p;for(const id of ids){const c=p.clips.find(x=>x.id===id);if(c&&c.subtitleOf){const parent=p.clips.find(v=>v.id===c.subtitleOf),as=a.assets.get(parent?.assetId);if(as&&as.captions)as.captions=as.captions.filter(q=>q.id!==c.cueId);}}p.clips=p.clips.filter(c=>!ids.has(c.id));}
const CMDS={
 select(){tool='select';markTool();},
 blade(){tool=tool==='blade'?'select':'blade';markTool();},
 selLeft(){const a=A(),t=a.current;multi=new Set(a.p.clips.filter(c=>c.start+c.duration<=t+.02).map(c=>c.id));a.selected=null;afterSel();a.toast(multi.size?'حُدِّد '+multi.size+' مقطعًا على يسار المؤشر.':'لا توجد مقاطع على يسار المؤشر.');},
 selRight(){const a=A(),t=a.current;multi=new Set(a.p.clips.filter(c=>c.start>=t-.02).map(c=>c.id));a.selected=null;afterSel();a.toast(multi.size?'حُدِّد '+multi.size+' مقطعًا على يمين المؤشر.':'لا توجد مقاطع على يمين المؤشر.');},
 selAll(){const a=A();multi=new Set(a.p.clips.map(c=>c.id));a.selected=null;afterSel();},
 split(){const a=A();if(a.selected&&!multi.size){a.splitSelected();return;}const t=a.current,list=multi.size?targets():a.p.clips.filter(c=>!isSub(c)&&t>c.start+.05&&t<c.start+c.duration-.05);const ok=list.filter(c=>!isSub(c)&&t>c.start+.05&&t<c.start+c.duration-.05);if(!ok.length){a.toast('ضع المؤشر داخل مقطع ثم قسّم.');return;}a.edit(()=>{for(const c of ok)a.C.split(a.p,c.id,t);});multi.clear();},
 trimL(){const a=A(),c=a.chosen(),t=a.current;if(!c||isSub(c)){a.toast('حدّد مقطعًا أولًا.');return;}if(t<=c.start+.05||t>=c.start+c.duration-.05){a.toast('ضع المؤشر داخل المقطع المحدد.');return;}a.edit(()=>{const d=t-c.start;a.C.trim(c,'left',d,srcDur(c));a.CM.updateLinked(a.p,c,'start',c.start);a.CM.updateLinked(a.p,c,'duration',c.duration);});},
 trimR(){const a=A(),c=a.chosen(),t=a.current;if(!c||isSub(c)){a.toast('حدّد مقطعًا أولًا.');return;}if(t<=c.start+.05||t>=c.start+c.duration-.05){a.toast('ضع المؤشر داخل المقطع المحدد.');return;}a.edit(()=>{a.C.trim(c,'right',(t-c.start)-c.duration,srcDur(c));a.CM.updateLinked(a.p,c,'duration',c.duration);});},
 del(){const a=A(),list=targets();if(!list.length)return;if(list.length===1&&!multi.size){a.deleteSelected();return;}const ids=new Set(list.map(c=>c.id));a.edit(()=>{removeClips(ids);a.selected=null;});multi.clear();},
 ripple(){const a=A(),list=targets();if(!list.length)return;const ids=new Set(list.map(c=>c.id));a.edit(()=>{const p=a.p,removed=p.clips.filter(c=>ids.has(c.id)&&!isSub(c));const shifts=new Map();for(const c of p.clips){if(ids.has(c.id))continue;let s=0;for(const r of removed){if(r.track===c.track&&r.start+r.duration<=c.start+.02)s+=r.duration;}if(s>0)shifts.set(c,s);}removeClips(ids);for(const [c,s] of shifts){c.start=Math.max(0,+(c.start-s).toFixed(3));if(!isSub(c))a.CM.updateLinked(p,c,'start',c.start);}a.selected=null;});multi.clear();a.toast('حُذف المقطع وسُدّ الفراغ.');},
 copy(){const a=A(),list=targets().filter(c=>!isSub(c));if(!list.length){a.toast('حدّد مقطعًا للنسخ.');return;}const t0=Math.min(...list.map(c=>c.start));clipboard=list.map(c=>({c:a.C.clone(c),off:c.start-t0}));a.toast('نُسخ '+list.length+' مقطع.');},
 cut(){CMDS.copy();if(clipboard)CMDS.del();},
 paste(){const a=A();if(!clipboard){a.toast('لا شيء للصق. انسخ مقطعًا أولًا (Ctrl+C).');return;}const t=a.current;let last=null;a.edit(()=>{for(const it of clipboard){const n=a.C.clone(it.c);n.id=a.C.uid();delete n.subtitleOf;delete n.cueId;delete n.audioLink;n.start=Math.min(3599,t+it.off);if(!a.p.tracks.some(x=>x.id===n.track))n.track=n.kind==='audio'?'a1':n.kind==='text'?'t1':'v1';if(!a.assets.has(n.assetId)&&n.kind!=='text')continue;a.p.clips.push(n);last=n.id;}if(last)a.selected=last;});},
 dup(){const a=A(),list=targets().filter(c=>!isSub(c));if(!list.length)return;const t0=Math.min(...list.map(c=>c.start)),t1=Math.max(...list.map(c=>c.start+c.duration));let last=null;a.edit(()=>{for(const c of list){const n=a.C.clone(c);n.id=a.C.uid();delete n.subtitleOf;delete n.cueId;delete n.audioLink;n.start=c.start+(t1-t0);a.p.clips.push(n);last=n.id;}if(last)a.selected=last;});multi.clear();},
 flipX(){const c=vis();if(!c)return;A().edit(()=>{c.flipX=!c.flipX;if(!c.flipX)delete c.flipX;});},
 flipY(){const c=vis();if(!c)return;A().edit(()=>{c.flipY=!c.flipY;if(!c.flipY)delete c.flipY;});},
 rot90(){const c=vis();if(!c)return;A().edit(()=>{c.rotation=((c.rotation||0)+90)%360;});},
 mute(){const a=A(),c=a.chosen();if(!c||!['video','audio'].includes(c.kind)){a.toast('حدّد مقطع فيديو أو صوت.');return;}a.edit(()=>{if(c.volume>0){c.prevVolume=c.volume;c.volume=0;}else{c.volume=c.prevVolume||1;delete c.prevVolume;}});},
 detach(){const a=A();const c=a.chosen();if(!c||c.kind!=='video'){a.toast('حدّد مقطع فيديو لعزل صوته.');return;}if(c.audioLink){a.toast('صوت هذا المقطع معزول بالفعل.');return;}a.detachAudio();},
 marker(){const a=A();a.edit(()=>{const p=a.p;p.markers=p.markers||[];const t=+a.current.toFixed(2),i=p.markers.findIndex(m=>Math.abs(m-t)<.15);if(i>=0)p.markers.splice(i,1);else if(p.markers.length<200)p.markers.push(t);p.markers.sort((x,y)=>x-y);});},
 nextMarker(){const a=A(),m=(a.p.markers||[]).find(x=>x>a.current+.05);if(m!==undefined)a.seek(m);},
 prevMarker(){const a=A(),m=[...(a.p.markers||[])].reverse().find(x=>x<a.current-.05);if(m!==undefined)a.seek(m);},
 zoomIn(){$('#zoom-in')?.click();},zoomOut(){$('#zoom-out')?.click();},
 toStart(){A().seek(0);},toEnd(){const a=A();a.seek(a.C.duration(a.p));},
 snap(){$('#snap')?.click();},
 keys(){openKeys();},
 trackVisual(){addTrack('visual');},trackText(){addTrack('text');},trackAudio(){addTrack('audio');},
 freeze(){freeze();},
 silence(){removeSilence();},
 montage(){montageOpen();},
 props(){openProps();},
 enhance(){enhanceAudio();},
 chromaG(){chromaSet('green');},chromaB(){chromaSet('blue');},chromaMore(){chromaAdj(.08);},chromaLess(){chromaAdj(-.08);},chromaOff(){chromaOff();}
};
function vis(){const a=A(),c=a.chosen();if(!c||c.kind==='audio'){a.toast('حدّد مقطع فيديو أو صورة أو نصًا.');return null;}return c;}
function addTrack(kind){const a=A(),letter={visual:'v',text:'t',audio:'a'}[kind];a.edit(()=>{const p=a.p;if(p.tracks.filter(t=>t.kind===kind).length>=5)throw Error('وصلت إلى الحد الأقصى لهذا النوع (٥ مسارات).');let n=1;while(p.tracks.some(t=>t.id===letter+n))n++;if(n>9)throw Error('لا توجد معرّفات مسارات متاحة.');const t={id:letter+n,name:{visual:'فيديو/صور',text:'نصوص',audio:'صوت'}[kind]+' '+n,kind,hidden:false,muted:false};if(kind==='visual')p.tracks.unshift(t);else if(kind==='text')p.tracks.splice(Math.max(0,p.tracks.findIndex(x=>x.kind==='text')),0,t);else p.tracks.push(t);a.activeTrack=t.id;});}
function speed(v){const a=A(),c=a.chosen();if(!c||!['video','audio'].includes(c.kind)){a.toast('حدّد مقطع فيديو أو صوت لتغيير سرعته.');return;}a.edit(()=>{const set=x=>{const old=x.speed||1;x.speed=v;if(v===1)delete x.speed;const room=Math.max(.1,(srcDur(x)-x.in)/v);x.duration=clamp(x.duration*old/v,.1,Math.min(3600-x.start,room));};set(c);const l=c.audioLink&&a.p.clips.find(x=>x.id===c.audioLink);if(l)set(l);});if(a.p.clips.some(x=>x.subtitleOf&&x.subtitleOf===c.id))a.toast('تنبيه: لا تتغير توقيتات الترجمة تلقائيًا مع السرعة.');}
async function freeze(){
 const a=A(),c=a.chosen();
 if(!c||c.kind!=='video'){a.toast('حدّد مقطع فيديو ثم ضع المؤشر على اللقطة المطلوبة.');return;}
 const t=a.current;if(t<=c.start+.05||t>=c.start+c.duration-.05){a.toast('ضع المؤشر داخل المقطع لتجميد اللقطة.');return;}
 const n=a.getNode(c),el=n&&n.el;if(!el||el.readyState<2){a.toast('الفيديو غير جاهز بعد. شغّله لحظة ثم أعد المحاولة.');return;}
 try{
  const cv=document.createElement('canvas');cv.width=el.videoWidth||1280;cv.height=el.videoHeight||720;cv.getContext('2d').drawImage(el,0,0,cv.width,cv.height);
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92));if(!blob)throw Error('تعذّر التقاط اللقطة.');
  const file=new File([blob],'لقطة مجمدة.jpg',{type:'image/jpeg'});
  const asset=await a.loadAsset(file,{name:'لقطة مجمدة',type:'image'});a.assets.set(asset.id,asset);
  const dur=2,tid=c.id;
  a.edit(()=>{const p=a.p,cc=p.clips.find(x=>x.id===tid);if(!cc)return;const r=a.C.split(p,tid,t);for(const o of p.clips){if(o.track===cc.track&&o.id!==cc.id&&o.start>=t-.001&&!(o===r?false:false)){o.start=+(o.start+dur).toFixed(3);}}
   const fz=a.C.clip(asset,t,cc.track);fz.duration=dur;fz.fit=cc.fit||'contain';fz.name='لقطة مجمدة';p.clips.push(fz);a.selected=fz.id;});
  a.toast('أُدرجت لقطة مجمدة مدتها ثانيتان.','success');
 }catch(e){a.toast(e.message||'تعذّر تجميد اللقطة.','error');}
}

async function removeSilence(){
 const a=A(),c=a.chosen();
 if(!c||!['video','audio'].includes(c.kind)||isSub(c)){a.toast('حدّد مقطع فيديو أو صوت لحذف الصمت منه.');return;}
 const as=a.assets.get(c.assetId);if(!as||!as.blob){a.toast('تعذّر الوصول إلى ملف المقطع.');return;}
 if(as.blob.size>300*1048576){a.toast('الملف كبير جدًا للتحليل داخل المتصفح (الحد 300 MB).');return;}
 a.toast('جارٍ تحليل الصوت…');
 let buf;try{buf=await new OfflineAudioContext(1,1,44100).decodeAudioData(await as.blob.arrayBuffer());}catch(e){a.toast('هذا الملف لا يحتوي صوتًا يمكن تحليله.','error');return;}
 const sr=buf.sampleRate,ch=[...Array(buf.numberOfChannels).keys()].map(i=>buf.getChannelData(i)),win=Math.round(sr*.05),n=Math.floor(buf.length/win),thr=.012,minLen=.5,pad=.1,sp=c.speed||1;
 const loud=new Array(n);for(let w=0;w<n;w++){let s=0;for(const d of ch)for(let i=w*win;i<(w+1)*win;i+=4)s+=d[i]*d[i];loud[w]=Math.sqrt(s/((win/4)*ch.length))>thr;}
 const lo=c.in,hi=c.in+c.duration*sp,runs=[];let st=null;
 for(let w=0;w<=n;w++){const q=w<n&&!loud[w];if(q&&st===null)st=w;else if(!q&&st!==null){const s0=st*.05,s1=w*.05;st=null;if(s1-s0>=minLen){const x0=Math.max(s0+pad,lo),x1=Math.min(s1-pad,hi);if(x1-x0>=.2)runs.push([c.start+(x0-c.in)/sp,c.start+(x1-c.in)/sp]);}}}
 const ids=[c.id];if(c.audioLink)ids.push(c.audioLink);
 const cut=[];for(const r of runs)if(r[0]>c.start+.06&&r[1]<c.start+c.duration-.06)cut.push(r);
 if(!cut.length){a.toast('لم أجد مقاطع صامتة طويلة في هذا المقطع.');return;}
 let saved=0;
 a.edit(()=>{const p=a.p;for(let k=cut.length-1;k>=0;k--){const [t1,t2]=cut[k],gap=t2-t1;for(const base of ids){const first=p.clips.find(v=>v.id===base);if(!first)continue;const tr=first.track,x=p.clips.find(v=>v.track===tr&&v.assetId===c.assetId&&v.start<=t1+.001&&v.start+v.duration>=t2-.001);if(!x)continue;
   const right=a.C.split(p,x.id,t2);if(!right)continue;const mid=a.C.split(p,x.id,t1);if(!mid)continue;p.clips=p.clips.filter(v=>v.id!==mid.id);
   for(const v of p.clips)if(v.track===tr&&v.start>=t2-.001&&!isSub(v))v.start=Math.max(0,+(v.start-gap).toFixed(3));}
  saved+=gap;}a.selected=null;});
 a.toast('حُذف '+cut.length+' مقطع صامت، ووُفّرت '+saved.toFixed(1)+' ثانية.','success');
}

/* ---- Auto montage ---- */
const STYLES={
 cinematic:{name:'سينمائي',desc:'إيقاع هادئ، انتقالات ناعمة، ألوان سينمائية وحواف مظللة',img:4,seg:6,tr:.6,trans:['fade','zoom','fade','circle','fade','wipe'],motions:['ken-burns','zoom-in','pan-left','zoom-out','pan-right','drift'],vm:.3,lut:'teal-orange',fx:'vignette',fxs:.5,title:'rise'},
 fast:{name:'سريع وحيوي',desc:'لقطات قصيرة، انتقالات سريعة وحركة نابضة (مناسب لـ Reels/TikTok)',img:2,seg:3,tr:.3,trans:['slide','zoom','wipe','slide-up','spin','diamond','blinds-vertical'],motions:['zoom-in','pulse','shake','zoom-out','pan-left'],vm:.25,lut:'vivid-pop',fx:'none',fxs:0,title:'pop'},
 calm:{name:'هادئ وأنيق',desc:'لقطات أطول، تلاشٍ ناعم وحركة تنفّس خفيفة بألوان دافئة',img:5,seg:7,tr:.9,trans:['fade'],motions:['breathe','float','drift','zoom-in'],vm:.2,lut:'soft-warm',fx:'vignette',fxs:.3,title:'fade'}
};
function montageSources(){
 const a=A(),p=a.p,vis=id=>(p.tracks.find(t=>t.id===id)||{}).kind==='visual';
 let items=p.clips.filter(c=>c.track==='v1'&&!['audio','text'].includes(c.kind)&&!c.subtitleOf).sort((x,y)=>x.start-y.start).map(c=>({asset:a.assets.get(c.assetId),srcIn:c.in,srcDur:c.duration*(c.speed||1),clipId:c.id})).filter(i=>i.asset);
 let fromTimeline=true;
 if(!items.length){fromTimeline=false;items=[...a.assets.values()].filter(x=>['video','image','scene'].includes(x.type)&&!x.overlay).map(x=>({asset:x,srcIn:0,srcDur:x.duration||5}));}
 let music=p.clips.filter(c=>c.kind==='audio'&&!c.videoLink&&!c.subtitleOf).sort((x,y)=>x.start-y.start).map(c=>({asset:a.assets.get(c.assetId),clipId:c.id})).filter(m=>m.asset);
 const musicFromTimeline=music.length>0;
 let m=music[0]||null;const ids=new Set(music.map(x=>x.clipId));
 if(!m){const x=[...a.assets.values()].find(q=>q.type==='audio');if(x)m={asset:x};}
 return {items,fromTimeline,music:m,musicClipIds:musicFromTimeline?ids:new Set()};
}
function montageOpen(){
 const a=A(),src=montageSources();
 if(!src.items.length){a.toast('أضف مقاطع فيديو أو صورًا إلى المشروع أولًا ثم اضغط «مونتاج تلقائي».');return;}
 let d=$('#montage-dialog');if(d)d.remove();
 d=document.createElement('dialog');d.id='montage-dialog';
 d.innerHTML=`<div class="dialog-head"><h2>✨ مونتاج تلقائي بضغطة زر</h2><button class="icon-button" data-close aria-label="إغلاق">×</button></div>
 <p class="muted">سأرتّب مقاطعك وأقصّها وأضيف الحركة والتأثيرات والانتقالات والألوان وأركّب الموسيقى. يمكنك التراجع (Ctrl+Z) وتعديل أي شيء بعدها.</p>
 <div class="mt-info"><span>🎞 ${src.items.length} ${src.fromTimeline?'مقطع من الخط الزمني':'ملف من المكتبة'}</span><span>🎵 ${src.music?'الموسيقى: '+src.music.asset.name.slice(0,30):'بلا موسيقى (أضف ملفًا صوتيًا لتركيبه)'}</span></div>
 <div class="mt-styles">${Object.entries(STYLES).map(([k,s],i)=>`<label class="mt-opt"><input type="radio" name="mt-style" value="${k}" ${i===0?'checked':''}><span><strong>${s.name}</strong><small>${s.desc}</small></span></label>`).join('')}</div>
 <label class="mt-check"><input type="checkbox" id="mt-title" checked> إضافة عنوان افتتاحي باسم المشروع</label>
 <label class="mt-check"><input type="checkbox" id="mt-fit" ${src.music?'checked':'disabled'}> اجعل طول الفيديو بطول الموسيقى</label>
 <div class="dialog-buttons"><button class="button primary" id="mt-go">إنشاء المونتاج</button><button class="button" data-close>إلغاء</button></div>`;
 document.body.append(d);
 d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-close]'))d.close();});
 d.querySelector('#mt-go').onclick=()=>{const st=d.querySelector('input[name=mt-style]:checked').value,title=d.querySelector('#mt-title').checked,fit=d.querySelector('#mt-fit').checked;d.close();runMontage(st,title,fit);};
 d.showModal();
}
function runMontage(key,title,fit){
 const a=A(),st=STYLES[key],src=montageSources(),n=src.items.length;
 if(!n)return;
 const tr=n>1?st.tr:0,clamp=(v,x,y)=>Math.max(x,Math.min(y,v));
 let ds=src.items.map(i=>i.asset.type==='video'?Math.max(.8,Math.min(i.srcDur,st.seg)):st.img);
 if(fit&&src.music){const T=Math.min(src.music.asset.duration,600),sum=ds.reduce((x,y)=>x+y,0),k=(T+(n-1)*tr)/sum;ds=ds.map((d,i)=>{const it=src.items[i],max=it.asset.type==='video'?it.srcDur:8;return clamp(d*k,Math.min(1.2,max),max);});}
 ds=ds.map(d=>Math.max(d,tr+.4));
 const hasLut=window.FahadLUT&&FahadLUT.LOOKS&&FahadLUT.LOOKS.some(l=>l.id===st.lut);
 a.edit(()=>{
  const p=a.p;
  const drop=new Set([...(src.fromTimeline?src.items.map(i=>i.clipId):[]),...src.musicClipIds]);
  p.clips=p.clips.filter(c=>!drop.has(c.id));
  let t=0,last=0;
  src.items.forEach((it,i)=>{
   const as=it.asset,c=a.C.clip(as,t,'v1'),d=ds[i];c.duration=d;c.fit='cover';
   if(as.type==='video'){c.in=Math.max(0,it.srcIn+(it.srcDur-d)*.35);c.volume=src.music?.25:1;}
   const mo=as.type==='video'?(i%2?'zoom-in':'none'):st.motions[i%st.motions.length];
   if(mo!=='none'){c.motion=mo;c.motionAmount=as.type==='video'?st.vm:.55;}
   c.transition=i===0?'fade':st.trans[(i-1)%st.trans.length];c.transitionDuration=i===0?.4:tr;
   if(hasLut){c.lut=st.lut;c.lutStrength=.75;}
   if(st.fx!=='none'){c.effect=st.fx;c.effectStrength=st.fxs;}
   p.clips.push(c);last=t+d;t=last-tr;
  });
  const total=last;
  if(src.music){const m=src.music.asset;let at=0,k=0;while(at<total-.2&&k<8){const c=a.C.clip(m,at,'a1');c.duration=Math.min(m.duration,total-at);c.volume=.85;p.clips.push(c);at+=c.duration;k++;}}
  if(title&&!p.clips.some(c=>c.kind==='text'&&!c.subtitleOf&&c.start<3.7&&c.start+c.duration>.5)){const tc=a.C.textClip(.5,{text:p.name||'حكايتي',name:'عنوان افتتاحي',duration:Math.min(3.2,ds[0]-.2),fontSize:80,y:.5,animation:st.title});p.clips.push(tc);}
  a.selected=null;
 });
 a.seek(0);
 a.toast('تم المونتاج التلقائي: '+n+' مقطع بنمط «'+st.name+'». يمكنك الآن تعديل أي شيء.','success');
}
(()=>{const s=document.createElement('style');s.textContent='#montage-dialog{max-width:440px;width:92vw}.mt-info{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);margin:8px 0}.mt-styles{display:grid;gap:8px;margin:10px 0}.mt-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px;cursor:pointer;background:#191d2c}.mt-opt:has(input:checked){border-color:var(--accent);background:#2a2750}.mt-opt strong{display:block;font-size:13px}.mt-opt small{display:block;color:var(--muted);font-size:11px;margin-top:2px;line-height:1.7}.mt-check{display:flex;gap:8px;align-items:center;font-size:12px;margin:6px 0}.mt-magic{background:linear-gradient(135deg,#8d7aff,#c07bff)!important;color:#fff!important;border:0!important;font-weight:700}';document.head.append(s);})();

/* ---- Audio enhance: denoise gate + high-pass + compressor + loudness ---- */
function wavBlob(data,sr){const n=data.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++){const x=Math.max(-1,Math.min(1,data[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true);}return new Blob([b],{type:'audio/wav'});}
async function enhanceAudio(){
 const a=A(),c=a.chosen();
 if(!c||!['video','audio'].includes(c.kind)||isSub(c)){a.toast('حدّد مقطع فيديو أو صوت لتحسين صوته.');return;}
 const as=a.assets.get(c.assetId);if(!as||!as.blob){a.toast('تعذّر الوصول إلى ملف المقطع.');return;}
 if(as.blob.size>250*1048576||as.duration>1200){a.toast('الملف طويل جدًا للمعالجة داخل المتصفح (الحد 20 دقيقة).');return;}
 a.toast('جارٍ تحسين الصوت… قد يستغرق لحظات.');
 try{
  const dec=await new OfflineAudioContext(1,1,44100).decodeAudioData(await as.blob.arrayBuffer());
  const sr=dec.sampleRate,len=dec.length;
  const off=new OfflineAudioContext(1,len,sr),src=off.createBufferSource();src.buffer=dec;
  const hp=off.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;hp.Q.value=.7;
  const lp=off.createBiquadFilter();lp.type='lowpass';lp.frequency.value=14000;
  const comp=off.createDynamicsCompressor();comp.threshold.value=-26;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.2;
  src.connect(hp);hp.connect(lp);lp.connect(comp);comp.connect(off.destination);src.start();
  const r=await off.startRendering(),d=r.getChannelData(0);
  const win=Math.round(sr*.03),nw=Math.floor(len/win),rms=new Float32Array(nw);
  for(let w=0;w<nw;w++){let s2=0;for(let i=w*win;i<(w+1)*win;i++)s2+=d[i]*d[i];rms[w]=Math.sqrt(s2/win);}
  const sorted=[...rms].sort((x,y)=>x-y),floor=Math.max(1e-4,sorted[Math.floor(nw*.1)]||1e-4),thr=floor*2.6;
  const g=new Float32Array(nw);let cur=1;for(let w=0;w<nw;w++){const t=rms[w]>=thr?1:Math.max(.1,Math.pow(rms[w]/thr,1.6));cur=t>cur?cur+(t-cur)*.6:cur+(t-cur)*.12;g[w]=cur;}
  const out=new Float32Array(len);for(let w=0;w<nw;w++){const g0=g[w],g1=g[Math.min(nw-1,w+1)];for(let i=0;i<win;i++)out[w*win+i]=d[w*win+i]*(g0+(g1-g0)*i/win);}
  let ss=0,cnt=0;for(let w=0;w<nw;w++)if(rms[w]>=thr){ss+=rms[w]*rms[w];cnt++;}
  const speech=Math.sqrt(ss/Math.max(1,cnt))||.05;let gain=Math.min(8,.14/speech),peak=0;for(let i=0;i<len;i++){const v=Math.abs(out[i]);if(v>peak)peak=v;}
  if(peak*gain>.97)gain=.97/peak;for(let i=0;i<len;i++)out[i]*=gain;
  const file=new File([wavBlob(out,sr)],'صوت محسّن.wav',{type:'audio/wav'});
  const na=await a.loadAsset(file,{name:'صوت محسّن — '+as.name.slice(0,30),type:'audio'});a.assets.set(na.id,na);
  a.edit(()=>{const p=a.p;
   if(c.kind==='audio'){c.assetId=na.id;c.name='صوت محسّن';}
   else{let at=p.tracks.filter(t=>t.kind==='audio').find(t=>!p.clips.some(x=>x.track===t.id&&x.start<c.start+c.duration&&x.start+x.duration>c.start))||p.tracks.find(t=>t.id==='a1');
    const ac=a.C.clip(na,c.start,at.id);ac.in=c.in;ac.duration=c.duration;ac.volume=c.volume||1;if(c.speed)ac.speed=c.speed;ac.name='صوت محسّن: '+c.name.slice(0,30);ac.videoLink=c.id;c.audioLink=ac.id;c.volume=0;p.clips.push(ac);}});
  a.toast('تم تحسين الصوت: إزالة ضجيج الخلفية وتخفيف الدمدمة وتوحيد المستوى.','success');
 }catch(e){a.toast('تعذّر تحسين الصوت: '+(e.message||'ملف غير مدعوم'),'error');}
}
/* ---- Chroma key (green/blue screen) ---- */
function chroma(canvas,c){
 const k=c.chroma;if(!k)return;const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');if(!ctx||!w||!h)return;
 let img;try{img=ctx.getImageData(0,0,w,h);}catch{return;}
 const px=img.data,hex=k.k==='blue'?[0,70,255]:[0,255,0],ky=(-.168736*hex[0]-.331264*hex[1]+.5*hex[2]),kr=(.5*hex[0]-.418688*hex[1]-.081312*hex[2]);
 const t0=Math.max(2,k.s*110),t1=t0+4+k.f*110,green=k.k!=='blue';
 for(let i=0;i<px.length;i+=4){const r=px[i],g=px[i+1],b=px[i+2];if(!px[i+3])continue;
  const cb=-.168736*r-.331264*g+.5*b,cr=.5*r-.418688*g-.081312*b,d=Math.hypot(cb-ky,cr-kr);
  let a=d<=t0?0:d>=t1?1:(d-t0)/(t1-t0);a=a*a*(3-2*a);
  if(a<1)px[i+3]*=a;
  if(green){const m=Math.max(r,b);if(g>m)px[i+1]=m+(g-m)*.15;}else{const m=Math.max(r,g);if(b>m)px[i+2]=m+(b-m)*.15;}}
 ctx.putImageData(img,0,0);
}
function chromaSet(kind){const c=vis();if(!c)return;A().edit(()=>{c.chroma={k:kind,s:.4,f:.15};});A().toast('أُزيلت الخلفية '+(kind==='blue'?'الزرقاء':'الخضراء')+'. اضبط القوة من قائمة «تحويل». ضع المقطع فوق مقطع آخر ليظهر خلفه.');}
function chromaAdj(dl){const c=vis();if(!c)return;if(!c.chroma){A().toast('فعّل إزالة الخلفية أولًا.');return;}A().edit(()=>{c.chroma.s=clamp(+(c.chroma.s+dl).toFixed(2),.05,1);c.chroma.f=clamp(+(c.chroma.f+dl/2).toFixed(2),.02,.6);});}
function chromaOff(){const c=vis();if(!c)return;A().edit(()=>{delete c.chroma;});}

/* ---- Touch / phone / tablet support ---- */
const compactMQ=window.matchMedia('(max-width:650px), (max-height:500px) and (orientation:landscape)');
const compact=()=>compactMQ.matches;
function closeSheets(){document.body.classList.remove('sheet-lib');$('#inspector')?.classList.remove('open');}
function openProps(){const a=A();if(!a.chosen()){a.toast('اضغط على مقطع في الخط الزمني أولًا لتعديل خصائصه.');return;}document.body.classList.remove('sheet-lib');a.renderProperties();$('#inspector').classList.add('open');}
document.addEventListener('click',e=>{
 if(!compact())return;
 const t=e.target.closest('.tool[data-panel]');
 if(t){const open=document.body.classList.contains('sheet-lib');if(open&&t.classList.contains('active')){document.body.classList.remove('sheet-lib');e.stopPropagation();e.preventDefault();return;}document.body.classList.add('sheet-lib');$('#inspector')?.classList.remove('open');return;}
 if(e.target.closest('.library,.inspector,dialog,.tl-pop,.toasts,.topbar'))return;
 if(e.target.closest('.timeline,.preview-panel')){document.body.classList.remove('sheet-lib');if(e.target.closest('.preview-panel'))$('#inspector')?.classList.remove('open');}
},true);
document.addEventListener('click',e=>{if(e.target.closest('.inspector-close'))$('#inspector')?.classList.remove('open');},true);
compactMQ.addEventListener?.('change',()=>{document.body.classList.remove('sheet-lib');});
/* pinch to zoom the timeline */
(()=>{let d0=0,z0=48;const dist=e=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
 document.addEventListener('touchstart',e=>{if(e.touches.length===2&&e.target.closest&&e.target.closest('#timeline-scroll')){d0=dist(e);z0=+($('#zoom')?.value||48);}},{passive:true});
 document.addEventListener('touchmove',e=>{if(e.touches.length===2&&d0&&e.target.closest&&e.target.closest('#timeline-scroll')){e.preventDefault();const z=clamp(Math.round(z0*dist(e)/d0),15,100),el=$('#zoom');if(el&&+el.value!==z){el.value=z;el.dispatchEvent(new Event('input',{bubbles:true}));}}},{passive:false});
 document.addEventListener('touchend',e=>{if(e.touches.length<2)d0=0;},{passive:true});})();

/* ---- Share / social export presets ---- */
const PRESETS=[
 {id:'ig-reels',n:'إنستغرام ريلز / ستوري',s:1080,b:8e6,f:30,r:'720x1280',c:'mp4',note:'9:16 · 1080p · H.264'},
 {id:'tiktok',n:'تيك توك',s:1080,b:8e6,f:30,r:'720x1280',c:'mp4',note:'9:16 · 1080p · H.264'},
 {id:'snap',n:'سناب شات',s:1080,b:5e6,f:30,r:'720x1280',c:'mp4',note:'9:16 · 1080p · H.264'},
 {id:'yt-shorts',n:'يوتيوب شورتس',s:1080,b:8e6,f:30,r:'720x1280',c:'mp4',note:'9:16 · 1080p'},
 {id:'yt',n:'يوتيوب',s:1080,b:16e6,f:30,r:'1280x720',c:'mp4',note:'16:9 · 1080p · جودة عالية'},
 {id:'yt4k',n:'يوتيوب 4K',s:2160,b:30e6,f:30,r:'1280x720',c:'mp4',note:'16:9 · 4K'},
 {id:'ig-post',n:'إنستغرام (منشور)',s:1080,b:5e6,f:30,r:'1080x1080',c:'mp4',note:'1:1 · 1080p'},
 {id:'x',n:'X (تويتر)',s:1080,b:5e6,f:30,r:'1280x720',c:'mp4',note:'16:9 · 1080p'},
 {id:'fb',n:'فيسبوك',s:1080,b:5e6,f:30,r:'1280x720',c:'mp4',note:'16:9 · 1080p'},
 {id:'wa',n:'واتساب / تيليجرام',s:720,b:2.5e6,f:30,r:null,c:'mp4',note:'حجم صغير · 720p'},
 {id:'best',n:'أعلى جودة',s:1440,b:16e6,f:30,r:null,c:'mp4',note:'2K · 16 Mbps'}
];
const CODEC_PREF={mp4:['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']};
function setSel(id,v){const el=$(id);if(!el)return false;const o=[...el.options].find(x=>x.value===String(v));if(o){el.value=o.value;return true;}return false;}
function applyPreset(id){const p=PRESETS.find(x=>x.id===id);if(!p)return;
 setSel('#export-size',p.s);setSel('#export-bitrate',p.b);setSel('#export-fps',p.f);
 for(const m of CODEC_PREF[p.c])if(setSel('#export-format',m))break;
 document.querySelectorAll('#share-presets button').forEach(b=>b.classList.toggle('active',b.dataset.preset===id));
 const hint=$('#share-hint');const cur=$('#aspect')?.value;
 if(p.r&&cur!==p.r){hint.hidden=false;hint.innerHTML='النسبة الموصى بها لهذه المنصة <b>'+p.r.replace('x',' × ')+'</b> — نسبة مشروعك الحالية '+String(cur).replace('x',' × ')+'. <button class="button compact" id="share-fit">اضبط النسبة</button>';
  $('#share-fit').onclick=()=>{const a=$('#aspect');a.value=p.r;a.dispatchEvent(new Event('change',{bubbles:true}));applyPreset(id);};}
 else{hint.hidden=false;hint.textContent='✓ إعدادات '+p.n+' جاهزة: '+p.note;}
}
function buildShare(){const box=$('#share-presets');if(!box||box.dataset.ok)return;box.dataset.ok=1;
 box.innerHTML=PRESETS.map(p=>'<button type="button" class="share-chip" data-preset="'+p.id+'"><b>'+p.n+'</b><small>'+p.note+'</small></button>').join('');
 box.addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b)applyPreset(b.dataset.preset);});
 $('#share-open')?.addEventListener('click',()=>{$('#export-open').click();setTimeout(()=>{const d=$('#export-dialog');d?.querySelector('h2')&&(d.querySelector('h2').textContent='مشاركة على منصات التواصل');box.scrollIntoView({block:'nearest'});},50);});
 $('#export-open')?.addEventListener('click',()=>{setTimeout(()=>{const h=$('#export-dialog h2');if(h&&!$('#export-dialog').dataset.share)h.textContent='حكايتك جاهزة للمشاركة';},0);},true);
 const sb=$('#export-share');
 if(sb){const can=()=>{try{return !!navigator.canShare&&!!navigator.share;}catch{return false;}};
  new MutationObserver(()=>{sb.hidden=!(can()&&!$('#export-result').hidden);}).observe($('#export-result'),{attributes:true,attributeFilter:['hidden']});
  sb.onclick=async()=>{try{const a=$('#export-download');const blob=await fetch(a.href).then(r=>r.blob());const name=a.download||'video.mp4';const f=new File([blob],name,{type:blob.type||'video/mp4'});
   if(navigator.canShare({files:[f]}))await navigator.share({files:[f],title:name});else A().toast('جهازك لا يدعم مشاركة الملف مباشرة. نزّله ثم شاركه من تطبيقك.','error');}catch(e){if(e&&e.name!=='AbortError')A().toast('تعذّرت المشاركة: '+e.message,'error');}};}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildShare);else buildShare();
/* ---- UI ---- */
const MENUS=[
 ['tool','أداة',[['select','تحديد','A'],['blade','شفرة: تقسيم بالنقر','E'],['selLeft','تحديد ما على اليسار','['],['selRight','تحديد ما على اليمين',']'],['selAll','تحديد الكل','Ctrl+A']]],
 ['cut','قص',[['split','تقسيم عند المؤشر','S'],['trimL','قص البداية حتى المؤشر','Q'],['trimR','قص النهاية من المؤشر','W'],['ripple','حذف وسدّ الفراغ','Shift+Del'],['copy','نسخ','Ctrl+C'],['cut','قصّ','Ctrl+X'],['paste','لصق','Ctrl+V'],['dup','تكرار','Ctrl+D']]],
 ['xform','تحويل',[['freeze','لقطة مجمدة','F'],['flipX','قلب أفقي (مرآة)','H'],['flipY','قلب رأسي','V'],['rot90','تدوير ٩٠°','R'],['chromaG','إزالة الخلفية الخضراء',''],['chromaB','إزالة الخلفية الزرقاء',''],['chromaMore','زيادة قوة إزالة الخلفية',''],['chromaLess','تقليل قوة إزالة الخلفية',''],['chromaOff','إلغاء إزالة الخلفية','']]],
 ['speed','سرعة',[['sp:0.25','٠٫٢٥×',''],['sp:0.5','٠٫٥×',''],['sp:0.75','٠٫٧٥×',''],['sp:1','عادية ١×',''],['sp:1.25','١٫٢٥×',''],['sp:1.5','١٫٥×',''],['sp:2','٢×',''],['sp:3','٣×',''],['sp:4','٤×','']]],
 ['audio','صوت',[['enhance','تحسين الصوت (ضجيج + مستوى)',''],['silence','حذف المقاطع الصامتة تلقائيًا',''],['detach','عزل الصوت عن الفيديو',''],['mute','كتم / إلغاء كتم المقطع','']]],
 ['track','+ مسار',[['trackVisual','مسار فيديو / صور',''],['trackText','مسار كتابة',''],['trackAudio','مسار صوت','']]]
];
const KEYS=[['Space','تشغيل / إيقاف'],['A','أداة التحديد'],['E','أداة الشفرة (انقر المقطع للتقسيم)'],['S','تقسيم عند المؤشر'],['Q / W','قص البداية / النهاية حتى المؤشر'],['[  /  ]','تحديد ما على يسار / يمين المؤشر'],['Delete','حذف'],['Shift+Delete','حذف وسدّ الفراغ'],['Ctrl+C / X / V','نسخ / قصّ / لصق'],['Ctrl+D','تكرار'],['Ctrl+A','تحديد الكل'],['Ctrl+Z / Ctrl+Shift+Z','تراجع / إعادة'],['F','لقطة مجمدة'],['H / V','قلب أفقي / رأسي'],['R','تدوير ٩٠°'],['M','علامة عند المؤشر'],[', / .','العلامة السابقة / التالية'],['← / →','إطار واحد (مع Shift: ثانية)'],['Home / End','البداية / النهاية'],['+ / −','تكبير / تصغير الخط الزمني'],['N','المغناطيس']];
function buildUI(){
 const host=$('.timeline-toolbar');if(!host||host.dataset.tools)return;host.dataset.tools='1';
 const mg=document.createElement('div');mg.className='tl-group';mg.innerHTML='<button class="button compact mt-magic" data-tl-cmd="montage" title="مونتاج كامل بضغطة زر">✨ مونتاج تلقائي</button>';host.prepend(mg);
 const pr=document.createElement('div');pr.className='tl-group tl-compact-only';pr.innerHTML='<button class="button compact" data-tl-cmd="props" title="خصائص المقطع المحدد">⚙ خصائص</button>';mg.after(pr);
 const pop=document.createElement('div');pop.className='tl-pop';pop.hidden=true;document.body.append(pop);
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tlCmd){run(b.dataset.tlCmd);return;}if(b.dataset.tlMenu){e.stopPropagation();const m=MENUS.find(x=>x[0]===b.dataset.tlMenu);pop.innerHTML=m[2].map(([c,l,k])=>`<button data-c="${c}"><span>${l}</span><kbd dir="ltr">${k}</kbd></button>`).join('');const r=b.getBoundingClientRect();pop.hidden=false;pop.style.bottom=(window.innerHeight-r.top+6)+'px';pop.style.left=Math.max(6,Math.min(r.left,window.innerWidth-pop.offsetWidth-6))+'px';}});
 pop.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pop.hidden=true;run(b.dataset.c);});
 document.addEventListener('click',e=>{if(!e.target.closest('.tl-pop')&&!e.target.closest('[data-tl-menu]'))pop.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')pop.hidden=true;});
}
function run(name){if(busy())return;if(name.startsWith('sp:')){speed(+name.slice(3));return;}const f=CMDS[name];if(f)f();}
function markTool(){const l=$('#tl-tool-label');if(l)l.textContent=(tool==='blade'?'شفرة':'تحديد');$('#timeline-content')?.classList.toggle('tool-blade',tool==='blade');$('#tl-tool')?.classList.toggle('active-toggle',tool==='blade');}
function afterSel(){const a=A();a.renderTimeline();a.renderProperties&&a.selected&&a.renderProperties();}
function openKeys(){let d=$('#keys-dialog');if(!d){d=document.createElement('dialog');d.id='keys-dialog';d.innerHTML=`<div class="dialog-head"><h2>اختصارات لوحة المفاتيح</h2><button class="icon-button" data-close aria-label="إغلاق">×</button></div><div class="keys-grid">${KEYS.map(([k,l])=>`<kbd dir="ltr">${k}</kbd><span>${l}</span>`).join('')}</div>`;document.body.append(d);d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-close]'))d.close();});}d.showModal();}
/* ---- hooks called from app.js ---- */
function afterTimeline(){
 const a=A();if(!a)return;
 for(const el of $$('.timeline-clip'))if(multi.has(el.dataset.clip))el.classList.add('selected','multi');
 const ruler=$('#ruler');if(ruler){ruler.querySelectorAll('.ruler-marker').forEach(x=>x.remove());for(const m of (a.p.markers||[])){const s=document.createElement('button');s.className='ruler-marker';s.style.left=m*a.zoom+'px';s.title='علامة · '+a.C.time(m);s.dataset.marker=m;s.addEventListener('pointerdown',ev=>{ev.stopPropagation();});s.addEventListener('click',ev=>{ev.stopPropagation();a.seek(m);});ruler.append(s);}}
}
function pointer(e){
 const a=A();if(!a||busy())return false;
 const el=e.target.closest('[data-clip]');
 if(!el){if(multi.size&&e.target.closest('.timeline-track')){multi.clear();}return false;}
 const id=el.dataset.clip;
 if(e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();if(a.selected&&!multi.has(a.selected)){multi.add(a.selected);}if(multi.has(id))multi.delete(id);else multi.add(id);a.selected=null;afterSel();return true;}
 if(tool==='blade'){
  e.preventDefault();const rect=$('#timeline-content').getBoundingClientRect(),t=(e.clientX-rect.left)/a.zoom,c=a.p.clips.find(x=>x.id===id);
  if(!c||isSub(c)){a.toast('قسّم الفيديو الأصلي وستتبعه الترجمة.');return true;}
  if(t<=c.start+.05||t>=c.start+c.duration-.05){return true;}
  a.edit(()=>{const r=a.C.split(a.p,id,t);if(r)a.selected=r.id;});a.seek(t);return true;
 }
 if(multi.size){multi.clear();a.renderTimeline();}
 return false;
}
function onKey(e){
 const a=A();if(!a)return;
 if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||document.querySelector('dialog[open]')||a.exportJob||a.loading)return;
 const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();let name=null;
 if(mod&&k==='a')name='selAll';else if(mod&&k==='c')name='copy';else if(mod&&k==='x')name='cut';else if(mod&&k==='v')name='paste';else if(mod&&k==='d')name='dup';
 else if(!mod&&!e.altKey){
  if(k==='a')name='select';else if(k==='e')name='blade';else if(k==='q')name='trimL';else if(k==='w')name='trimR';else if(e.key==='['||e.code==='BracketLeft')name='selLeft';else if(e.key===']'||e.code==='BracketRight')name='selRight';
  else if(k==='f')name='freeze';else if(k==='h')name='flipX';else if(k==='v')name='flipY';else if(k==='r')name='rot90';else if(k==='m')name='marker';else if(e.key===',')name='prevMarker';else if(e.key==='.')name='nextMarker';
  else if(k==='n')name='snap';else if(e.key==='Home')name='toStart';else if(e.key==='End')name='toEnd';else if(e.key==='+'||e.key==='=')name='zoomIn';else if(e.key==='-'||e.key==='_')name='zoomOut';
  else if(e.key==='Delete'&&e.shiftKey)name='ripple';
  else if(['Delete','Backspace'].includes(e.key)&&multi.size)name='del';
  else if(k==='s'&&multi.size)name='split';
 }
 if(!name)return;
 e.preventDefault();e.stopImmediatePropagation();run(name);
}
document.addEventListener('keydown',onKey,true);
function boot(){buildUI();}
window.FahadTools={chroma,compact,noAutoInspector:()=>compact(),STYLES,montageSources,afterTimeline,pointer,run,get tool(){return tool},get multi(){return multi}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
