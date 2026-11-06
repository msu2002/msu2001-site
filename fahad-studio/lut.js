/* Fahad Studio — LUT & colour grading. Procedural cinematic looks + .cube import, applied with WebGL. */
(function(){
'use strict';
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,sm=x=>{x=clamp(x);return x*x*(3-2*x);};
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;
/* Generic grading primitive: every look is a parameter set. */
function grade(p){
 const o=Object.assign({exp:0,contrast:1,curve:0,sat:1,lift:[0,0,0],gamma:[1,1,1],gain:[1,1,1],sh:[0,0,0],hi:[0,0,0],tint:1,fade:0,bleach:0,mono:0,mtint:null,mix:null,satHi:1,satSh:1},p);
 const e=Math.pow(2,o.exp);
 return(r,g,b)=>{
  let c=[r*e,g*e,b*e];
  if(o.mix){const m=o.mix;c=[m[0]*c[0]+m[1]*c[1]+m[2]*c[2],m[3]*c[0]+m[4]*c[1]+m[5]*c[2],m[6]*c[0]+m[7]*c[1]+m[8]*c[2]];}
  for(let i=0;i<3;i++){c[i]=Math.pow(Math.max(0,c[i]*o.gain[i]+o.lift[i]*(1-c[i])),1/o.gamma[i]);}
  for(let i=0;i<3;i++){c[i]=clamp(c[i]);const k=.5+(c[i]-.5)*o.contrast;c[i]=o.curve?k*(1-o.curve)+sm(k)*o.curve:k;c[i]=clamp(c[i]);}
  let l=lum(c[0],c[1],c[2]);
  const s=o.sat*(1+(o.satHi-1)*sm(l)+(o.satSh-1)*(1-sm(l)));
  for(let i=0;i<3;i++)c[i]=l+(c[i]-l)*s;
  const w=sm(l);
  for(let i=0;i<3;i++)c[i]+=(o.sh[i]*(1-w)+o.hi[i]*w)*o.tint;
  if(o.bleach){const l2=lum(clamp(c[0]),clamp(c[1]),clamp(c[2]));for(let i=0;i<3;i++){const ov=clamp(c[i])<.5?2*clamp(c[i])*l2:1-2*(1-clamp(c[i]))*(1-l2);c[i]=c[i]*(1-o.bleach)+ov*o.bleach;}}
  if(o.fade)for(let i=0;i<3;i++)c[i]=o.fade+c[i]*(1-o.fade);
  if(o.mono){const l3=lum(clamp(c[0]),clamp(c[1]),clamp(c[2]));const t=o.mtint||[1,1,1];for(let i=0;i<3;i++)c[i]=c[i]*(1-o.mono)+l3*t[i]*o.mono;}
  return[clamp(c[0]),clamp(c[1]),clamp(c[2])];
 };
}
const CATS={cinematic:'سينمائي',film:'أفلام وكلاسيك',modern:'عصري',bw:'أبيض وأسود'};
const LOOKS=[
 ['none','الأصلي','cinematic',null],
 ['teal-orange','تيل وبرتقالي','cinematic',{contrast:1.12,curve:.3,sat:1.1,sh:[-.02,.035,.06],hi:[.09,.035,-.06],gain:[1.02,1,.97]}],
 ['blockbuster','بلوك باستر','cinematic',{contrast:1.2,curve:.4,sat:1.05,sh:[-.03,.04,.08],hi:[.12,.05,-.08],exp:.05}],
 ['moody-teal','تيل داكن','cinematic',{exp:-.25,contrast:1.15,curve:.3,sat:.85,sh:[-.02,.04,.06],hi:[.02,.02,.0],gain:[.95,1.02,1.05]}],
 ['golden-hour','الساعة الذهبية','cinematic',{gain:[1.1,1.0,.84],sat:1.15,hi:[.06,.03,-.04],lift:[.02,.01,0],contrast:1.06,curve:.2}],
 ['night-blue','ليل أزرق','cinematic',{exp:-.55,gain:[.78,.95,1.22],sat:.8,contrast:1.12,curve:.25,sh:[-.02,.0,.05]}],
 ['bleach-bypass','تجاوز التبييض','cinematic',{bleach:.6,contrast:1.2,sat:.55,curve:.2}],
 ['crimson-drama','دراما قرمزية','cinematic',{contrast:1.2,curve:.35,sat:.95,sh:[-.03,.02,.04],hi:[.1,-.02,-.03],gain:[1.05,.97,.95]}],
 ['cold-thriller','ثريلر بارد','cinematic',{gain:[.9,1.0,1.12],sat:.72,contrast:1.18,curve:.3,sh:[-.02,.03,.03]}],
 ['sci-fi','خيال علمي','cinematic',{contrast:1.15,curve:.3,sat:1.1,sh:[-.02,.06,.07],hi:[.05,-.01,.06]}],
 ['desert-sand','صحراء دافئة','cinematic',{gain:[1.1,1.02,.82],sat:.95,fade:.03,hi:[.05,.04,-.03],contrast:1.05}],
 ['forest-green','غابة','cinematic',{gain:[.92,1.08,.9],sh:[-.02,.04,-.01],sat:1.05,contrast:1.08,curve:.2}],
 ['epic-contrast','ملحمي','cinematic',{contrast:1.3,curve:.5,sat:1.2,satSh:.9}],
 ['dream-pastel','حلم باستيل','cinematic',{fade:.12,exp:.15,sat:.85,contrast:.9,hi:[.04,.0,.03]}],
 ['warm-negative','نيجاتيف دافئ','film',{lift:[.03,.02,0],gain:[1.05,1,.92],gamma:[1.02,1,.96],sat:1.12,contrast:1.06,curve:.2,fade:.02}],
 ['cool-negative','نيجاتيف بارد','film',{gain:[.95,1.02,1.06],lift:[0,.015,.03],sat:1.02,contrast:1.08,curve:.2}],
 ['matte-fade','مات باهت','film',{fade:.1,contrast:.95,sat:.85}],
 ['seventies','السبعينات','film',{fade:.08,gain:[1.1,.98,.82],sat:.9,sh:[.03,.01,-.02],contrast:1.02}],
 ['cross-process','كروس بروسس','film',{gain:[1.1,1,.9],gamma:[1.15,1,.85],sat:1.2,sh:[-.02,.03,.05],hi:[.06,.04,-.05],contrast:1.1}],
 ['instant-photo','صورة فورية','film',{fade:.08,hi:[.03,.01,-.02],sh:[0,.015,.03],sat:.95,contrast:1.0}],
 ['clean-bright','نقي ومشرق','modern',{exp:.15,contrast:1.05,sat:1.08,curve:.15}],
 ['vivid-pop','حيوي','modern',{sat:1.4,contrast:1.12,curve:.25}],
 ['soft-warm','دافئ ناعم','modern',{exp:.1,gain:[1.05,1.0,.93],fade:.03,sat:1.05,curve:.2}],
 ['cool-modern','بارد عصري','modern',{gain:[.95,1.0,1.08],contrast:1.08,curve:.2,sat:1.05}],
 ['cyberpunk','سايبربانك','modern',{contrast:1.2,curve:.35,sat:1.3,sh:[.0,.01,.09],hi:[.09,-.02,.07],gain:[1,.97,1.05]}],
 ['bw-classic','أبيض وأسود','bw',{mono:1,contrast:1.1,curve:.25}],
 ['bw-hard','أبيض وأسود قاسٍ','bw',{mono:1,contrast:1.5,curve:.5}],
 ['bw-soft','أبيض وأسود ناعم','bw',{mono:1,fade:.06,contrast:.95}],
 ['noir','نوار سينمائي','bw',{mono:1,contrast:1.35,curve:.45,exp:-.1,fade:.015}],
 ['sepia','سيبيا','bw',{mono:1,mtint:[1.07,.92,.7],contrast:1.05,fade:.03}],
 ['cyanotype','سيانوتايب','bw',{mono:1,mtint:[.62,.88,1.12],contrast:1.1}]
].map(([id,name,cat,p])=>({id,name,cat,fn:p?grade(p):null}));
const byId=new Map(LOOKS.map(l=>[l.id,l]));
const N0=33,tables=new Map();
function bake(fn,n){const w=n*n,d=new Uint8Array(w*n*4);for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const o=fn(r/(n-1),g/(n-1),b/(n-1)),i=(g*w+b*n+r)*4;d[i]=Math.round(o[0]*255);d[i+1]=Math.round(o[1]*255);d[i+2]=Math.round(o[2]*255);d[i+3]=255;}return d;}
/* .cube */
function parseCube(text){
 let n3=0,n1=0,mn=[0,0,0],mx=[1,1,1];const rows=[];
 for(const raw of String(text).split(/\r?\n/)){
  const s=raw.trim();if(!s||s[0]==='#')continue;const t=s.split(/\s+/);
  if(t[0]==='LUT_3D_SIZE')n3=+t[1];else if(t[0]==='LUT_1D_SIZE')n1=+t[1];
  else if(t[0]==='DOMAIN_MIN')mn=t.slice(1,4).map(Number);else if(t[0]==='DOMAIN_MAX')mx=t.slice(1,4).map(Number);
  else if(/^[-+0-9.]/.test(t[0])&&t.length>=3){rows.push([+t[0],+t[1],+t[2]]);}
 }
 if(!n3&&!n1)throw Error('ملف .cube غير مفهوم.');
 const norm=v=>v.map((x,i)=>clamp((x-mn[i])/((mx[i]-mn[i])||1)));
 if(n3){
  if(n3<2||n3>128||rows.length!==n3**3)throw Error('بيانات LUT ثلاثي الأبعاد ناقصة.');
  const n=Math.min(n3,25),at=(r,g,b)=>rows[r+g*n3+b*n3*n3];
  const fn=(r,g,b)=>{const f=(v)=>{const x=v*(n3-1),i=Math.min(Math.floor(x),n3-2),t=x-i;return[i,t];};const[ri,rt]=f(r),[gi,gt]=f(g),[bi,bt]=f(b);const o=[0,0,0];
   for(let db=0;db<2;db++)for(let dg=0;dg<2;dg++)for(let dr=0;dr<2;dr++){const w=(dr?rt:1-rt)*(dg?gt:1-gt)*(db?bt:1-bt),v=at(ri+dr,gi+dg,bi+db);for(let k=0;k<3;k++)o[k]+=v[k]*w;}return norm(o);};
  return{n,data:bake(fn,n)};
 }
 if(n1<2||rows.length!==n1)throw Error('بيانات LUT أحادي البعد ناقصة.');
 const curve=(v,k)=>{const x=v*(n1-1),i=Math.min(Math.floor(x),n1-2),t=x-i;return rows[i][k]*(1-t)+rows[i+1][k]*t;};
 const n=17;return{n,data:bake((r,g,b)=>norm([curve(r,0),curve(g,1),curve(b,2)]),n)};
}
const b64=u8=>{let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);};
const unb64=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;};
/* custom LUTs live inside the project: project.luts=[{id,name,n,rgb}] */
function customTable(def){const key='c:'+def.id;if(tables.has(key))return tables.get(key);const rgb=unb64(def.rgb),n=def.n,d=new Uint8Array(n*n*n*4);
 for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const si=(r+g*n+b*n*n)*3,di=(g*n*n+b*n+r)*4;d[di]=rgb[si];d[di+1]=rgb[si+1];d[di+2]=rgb[si+2];d[di+3]=255;}
 const t={n,data:d};tables.set(key,t);return t;}
function packCustom(parsed){const n=parsed.n,w=n*n,out=new Uint8Array(n*n*n*3);for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const si=(g*w+b*n+r)*4,di=(r+g*n+b*n*n)*3;out[di]=parsed.data[si];out[di+1]=parsed.data[si+1];out[di+2]=parsed.data[si+2];}return b64(out);}
function tableFor(id,luts){
 if(!id||id==='none')return null;
 const look=byId.get(id);
 if(look&&look.fn){if(!tables.has(id))tables.set(id,{n:N0,data:bake(look.fn,N0)});return tables.get(id);}
 const def=(luts||[]).find(v=>v.id===id);return def?customTable(def):null;
}
/* WebGL pass */
let gl=null,glc=null,prog=null,imgTex=null,lutTex=new Map(),lutCur=null,failed=false,loc={},buf=null;
const VS='attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const FS='precision highp float;varying vec2 v;uniform sampler2D uI,uL;uniform float uN,uS,uT,uTi,uC,uHasLut;'+
'vec3 sl(vec3 c,float s){float x=(s*uN+c.r*(uN-1.)+.5)/(uN*uN);float y=(c.g*(uN-1.)+.5)/uN;return texture2D(uL,vec2(x,y)).rgb;}'+
'void main(){vec4 s=texture2D(uI,v);vec3 c=s.rgb;'+
'c.r+=uT*.10;c.b-=uT*.10;c.g-=uTi*.07;c.r+=uTi*.03;c.b+=uTi*.03;'+
'c=(c-.5)*(1.+uC*.6)+.5;c=clamp(c,0.,1.);vec3 o=c;'+
'if(uHasLut>.5){float b=c.b*(uN-1.);float b0=floor(b);float b1=min(b0+1.,uN-1.);float f=b-b0;o=mix(c,mix(sl(c,b0),sl(c,b1),f),uS);}'+
'gl_FragColor=vec4(o*s.a,s.a);}';
function initGL(w,h){
 if(failed)return false;
 try{
  if(!glc){glc=document.createElement('canvas');gl=glc.getContext('webgl',{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true,antialias:false});if(!gl)throw 0;
   const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x;};
   prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('link');
   gl.useProgram(prog);buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   for(const k of['uI','uL','uN','uS','uT','uTi','uC','uHasLut'])loc[k]=gl.getUniformLocation(prog,k);
   imgTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,imgTex);for(const[p,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
  }
  if(glc.width!==w||glc.height!==h){glc.width=w;glc.height=h;}
  return true;
 }catch(e){failed=true;return false;}
}
function lutTexture(key,t){
 if(lutTex.has(key))return lutTex.get(key);
 const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,t.n*t.n,t.n,0,gl.RGBA,gl.UNSIGNED_BYTE,t.data);
 for(const[p,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
 lutTex.set(key,tx);if(lutTex.size>40){const k=lutTex.keys().next().value;gl.deleteTexture(lutTex.get(k));lutTex.delete(k);}return tx;
}
function needs(c){return !!(c&&((c.lut&&c.lut!=='none')||c.gTemp||c.gTint||c.gContrast));}
/** Applies the clip's LUT + basic grade onto canvas (in place). */
function apply(canvas,c,luts){
 if(!needs(c)||canvas.width<2)return false;
 const t=tableFor(c.lut,luts);
 if(!initGL(canvas.width,canvas.height))return false;
 gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(prog);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,imgTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
 gl.uniform1i(loc.uI,0);
 if(t){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,lutTexture((byId.has(c.lut)?c.lut:'c:'+c.lut),t));gl.uniform1i(loc.uL,1);gl.uniform1f(loc.uN,t.n);}
 gl.uniform1f(loc.uHasLut,t?1:0);gl.uniform1f(loc.uS,c.lutStrength??1);
 gl.uniform1f(loc.uT,c.gTemp||0);gl.uniform1f(loc.uTi,c.gTint||0);gl.uniform1f(loc.uC,c.gContrast||0);
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 const cx=canvas.getContext('2d');cx.save();cx.setTransform(1,0,0,1,0,0);cx.globalAlpha=1;cx.globalCompositeOperation='copy';cx.filter='none';cx.drawImage(glc,0,0);cx.restore();
 return true;
}
/* CPU preview for thumbnails */
function sampleScene(cv){
 const w=cv.width,h=cv.height,x=cv.getContext('2d');
 let g=x.createLinearGradient(0,0,0,h*.62);g.addColorStop(0,'#2f6fd0');g.addColorStop(.6,'#9fc7ee');g.addColorStop(1,'#f3d9b0');x.fillStyle=g;x.fillRect(0,0,w,h);
 x.fillStyle='#fff3c8';x.beginPath();x.arc(w*.8,h*.2,h*.1,0,7);x.fill();
 x.fillStyle='#3f7d3a';x.beginPath();x.moveTo(0,h*.72);x.quadraticCurveTo(w*.3,h*.45,w*.6,h*.7);x.lineTo(w*.6,h);x.lineTo(0,h);x.fill();
 x.fillStyle='#6a5a3a';x.beginPath();x.moveTo(w*.4,h*.78);x.quadraticCurveTo(w*.7,h*.52,w,h*.74);x.lineTo(w,h);x.lineTo(w*.4,h);x.fill();
 x.fillStyle='#d9a37e';x.beginPath();x.arc(w*.3,h*.55,h*.14,0,7);x.fill();x.fillStyle='#b23a2e';x.fillRect(w*.22,h*.68,w*.16,h*.3);
 ['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa','#eeeeee','#222222'].forEach((c,i)=>{x.fillStyle=c;x.fillRect(i*w/8,h-h*.1,w/8,h*.1);});
}
function paintThumb(cv,id,luts,src){
 const x=cv.getContext('2d');
 if(src)x.drawImage(src,0,0,cv.width,cv.height);else sampleScene(cv);
 const t=tableFor(id,luts);if(!t)return;
 const im=x.getImageData(0,0,cv.width,cv.height),d=im.data,n=t.n,T=t.data,w=n*n;
 for(let i=0;i<d.length;i+=4){const r=d[i]/255*(n-1),g=d[i+1]/255*(n-1),b=d[i+2]/255*(n-1);
  const ri=Math.round(r),gi=Math.round(g),bi=Math.round(b),j=(gi*w+bi*n+ri)*4;d[i]=T[j];d[i+1]=T[j+1];d[i+2]=T[j+2];}
 x.putImageData(im,0,0);
}
/* Panel */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cat='all',frameSrc=null;
function renderPanel(root,ctx){
 const c=ctx.chosen(),p=ctx.project(),luts=p.luts||[];
 const cur=c?.lut||'none',str=Math.round((c?.lutStrength??1)*100);
 const list=[...LOOKS.filter(l=>cat==='all'||l.cat===cat||l.id==='none'),...(cat==='all'||cat==='custom'?luts.map(v=>({id:v.id,name:v.name,cat:'custom',custom:true})):[])];
 const cats=Object.assign({all:'الكل'},CATS,luts.length?{custom:'ملفاتي'}:{});
 const gr=(k,l)=>`<label class="field"><span>${l}<output>${Math.round((c?.[k]||0)*100)}</output></span><input data-lut-grade="${k}" type="range" min="-1" max="1" step=".02" value="${c?.[k]||0}" ${c?'':'disabled'}></label>`;
 root.innerHTML=`<section class="creative-library lut-panel">
 <p class="creative-description">${c&&c.kind!=='text'&&c.kind!=='audio'?'فلاتر ألوان سينمائية (LUT) تُطبَّق على المقطع المحدد في المعاينة والتصدير.':'اختر مقطع فيديو أو صورة على الخط الزمني ثم طبّق مظهر LUT.'}</p>
 <div class="creative-categories">${Object.entries(cats).map(([k,n])=>`<button data-lut-cat="${k}" class="${cat===k?'active':''}">${n}</button>`).join('')}</div>
 <label class="field"><span>شدة الفلتر<output>${str}٪</output></span><input data-lut-strength type="range" min="0" max="100" step="1" value="${str}" ${c?'':'disabled'}></label>
 <div class="lut-grid">${list.map(l=>`<article class="lut-card ${cur===l.id?'is-selected':''}"><button data-lut-pick="${esc(l.id)}" aria-label="${esc(l.name)}" ${c?'':'disabled'}><canvas width="160" height="90" data-lut-thumb="${esc(l.id)}"></canvas></button><strong>${esc(l.name)}</strong>${l.custom?`<button class="lut-del" data-lut-del="${esc(l.id)}" aria-label="حذف">×</button>`:''}</article>`).join('')}</div>
 <div class="lut-actions"><button class="button" data-lut-import>استيراد ملف LUT ‎(.cube)</button><button class="button" data-lut-all ${c?'':'disabled'}>تطبيق على كل المقاطع</button><input type="file" accept=".cube" hidden data-lut-file></div>
 <div class="section-label">ضبط الألوان</div>${gr('gTemp','الحرارة (دافئ ↔ بارد)')}${gr('gTint','الصبغة (أخضر ↔ أرجواني)')}${gr('gContrast','التباين')}
 <button class="button" data-lut-reset ${c?'':'disabled'}>إزالة اللون من المقطع</button>
 <p class="fine-print">الفلاتر مُولَّدة محليًا من معادلات ألوان، وليست مأخوذة من أفلام أو علامات تجارية. يدعم استيراد LUT ثلاثي وأحادي البعد بصيغة ‎.cube.</p></section>`;
 root.querySelectorAll('[data-lut-thumb]').forEach(cv=>paintThumb(cv,cv.dataset.lutThumb,luts,ctx.frame?.()));
 if(root._lutBound)return;root._lutBound=true;
 const upd=fn=>ctx.edit(()=>{const k=ctx.chosen();if(k&&k.kind!=='text'&&k.kind!=='audio')fn(k);});
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.lutCat){cat=d.lutCat;ctx.rerender();}
  else if(d.lutPick){upd(k=>{k.lut=d.lutPick==='none'?undefined:d.lutPick;if(k.lut===undefined)delete k.lut;else if(k.lutStrength===undefined)k.lutStrength=1;});}
  else if(d.lutDel){ctx.edit(()=>{const pr=ctx.project();pr.luts=(pr.luts||[]).filter(v=>v.id!==d.lutDel);pr.clips.forEach(k=>{if(k.lut===d.lutDel)delete k.lut;});});}
  else if(d.lutAll){const k0=ctx.chosen();ctx.edit(()=>{const pr=ctx.project();pr.clips.forEach(k=>{if(k.kind==='video'||k.kind==='image'){if(k0.lut)k.lut=k0.lut;else delete k.lut;k.lutStrength=k0.lutStrength??1;}});});ctx.toast('طُبّق الفلتر على كل مقاطع الفيديو والصور.');}
  else if(d.lutReset!==undefined){upd(k=>{for(const f of['lut','lutStrength','gTemp','gTint','gContrast'])delete k[f];});}
  else if(d.lutImport!==undefined){root.querySelector('[data-lut-file]').click();}
 });
 root.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.lutStrength!==undefined){const v=+t.value/100;t.previousElementSibling.querySelector('output').textContent=t.value+'٪';ctx.live(k=>{k.lutStrength=v;});}
  else if(t.dataset.lutGrade){const v=+t.value;t.closest('label').querySelector('output').textContent=Math.round(v*100);ctx.live(k=>{if(v)k[t.dataset.lutGrade]=v;else delete k[t.dataset.lutGrade];});}
 });
 root.addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.lutFile!==undefined&&t.files[0]){
   try{const f=t.files[0];if(f.size>8e6)throw Error('الملف كبير جدًا.');const parsed=parseCube(await f.text());const name=f.name.replace(/\.cube$/i,'').slice(0,40)||'LUT';
    ctx.edit(()=>{const pr=ctx.project();pr.luts=pr.luts||[];if(pr.luts.length>=8)throw Error('الحد الأقصى ٨ ملفات LUT في المشروع.');let i=1;while(pr.luts.some(v=>v.id==='c'+i))i++;const id='c'+i;pr.luts.push({id,name,n:parsed.n,rgb:packCustom(parsed)});const k=ctx.chosen();if(k&&k.kind!=='text'&&k.kind!=='audio'){k.lut=id;k.lutStrength=k.lutStrength??1;}});
    cat='custom';
   }catch(err){ctx.toast(err.message||'تعذّر قراءة الملف.','error');}
   t.value='';
  }
 });
}
window.FahadLUT={LOOKS,CATS,apply,needs,renderPanel,parseCube,paintThumb,tableFor,supported:()=>!failed};
})();
