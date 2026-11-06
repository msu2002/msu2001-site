/* Fahad Studio — MIT. Original procedural graphics and deterministic local presets. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./core.js'):root.StudioCore,node?require('./gold.js'):root.StudioGold);if(node)module.exports=api;else root.StudioCreative=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,G){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
 const ease=t=>1-Math.pow(1-clamp(t),3),noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
 const named=rows=>rows.map(([id,name,category='general'])=>({id,name,category}));
 const transitions=named([
 ['none','قص مباشر'],['fade','تلاشي ناعم'],['slide','انزلاق لليسار'],['slide-right','انزلاق لليمين'],['slide-up','انزلاق للأعلى'],['slide-down','انزلاق للأسفل'],['wipe','كشف أفقي'],['wipe-right','كشف عكسي'],['wipe-up','كشف للأعلى'],['wipe-down','كشف للأسفل'],['circle','دائرة متّسعة'],['diamond','ماسة'],['blinds-horizontal','ستائر أفقية'],['blinds-vertical','ستائر عمودية'],['checker','مربعات متتابعة'],['diagonal','كشف قطري'],['curtain','فتح الستار'],['clock','كشف دائري'],['zoom','تقريب متدرج'],['zoom-out','ابتعاد متدرج'],['spin','دوران ناعم'],['flip','طي أفقي'],['squeeze-horizontal','ضغط أفقي'],['squeeze-vertical','ضغط عمودي'],['door','فتح جانبي']]);
 const motions=named([
 ['none','ثابت'],['zoom-in','تقريب بطيء'],['zoom-out','ابتعاد بطيء'],['pan-left','تحريك لليسار'],['pan-right','تحريك لليمين'],['pan-up','تحريك للأعلى'],['pan-down','تحريك للأسفل'],['breathe','تنفّس هادئ'],['float','طفو'],['drift','انجراف'],['rotate-left','دوران لليسار'],['rotate-right','دوران لليمين'],['shake','اهتزاز'],['pulse','نبض'],['tilt','ميلان'],['orbit','مدار'],['ken-burns','حركة سينمائية'],['heartbeat','نبض مزدوج'],['wiggle','تأرجح'],['spin-loop','دورة كاملة'],['sway','تمايل']]);
 const animations=named([
 ['none','ثابت'],['fade','ظهور ناعم'],['rise','صعود'],['zoom','تكبير'],['typewriter','كتابة متتابعة'],['slide-left','دخول من اليمين'],['slide-right','دخول من اليسار'],['drop','هبوط'],['bounce','ارتداد'],['spin','دوران'],['flip-x','فتح أفقي'],['flip-y','فتح عمودي'],['elastic','تمدد مرن'],['stretch','تمدد أفقي'],['shrink','تصغير إلى موضعه'],['pop','ظهور سريع'],['rotate-in','دخول مائل'],['swivel','التفاف خفيف'],['wave','موجة هادئة'],['jitter','اهتزاز عند الدخول'],['word-reveal','كلمة بعد كلمة']]);
 const effects=named([
 ['none','بدون تأثير','all'],['warm','دفء ذهبي','color'],['cool','لون بارد','color'],['cinema','سينمائي','color'],['vintage','طابع قديم','color'],['monochrome','أبيض وأسود','color'],['noir','نوير','color'],['vivid','ألوان حيوية','color'],['soft','نعومة','color'],['faded','ألوان باهتة','color'],['sepia','سيبيا','color'],['invert','ألوان معكوسة','color'],['blur','تمويه','color'],['bright','إشراق','color'],['dark','إضاءة منخفضة','color'],['pastel','باستيل','color'],['muted','ألوان هادئة','color'],['vignette','حواف مظللة','overlay'],['grain','حبيبات فيلم','overlay'],['scanlines','خطوط شاشة','overlay'],['letterbox','إطار سينمائي','overlay'],['glow-frame','إطار مضيء','overlay'],['light-leak','تسريب ضوء','overlay'],['duotone','تدرّج لوني ثنائي','color'],['glitch','تشويش متحرك','overlay']]);
 const graphics=named([
 ['particles','جزيئات عائمة'],['rings','حلقات نابضة'],['ribbons','شرائط متدفقة'],['confetti','قصاصات احتفال'],['equalizer','إيقاع بصري'],['countdown','عدّاد ٣ ثوانٍ'],['corners','إطار زوايا'],['rays','أشعة دوّارة'],['bubbles','دوائر صاعدة'],['chevrons','أسهم متحركة'],['stars','نجوم متلألئة'],['lower-third','شريط سفلي'],['speed-lines','خطوط سرعة'],['hexagons','خلايا هندسية'],['radar','مسح دائري'],['dots','نقاط متتابعة'],['heartbeats','خط إيقاعي'],['swirls','مسارات ملتفة'],['light-sweep','مسحة ضوء'],['floating-cards','بطاقات عائمة']]);
 graphics.push({id:'cinematic-smoke',name:'دخان سينمائي',category:'cinema'},{id:'cinematic-lights',name:'إضاءة ذهبية',category:'cinema'});
 const backgroundIds=['mesh','waves','bokeh','paper','sunset','grid','ripple','neon','geometric','spotlight','gold-velvet'];
 const sceneIds=[...backgroundIds,...graphics.map(g=>g.id)];
 const themes={night:['#10172E','#453A80','#A99AFF'],aqua:['#102B3D','#15586B','#74E3D4'],gold:['#241E30','#604835','#F6CB7E'],rose:['#281C3A','#733E75','#F6AFCA'],forest:['#122D2B','#285A49','#9DD7AA'],ice:['#142A44','#345B85','#9ADBF8'],paper:['#F1EBDF','#D5C7B2','#5A7199'],lava:['#301C2A','#7A3B3B','#F7AF84']};
 const templateRows=[
 ['story','حكاية سينمائية','cinema','كل لقطة بداية حكاية','اصنعها بطريقتك','night','mesh','rings','rise',6],
 ['opening','افتتاحية الضوء','cinema','بداية تستحق المشاهدة','عنوان مشروعك هنا','ice','spotlight','light-sweep','zoom',5],
 ['documentary','عنوان وثائقي','cinema','وراء كل مشهد حكاية','اسم الفيلم · تفاصيلك هنا','gold','grid','corners','fade',7],
 ['travel','مذكرات رحلة','cinema','هنا تبدأ الرحلة','اسم المكان · تاريخك هنا','aqua','waves','particles','slide-left',6],
 ['dramatic','عنوان درامي','cinema','لحظة تغيّر الحكاية','دع للصورة مساحة','lava','sunset','rays','shrink',6],
 ['closing','نهاية أنيقة','cinema','إلى حكاية أخرى','شكرًا للمشاهدة','night','bokeh','stars','fade',5],
 ['social','لحظة للمشاركة','social','لحظة تستحق المشاركة','اكتب وصفك هنا','aqua','neon','chevrons','pop',5],
 ['reels','افتتاح ريلز','social','ابدأ من هنا','فكرتك في لقطة','rose','mesh','floating-cards','bounce',5],
 ['hook','سؤال البداية','social','ما الذي يجعلها مختلفة؟','ضع سؤالك هنا','ice','grid','dots','word-reveal',5],
 ['podcast','بطاقة بودكاست','social','صوت وحكاية','اسم الحلقة · اسم المتحدث','night','ripple','equalizer','rise',7],
 ['quick-tip','نصيحة سريعة','social','فكرة صغيرة… أثر كبير','اكتب نصيحتك هنا','forest','geometric','lower-third','slide-right',6],
 ['follow','دعوة للمتابعة','social','الحكاية لم تنتهِ','أضف دعوتك للتفاعل','gold','bokeh','rings','elastic',5],
 ['product','عرض منتج','business','اسم منتجك هنا','الميزة التي تود إبرازها','night','spotlight','corners','rotate-in',7],
 ['offer','بطاقة عرض','business','عرض يستحق الانتباه','اكتب تفاصيل العرض','lava','waves','ribbons','pop',6],
 ['launch','إطلاق جديد','business','قريبًا… شيء مختلف','اسم مشروعك هنا','rose','neon','rays','zoom',6],
 ['brand','هوية بسيطة','business','اسم علامتك','رسالتك في سطر','ice','paper','light-sweep','fade',6],
 ['feature','ميزة في التركيز','business','التفاصيل تصنع الفرق','اكتب ميزتك الأساسية','forest','grid','hexagons','stretch',6],
 ['cta','كرت نهاية دعائي','business','الخطوة التالية لك','الموقع أو وسيلة التواصل','aqua','mesh','chevrons','rise',6],
 ['lesson','افتتاح درس','education','نتعلّم خطوة بخطوة','عنوان الدرس','ice','grid','dots','rise',6],
 ['fact','بطاقة معلومة','education','معلومة تستحق التأمل','اكتب معلومتك الموثقة','forest','paper','lower-third','fade',7],
 ['chapter','فاصل فصل','education','الفصل التالي','اسم المحور','night','geometric','corners','flip-x',4],
 ['compare','قبل وبعد','education','الفكرة ثم النتيجة','ضع المقارنة هنا','aqua','waves','ribbons','slide-left',6],
 ['steps','خطوات واضحة','education','ثلاث خطوات للبداية','اكتب خطوتك الأولى','gold','grid','chevrons','word-reveal',7],
 ['summary','ملخص الدرس','education','ما الذي تعلّمناه؟','أبرز فكرتك هنا','ice','bokeh','dots','drop',6],
 ['quote','كلمات لها أثر','quotes','الكلمات تصنع أثرًا','اكتب اقتباسك ومصدره','gold','paper','particles','fade',7],
 ['thought','مساحة للتأمل','quotes','امنح فكرتك مساحة','كلماتك هنا','aqua','ripple','bubbles','wave',7],
 ['poetry','بيت وشعور','quotes','بيتك الشعري هنا','اسم الشاعر عند الحاجة','night','sunset','stars','word-reveal',8],
 ['wisdom','بطاقة حكمة','quotes','ابدأ بفكرة واصنع حكايتك','عبارتك الخاصة','forest','mesh','swirls','fade',7],
 ['minimal','كلمات بهدوء','quotes','كل شيء يبدأ بخطوة','نصك المختصر','paper','paper','lower-third','rise',6],
 ['thanks','رسالة شكر','quotes','شكرًا لأنك جزء من الحكاية','أضف إهداءك هنا','rose','bokeh','light-sweep','zoom',6],
 ['eid','تهنئة العيد','celebration','كل عام وأنتم بخير','تهنئتك واسمك هنا','gold','mesh','stars','elastic',7],
 ['graduation','لحظة تخرّج','celebration','بداية فصل أجمل','اسم الخريج · تهنئتك','night','spotlight','confetti','bounce',7],
 ['congrats','مباركة','celebration','ألف مبروك','اكتب مناسبتك','rose','bokeh','confetti','pop',6],
 ['achievement','إنجاز يستحق','celebration','هذه لحظة الإنجاز','تفاصيلك هنا','forest','geometric','rays','rise',6],
 ['invite','دعوة أنيقة','celebration','يسرّنا حضوركم','اسم المناسبة · الموعد','gold','paper','corners','fade',8],
 ['event','إعلان فعالية','celebration','موعد لحكاية جديدة','اسم الفعالية · التفاصيل','ice','neon','speed-lines','slide-right',6]
 ];
 const templates=templateRows.map(([id,name,category,title,subtitle,theme,scene,graphic,animation,duration],i)=>({id,name,category,title,subtitle,theme,scene,graphic,animation,duration,layout:i%6}));
 templates.unshift({id:'cinematic-gold',name:'Cinematic Gold',category:'cinema',title:'قريبًا… حدث استثنائي',subtitle:'حكاية تستحق الانتظار',theme:'gold',scene:'gold-velvet',graphic:'cinematic-lights',animation:'fade',duration:8,layout:0});
 const categories={cinema:'سينمائي',social:'سوشال',business:'أعمال وإعلان',education:'تعليم',quotes:'كلمات واقتباسات',celebration:'مناسبات'};
 function transition(cx,id,local,duration,length,w,h){
  if(!id||id==='none')return;const d=Math.max(.01,Math.min(length||.5,duration/2)),a=ease(local/d),b=ease((duration-local)/d),p=Math.min(a,b),inv=1-p;
  if(id==='fade'){cx.globalAlpha*=p;return;}
  if(id.startsWith('slide')){const dir=id==='slide-right'?-1:1,delta=(1-a)-(1-b);cx.translate(id==='slide-up'||id==='slide-down'?0:dir*w*delta,id==='slide-up'?h*delta:id==='slide-down'?-h*delta:0);return;}
  if(['zoom','zoom-out','spin','flip','squeeze-horizontal','squeeze-vertical','door'].includes(id)){
   cx.translate(w/2,h/2);let sx=1,sy=1;
   if(id==='zoom')sx=sy=.65+.35*p;if(id==='zoom-out')sx=sy=1+.45*inv;
   if(id==='spin'){cx.rotate(inv*Math.PI*.5);sx=sy=.4+.6*p;}
   if(id==='flip')sx=Math.sin(p*Math.PI/2);if(id==='squeeze-horizontal')sx=p;if(id==='squeeze-vertical')sy=p;
   if(id==='door'){cx.translate(-w/2,0);cx.rotate(-inv*.12);cx.scale(p,1);cx.translate(w/2,0);}else cx.scale(sx,sy);
   cx.translate(-w/2,-h/2);cx.globalAlpha*=id==='zoom-out'?p:1;return;
  }
  cx.beginPath();
  if(id==='wipe')cx.rect(0,0,w*p,h);else if(id==='wipe-right')cx.rect(w*(1-p),0,w*p,h);
  else if(id==='wipe-up')cx.rect(0,h*(1-p),w,h*p);else if(id==='wipe-down')cx.rect(0,0,w,h*p);
  else if(id==='circle')cx.arc(w/2,h/2,Math.hypot(w,h)*.51*p,0,TAU);
  else if(id==='diamond'){cx.moveTo(w/2,h/2-h*p);cx.lineTo(w/2+w*p,h/2);cx.lineTo(w/2,h/2+h*p);cx.lineTo(w/2-w*p,h/2);cx.closePath();}
  else if(id==='blinds-horizontal'){for(let i=0;i<8;i++)cx.rect(0,h*i/8,w,(h/8+.5)*p);}
  else if(id==='blinds-vertical'){for(let i=0;i<10;i++)cx.rect(w*i/10,0,(w/10+.5)*p,h);}
  else if(id==='checker'){for(let y=0;y<5;y++)for(let x=0;x<8;x++)cx.rect((x+.5)*w/8-w*p/16,(y+.5)*h/5-h*p/10,(w/8+.5)*p,(h/5+.5)*p);}
  else if(id==='diagonal'){cx.moveTo(0,0);cx.lineTo(w*2*p,0);cx.lineTo(0,h*2*p);cx.closePath();}
  else if(id==='curtain')cx.rect(w*(1-p)/2,0,w*p,h);
  else if(id==='clock'){cx.moveTo(w/2,h/2);cx.arc(w/2,h/2,Math.hypot(w,h),-Math.PI/2,-Math.PI/2+TAU*p);cx.closePath();}
  else {cx.rect(0,0,w,h);}cx.clip();
 }
 function motion(cx,id,t,duration,w,h,amount=.6){
  const a=clamp(amount),q=clamp(t/Math.max(.1,duration)),s=Math.sin(t*TAU*.35),co=Math.cos(t*TAU*.25);let x=0,y=0,z=1,r=0;
  if(id==='zoom-in')z=1+q*.22*a;if(id==='zoom-out')z=1+(1-q)*.22*a;
  if(id==='pan-left'||id==='pan-right'){z=1+.12*a;x=(q-.5)*w*.16*a*(id==='pan-left'?-1:1);}
  if(id==='pan-up'||id==='pan-down'){z=1+.12*a;y=(q-.5)*h*.16*a*(id==='pan-up'?-1:1);}
  if(id==='breathe')z=1+(.5+.5*s)*.08*a;if(id==='float')y=s*h*.035*a;
  if(id==='drift'){x=s*w*.035*a;y=co*h*.03*a;z=1+.05*a;}
  if(id==='rotate-left')r=-q*.12*a;if(id==='rotate-right')r=q*.12*a;
  if(id==='shake'){x=Math.sin(t*43)*w*.008*a;y=Math.cos(t*37)*h*.012*a;z=1+.035*a;}
  if(id==='pulse')z=1+Math.pow(Math.max(0,Math.sin(t*4)),6)*.13*a;
  if(id==='tilt')r=s*.045*a;if(id==='orbit'){x=Math.cos(t*1.1)*w*.035*a;y=Math.sin(t*1.1)*h*.04*a;}
  if(id==='ken-burns'){z=1+q*.18*a;x=(q-.5)*w*.08*a;y=(.5-q)*h*.06*a;}
  if(id==='heartbeat')z=1+Math.pow(Math.max(0,Math.sin(t*5)),10)*.1*a+Math.pow(Math.max(0,Math.sin(t*5+1)),16)*.06*a;
  if(id==='wiggle'){r=Math.sin(t*8)*.025*a;x=Math.sin(t*4)*w*.012*a;}
  if(id==='spin-loop')r=q*TAU*a;if(id==='sway'){x=s*w*.035*a;r=s*.018*a;}
  cx.translate(x,y);cx.rotate(r);cx.scale(z,z);
 }
 function textMotion(cx,id,t,duration,w,h){
  const p=clamp(t/.6),e=ease(p),out=clamp((duration-t)/.3),v=1-e;
  if(!id||id==='none')return;
  cx.globalAlpha*=Math.min(id==='bounce'||id==='elastic'?clamp(p*3):p,out);
  if(id==='rise')cx.translate(0,v*55);if(id==='drop')cx.translate(0,-v*75);
  if(id==='zoom'){const s=.8+.2*e;cx.scale(s,s);}
  if(id==='slide-left')cx.translate(w*.22*v,0);if(id==='slide-right')cx.translate(-w*.22*v,0);
  if(id==='bounce')cx.translate(0,-Math.abs(Math.sin(p*Math.PI*2.5))*v*90);
  if(id==='spin'){cx.rotate(v*1.1);cx.scale(.6+.4*e,.6+.4*e);}
  if(id==='flip-x')cx.scale(Math.max(.01,Math.sin(p*Math.PI/2)),1);if(id==='flip-y')cx.scale(1,Math.max(.01,Math.sin(p*Math.PI/2)));
  if(id==='elastic'){const s=1+Math.sin(p*Math.PI*3)*(1-p)*.3;cx.scale(s,s);}
  if(id==='stretch')cx.scale(.25+.75*e,1);if(id==='shrink')cx.scale(1+.45*v,1+.45*v);
  if(id==='pop'){const s=p<.65?mix(.1,1.13,ease(p/.65)):mix(1.13,1,(p-.65)/.35);cx.scale(s,s);}
  if(id==='rotate-in'){cx.rotate(-v*.22);cx.translate(0,v*35);}
  if(id==='swivel'){cx.rotate(Math.sin(p*Math.PI*2)*v*.2);cx.scale(.7+.3*e,1);}
  if(id==='wave')cx.translate(0,Math.sin(t*3.3)*h*.012*e);
  if(id==='jitter')cx.translate(Math.sin(t*80)*18*v,Math.cos(t*67)*10*v);
 }
 function reveal(text,id,t){if(id==='word-reveal'){const p=clamp(t/1.8);if(p===1)return text;const words=[...text.matchAll(/\S+/gu)],n=Math.ceil(words.length*p);return n?text.slice(0,words[n-1].index+words[n-1][0].length):'';}if(id!=='typewriter')return text;const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):[...text];return parts.slice(0,Math.ceil(parts.length*clamp(t/1.8))).join('');}
 function filter(c){const s=clamp(c.effectStrength??.7),b=c.brightness??1,sa=c.saturation??1,id=c.effect;let f=`brightness(${b}) saturate(${sa})`;
  const add={warm:`sepia(${.35*s}) saturate(${1+.35*s})`,cool:`hue-rotate(${18*s}deg) saturate(${1+.2*s})`,cinema:`contrast(${1+.3*s}) saturate(${1-.25*s})`,vintage:`sepia(${.65*s}) contrast(${1-.12*s})`,monochrome:`grayscale(${s})`,noir:`grayscale(${s}) contrast(${1+.65*s})`,vivid:`saturate(${1+1.1*s}) contrast(${1+.15*s})`,soft:`contrast(${1-.2*s}) brightness(${1+.1*s})`,faded:`saturate(${1-.5*s}) contrast(${1-.25*s})`,sepia:`sepia(${s})`,invert:`invert(${s})`,blur:`blur(${7*s}px)`,bright:`brightness(${1+.45*s})`,dark:`brightness(${1-.5*s})`,pastel:`saturate(${1-.35*s}) brightness(${1+.15*s}) contrast(${1-.13*s})`,muted:`saturate(${1-.7*s})`,duotone:`grayscale(${s}) contrast(${1+.1*s})`}[id];return add?f+' '+add:f;
 }
 function paintEffect(cx,id,strength,t,w,h){
  const a=clamp(strength??.7);if(!a||!id||id==='none')return;cx.save();cx.globalCompositeOperation='source-atop';
  if(id==='vignette'){const g=cx.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.hypot(w,h)*.6);g.addColorStop(0,'#00000000');g.addColorStop(1,'#000000');cx.globalAlpha=a*.85;cx.fillStyle=g;cx.fillRect(0,0,w,h);}
  if(id==='grain'){const n=Math.floor(t*15);for(let i=0;i<350;i++){cx.globalAlpha=(.08+noise(i+n)*.12)*a;cx.fillStyle=i%2?'#ffffff':'#000000';cx.fillRect(noise(i*7+n)*w,noise(i*13+n)*h,Math.max(1,w/500),Math.max(1,h/300));}}
  if(id==='scanlines'){cx.globalAlpha=a*.2;cx.fillStyle='#061027';for(let y=0;y<h;y+=6)cx.fillRect(0,y,w,2);}
  if(id==='letterbox'){cx.globalAlpha=a;cx.fillStyle='#03050B';cx.fillRect(0,0,w,h*.105);cx.fillRect(0,h*.895,w,h*.105);}
  if(id==='glow-frame'){cx.globalAlpha=a*.8;cx.strokeStyle='#AC8CFF';cx.lineWidth=w*.008;cx.shadowColor='#9C75FF';cx.shadowBlur=w*.025;cx.strokeRect(w*.02,h*.025,w*.96,h*.95);}
  if(id==='light-leak'){const x=w*(.2+.5*(.5+.5*Math.sin(t*.7))),g=cx.createRadialGradient(x,0,0,x,0,w*.8);g.addColorStop(0,'#FFBC78');g.addColorStop(.35,'#D4638F99');g.addColorStop(1,'#FF999900');cx.globalAlpha=a*.42;cx.fillStyle=g;cx.fillRect(0,0,w,h);}
  if(id==='duotone'){const g=cx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#7361CF');g.addColorStop(1,'#65D9C9');cx.globalAlpha=a*.4;cx.fillStyle=g;cx.fillRect(0,0,w,h);}
  if(id==='glitch'){for(let i=0;i<7;i++){const y=noise(i+Math.floor(t*8))*h;cx.globalAlpha=a*(.06+noise(i+t)*.13);cx.fillStyle=i%2?'#B66CFF':'#48EBE0';cx.fillRect(noise(i*6+t)*w*.3,y,w*.75,2+noise(i)*h*.025);}}
  cx.restore();
 }
 const alpha=(color,value)=>color+Math.round(clamp(value)*255).toString(16).padStart(2,'0');
 function scene(cx,id,t,w,h,colors=themes.night,overlay=false,options={}){
  if(G.sceneIds.includes(id)){G.drawScene(cx,id,t,w,h,colors,overlay,options);return;}
  const [bg,secondary,accent]=colors,cx0=w/2,cy0=h/2;cx.save();
  if(!overlay){const g=cx.createLinearGradient(0,0,w,h);g.addColorStop(0,bg);g.addColorStop(1,secondary);cx.fillStyle=g;cx.fillRect(0,0,w,h);}
  cx.strokeStyle=accent;cx.fillStyle=accent;cx.lineWidth=Math.max(1,w*.002);
  if(id==='mesh'||id==='bokeh'||id==='spotlight'){for(let i=0;i<(id==='bokeh'?16:4);i++){const x=(.5+.48*Math.sin(t*.12+i*2.2))*w,y=(.5+.5*Math.cos(t*.15+i*1.4))*h,r=w*(id==='bokeh'?.025+.035*noise(i):.35);const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,alpha(i%2?accent:secondary,id==='bokeh'?.25:.65));g.addColorStop(1,alpha(accent,0));cx.fillStyle=g;cx.fillRect(0,0,w,h);}}
  if(id==='waves'||id==='ribbons'){for(let j=0;j<6;j++){cx.beginPath();for(let x=0;x<=w+20;x+=20){const y=h*(.3+j*.09)+Math.sin(x/w*TAU+t*.8+j)*h*.08;x?cx.lineTo(x,y):cx.moveTo(x,y);}cx.strokeStyle=alpha(accent,.15+j*.09);cx.lineWidth=id==='ribbons'?h*.025:2+j;cx.stroke();}}
  if(id==='paper'){cx.globalAlpha=.12;for(let i=0;i<24;i++){cx.strokeStyle=accent;cx.beginPath();cx.moveTo(0,h*i/24);cx.lineTo(w,h*i/24);cx.stroke();}cx.globalAlpha=.08;for(let i=0;i<75;i++)cx.fillRect(noise(i*3)*w,noise(i*8)*h,1,1);}
  if(id==='sunset'){const y=h*.37+Math.sin(t*.15)*h*.015;cx.fillStyle=alpha(accent,.65);cx.beginPath();cx.arc(w*.72,y,h*.12,0,TAU);cx.fill();for(let j=0;j<4;j++){cx.beginPath();cx.moveTo(0,h);for(let x=0;x<=w+20;x+=20)cx.lineTo(x,h*(.58+j*.1)+Math.sin(x/w*4+j+t*.08)*h*.09);cx.lineTo(w,h);cx.closePath();cx.fillStyle=j%2?alpha(bg,.7):alpha(secondary,.8);cx.fill();}}
  if(id==='grid'){cx.strokeStyle=alpha(accent,.18);const cell=w/16,shift=(t*12)%cell;for(let x=-cell;x<w+cell;x+=cell){cx.beginPath();cx.moveTo(x+shift,0);cx.lineTo(x+shift,h);cx.stroke();}for(let y=0;y<h;y+=cell){cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke();}}
  if(id==='ripple'||id==='rings'){for(let i=0;i<6;i++){const r=((t*.12+i/6)%1)*Math.hypot(w,h)*.55;cx.beginPath();cx.ellipse(cx0,cy0,r,r*.58,0,0,TAU);cx.strokeStyle=alpha(accent,(1-r/Math.hypot(w,h))*.5);cx.lineWidth=id==='rings'?Math.max(2,w*.004):2;cx.stroke();}}
  if(id==='neon'){cx.save();cx.translate(cx0,cy0);cx.rotate(Math.sin(t*.3)*.04);for(let i=0;i<7;i++){const q=.2+i*.11;cx.strokeStyle=alpha(accent,.6-i*.06);cx.shadowColor=accent;cx.shadowBlur=20;cx.strokeRect(-w*q/2,-h*q/2,w*q,h*q);}cx.restore();}
  if(id==='geometric'||id==='floating-cards'){for(let i=0;i<8;i++){const x=(noise(i*3)+Math.sin(t*.2+i)*.04)*w,y=(noise(i*5)+Math.cos(t*.25+i)*.05)*h;cx.save();cx.translate(x,y);cx.rotate(t*.05+i);cx.fillStyle=alpha(accent,.08+noise(i)*.15);cx.strokeStyle=alpha(accent,.25);const size=w*(.04+noise(i*9)*.08);cx.fillRect(-size,-size*.6,size*2,size*1.2);cx.strokeRect(-size,-size*.6,size*2,size*1.2);cx.restore();}}
  if(id==='particles'||id==='bubbles'||id==='confetti'){for(let i=0;i<35;i++){const x=(noise(i*3)+Math.sin(t*.25+i)*.025)*w,y=((noise(i*7)+(id==='confetti'?1:-1)*t*(.03+noise(i)*.035))%1+1)%1*h;const size=w*(.002+noise(i*11)*(id==='bubbles'?.025:.009));cx.save();cx.translate(x,y);cx.rotate(t+i);cx.globalAlpha=.15+noise(i)*.55;cx.fillStyle=i%2?accent:secondary;cx.strokeStyle=accent;if(id==='confetti')cx.fillRect(-size,-size*.4,size*2,size*.8);else{cx.beginPath();cx.arc(0,0,size,0,TAU);id==='bubbles'?cx.stroke():cx.fill();}cx.restore();}}
  if(id==='equalizer'){for(let i=0;i<38;i++){const v=.15+.75*Math.abs(Math.sin(i*.57+t*2.4)*Math.cos(i*.17+t*.8));cx.fillStyle=alpha(accent,.35+v*.5);cx.fillRect(w*(.12+i*.02),h*.8-h*.22*v,w*.012,h*.22*v);}}
  if(id==='countdown'){cx.fillStyle=accent;cx.textAlign='center';cx.textBaseline='middle';cx.font=`700 ${Math.round(Math.min(w,h)*.38)}px Tahoma, Arial`;cx.fillText(String(Math.max(1,3-Math.floor(t))),cx0,cy0);const p=t%1;cx.beginPath();cx.arc(cx0,cy0,Math.min(w,h)*(.24+.05*p),0,TAU*p);cx.lineWidth=w*.006;cx.stroke();}
  if(id==='corners'){const x=w*.08,y=h*.12,l=w*(.05+.008*Math.sin(t*2));cx.lineWidth=w*.003;for(const [a,b,sx,sy] of [[x,y,1,1],[w-x,y,-1,1],[x,h-y,1,-1],[w-x,h-y,-1,-1]]){cx.beginPath();cx.moveTo(a+sx*l,b);cx.lineTo(a,b);cx.lineTo(a,b+sy*l);cx.stroke();}}
  if(id==='rays'){cx.translate(cx0,cy0);cx.rotate(t*.12);for(let i=0;i<18;i++){cx.rotate(TAU/18);cx.strokeStyle=alpha(accent,.18);cx.beginPath();cx.moveTo(w*.1,0);cx.lineTo(w*.65,0);cx.stroke();}}
  if(id==='chevrons'){const shift=t%1;for(let i=0;i<6;i++){const x=w*(.15+i*.13+shift*.04);cx.strokeStyle=alpha(accent,.1+.4*(1-(i+shift)%6/6));cx.lineWidth=w*.007;cx.beginPath();cx.moveTo(x-w*.025,h*.68);cx.lineTo(x,h*.73);cx.lineTo(x-w*.025,h*.78);cx.stroke();}}
  if(id==='stars'){for(let i=0;i<20;i++){const x=noise(i*5)*w,y=noise(i*11)*h,size=w*(.004+.007*noise(i))*(.65+.35*Math.sin(t*2+i));cx.strokeStyle=alpha(accent,.3+.5*Math.abs(Math.sin(t+i)));cx.beginPath();cx.moveTo(x-size,y);cx.lineTo(x+size,y);cx.moveTo(x,y-size);cx.lineTo(x,y+size);cx.stroke();}}
  if(id==='lower-third'){const x=w*.1,y=h*.72,v=.98+.02*Math.sin(t*.7);cx.fillStyle=alpha(secondary,.78);cx.fillRect(x,y,w*.8*v,h*.17);cx.fillStyle=accent;cx.fillRect(x,y,w*.009,h*.17);cx.fillRect(x,y,w*.23*(.9+.1*Math.sin(t)),h*.008);}
  if(id==='speed-lines'){for(let i=0;i<22;i++){const x=((noise(i*3)+t*.2)%1)*w,y=noise(i*7)*h;cx.strokeStyle=alpha(accent,.1+noise(i)*.25);cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+w*(.05+.1*noise(i)),y);cx.stroke();}}
  if(id==='hexagons'){for(let i=0;i<12;i++){const x=noise(i*3)*w,y=noise(i*7)*h,r=w*(.025+.02*noise(i));cx.beginPath();for(let k=0;k<=6;k++){const a=TAU*k/6+t*.15;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;k?cx.lineTo(px,py):cx.moveTo(px,py);}cx.strokeStyle=alpha(accent,.14+.12*Math.sin(t+i));cx.stroke();}}
  if(id==='radar'){const r=Math.min(w,h)*.35;cx.translate(cx0,cy0);for(let i=1;i<4;i++){cx.beginPath();cx.arc(0,0,r*i/3,0,TAU);cx.strokeStyle=alpha(accent,.23);cx.stroke();}cx.rotate(t*.9);const g=cx.createLinearGradient(0,0,r,0);g.addColorStop(0,alpha(accent,0));g.addColorStop(1,alpha(accent,.45));cx.fillStyle=g;cx.beginPath();cx.moveTo(0,0);cx.arc(0,0,r,-.5,0);cx.closePath();cx.fill();cx.strokeStyle=accent;cx.beginPath();cx.moveTo(0,0);cx.lineTo(r,0);cx.stroke();}
  if(id==='dots'){for(let i=0;i<18;i++){cx.fillStyle=alpha(accent,.15+.65*Math.pow(Math.max(0,Math.sin(t*2-i*.45)),2));cx.beginPath();cx.arc(w*(.12+i*.044),h*.76,w*.004,0,TAU);cx.fill();}}
  if(id==='heartbeats'){cx.beginPath();for(let x=0;x<=w;x+=6){const q=(x/w*6+t*.6)%1,y=h*.72-Math.pow(Math.max(0,1-Math.abs(q-.5)*12),3)*h*.14+Math.sin(x/w*40+t)*h*.008;x?cx.lineTo(x,y):cx.moveTo(x,y);}cx.strokeStyle=alpha(accent,.8);cx.lineWidth=w*.003;cx.stroke();}
  if(id==='swirls'){cx.translate(cx0,cy0);for(let j=0;j<3;j++){cx.beginPath();for(let i=0;i<180;i++){const a=i*.065+t*.2+j*TAU/3,r=i*w*.0018;const x=Math.cos(a)*r,y=Math.sin(a)*r*.55;i?cx.lineTo(x,y):cx.moveTo(x,y);}cx.strokeStyle=alpha(accent,.2+j*.14);cx.stroke();}}
  if(id==='light-sweep'){const x=((t*.18)%1.6-.3)*w,g=cx.createLinearGradient(x-w*.15,0,x+w*.15,h);g.addColorStop(0,alpha(accent,0));g.addColorStop(.5,alpha(accent,.22));g.addColorStop(1,alpha(accent,0));cx.fillStyle=g;cx.fillRect(0,0,w,h);}
  cx.restore();
 }
 function buildTemplate(id,options={},start=0){
  if(id==='cinematic-gold')return buildGoldTemplate(options,start);
  const spec=templates.find(t=>t.id===id);if(!spec)throw Error('القالب غير موجود.');const width=options.width||1280,height=options.height||720,colors=themes[spec.theme],fg=spec.theme==='paper'?'#17233C':'#FFFFFF',duration=spec.duration;
  const background={id:C.uid(),type:'scene',name:spec.name+' · خلفية',scene:spec.scene,colors,overlay:false,duration};
  const graphic={id:C.uid(),type:'scene',name:spec.name+' · موشن',scene:spec.graphic,colors,overlay:true,duration};
  const visual=C.clip(background,start,'v1'),overlay=C.clip(graphic,start,'v2');visual.duration=overlay.duration=duration;visual.transition='fade';visual.transitionDuration=.45;overlay.transition='fade';overlay.transitionDuration=.4;
  const lower=spec.graphic==='lower-third',titleY=lower?.76:spec.layout===2?.43:spec.layout===4?.45:.47,subtitleY=lower?.84:titleY+.16;
  const fontId=spec.category==='quotes'?'amiri':options.fontId||'cairo';
  const title=C.textClip(start+.2,{name:spec.name+' · عنوان',text:spec.title,duration:duration-.4,fontId,fontSize:Math.max(8,Math.round(width*(spec.title.length>26?.052:.066))),fontWeight:700,bold:true,color:fg,x:.5,y:titleY,animation:spec.animation});
  const subtitle=C.textClip(start+.65,{name:spec.name+' · تفاصيل',text:spec.subtitle,duration:duration-1.05,fontId:options.fontId||'tajawal',fontSize:Math.max(8,Math.round(width*.025)),fontWeight:400,bold:false,color:spec.theme==='paper'?'#41536C':colors[2],x:.5,y:subtitleY,animation:spec.layout%2?'slide-left':'fade'});
  return {assets:[background,graphic],clips:[visual,overlay,title,subtitle],duration,spec};
 }
 function buildGoldTemplate(options={},start=0){
  const spec=templates.find(t=>t.id==='cinematic-gold'),width=options.width||1280,height=options.height||720,duration=spec.duration,colors=[...G.palette],fontId=options.fontId||'cairo';
  const assets=[['gold-velvet','خلفية مخملية',false],['cinematic-smoke','الدخان',true],['cinematic-lights','الإضاءة',true]].map(([scene,name,overlay])=>({id:C.uid(),type:'scene',name:'Cinematic Gold · '+name,scene,colors:[...colors],overlay,duration}));
  const clips=assets.map(a=>{const c=C.clip(a,start,a.overlay?'v2':'v1');Object.assign(c,{transition:'fade',transitionDuration:.85});return c;});
  Object.assign(clips[1],{smokeDensity:.75,smokeSpeed:.65});Object.assign(clips[2],{lightStrength:.8,lightSpeed:.65});
  const title=C.textClip(start+.4,{name:'Cinematic Gold · العنوان',text:spec.title,duration:duration-.8,fontId,fontSize:Math.max(8,Math.round(width*.067)),fontWeight:800,color:colors[2],x:.5,y:.48,animation:'fade',textStyle:'cinematic-gold',goldGlow:.65,goldShine:.8,goldSpeed:.7,motion:'zoom-in',motionAmount:.6});
  const subtitle=C.textClip(start+1.1,{name:'Cinematic Gold · التفاصيل',text:spec.subtitle,duration:duration-1.65,fontId,fontSize:Math.max(8,Math.round(width*.024)),fontWeight:400,bold:false,color:'#CFBB92',x:.5,y:height>width?.58:.65,animation:'rise'});
  clips.push(title,subtitle);return {assets,clips,duration,spec};
 }
 return {transitions,motions,animations,effects,graphics,templates,themes,categories,sceneIds,backgroundIds,transition,motion,textMotion,reveal,filter,paintEffect,scene,buildTemplate,noise,ease,gold:G};
});
