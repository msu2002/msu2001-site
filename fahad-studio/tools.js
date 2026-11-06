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
 freeze(){freeze();}
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
/* ---- UI ---- */
const MENUS=[
 ['tool','أداة',[['select','تحديد','A'],['blade','شفرة: تقسيم بالنقر','E'],['selLeft','تحديد ما على اليسار','['],['selRight','تحديد ما على اليمين',']'],['selAll','تحديد الكل','Ctrl+A']]],
 ['cut','قص',[['split','تقسيم عند المؤشر','S'],['trimL','قص البداية حتى المؤشر','Q'],['trimR','قص النهاية من المؤشر','W'],['ripple','حذف وسدّ الفراغ','Shift+Del'],['copy','نسخ','Ctrl+C'],['cut','قصّ','Ctrl+X'],['paste','لصق','Ctrl+V'],['dup','تكرار','Ctrl+D']]],
 ['xform','تحويل',[['freeze','لقطة مجمدة','F'],['flipX','قلب أفقي (مرآة)','H'],['flipY','قلب رأسي','V'],['rot90','تدوير ٩٠°','R']]],
 ['speed','سرعة',[['sp:0.25','٠٫٢٥×',''],['sp:0.5','٠٫٥×',''],['sp:0.75','٠٫٧٥×',''],['sp:1','عادية ١×',''],['sp:1.25','١٫٢٥×',''],['sp:1.5','١٫٥×',''],['sp:2','٢×',''],['sp:3','٣×',''],['sp:4','٤×','']]],
 ['audio','صوت',[['detach','عزل الصوت عن الفيديو',''],['mute','كتم / إلغاء كتم المقطع','']]],
 ['track','+ مسار',[['trackVisual','مسار فيديو / صور',''],['trackText','مسار كتابة',''],['trackAudio','مسار صوت','']]]
];
const KEYS=[['Space','تشغيل / إيقاف'],['A','أداة التحديد'],['E','أداة الشفرة (انقر المقطع للتقسيم)'],['S','تقسيم عند المؤشر'],['Q / W','قص البداية / النهاية حتى المؤشر'],['[  /  ]','تحديد ما على يسار / يمين المؤشر'],['Delete','حذف'],['Shift+Delete','حذف وسدّ الفراغ'],['Ctrl+C / X / V','نسخ / قصّ / لصق'],['Ctrl+D','تكرار'],['Ctrl+A','تحديد الكل'],['Ctrl+Z / Ctrl+Shift+Z','تراجع / إعادة'],['F','لقطة مجمدة'],['H / V','قلب أفقي / رأسي'],['R','تدوير ٩٠°'],['M','علامة عند المؤشر'],[', / .','العلامة السابقة / التالية'],['← / →','إطار واحد (مع Shift: ثانية)'],['Home / End','البداية / النهاية'],['+ / −','تكبير / تصغير الخط الزمني'],['N','المغناطيس']];
function buildUI(){
 const host=$('.timeline-toolbar');if(!host||host.dataset.tools)return;host.dataset.tools='1';
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
window.FahadTools={afterTimeline,pointer,run,get tool(){return tool},get multi(){return multi}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
