/* Fahad Studio — professional text motion library. Arabic-safe: letters are never split, only whole lines / words move. */
(function(){
'use strict';
const X=window.StudioCreative;if(!X)return;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t;
const E={
 cubic:t=>1-Math.pow(1-t,3),
 expo:t=>t>=1?1:1-Math.pow(2,-10*t),
 back:t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);},
 elastic:t=>t<=0?0:t>=1?1:Math.pow(2,-10*t)*Math.sin((t*10-.75)*TAU/3)+1,
 bounce:t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;},
 inout:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2
};
const ID={x:0,y:0,s:1,sx:1,sy:1,r:0,b:0,a:1,k:0};
const st=o=>Object.assign({},ID,o);
const CATS={karaoke:'كاريوكي · الكلمة المنطوقة',basic:'أساسية',entrance:'دخول احترافي',io:'دخول وخروج',reveal:'كشف وأقنعة',lines:'سطر بعد سطر',words:'كلمات وكتابة',loop:'حركة مستمرة',style:'نيون وتأثيرات',exit:'خروج مميّز'};
/* DEF: id -> definition. kind: tf (transform), clip, fade (alpha only), loop */
const DEF={},LIST=[];
const add=(id,name,cat,def)=>{DEF[id]=def;LIST.push({id,name,category:cat});};
/* ---- entrances (fade out at the end) ---- */
const tf=(id,name,cat,from,o={})=>add(id,name,cat,Object.assign({kind:'tf',from:st(Object.assign({a:0},from)),to:st({a:0}),ease:'cubic',in:.8,out:.4},o));
tf('blur-in','ظهور ضبابي','entrance',{b:26},{in:.9});
tf('focus-pull','سحب البؤرة','entrance',{b:30,s:1.18},{in:1,ease:'expo'});
tf('blur-zoom','ضباب مع تقريب','entrance',{b:22,s:.7},{in:.9,ease:'expo'});
tf('zoom-giant','تقريب عملاق','entrance',{s:2.4},{in:.8,ease:'expo'});
tf('zoom-small','نمو من الصغر','entrance',{s:.2},{in:.7,ease:'back'});
tf('rise-fast','صعود سريع','entrance',{y:.2},{in:.55,ease:'expo'});
tf('drop-fast','هبوط سريع','entrance',{y:-.22},{in:.55,ease:'expo'});
tf('rise-long','صعود طويل ناعم','entrance',{y:.45},{in:1.1,ease:'cubic'});
tf('slide-sharp-r','انزلاق حاد من اليمين','entrance',{x:.5},{in:.55,ease:'expo'});
tf('slide-sharp-l','انزلاق حاد من اليسار','entrance',{x:-.5},{in:.55,ease:'expo'});
tf('skew-slide','انزلاق مائل','entrance',{x:.3,k:-.5},{in:.7,ease:'expo'});
tf('swing-in','أرجحة','entrance',{r:-.5,y:-.08},{in:1.1,ease:'elastic'});
tf('roll-in','تدحرج','entrance',{x:.55,r:.9},{in:.9,ease:'back'});
tf('drop-bounce','سقوط وارتداد','entrance',{y:-.5},{in:1.05,ease:'bounce'});
tf('pop-back','قفزة خفيفة','entrance',{s:.55},{in:.6,ease:'back'});
tf('elastic-pop','ظهور مرن قوي','entrance',{s:.1},{in:1.1,ease:'elastic'});
tf('unfold-y','انفتاح رأسي','entrance',{sy:.02},{in:.7,ease:'expo'});
tf('unfold-x','انفتاح أفقي','entrance',{sx:.02},{in:.7,ease:'expo'});
tf('tilt-rise','صعود مع ميلان','entrance',{y:.25,r:.18},{in:.8,ease:'cubic'});
tf('spin-zoom','دوران وتقريب','entrance',{r:-1.6,s:.2},{in:.9,ease:'expo'});
tf('stretch-tall','تمدد رأسي','entrance',{sy:2.2,sx:.6,b:10},{in:.7,ease:'expo'});
tf('whip-in','سحبة سريعة','entrance',{x:-.7,b:30,k:.4},{in:.5,ease:'expo'});
/* ---- in + out ---- */
const io=(id,name,from,to,o={})=>add(id,name,'io',Object.assign({kind:'tf',from:st(Object.assign({a:0},from)),to:st(Object.assign({a:0},to)),ease:'expo',in:.6,out:.5},o));
io('zoom-through','عبور بالتقريب',{s:.5},{s:1.8},{ease:'cubic'});
io('slide-through','انزلاق عابر',{x:.45},{x:-.45});
io('slide-through-r','انزلاق عابر عكسي',{x:-.45},{x:.45});
io('rise-fall','صعود وهبوط',{y:.3},{y:-.3});
io('fall-rise','هبوط وصعود',{y:-.3},{y:.3});
io('blur-inout','ضباب دخولًا وخروجًا',{b:24},{b:24},{ease:'cubic',in:.8,out:.7});
io('scale-inout','تكبير وتصغير',{s:.6},{s:.6},{ease:'back',in:.6,out:.4});
io('flip-inout','قلب وإغلاق',{sy:.02},{sy:.02});
io('spin-inout','دوران دخولًا وخروجًا',{r:-.9,s:.4},{r:.9,s:.4},{ease:'cubic'});
io('skew-inout','ميلان دخولًا وخروجًا',{x:.3,k:-.45},{x:-.3,k:.45});
/* ---- special exits ---- */
const ex=(id,name,to,o={})=>add(id,name,'exit',Object.assign({kind:'tf',from:st({a:0}),to:st(Object.assign({a:0},to)),ease:'cubic',in:.35,out:.65,exitEase:'cubic'},o));
ex('exit-blur','خروج ضبابي',{b:28});
ex('exit-rise','خروج صعودًا',{y:-.25});
ex('exit-zoom','خروج بالتكبير',{s:2});
ex('exit-shrink','خروج بالتصغير',{s:.3});
ex('exit-left','خروج لليسار',{x:-.55,b:6});
ex('exit-spin','خروج دوّار',{r:1.2,s:.3});
/* ---- masks / reveals ---- */
const cl=(id,name,type,o={})=>add(id,name,'reveal',Object.assign({kind:'clip',type,in:.8,out:.5,ease:'expo'},o));
cl('wipe-from-right','كشف من اليمين','r');
cl('wipe-from-left','كشف من اليسار','l');
cl('wipe-center','كشف من المركز','c');
cl('wipe-rise','كشف صاعد','u');
cl('wipe-fall','كشف هابط','d');
cl('wipe-circle','كشف دائري','o',{in:.9});
cl('wipe-split','انفتاح من الوسط','s',{in:.7});
cl('wipe-slow','كشف هادئ','r',{in:1.4,ease:'inout'});
/* ---- line staggers ---- */
const LS={},ls=(id,name,kind,gap=.18)=>{LS[id]={kind,gap};add(id,name,'lines',{kind:'lines',in:.8,out:.4});};
ls('line-rise','أسطر صاعدة','rise');ls('line-fade','أسطر تتوالى بنعومة','fade',.25);ls('line-slide','أسطر منزلقة','slide');
ls('line-blur','أسطر ضبابية','blur',.22);ls('line-zoom','أسطر مكبّرة','zoom');ls('line-alt','أسطر متبادلة الاتجاه','alt',.2);ls('line-wipe','أسطر مكشوفة','wipe',.25);
/* ---- words / typing ---- */
const RV={};
const wd=(id,name,fn)=>{RV[id]=fn;add(id,name,'words',{kind:'fade',in:.25,out:.3});};
const gr=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):[...text];
const byWords=iv=>(text,t)=>{const w=[...text.matchAll(/\S+/gu)];const n=Math.min(w.length,Math.floor(t/iv)+1);return n?text.slice(0,w[n-1].index+w[n-1][0].length):'';};
const byChars=rate=>(text,t)=>{const g=gr(text);return g.slice(0,Math.min(g.length,Math.floor(t*rate)+1)).join('');};
wd('word-beat','كلمات بإيقاع سريع',byWords(.28));wd('word-calm','كلمات بإيقاع هادئ',byWords(.7));
wd('type-fast','كتابة سريعة',byChars(38));wd('type-calm','كتابة هادئة',byChars(9));
wd('type-cursor','كتابة مع مؤشر',(text,t)=>{const s=byChars(14)(text,t),done=s.length>=text.length;return done&&Math.floor(t*2)%2?s:s+(done?'':'|');});
/* ---- continuous motion ---- */
const lp=(id,name,fn)=>{DEF[id]={kind:'loop',fn,in:.5,out:.35};LIST.push({id,name,category:'loop'});};
lp('loop-pulse','نبض مستمر',(cx,t)=>{const s=1+Math.sin(t*4)*.04;cx.scale(s,s);});
lp('loop-heartbeat','نبض القلب',(cx,t)=>{const k=Math.pow(Math.max(0,Math.sin(t*TAU*1.2)),10)+Math.pow(Math.max(0,Math.sin(t*TAU*1.2-.7)),10)*.6;const s=1+k*.09;cx.scale(s,s);});
lp('loop-float','طفو هادئ',(cx,t,W,H)=>{cx.translate(Math.sin(t*1.3)*W*.004,Math.sin(t*1.8)*H*.016);});
lp('loop-swing','تأرجح',(cx,t)=>{cx.rotate(Math.sin(t*2.2)*.045);});
lp('loop-shake','اهتزاز',(cx,t,W)=>{cx.translate(Math.sin(t*47)*W*.004,Math.cos(t*39)*W*.003);});
lp('loop-zoom-slow','تقريب بطيء مستمر',(cx,t,W,H,dur)=>{const s=1+.12*(t/Math.max(.5,dur));cx.scale(s,s);});
lp('loop-drift','انجراف أفقي',(cx,t,W)=>{cx.translate(Math.sin(t*.9)*W*.02,0);});
/* ---- styles (neon, glow, 3D, glitch …) ---- */
const ST={};
const sy=(id,name,fn)=>{ST[id]=fn;DEF[id]={kind:'fade',in:.5,out:.35};LIST.push({id,name,category:'style'});};
const hex=c=>{const m=/^#?([0-9a-f]{6})/i.exec(c||'');if(!m)return[255,255,255];const n=parseInt(m[1],16);return[n>>16&255,n>>8&255,n&255];};
const light=c=>{const[r,g,b]=hex(c);return(r*.299+g*.587+b*.114)>200;};
const accent=c=>light(c)?'#00e5ff':c;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
sy('fx-neon','نيون متوهج',(c,t)=>({fill:'#ffffff',glow:{color:accent(c.color),blur:26+Math.sin(t*3)*6}}));
sy('fx-neon-flicker','وميض نيون',(c,t)=>{const f=noise(Math.floor(t*14))>.86?.35:1;return{fill:'#ffffff',alpha:f,glow:{color:accent(c.color),blur:30*f}};});
sy('fx-glow-pulse','توهج نابض',(c,t)=>({glow:{color:accent(c.color),blur:12+(Math.sin(t*2.6)+1)*14}}));
sy('fx-outline','نص مفرغ',(c)=>({fill:'rgba(0,0,0,0)',stroke:{w:Math.max(1.5,c.fontSize*.022),color:c.color},glow:{color:'rgba(0,0,0,0)',blur:0}}));
sy('fx-outline-solid','حدود بارزة',(c)=>({stroke:{w:Math.max(3,c.fontSize*.09),color:'#0a0d1c'},glow:{color:'rgba(0,0,0,0)',blur:0}}));
sy('fx-shadow-long','ظل طويل',(c)=>{const g=[];for(let i=28;i>=1;i--)g.push({dx:i*1.4,dy:i*1.4,color:'#000',a:.28*(1-i/32)});return{ghosts:g};});
sy('fx-extrude','عمق ثلاثي الأبعاد',(c)=>{const g=[];for(let i=16;i>=1;i--)g.push({dx:-i*.9,dy:i*1.1,color:'#2a2150',a:1});return{ghosts:g};});
sy('fx-echo','صدى متتالٍ',(c,t)=>{const g=[];for(let i=4;i>=1;i--)g.push({dx:0,dy:-i*c.fontSize*.12,color:c.color,a:.5/i});return{ghosts:g};});
sy('fx-rgb-split','انقسام لوني',(c,t)=>{const k=4+Math.sin(t*6)*2;return{ghosts:[{dx:-k,dy:0,color:'#ff2d55',a:.8,op:'lighter'},{dx:k,dy:0,color:'#00e5ff',a:.8,op:'lighter'}]};});
sy('fx-glitch','تشويش رقمي',(c,t)=>{const b=noise(Math.floor(t*10))>.78,k=b?(noise(Math.floor(t*30))-.5)*28:0;return{dx:k,ghosts:b?[{dx:-9,dy:2,color:'#ff2d55',a:.85,op:'lighter'},{dx:9,dy:-2,color:'#00e5ff',a:.85,op:'lighter'}]:[{dx:-1.5,dy:0,color:'#ff2d55',a:.5,op:'lighter'},{dx:1.5,dy:0,color:'#00e5ff',a:.5,op:'lighter'}]};});
sy('fx-shine','لمعان عابر',(c,t)=>({fill:(cx,w)=>{const p=((t%2.6)/2.6)*1.6-.3,x0=-w/2,g=cx.createLinearGradient(x0,0,x0+w,0);const a=clamp(p-.15),b=clamp(p),d=clamp(p+.15);g.addColorStop(0,c.color);g.addColorStop(a,c.color);g.addColorStop(b,'#ffffff');g.addColorStop(d,c.color);g.addColorStop(1,c.color);return g;}}));
sy('fx-gradient-flow','تدرج ألوان متحرك',(c,t)=>({fill:(cx,w)=>{const g=cx.createLinearGradient(-w/2,0,w/2,0),cols=['#ffb347','#ff5f6d','#8e6bff','#26c6ff'];for(let i=0;i<=4;i++){g.addColorStop(i/4,cols[(i+Math.floor(t*1.2))%4]);}return g;}}));
sy('fx-gold-pulse','وهج ذهبي',(c,t)=>({fill:'#ffe9a8',glow:{color:'#d4a63c',blur:18+Math.sin(t*2.4)*8}}));

/* ---- karaoke: highlight the word being spoken (whole words only, Arabic stays connected) ---- */
const KC={gold:'#ffc94d',cyan:'#35e0ff',pink:'#ff6fae',green:'#62f08f',fire:'#ff7a30'};
const KS={};
const kara=(id,name,o)=>{KS[id]=o;DEF[id]={kind:'fade',in:.5,out:.4};LIST.push({id,name,category:'karaoke'});};
kara('kara-gold','كاريوكي ذهبي',{active:KC.gold,mode:'plain',upLine:.42,keep:false});
kara('kara-cyan','كاريوكي سماوي',{active:KC.cyan,mode:'plain',upLine:.42});
kara('kara-pink','كاريوكي وردي',{active:KC.pink,mode:'plain',upLine:.42});
kara('kara-green','كاريوكي أخضر',{active:KC.green,mode:'plain',upLine:.42});
kara('kara-fire','كاريوكي ناري',{active:KC.fire,mode:'glow',upLine:.42});
kara('kara-keep','ذهبي يتراكم',{active:KC.gold,mode:'plain',keep:true,upWord:.55,upLine:.4});
kara('kara-dim','كلمات خافتة تضيء',{active:KC.gold,mode:'plain',upWord:.35,upLine:.35});
kara('kara-scale','كلمة مكبّرة ذهبية',{active:KC.gold,mode:'scale',upLine:.42});
kara('kara-pop','كلمة تقفز',{active:KC.gold,mode:'pop',upLine:.42});
kara('kara-pill','كلمة على شريحة',{active:KC.gold,mode:'pill',upLine:.42});
kara('kara-underline','كلمة بخط سفلي',{active:KC.gold,mode:'underline',upLine:.42});
kara('kara-glow','كلمة متوهجة',{active:KC.cyan,mode:'glow',upLine:.42});
kara('kara-fill','تعبئة سلسة',{active:KC.gold,mode:'fill',keep:true,upWord:.6,upLine:.42});
kara('kara-fill-cyan','تعبئة سلسة سماوية',{active:KC.cyan,mode:'fill',keep:true,upWord:.6,upLine:.42});
function words(lines){const base=[],all=[];let n=0;for(const l of lines){base.push(n);const w=l.split(' ').filter(Boolean);for(const x of w)all.push(x.length+1.5);n+=w.length;}return{base,w:all};}
function karaState(lines,t,dur){
 const {base,w}=words(lines),tot=w.reduce((a,b)=>a+b,0)||1,lead=Math.min(.3,dur*.08),tail=Math.min(.35,dur*.1);
 const T=clamp((t-lead)/Math.max(.1,dur-lead-tail))*tot;let acc=0,a=0,f=0;
 for(let k=0;k<w.length;k++){if(T<=acc+w[k]||k===w.length-1){a=k;f=clamp((T-acc)/w[k]);break;}acc+=w[k];}
 if(t<lead){a=-1;f=0;}
 let al=0;for(let i=0;i<base.length;i++)if(base[i]<=a)al=i;
 return{a,f,base,activeLine:al};
}
function paintKara(lc,text,y,tw,c,o,S,i,t){
 const rtl=lc.direction==='rtl',ws=text.split(' '),fs=c.fontSize,lh=fs*1.45,keepAlign=lc.textAlign,spoken=c.color;
 lc.textAlign=rtl?'right':'left';let prefix='';
 for(let k=0;k<ws.length;k++){
  const w=ws[k];if(!w){continue;}
  const pw=prefix?lc.measureText(prefix+' ').width:0,ww=lc.measureText(w).width,x=rtl?tw/2-pw:-tw/2+pw,x0=rtl?x-ww:x,gi=S.base[i]+k;
  const state=gi<S.a?0:gi===S.a?1:2;
  let col=spoken,alpha=1;
  if(state===2){alpha=i>S.activeLine?o.upLine:(o.upWord??1);}
  else if(state===0&&o.keep){col=o.active;}
  const act=state===1;
  lc.save();
  if(act){
   if(o.mode==='pill'){lc.save();lc.shadowColor='transparent';lc.fillStyle=o.active;const px=x0-lh*.18,py=y-lh*.4,pwid=ww+lh*.36,ph=lh*.8,r=ph*.3;lc.beginPath();lc.moveTo(px+r,py);lc.arcTo(px+pwid,py,px+pwid,py+ph,r);lc.arcTo(px+pwid,py+ph,px,py+ph,r);lc.arcTo(px,py+ph,px,py,r);lc.arcTo(px,py,px+pwid,py,r);lc.closePath();lc.fill();lc.restore();col='#10131f';}
   else if(o.mode==='underline'){lc.save();lc.shadowColor='transparent';lc.fillStyle=o.active;lc.fillRect(x0,y+fs*.52,ww,Math.max(3,fs*.07));lc.restore();col=o.active;}
   else if(o.mode==='scale'||o.mode==='pop'){const cx0=x0+ww/2,s=o.mode==='scale'?1.16:1+.12*Math.sin(Math.min(1,S.f*3)*Math.PI/2),dy=o.mode==='pop'?-fs*.08*Math.sin(Math.min(1,S.f*3)*Math.PI/2):0;lc.translate(cx0,y);lc.scale(s,s);lc.translate(-cx0,-y+dy);col=o.active;lc.shadowColor=o.active;lc.shadowBlur=14;lc.shadowOffsetY=0;}
   else if(o.mode==='glow'){col=o.active;lc.shadowColor=o.active;lc.shadowBlur=22;lc.shadowOffsetY=0;}
   else if(o.mode==='fill'){col=spoken;}
   else col=o.active;
  }
  lc.globalAlpha*=alpha;lc.fillStyle=col;lc.fillText(w,x,y);
  if(act&&o.mode==='fill'){lc.beginPath();const cw=ww*S.f;if(rtl)lc.rect(x-cw,y-lh/2,cw,lh);else lc.rect(x,y-lh/2,cw,lh);lc.clip();lc.fillStyle=o.active;lc.shadowColor='transparent';lc.fillText(w,x,y);}
  lc.restore();
  prefix=prefix?prefix+' '+w:w;
 }
 lc.textAlign=keepAlign;
}
/* ---- block application ---- */
function stateAt(d,t,dur){
 const inD=Math.min(d.in,dur*.5),outD=Math.min(d.out,dur*.4),pin=clamp(t/inD),rem=clamp((dur-t)/outD);
 if(rem<1&&t>dur-outD){const k=1-E[d.exitEase||'cubic'](rem);const a=st(),b=d.to;const o={};for(const key of Object.keys(ID))o[key]=lerp(ID[key],b[key],k);return o;}
 const e=E[d.ease](pin),o={};for(const key of Object.keys(ID))o[key]=lerp(d.from[key],ID[key],e);o.a=lerp(d.from.a,1,clamp(pin*1.6));return o;
}
function apply(cx,o,W,H){
 cx.globalAlpha*=clamp(o.a);cx.translate(o.x*W,o.y*H);if(o.r)cx.rotate(o.r);if(o.k)cx.transform(1,0,o.k,1,0,0);cx.scale(o.s*o.sx,o.s*o.sy);
 if(o.b>.3){const f=cx.filter&&cx.filter!=='none'?cx.filter+' ':'';cx.filter=f+`blur(${o.b.toFixed(1)}px)`;}
}
function block(cx,id,t,dur,W,H,c){
 const d=DEF[id];if(!d)return false;const sc=(c&&c.scale)||1;
 if(d.kind==='tf'){apply(cx,stateAt(d,t,dur),W,H);return true;}
 const inD=Math.min(d.in,dur*.5),outD=Math.min(d.out,dur*.4),pin=clamp(t/inD),rem=clamp((dur-t)/outD);
 if(d.kind==='clip'){
  const P=t>dur-outD?E.cubic(rem):E[d.ease](pin),hw=W*.47/sc,hh=H*.5/sc;
  cx.beginPath();
  if(d.type==='r')cx.rect(hw-2*hw*P,-hh,2*hw*P,2*hh);
  else if(d.type==='l')cx.rect(-hw,-hh,2*hw*P,2*hh);
  else if(d.type==='c')cx.rect(-hw*P,-hh,2*hw*P,2*hh);
  else if(d.type==='u')cx.rect(-hw,hh-2*hh*P,2*hw,2*hh*P);
  else if(d.type==='d')cx.rect(-hw,-hh,2*hw,2*hh*P);
  else if(d.type==='o')cx.arc(0,0,Math.hypot(hw,hh)*P,0,TAU);
  else if(d.type==='s'){cx.rect(-hw,-hh*P*.5-2,2*hw,hh*P+4);}
  cx.clip();cx.globalAlpha*=clamp(rem*1.2)*clamp(pin*4);return true;
 }
 if(d.kind==='lines'){return true;}
 cx.globalAlpha*=Math.min(clamp(t/d.in),clamp((dur-t)/d.out));
 if(d.kind==='loop')d.fn(cx,t,W,H,dur);
 return true;
}
/* ---- per-line application ---- */
function line(lc,id,i,n,t,dur,W,H,lineW,y,c,lines){
 const s=ST[id],l=LS[id],ko=KS[id];if(!s&&!l&&!ko)return null;
 let fx=null;
 if(l){
  const lh=c.fontSize*1.45,p=clamp((t-i*l.gap)/.6),e=E.expo(p),q=clamp((dur-t-(n-1-i)*.08)/.35),a=Math.min(clamp(p*1.5),q);
  lc.globalAlpha*=a;const v=1-e;let dx=0,dy=0,sc=1;
  if(l.kind==='rise')dy=v*lh*1.3;else if(l.kind==='slide')dx=v*W*.3;else if(l.kind==='alt')dx=(i%2?-1:1)*v*W*.35;else if(l.kind==='zoom')sc=.55+.45*e;
  else if(l.kind==='blur'){const f=lc.filter&&lc.filter!=='none'?lc.filter+' ':'';lc.filter=f+`blur(${(v*18).toFixed(1)}px)`;dy=v*lh*.3;}
  else if(l.kind==='wipe'){lc.beginPath();const w=(lineW+30)*E.cubic(p);lc.rect(lineW/2+15-w,y-lh/2,w,lh);lc.clip();}
  lc.translate(dx,dy);if(sc!==1){lc.translate(0,y);lc.scale(sc,sc);lc.translate(0,-y);}
  fx={};
 }
 if(ko&&lines){const S=karaState(lines,t,dur);fx={paint:(lc2,text,y2,tw2)=>paintKara(lc2,text,y2,tw2,c,ko,S,i,t)};}
 if(s){fx=Object.assign(fx||{},s(c,t,lineW,i));if(fx.alpha!==undefined)lc.globalAlpha*=fx.alpha;if(fx.dx)lc.translate(fx.dx,0);}
 return fx;
}
/* ---- registration into the creative library ---- */
const orig={textMotion:X.textMotion,reveal:X.reveal};
X.textMotion=function(cx,id,t,dur,w,h,c){if(DEF[id]){block(cx,id,t,dur,w,h,c);return;}return orig.textMotion(cx,id,t,dur,w,h);};
X.reveal=function(text,id,t){return RV[id]?RV[id](text,t):orig.reveal(text,id,t);};
for(const a of X.animations)if(!a.category||a.category==='general')a.category='basic';
const kar=LIST.filter(v=>v.category==='karaoke'),rest=LIST.filter(v=>v.category!=='karaoke'),none=X.animations.filter(a=>a.id==='none'),others=X.animations.filter(a=>a.id!=='none');
X.animations.length=0;X.animations.push(...none,...kar,...others,...rest);
X.animationCategories=CATS;
window.FahadTextFX={line,count:LIST.length,CATS};
})();
