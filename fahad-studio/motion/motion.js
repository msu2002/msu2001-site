/* Fahad Motion — MIT. Browser reel studio: Arabic captions, smart cuts, 14 looks. Everything stays on the device. */
(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const W=1080,H=1920;
const cv=$('#stage'),ctx=cv.getContext('2d');cv.width=W;cv.height=H;
const tl=$('#tl'),tx=tl.getContext('2d');
const v=document.createElement('video');v.playsInline=true;v.preload='auto';v.setAttribute('playsinline','');v.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;opacity:0';document.body.appendChild(v);

const S={url:null,name:'',dur:0,vw:0,vh:0,cues:[],cuts:[],sel:-1,style:'glass',font:'cairo',size:76,y:.74,digits:'ar',fit:'cover',emph:'#ffd34d',guides:true,
 cfg:{db:-38,min:.6,keep:.22},wave:null,peak:0,rms:0,hasAudio:false,exporting:false,busy:false,samples:null};
try{const o=JSON.parse(localStorage.getItem('fahad-motion')||'{}');for(const k of ['style','font','size','y','digits','fit','emph','guides'])if(o[k]!==undefined)S[k]=o[k];}catch{}
const save=()=>{try{localStorage.setItem('fahad-motion',JSON.stringify({style:S.style,font:S.font,size:S.size,y:S.y,digits:S.digits,fit:S.fit,emph:S.emph,guides:S.guides}));}catch{}};

/* ---------- helpers ---------- */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const AR='٠١٢٣٤٥٦٧٨٩';
const fmtD=s=>S.digits==='ar'?s.replace(/[0-9]/g,d=>AR[d]):S.digits==='lat'?s.replace(/[٠-٩]/g,d=>AR.indexOf(d)):s;
const mmss=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+String(s).padStart(2,'0');};
const dec=t=>{t=Math.max(0,t);return mmss(t)+'.'+Math.floor((t%1)*10);};
const say=(m)=>{$('#status').textContent=m||'';};
const busy=(m)=>{S.busy=!!m;$('#busy').hidden=!m;$('#busy-t').textContent=m||'';};
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
const back=t=>{t=clamp(t,0,1);const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

/* ---------- cues, cuts, time mapping ---------- */
const invalidate=c=>{c._w=null;};
function words(c){
 if(c._w)return c._w;
 const ws=c.t.split(/\s+/).filter(Boolean),tot=ws.reduce((n,w)=>n+[...w].length+1,0)||1;let a=c.s;const d=c.e-c.s;
 c._w=ws.map((w,i)=>{const s=a;a+=d*([...w].length+1)/tot;return{text:w,i,s,e:a};});
 return c._w;
}
function cueAt(t){for(let i=0;i<S.cues.length;i++){const c=S.cues[i];if(t>=c.s&&t<c.e)return i;}return -1;}
const cutAt=t=>S.cuts.find(k=>k.on&&t>=k.s-.005&&t<k.e-.02);
const cutTotal=()=>S.cuts.reduce((n,k)=>n+(k.on?k.e-k.s:0),0);
const editedDur=()=>Math.max(0,S.dur-cutTotal());
function ed(t){let r=t;for(const k of S.cuts){if(!k.on)continue;if(t>=k.e)r-=k.e-k.s;else if(t>k.s)r-=t-k.s;}return Math.max(0,r);}
function normalize(result,dur){
 const chunks=Array.isArray(result.chunks)&&result.chunks.length?result.chunks:[{text:result.text||'',timestamp:[0,dur]}];
 const out=[];
 chunks.forEach((ch,i)=>{
  const text=String(ch.text||'').replace(/<\|[^>]*\|>/g,'').replace(/\s+/g,' ').trim();if(!text)return;
  const ts=ch.timestamp||[],s=clamp(ts[0]??0,0,dur),e=clamp(ts[1]??chunks[i+1]?.timestamp?.[0]??dur,s,dur);if(e-s<.15)return;
  const ws=text.split(' '),groups=[];let g=[];
  for(const w of ws){if(g.length&&(g.length>=5||[...g.join(' ')+' '+w].length>30)){groups.push(g.join(' '));g=[];}g.push(w);}
  if(g.length)groups.push(g.join(' '));
  const tot=groups.reduce((n,x)=>n+[...x].length,0);let used=0;
  for(const x of groups){const a=s+(e-s)*used/tot;used+=[...x].length;const b=s+(e-s)*used/tot;if(b-a>=.15)out.push({s:+a.toFixed(2),e:+b.toFixed(2),t:x,em:[]});}
 });
 return out;
}

/* ---------- fonts ---------- */
const FONT_IDS=['cairo','tajawal','amiri','notokufiarabic','notonaskharabic','notosansarabic'];
const fontName=id=>'FM-'+id;
async function loadFonts(){
 const sel=$('#font');
 try{
  const cat=await fetch(new URL('../fonts/catalog.json',location.href)).then(r=>r.json());
  for(const f of cat.families){
   if(!FONT_IDS.includes(f.id))continue;
   const o=document.createElement('option');o.value=f.id;o.textContent=f.label||f.name;sel.appendChild(o);
   for(const face of f.faces){try{const ff=new FontFace(fontName(f.id),'url('+new URL('../fonts/'+encodeURI(face.file),location.href).href+')',{weight:face.weight});await ff.load();document.fonts.add(ff);}catch{}}
  }
 }catch{}
 if(!sel.options.length){const o=document.createElement('option');o.value='sys';o.textContent='خط النظام';sel.appendChild(o);}
 if(![...sel.options].some(o=>o.value===S.font))S.font=sel.options[0].value;
 sel.value=S.font;
}
const fam=(id)=>(id==='sys'?'':'"'+fontName(id)+'",')+'Tahoma,Arial,sans-serif';
const styleFam=st=>st.fam?fam(st.fam):fam(S.font);

/* ---------- text layout on canvas (RTL) ---------- */
function block(g,o={}){
 const size=o.size||S.size,weight=o.weight||800;
 ctx.font=weight+' '+size+'px '+styleFam(g.st);ctx.direction='rtl';ctx.textBaseline='middle';
 const sp=size*.3,maxW=o.maxW||W*.82,lh=size*(o.lh||1.5);
 const lines=[];let cur=[],cw=0;
 g.ws.forEach(w=>{
  const text=fmtD(w.text),m=ctx.measureText(text).width;
  if(cur.length&&cw+sp+m>maxW){lines.push({ws:cur,w:cw});cur=[];cw=0;}
  cur.push({...w,text,m});cw+=(cur.length>1?sp:0)+m;
 });
 if(cur.length)lines.push({ws:cur,w:cw});
 const h=lines.length*lh,cy=o.cy??S.y*H,y0=cy-h/2,cx=W/2;
 let maxLine=0;lines.forEach(l=>{maxLine=Math.max(maxLine,l.w);});
 lines.forEach((l,li)=>{
  let xr=cx+l.w/2;const yc=y0+lh*li+lh/2;l.y=yc;l.x=cx-l.w/2;
  l.ws.forEach(w=>{w.xr=xr;w.x=xr-w.m;w.y=yc;xr-=w.m+sp;});
 });
 return{lines,lh,size,weight,h,y0,cx,cy,maxLine,sp,box:{x:cx-maxLine/2,y:y0,w:maxLine,h}};
}
function state(w,t){return t<w.s?0:(t<w.e?1:2);}
function paint(b,t,fn){b.lines.forEach(l=>l.ws.forEach(w=>fn(w,state(w,t),l)));}
function wordText(c,w,fill,stroke,sw){
 ctx.textAlign='right';ctx.direction='rtl';
 if(stroke){ctx.lineJoin='round';ctx.lineWidth=sw||10;ctx.strokeStyle=stroke;ctx.strokeText(w.text,w.xr,w.y);}
 ctx.fillStyle=fill;ctx.fillText(w.text,w.xr,w.y);
}
const LIGHT=['ticket','scrap','deck','kinetic','receipt','collage'];
const emCol=(g,w,def)=>g.c.em&&g.c.em.includes(w.i)?(LIGHT.includes(g.st.id)?'#c2255c':S.emph):def;

/* ---------- 14 styles ---------- */
const PAL=['#ffd34d','#ff6b9d','#7ee0c3','#8fb8ff','#ffffff'];
const STYLES=[
 {id:'glass',name:'زجاج مضيء',prev:['#6a5cff','#2b2f6b'],draw(g){
   const b=block(g,{}),p=18;ctx.save();ctx.globalAlpha=ease(g.p);
   rr(ctx,b.box.x-p*2,b.box.y-p,b.box.w+p*4,b.box.h+p*2,44);ctx.fillStyle='rgba(255,255,255,.17)';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.42)';ctx.stroke();
   paint(b,g.t,(w,s)=>{ctx.save();if(s===1){ctx.shadowColor=S.emph;ctx.shadowBlur=34;}ctx.globalAlpha*=s===0?.62:1;wordText(g.c,w,emCol(g,w,'#fff'));ctx.restore();});ctx.restore();}},
 {id:'ticket',name:'تذاكر الحملة',prev:['#ffd34d','#ff6b9d'],draw(g){
   const b=block(g,{weight:900,lh:1.7});ctx.save();ctx.globalAlpha=ease(g.p);
   b.lines.forEach(l=>{const x=l.x-40,w=l.w+80,y=l.y-b.lh/2+8,h=b.lh-16;ctx.fillStyle='#fff3c4';rr(ctx,x,y,w,h,14);ctx.fill();ctx.fillStyle='#0d101b';[x,x+w].forEach(cx=>{ctx.beginPath();ctx.arc(cx,y+h/2,15,0,7);ctx.fill();});});
   paint(b,g.t,(w,s)=>{if(s===1){ctx.fillStyle='#ff4d8d';ctx.fillRect(w.x,w.y+b.size*.42,w.m,9);}wordText(g.c,w,emCol(g,w,'#1b1b1b'));});ctx.restore();}},
 {id:'magazine',name:'حوار المجلة',fam:'amiri',prev:['#111','#e63946'],draw(g){
   const b=block(g,{weight:700,size:S.size*1.05,lh:1.55,maxW:W*.84}),p=34;ctx.save();ctx.globalAlpha=ease(g.p);
   ctx.fillStyle='rgba(8,8,10,.82)';ctx.fillRect(0,b.box.y-p,W,b.box.h+p*2);ctx.fillStyle='#e63946';ctx.fillRect(0,b.box.y-p,W,8);
   ctx.font='700 30px '+styleFam(g.st);ctx.textAlign='right';ctx.fillStyle='#e63946';ctx.fillText('حوار',W-70,b.box.y-p-24);
   ctx.font=b.weight+' '+b.size+'px '+styleFam(g.st);
   paint(b,g.t,(w,s)=>wordText(g.c,w,emCol(g,w,s===1?S.emph:s===0?'#b9b9c4':'#fff')));ctx.restore();}},
 {id:'scrap',name:'سكراب بوك',fam:'amiri',prev:['#f2e8cf','#bc6c25'],draw(g){
   const b=block(g,{weight:700,lh:1.75});ctx.save();ctx.globalAlpha=ease(g.p);
   b.lines.forEach((l,i)=>{ctx.save();ctx.translate(W/2,l.y);ctx.rotate((i%2?1:-1)*.022);ctx.translate(-W/2,-l.y);
    rr(ctx,l.x-36,l.y-b.lh/2+10,l.w+72,b.lh-20,8);ctx.fillStyle='#f6efe0';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(233,217,138,.85)';ctx.fillRect(W/2-46,l.y-b.lh/2-2,92,26);
    paint({lines:[l]},g.t,(w,s)=>{if(s===1){ctx.fillStyle='rgba(255,224,102,.9)';ctx.fillRect(w.x-6,w.y-b.size*.5,w.m+12,b.size);}wordText(g.c,w,emCol(g,w,'#2a2118'));});ctx.restore();});ctx.restore();}},
 {id:'split',name:'لوحة منقسمة',prev:['#1f2a44','#5de2ff'],split:true,draw(g){
   const b=block(g,{cy:H*.81,weight:800,maxW:W*.84});ctx.save();ctx.globalAlpha=ease(g.p);
   paint(b,g.t,(w,s)=>wordText(g.c,w,emCol(g,w,s===1?'#5de2ff':s===0?'#8e9ab8':'#fff')));ctx.restore();}},
 {id:'deck',name:'بطاقات الأقسام',prev:['#4a3df0','#fff'],draw(g){
   const b=block(g,{weight:800,lh:1.55}),p=34,top=b.box.y-p-70;ctx.save();ctx.translate(0,(1-ease(g.p))*50);ctx.globalAlpha=ease(g.p);
   rr(ctx,b.box.x-60,top,b.box.w+120,b.box.h+p*2+70,36);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=30;ctx.fill();ctx.shadowBlur=0;
   ctx.save();rr(ctx,b.box.x-60,top,b.box.w+120,70,36);ctx.clip();ctx.fillStyle='#4a3df0';ctx.fillRect(b.box.x-60,top,b.box.w+120,70);ctx.restore();
   ctx.font='700 30px '+styleFam(g.st);ctx.textAlign='right';ctx.fillStyle='#fff';ctx.fillText(fmtD('المقطع '+(g.i+1)+' / '+S.cues.length),b.box.x+b.box.w+36,top+36);
   ctx.font=b.weight+' '+b.size+'px '+styleFam(g.st);
   paint(b,g.t,(w,s)=>{if(s===1){ctx.fillStyle='#e6e1ff';rr(ctx,w.x-8,w.y-b.size*.55,w.m+16,b.size*1.1,14);ctx.fill();}wordText(g.c,w,emCol(g,w,'#16162b'));});ctx.restore();}},
 {id:'kinetic',name:'ورق متحرك',prev:['#efe6d2','#ffd34d'],draw(g){
   const b=block(g,{weight:900,lh:1.65});ctx.save();
   paint(b,g.t,(w,s,l)=>{const q=(g.t-(w.s-.04))/.18;if(q<=0)return;const sc=back(q);ctx.save();ctx.translate(w.x+w.m/2,w.y);ctx.scale(sc,sc);ctx.translate(-(w.x+w.m/2),-w.y);
    rr(ctx,w.x-14,w.y-b.size*.62,w.m+28,b.size*1.24,18);ctx.fillStyle=s===1?'#ffd34d':'#efe6d2';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;wordText(g.c,w,emCol(g,w,'#1b1b1b'));ctx.restore();});ctx.restore();}},
 {id:'receipt',name:'إيصالات الخط',fam:'notonaskharabic',prev:['#fff','#9aa0b4'],draw(g){
   const b=block(g,{weight:700,lh:1.6,size:S.size*.95}),p=44,top=b.box.y-p-40,hh=b.box.h+p*2+40,x=b.box.x-64,w=b.box.w+128;ctx.save();ctx.globalAlpha=ease(g.p);
   ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+w,top);ctx.lineTo(x+w,top+hh);for(let i=0;i<=w/28;i++){ctx.lineTo(x+w-i*28-14,top+hh+(i%2?0:-14));}ctx.lineTo(x,top+hh);ctx.closePath();ctx.fillStyle='#fffdf7';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=24;ctx.fill();ctx.shadowBlur=0;
   ctx.setLineDash([12,10]);ctx.strokeStyle='#b7b2a2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+30,top+46);ctx.lineTo(x+w-30,top+46);ctx.stroke();ctx.setLineDash([]);
   ctx.font='600 28px Tahoma,Arial,sans-serif';ctx.textAlign='left';ctx.fillStyle='#8a8576';ctx.direction='ltr';ctx.fillText('REEL  '+mmss(g.c.s),x+34,top+24);ctx.direction='rtl';
   ctx.font=b.weight+' '+b.size+'px '+styleFam(g.st);
   paint(b,g.t,(w,s)=>{if(s===1){ctx.fillStyle=S.emph;ctx.fillRect(w.x,w.y+b.size*.46,w.m,10);}wordText(g.c,w,emCol(g,w,'#23201a'));});ctx.restore();}},
 {id:'collage',name:'كولاج ورقي',prev:['#ff6b9d','#7ee0c3'],draw(g){
   const b=block(g,{weight:900,lh:1.75});ctx.save();ctx.globalAlpha=ease(g.p);
   paint(b,g.t,(w,s)=>{const rot=(((w.i*37)%7)-3)*.012,sc=s===1?1.1:1;ctx.save();ctx.translate(w.x+w.m/2,w.y);ctx.rotate(rot);ctx.scale(sc,sc);ctx.translate(-(w.x+w.m/2),-w.y);
    rr(ctx,w.x-12,w.y-b.size*.6,w.m+24,b.size*1.2,8);ctx.fillStyle=PAL[w.i%PAL.length];ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;wordText(g.c,w,emCol(g,w,'#16162b'));ctx.restore();});ctx.restore();}},
 {id:'judge',name:'لوحة الحكم',prev:['#101a38','#e4b84d'],draw(g){
   const b=block(g,{weight:900}),p=40;ctx.save();ctx.globalAlpha=ease(g.p);
   rr(ctx,b.box.x-60,b.box.y-p-36,b.box.w+120,b.box.h+p*2+36,30);ctx.fillStyle='#0f1a3a';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#e4b84d';ctx.stroke();
   ctx.font='800 26px '+styleFam(g.st);ctx.textAlign='center';ctx.fillStyle='#e4b84d';ctx.fillText('الحكم',W/2,b.box.y-p-6);ctx.font=b.weight+' '+b.size+'px '+styleFam(g.st);
   paint(b,g.t,(w,s)=>{if(s===1){ctx.fillStyle='#e4b84d';rr(ctx,w.x-10,w.y-b.size*.56,w.m+20,b.size*1.12,12);ctx.fill();}wordText(g.c,w,emCol(g,w,s===1?'#0f1a3a':s===2?'#e4b84d':'#fff'));});ctx.restore();}},
 {id:'steps',name:'تحرير متدرج',prev:['#000','#8d7aff'],draw(g){
   const b=block(g,{weight:900,lh:1.5});ctx.save();
   paint(b,g.t,(w,s)=>{if(s===0)return;const q=(g.t-w.s)/.12;ctx.globalAlpha=clamp(q,0,1);wordText(g.c,w,emCol(g,w,'#fff'),'#000',14);});
   ctx.globalAlpha=1;const pr=clamp((g.t-g.c.s)/(g.c.e-g.c.s),0,1);ctx.fillStyle='rgba(255,255,255,.25)';rr(ctx,b.box.x,b.box.y+b.box.h+10,b.box.w,10,5);ctx.fill();ctx.fillStyle='#8d7aff';rr(ctx,b.box.x+b.box.w*(1-pr),b.box.y+b.box.h+10,b.box.w*pr,10,5);ctx.fill();ctx.restore();}},
 {id:'grid',name:'انزلاق الشبكة',prev:['#0b2530','#5de2ff'],draw(g){
   const b=block(g,{weight:800}),p=40,y=b.box.y-p,h=b.box.h+p*2,k=ease(g.p);ctx.save();
   const gr=ctx.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'rgba(4,16,24,.0)');gr.addColorStop(.25,'rgba(4,16,24,.82)');gr.addColorStop(1,'rgba(4,16,24,.9)');ctx.fillStyle=gr;ctx.fillRect(0,y-40,W,h+40);
   ctx.strokeStyle='rgba(93,226,255,.12)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=W;x+=60){ctx.moveTo(x,y);ctx.lineTo(x,y+h);}for(let yy=y;yy<=y+h;yy+=60){ctx.moveTo(0,yy);ctx.lineTo(W,yy);}ctx.stroke();
   ctx.translate((1-k)*240,0);ctx.globalAlpha=k;paint(b,g.t,(w,s)=>{if(s===1){ctx.fillStyle='#5de2ff';ctx.fillRect(w.x,w.y+b.size*.48,w.m,8);}wordText(g.c,w,emCol(g,w,'#fff'));});ctx.restore();}},
 {id:'one',name:'لقطة واحدة',prev:['#222','#fff'],draw(g){
   const b=block(g,{weight:800,size:S.size*1.04});ctx.save();ctx.globalAlpha=ease(g.p);ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=18;ctx.shadowOffsetY=3;
   paint(b,g.t,(w,s)=>{ctx.globalAlpha=ease(g.p)*(s===0?.8:1);wordText(g.c,w,emCol(g,w,'#fff'));});ctx.restore();}},
 {id:'cartoon',name:'كرتون',prev:['#4dd2ff','#ff5c8a'],draw(g){
   const b=block(g,{weight:900,size:S.size*1.06,lh:1.55});const C=['#ffe14d','#ff5c8a','#4dd2ff','#7dff8a'];ctx.save();
   paint(b,g.t,(w,s)=>{const bounce=s===1?-14*Math.sin(clamp((g.t-w.s)/(w.e-w.s),0,1)*Math.PI):0;const o={...w,y:w.y+bounce};ctx.globalAlpha=clamp((g.t-(g.c.s-.02))/.1,0,1);wordText(g.c,o,emCol(g,w,C[w.i%C.length]),'#111',16);});ctx.restore();}}
];
const styleOf=id=>STYLES.find(s=>s.id===id)||STYLES[0];

/* ---------- rendering ---------- */
let lastCueIdx=-2;
function drawBackdrop(){
 const st=styleOf(S.style);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
 if(!S.vw)return;
 const rh=st.split?Math.round(H*.6):H;
 const cover=Math.max(W/S.vw,rh/S.vh),contain=Math.min(W/S.vw,rh/S.vh);
 if(S.fit==='contain'&&!st.split){
  ctx.save();try{ctx.filter='blur(46px) brightness(.55)';}catch{}
  const dw=S.vw*cover,dh=S.vh*cover;ctx.drawImage(v,(W-dw)/2,(rh-dh)/2,dw,dh);ctx.restore();
  const w2=S.vw*contain,h2=S.vh*contain;ctx.drawImage(v,(W-w2)/2,(rh-h2)/2,w2,h2);
 }else{
  const dw=S.vw*cover,dh=S.vh*cover;ctx.save();ctx.beginPath();ctx.rect(0,0,W,rh);ctx.clip();ctx.drawImage(v,(W-dw)/2,(rh-dh)/2,dw,dh);ctx.restore();
 }
 if(st.split){ctx.fillStyle='#1f2a44';ctx.fillRect(0,rh,W,H-rh);ctx.fillStyle='#5de2ff';ctx.fillRect(0,rh,W,8);}
}
function drawCaption(t){
 const i=cueAt(t);if(i<0)return;const c=S.cues[i],st=styleOf(S.style);
 ctx.save();ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.setLineDash([]);
 st.draw({c,i,t,ws:words(c),p:(t-c.s)/.2,st});ctx.restore();
}
function drawGuides(){
 ctx.save();ctx.fillStyle='rgba(255,70,90,.16)';ctx.fillRect(0,0,W,250);ctx.fillRect(0,H-380,W,380);ctx.fillRect(W-150,250,150,H-630);
 ctx.strokeStyle='rgba(255,255,255,.35)';ctx.setLineDash([14,12]);ctx.lineWidth=3;ctx.strokeRect(60,250,W-210,H-630);
 ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='600 26px Tahoma,Arial,sans-serif';ctx.textAlign='center';ctx.direction='rtl';ctx.fillText('واجهة المنصة',W/2,H-190);ctx.restore();
}
function frame(){
 const t=v.currentTime||0;
 if(!S.vw){ctx.fillStyle='#0f1220';ctx.fillRect(0,0,W,H);return;}
 drawBackdrop();drawCaption(t);if(S.guides&&!S.exporting)drawGuides();
}
let lastUI=0;
function loop(ts){
 if(S.vw&&!v.paused){
  const k=cutAt(v.currentTime);if(k)v.currentTime=Math.min(k.e,S.dur);
  if(v.currentTime>=S.dur-.04){v.pause();setPlayIcon();}
 }
 frame();
 if(ts-lastUI>90){lastUI=ts;ui();}
 requestAnimationFrame(loop);
}
function ui(){
 const t=v.currentTime||0;$('#time').textContent=mmss(ed(t))+' / '+mmss(editedDur());
 const i=cueAt(t);if(i!==lastCueIdx){lastCueIdx=i;$$('#cue-list .cue').forEach((el,k)=>el.classList.toggle('on',k===i));}
 drawTL();
}
function setPlayIcon(){$('#play-ic').setAttribute('d',v.paused?'M8 4l13 8-13 8z':'M6 4h4v16H6z M14 4h4v16h-4z');$('#play').setAttribute('aria-label',v.paused?'تشغيل':'إيقاف مؤقت');}

/* ---------- timeline ---------- */
function drawTL(){
 const dpr=window.devicePixelRatio||1,w=tl.clientWidth,h=tl.clientHeight;if(!w)return;
 if(tl.width!==Math.round(w*dpr)){tl.width=Math.round(w*dpr);tl.height=Math.round(h*dpr);}
 tx.setTransform(dpr,0,0,dpr,0,0);tx.clearRect(0,0,w,h);tx.fillStyle='#10131f';tx.fillRect(0,0,w,h);
 if(!S.vw)return;
 const X=t=>t/S.dur*w;
 if(S.wave){tx.fillStyle='#5a5f86';const n=S.wave.length,bw=w/n;for(let i=0;i<n;i++){const a=Math.max(1,S.wave[i]*(h*.52));tx.fillRect(i*bw,h*.46-a/2,Math.max(1,bw-.5),a);}}
 S.cuts.forEach(k=>{tx.fillStyle=k.on?'rgba(255,107,125,.35)':'rgba(255,255,255,.06)';tx.fillRect(X(k.s),0,Math.max(2,X(k.e)-X(k.s)),h*.7);});
 S.cues.forEach((c,i)=>{tx.fillStyle=i===S.sel?'#ffd34d':'#8d7aff';tx.fillRect(X(c.s),h*.78,Math.max(2,X(c.e)-X(c.s)-1),h*.16);});
 const px=X(v.currentTime||0);tx.fillStyle='#fff';tx.fillRect(px-1,0,2,h);
}
function seekFromEvent(e){
 if(!S.vw)return;const r=tl.getBoundingClientRect();let t=clamp((e.clientX-r.left)/r.width,0,1)*S.dur;
 const k=cutAt(t);if(k)t=k.e;v.currentTime=Math.min(t,S.dur-.01);
}
let dragTL=false;
tl.addEventListener('pointerdown',e=>{dragTL=true;tl.setPointerCapture(e.pointerId);seekFromEvent(e);});
tl.addEventListener('pointermove',e=>{if(dragTL)seekFromEvent(e);});
tl.addEventListener('pointerup',()=>{dragTL=false;});

/* ---------- loading a video ---------- */
const once=(el,ev)=>new Promise((res,rej)=>{const ok=()=>{cl();res();},bad=()=>{cl();rej(Error('media'));},cl=()=>{el.removeEventListener(ev,ok);el.removeEventListener('error',bad);};el.addEventListener(ev,ok);el.addEventListener('error',bad);});
async function decodeAudio(f){
 const Off=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Off||f.size>700*1024*1024)return null;
 try{
  const buf=await new Off(1,16000,16000).decodeAudioData(await f.arrayBuffer());
  const mono=new Float32Array(buf.length);
  for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<mono.length;i++)mono[i]+=d[i]/buf.numberOfChannels;}
  return mono;
 }catch{return null;}
}
function analyze(){
 const s=S.samples;S.wave=null;S.peak=0;S.rms=0;S.hasAudio=!!s;if(!s)return;
 let e=0,pk=0;for(let i=0;i<s.length;i++){const a=Math.abs(s[i]);if(a>pk)pk=a;e+=s[i]*s[i];}
 S.peak=pk;S.rms=Math.sqrt(e/Math.max(1,s.length));
 const bins=clamp(Math.floor(S.dur*40),60,6000),per=s.length/bins,w=new Float32Array(bins);let mx=1e-6;
 for(let b=0;b<bins;b++){let m=0;const a=Math.floor(b*per),z=Math.floor((b+1)*per);for(let i=a;i<z;i+=4){const x=Math.abs(s[i]);if(x>m)m=x;}w[b]=m;if(m>mx)mx=m;}
 for(let b=0;b<bins;b++)w[b]=Math.pow(w[b]/mx,.6);
 S.wave=w;
}
async function loadFile(f){
 if(!f||!f.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)){say('اختر ملف فيديو (MP4 أو MOV أو WebM).');return;}
 stopPlay();busy('جارٍ قراءة الفيديو…');
 try{
  if(S.url)URL.revokeObjectURL(S.url);
  S.url=URL.createObjectURL(f);S.name=f.name.replace(/\.[^.]+$/,'');v.src=S.url;
  await once(v,'loadedmetadata');S.vw=v.videoWidth;S.vh=v.videoHeight;S.dur=v.duration;
  if(!S.vw||!isFinite(S.dur))throw Error('media');
  v.currentTime=Math.min(.05,S.dur/2);await once(v,'seeked').catch(()=>{});
  busy('تحليل الصوت…');
  S.samples=await decodeAudio(f);analyze();
  S.cues=[];S.cuts=[];S.sel=-1;
  $('#empty').hidden=true;$$('#play,#btn-auto,#btn-detect,#btn-export,#btn-srt,#cue-add,#cue-clear,#btn-pack').forEach(b=>b.disabled=false);
  renderCues();renderCuts();renderChecks();setPlayIcon();
  say(S.samples?'الفيديو جاهز. اضغط «تفريغ تلقائي بالعربية».':'الفيديو جاهز، لكن تعذّرت قراءة صوته: التفريغ والقص الذكي غير متاحين.');
 }catch{say('تعذّر فتح هذا الفيديو. جرّب MP4 (H.264) أو WebM.');$('#empty').hidden=!!S.vw;}
 busy(null);
}
$('#file').addEventListener('change',e=>{loadFile(e.target.files[0]);e.target.value='';});
['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop')loadFile(e.dataTransfer.files[0]);}));

/* ---------- playback ---------- */
let AC=null,node=null,spk=null;
function ensureAudio(){
 const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
 if(!AC){AC=new A();node=AC.createMediaElementSource(v);spk=AC.createGain();node.connect(spk);spk.connect(AC.destination);}
 if(AC.state==='suspended')AC.resume();return AC;
}
function stopPlay(){v.pause();setPlayIcon();}
async function togglePlay(){
 if(!S.vw||S.exporting)return;
 if(!v.paused){stopPlay();return;}
 try{ensureAudio();}catch{}
 if(v.currentTime>=S.dur-.1)v.currentTime=0;
 try{await v.play();}catch{say('تعذّر التشغيل.');}setPlayIcon();
}
$('#play').addEventListener('click',togglePlay);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)){e.preventDefault();togglePlay();}});
v.addEventListener('ended',setPlayIcon);

/* ---------- Arabic auto captions (same local engine as Fahad Studio) ---------- */
let asrWorker=null,asrId=0;
function runASR(){
 if(!S.samples){say('لا يوجد صوت قابل للتفريغ في هذا الفيديو.');return Promise.resolve();}
 if(S.dur>900){say('التفريغ المحلي يدعم فيديو حتى ١٥ دقيقة. اقتطع مقطعًا أقصر.');return Promise.resolve();}
 if(S.rms<.0001){say('لا يوجد كلام مسموع في الفيديو.');return Promise.resolve();}
 if(!window.Worker||!window.WebAssembly){say('هذا المتصفح لا يدعم محرك الكتابة المحلي.');return Promise.resolve();}
 stopPlay();busy('تهيئة محرك الكتابة العربي…');const t0=Date.now();
 return new Promise(res=>{
  const id=++asrId,copy=S.samples.slice();
  const done=(ok,msg)=>{busy(null);say(msg);res(ok);};
  try{
   if(!asrWorker)asrWorker=new Worker(new URL('../asr-worker.js',location.href),{type:'module'});
   asrWorker.onmessage=ev=>{
    const d=ev.data;if(d.id!==id)return;
    if(d.type==='loading')busy('تحميل نموذج الكتابة'+(d.progress!=null?' '+Math.round(d.progress)+'%':'')+' (أول مرة فقط)');
    else if(d.type==='transcribing')busy('جارٍ تفريغ الكلام… قد يستغرق دقائق للفيديوهات الطويلة');
    else if(d.type==='complete'){
     S.cues=normalize(d.result,S.dur);S.sel=-1;renderCues();renderChecks();
     done(true,S.cues.length?'تم التفريغ: '+fmtD(String(S.cues.length))+' سطرًا خلال '+Math.round((Date.now()-t0)/1000)+' ث. راجع النص ثم اختر نمطًا.':'لم يُكتشف كلام عربي واضح.');
    }else if(d.type==='error'){asrWorker.terminate();asrWorker=null;done(false,'تعذّر تشغيل نموذج الكتابة. أعد المحاولة أو افتح الصفحة من موقعك على HTTPS.');}
   };
   asrWorker.onerror=()=>{asrWorker=null;done(false,'تعذّر بدء محرك الكتابة المحلي.');};
   asrWorker.postMessage({id,audio:copy.buffer,lang:'arabic'},[copy.buffer]);
  }catch{done(false,'تعذّر بدء محرك الكتابة.');}
 });
}
$('#btn-auto').addEventListener('click',()=>{if(S.cues.length&&!confirm_replace())return;runASR();});
let armed=false;function confirm_replace(){if(armed){armed=false;return true;}armed=true;say('يوجد نص حالي. اضغط الزر مرة أخرى لاستبداله بتفريغ جديد.');setTimeout(()=>{armed=false;},4000);return false;}

/* ---------- smart cuts ---------- */
function detectSilence(){
 const s=S.samples;if(!s){say('لا يوجد صوت لتحليله.');return;}
 const win=320,thr=Math.pow(10,S.cfg.db/20),runs=[];let start=-1;
 for(let a=0;a+win<=s.length;a+=win){let e=0;for(let i=a;i<a+win;i++)e+=s[i]*s[i];const q=Math.sqrt(e/win)<thr;
  if(q&&start<0)start=a;if(!q&&start>=0){runs.push([start,a]);start=-1;}}
 if(start>=0)runs.push([start,s.length]);
 const cuts=[];
 for(const [a,b] of runs){const rs=a/16000,re=b/16000;if(re-rs<S.cfg.min)continue;const cs=rs+S.cfg.keep/2,ce=re-S.cfg.keep/2;if(ce-cs>=.15)cuts.push({s:+cs.toFixed(2),e:+ce.toFixed(2),on:true});}
 S.cuts=cuts;renderCuts();renderChecks();
}
function renderCuts(){
 const ul=$('#cut-list');ul.innerHTML='';
 S.cuts.forEach((k,i)=>{
  const li=document.createElement('li'),cb=document.createElement('input');cb.type='checkbox';cb.checked=k.on;cb.setAttribute('aria-label','تفعيل القص '+(i+1));
  cb.onchange=()=>{k.on=cb.checked;renderCuts();renderChecks();};
  const sp=document.createElement('span');sp.textContent=dec(k.s)+' ← '+dec(k.e);
  const b=document.createElement('b');b.textContent='-'+(k.e-k.s).toFixed(1)+' ث';
  const go=document.createElement('button');go.className='ghost';go.textContent='اذهب';go.onclick=()=>{v.currentTime=Math.max(0,k.s-.6);};
  li.append(cb,sp,b,go);ul.appendChild(li);
 });
 const on=S.cuts.filter(k=>k.on);
 $('#cut-sum').textContent=S.cuts.length?('قصّ '+fmtD(String(on.length))+' فترة صمت، توفّر '+fmtD(cutTotal().toFixed(1))+' ثانية. المدة بعد القص: '+mmss(editedDur())):(S.vw?'اضغط «اكتشاف الصمت» لتظهر الفترات.':'');
}
['db','min','keep'].forEach(k=>{
 const el=$('#sil-'+k),o=$('#sil-'+k+'-o');
 const upd=()=>{const n=+el.value;if(k==='db'){S.cfg.db=n;o.textContent=n+' dB';}if(k==='min'){S.cfg.min=n/10;o.textContent=fmtD((n/10).toFixed(1))+' ث';}if(k==='keep'){S.cfg.keep=n/100;o.textContent=fmtD((n/100).toFixed(2))+' ث';}};
 el.addEventListener('input',upd);upd();
});
$('#btn-detect').addEventListener('click',detectSilence);

/* ---------- caption list ---------- */
function renderCues(){
 const ol=$('#cue-list');ol.innerHTML='';$('#cue-n').textContent=fmtD(String(S.cues.length))+' سطر';
 S.cues.forEach((c,i)=>{
  const li=document.createElement('li');li.className='cue';
  const h=document.createElement('div');h.className='cue-h';
  const n=document.createElement('span');n.textContent=fmtD(String(i+1));
  const a=numIn(c.s,v=>{c.s=clamp(v,0,c.e-.15);invalidate(c);}),b=numIn(c.e,v=>{c.e=clamp(v,c.s+.15,S.dur);invalidate(c);});
  const go=document.createElement('button');go.textContent='▶';go.title='اذهب للسطر';go.onclick=()=>{S.sel=i;v.currentTime=c.s+.01;showWords();};
  const del=document.createElement('button');del.textContent='✕';del.title='حذف السطر';del.onclick=()=>{S.cues.splice(i,1);S.sel=-1;renderCues();renderChecks();};
  h.append(n,a,b,go,del);
  const ta=document.createElement('textarea');ta.value=c.t;ta.setAttribute('aria-label','نص السطر '+(i+1));
  ta.oninput=()=>{c.t=ta.value;c.em=[];invalidate(c);};ta.onfocus=()=>{S.sel=i;showWords();};
  li.append(h,ta);ol.appendChild(li);
 });
 showWords();
}
function numIn(val,set){const i=document.createElement('input');i.type='number';i.step='0.1';i.min='0';i.value=val.toFixed(1);i.style.cssText='width:64px;padding:2px 4px;border-radius:6px';i.setAttribute('aria-label','وقت بالثواني');i.onchange=()=>{set(+i.value);renderCues();};return i;}
function showWords(){
 const c=S.cues[S.sel],box=$('#word-ed'),chips=$('#word-chips');chips.innerHTML='';box.hidden=!c;if(!c)return;
 words(c).forEach(w=>{const b=document.createElement('button');b.className='chip';b.textContent=fmtD(w.text);b.setAttribute('aria-pressed',c.em&&c.em.includes(w.i));
  b.onclick=()=>{c.em=c.em||[];const k=c.em.indexOf(w.i);if(k<0)c.em.push(w.i);else c.em.splice(k,1);b.setAttribute('aria-pressed',k<0);};chips.appendChild(b);});
}
$('#cue-add').addEventListener('click',()=>{
 const t=v.currentTime||0,c={s:+t.toFixed(2),e:+Math.min(S.dur,t+2).toFixed(2),t:'نص جديد',em:[]};
 S.cues.push(c);S.cues.sort((a,b)=>a.s-b.s);S.sel=S.cues.indexOf(c);renderCues();renderChecks();
});
$('#cue-clear').addEventListener('click',()=>{if(S.cues.length&&!confirm_clear())return;S.cues=[];S.sel=-1;renderCues();renderChecks();});
let armC=false;function confirm_clear(){if(armC){armC=false;return true;}armC=true;say('اضغط «مسح الكل» مرة أخرى لتأكيد حذف كل الأسطر.');setTimeout(()=>{armC=false;},4000);return false;}

/* ---------- styles UI ---------- */
function thumbs(){
 const grid=$('#style-grid');grid.innerHTML='';
 const keep={style:S.style,vw:S.vw},sample={s:0,e:3,t:'هذا نمط تجريبي رائع',em:[]};
 STYLES.forEach(st=>{
  S.style=st.id;S.vw=0;
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,st.prev[0]);g.addColorStop(1,st.prev[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(st.split){ctx.fillStyle='#1f2a44';ctx.fillRect(0,Math.round(H*.6),W,H);ctx.fillStyle='#5de2ff';ctx.fillRect(0,Math.round(H*.6),W,8);}
  ctx.save();st.draw({c:sample,i:0,t:1.2,ws:words({...sample,_w:null}),p:1,st});ctx.restore();
  const b=document.createElement('button'),c=document.createElement('canvas');c.width=360;c.height=280;
  c.getContext('2d').drawImage(cv,90,H*.74-350,900,700,0,0,360,280);
  const sp=document.createElement('span');sp.textContent=st.name;
  b.className='st';b.dataset.id=st.id;b.setAttribute('role','option');b.setAttribute('aria-selected',st.id===keep.style);
  b.append(c,sp);b.onclick=()=>{S.style=st.id;save();markStyle();};grid.appendChild(b);
 });
 S.style=keep.style;S.vw=keep.vw;
}
function markStyle(){$$('.st').forEach(b=>b.setAttribute('aria-selected',b.dataset.id===S.style));}
$$('.tab').forEach(t=>t.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.toggle('on',x===t));$$('.tabpane').forEach(p=>p.classList.toggle('on',p.id==='tab-'+t.dataset.tab));if(t.dataset.tab==='check')renderChecks();}));
$('#font').addEventListener('change',e=>{S.font=e.target.value;save();thumbs();markStyle();});
$('#size').addEventListener('input',e=>{S.size=+e.target.value;$('#size-o').textContent=fmtD(String(S.size));save();});
$('#ypos').addEventListener('input',e=>{S.y=+e.target.value/100;$('#ypos-o').textContent=fmtD(e.target.value+'%');save();renderChecks();});
$('#digits').addEventListener('change',e=>{S.digits=e.target.value;save();$('#ypos-o').textContent=fmtD(Math.round(S.y*100)+'%');$('#size-o').textContent=fmtD(String(S.size));renderCuts();renderCues();});
$('#fit').addEventListener('change',e=>{S.fit=e.target.value;save();});
$('#emph').addEventListener('input',e=>{S.emph=e.target.value;save();});
$('#guides').addEventListener('change',e=>{S.guides=e.target.checked;save();});

/* ---------- delivery checks ---------- */
function checks(){
 const L=[],add=(lv,t,d)=>L.push({lv,t,d});
 if(!S.vw){add('warn','لا يوجد فيديو بعد','افتح فيديو ليبدأ الفحص.');return L;}
 add('ok','المقاس ٩:١٦','لوحة التصدير ١٠٨٠×١٩٢٠ بكسل.');
 const d=editedDur();
 add(d<=90?'ok':d<=180?'warn':'bad','المدة بعد القص: '+mmss(d),d<=90?'مناسبة للريلز والشورتس.':d<=180?'أطول من ٩٠ ثانية: يقلّ الاحتفاظ بالمشاهد.':'تتجاوز حدّ ٣ دقائق لريلز وشورتس.');
 const sh=Math.min(S.vw,S.vh);
 add(sh>=720?'ok':'warn','جودة المصدر '+S.vw+'×'+S.vh,sh>=720?'كافية لتصدير واضح.':'أقل من ٧٢٠ بكسل: قد تبدو الصورة ناعمة.');
 if(!S.hasAudio)add('warn','تعذّر قياس الصوت','لم تُقرأ مسار الصوت في هذا الملف.');
 else{
  const db=20*Math.log10(Math.max(S.rms,1e-6));
  add(db>=-30&&db<=-10?'ok':'warn','مستوى الصوت '+Math.round(db)+' dB',db<-30?'منخفض: ارفع الصوت قبل التصدير.':db>-10?'مرتفع جدًا.':'ضمن المدى المناسب.');
  add(S.peak<.99?'ok':'warn','ذروة الصوت',S.peak<.99?'لا يوجد تقطيع.':'ذروة قريبة من الحد الأقصى: قد يوجد تشويه.');
 }
 add(S.cues.length?'ok':'warn','الترجمة',S.cues.length?fmtD(String(S.cues.length))+' سطرًا.':'لا توجد ترجمة. استخدم التفريغ التلقائي.');
 const st=styleOf(S.style),cy=st.split?H*.81:S.y*H,half=S.size*1.5;
 add(cy+half<=H-380?'ok':'warn','موضع الترجمة',cy+half<=H-380?'داخل المنطقة الآمنة.':'قريبة من واجهة المنصة السفلية: ارفعها قليلًا.');
 const short=S.cues.filter(c=>c.e-c.s<.5).length;if(short)add('warn','أسطر قصيرة جدًا',fmtD(String(short))+' سطرًا أقل من نصف ثانية.');
 if(S.cuts.length)add('ok','القص الذكي',fmtD(String(S.cuts.filter(k=>k.on).length))+' فترة مقصوصة.');
 return L;
}
function renderChecks(){
 const ul=$('#check-list');ul.innerHTML='';
 checks().forEach(x=>{const li=document.createElement('li');li.className=x.lv;const dot=document.createElement('i');dot.className='dot';const dv=document.createElement('div');const b=document.createElement('b');b.textContent=x.t;const s=document.createElement('small');s.textContent=x.d;dv.append(b,s);li.append(dot,dv);ul.appendChild(li);});
}

/* ---------- SRT + publish pack ---------- */
function stamp(t){const ms=Math.round(Math.max(0,t)*1000),p=(n,l=2)=>String(n).padStart(l,'0');return p(Math.floor(ms/3600000))+':'+p(Math.floor(ms/60000)%60)+':'+p(Math.floor(ms/1000)%60)+','+p(ms%1000,3);}
function srt(){
 let n=0;return S.cues.map(c=>{const a=ed(c.s),b=ed(c.e);if(b-a<.1)return '';n++;return n+'\n'+stamp(a)+' --> '+stamp(b)+'\n'+c.t+'\n';}).filter(Boolean).join('\n');
}
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
$('#btn-srt').addEventListener('click',()=>{if(!S.cues.length){say('لا توجد ترجمة لتنزيلها.');return;}download((S.name||'reel')+'.srt',new Blob(['﻿'+srt()],{type:'text/plain;charset=utf-8'}));});
function pack(){
 const title=($('#pk-title').value.trim()||S.cues[0]?.t||'ريل جديد'),tags=$('#pk-tags').value.trim(),cta=$('#pk-cta').value.trim();
 const pts=S.cues.filter(c=>c.t.length>12).slice(0,3).map(c=>'• '+c.t).join('\n');
 const five=tags.split(/\s+/).filter(Boolean).slice(0,5).join(' ');
 return '# حزمة النشر — '+title+'\n\n## إنستجرام ريلز\n'+title+'\n\n'+(pts?pts+'\n\n':'')+cta+'\n\n'+tags+'\n\n## تيك توك\n'+title+' '+five+'\n\n## يوتيوب شورتس\nالعنوان: '+title+' #Shorts\n\nالوصف:\n'+(pts?pts+'\n':'')+cta+'\n'+tags+' #Shorts\n\n---\nراجع النصوص قبل النشر وانشرها بنفسك. أُنشئت بواسطة فهد موشن.\n';
}
$('#btn-pack').addEventListener('click',()=>{const t=pack();$('#pk-out').value=t;$('#pk-copy').disabled=false;$('#pk-save').disabled=false;if(!$('#pk-title').value&&S.cues[0])$('#pk-title').placeholder=S.cues[0].t;});
$('#pk-copy').addEventListener('click',async()=>{const el=$('#pk-out');try{await navigator.clipboard.writeText(el.value);say('تم النسخ.');}catch{el.select();say('حدّد النص وانسخه يدويًا.');}});
$('#pk-save').addEventListener('click',()=>download('PUBLISH_PACK.md',new Blob([$('#pk-out').value],{type:'text/markdown;charset=utf-8'})));

/* ---------- export (records the canvas in real time) ---------- */
function pickMime(){
 const c=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
 return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||'';
}
async function exportReel(){
 if(!S.vw||S.exporting)return;
 if(!window.MediaRecorder||!cv.captureStream){say('هذا المتصفح لا يدعم تسجيل الفيديو. استخدم كروم أو إيدج أو سفاري حديثًا.');return;}
 const mime=pickMime();if(!mime){say('لا يوجد ترميز فيديو مدعوم في هذا المتصفح.');return;}
 stopPlay();S.exporting=true;$$('button').forEach(b=>{if(b.id!=='btn-cancel')b.dataset.was=b.disabled?'1':'';b.disabled=true;});
 let rec=null,cancelled=false;
 const finish=()=>{S.exporting=false;$$('button').forEach(b=>{b.disabled=b.dataset.was==='1';delete b.dataset.was;});if(spk)spk.gain.value=1;busy(null);setPlayIcon();};
 try{
  ensureAudio();const out=[];
  const stream=cv.captureStream(30);
  if(AC&&node){const dest=AC.createMediaStreamDestination();node.connect(dest);spk.gain.value=0;dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));}
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8e6,audioBitsPerSecond:160e3});
  rec.ondataavailable=e=>{if(e.data.size)out.push(e.data);};
  const stopped=new Promise(r=>{rec.onstop=r;});
  v.currentTime=0;await once(v,'seeked').catch(()=>{});
  busy('جارٍ تصدير الريل… ٠٪');rec.start(400);await v.play();
  const total=editedDur()||S.dur;
  await new Promise(res=>{const iv=setInterval(()=>{const p=clamp(ed(v.currentTime)/total,0,1);busy('جارٍ تصدير الريل… '+fmtD(String(Math.round(p*100)))+'٪ (لا تغلق الصفحة)');if(v.ended||v.currentTime>=S.dur-.05||v.paused){clearInterval(iv);res();}},250);});
  v.pause();await new Promise(r=>setTimeout(r,350));rec.stop();await stopped;
  const ext=mime.startsWith('video/mp4')?'.mp4':'.webm';
  download('fahad-motion-'+(S.name||'reel')+ext,new Blob(out,{type:mime.split(';')[0]}));
  say('تم التصدير'+(ext==='.webm'?' بصيغة WebM لأن هذا المتصفح لا يسجّل MP4. أي برنامج أو منصة حديثة تقرأه.':' بصيغة MP4.'));
 }catch(e){say('تعذّر التصدير: '+(e&&e.message?e.message:'خطأ غير معروف')+'.');try{rec&&rec.state!=='inactive'&&rec.stop();}catch{}}
 finish();
}
$('#btn-export').addEventListener('click',exportReel);

/* ---------- start ---------- */
(async()=>{
 $('#size').value=S.size;$('#size-o').textContent=fmtD(String(S.size));$('#ypos').value=Math.round(S.y*100);$('#ypos-o').textContent=fmtD(Math.round(S.y*100)+'%');
 $('#digits').value=S.digits;$('#fit').value=S.fit;$('#emph').value=S.emph;$('#guides').checked=S.guides;
 await loadFonts();thumbs();markStyle();renderChecks();setPlayIcon();
 window.__FM={S,STYLES,renderCues,renderCuts,detectSilence,exportReel,loadFile,frame,v,thumbs};
 requestAnimationFrame(loop);
})();
})();
