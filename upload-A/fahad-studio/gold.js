/* Fahad Studio — MIT. Original local Cinematic Gold renderer; no external media. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudioGold=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const sceneIds=['gold-velvet','cinematic-smoke','cinematic-lights'];
 const defaults={smokeDensity:.75,smokeSpeed:.65,lightStrength:.8,lightSpeed:.65,goldGlow:.65,goldShine:.8,goldSpeed:.7};
 const palette=['#090806','#6C512E','#E5BF72'];
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
 const rgba=(hex,a)=>{const c=rgb(hex);return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;};
 function rgb(hex){const h=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#E5BF72';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
 function tone(hex,amount){const c=rgb(hex),a=Math.abs(amount),target=amount<0?0:255;return '#'+c.map(v=>Math.round(mix(v,target,a)).toString(16).padStart(2,'0')).join('');}
 function hash(x,y,seed=17){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
 const smooth=t=>t*t*(3-2*t);
 function valueNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);}
 const N=256;let field;
 function noiseField(){if(field)return field;field=new Float32Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let sum=0,weight=0,a=.55,f=1;for(let i=0;i<5;i++){sum+=valueNoise(x/N*4*f+13,y/N*4*f+37)*a;weight+=a;a*=.5;f*=2;}field[y*N+x]=sum/weight;}return field;}
 function sample(x,y){const f=noiseField(),u=((x%1)+1)%1*N,v=((y%1)+1)%1*N,ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;return mix(mix(f[iy*N+ix],f[iy*N+(ix+1)%N],fx),mix(f[((iy+1)%N)*N+ix],f[((iy+1)%N)*N+(ix+1)%N],fx),fy);}
 function smokePixels(t,w,h,options={},accent=palette[2]){
  const density=clamp(options.smokeDensity??defaults.smokeDensity),time=t*clamp(options.smokeSpeed??defaults.smokeSpeed,.1,3),color=rgb(accent),pixels=new Uint8ClampedArray(w*h*4);
  if(!density)return pixels;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=x/Math.max(1,w-1),v=y/Math.max(1,h-1),warp=sample(u*.28+time*.013,v*.3-time*.011),curl=sample(u*.22-time*.007,v*.31+time*.009);
   const n=sample(u*.48+warp*.22+time*.014,v*.5+curl*.19-time*.017),detail=sample(u*1.4+warp*.2+time*.018,v*1.7-curl*.2-time*.022);
   const lane=.72+.11*Math.sin(u*5.7+time*.38)+.07*Math.sin(u*11-time*.2),upper=.3+.13*Math.cos(u*4-time*.3);
   const envelope=Math.exp(-Math.pow((v-lane)/.18,2))+.4*Math.exp(-Math.pow((v-upper)/.15,2));
   const wisps=Math.pow(clamp((n-.34)*2.8+detail*.38-.08),2),edge=clamp(u*8)*clamp((1-u)*8)*clamp(v*9)*clamp((1-v)*9);
   const lit=.5+.5*sample(u*.19-time*.01,v*.23+time*.007),alpha=clamp(wisps*envelope*edge*density*1.05),i=(y*w+x)*4;
   pixels[i]=mix(color[0],235,.28)*(.62+.3*lit);pixels[i+1]=mix(color[1],231,.4)*(.62+.3*lit);pixels[i+2]=mix(color[2],222,.58)*(.62+.3*lit);pixels[i+3]=Math.round(alpha*255);
  }
  return pixels;
 }
 let smokeSurface,smokeContext,smokeImage,smokeKey='';
 function drawSmoke(cx,t,w,h,colors,options){
  if(!(options.smokeDensity??defaults.smokeDensity))return;
  const sw=w>=h?240:152,sh=Math.round(sw*h/w),stamp=Math.floor(t*30)/30,key=[stamp,sw,sh,colors[2],options.smokeDensity,options.smokeSpeed].join(':');
  if(!smokeSurface){const doc=cx.canvas?.ownerDocument;if(doc){smokeSurface=doc.createElement('canvas');smokeContext=smokeSurface.getContext('2d');}}
  if(smokeContext){
   if(smokeSurface.width!==sw||smokeSurface.height!==sh){smokeSurface.width=sw;smokeSurface.height=sh;smokeImage=smokeContext.createImageData(sw,sh);smokeKey='';}
   if(key!==smokeKey){smokeImage.data.set(smokePixels(stamp,sw,sh,options,colors[2]));smokeContext.putImageData(smokeImage,0,0);smokeKey=key;}
   cx.save();cx.imageSmoothingEnabled=true;cx.drawImage(smokeSurface,0,0,w,h);cx.restore();
  }else{
   // Non-DOM test contexts still exercise deterministic drawing operations.
   const pixels=smokePixels(t,12,8,options,colors[2]);for(let y=0;y<8;y++)for(let x=0;x<12;x++){const i=(y*12+x)*4;cx.fillStyle=`rgba(${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]/255})`;cx.fillRect(x*w/12,y*h/8,w/12,h/8);}
  }
 }
 function glow(cx,x,y,r,color,strength){const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,strength));g.addColorStop(.25,rgba(color,strength*.35));g.addColorStop(1,rgba(color,0));cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);}
 function drawLights(cx,t,w,h,colors,options){
  const strength=clamp(options.lightStrength??defaults.lightStrength),time=t*clamp(options.lightSpeed??defaults.lightSpeed,.1,3),gold=colors[2];if(!strength)return;
  cx.save();cx.globalAlpha*=strength;
  for(let i=0;i<4;i++){
   const sourceX=w*(.14+i*.24+.04*Math.sin(time*.3+i)),targetX=w*(.1+i*.27+.15*Math.sin(time*.24+i)),top=-h*.15,bottom=h*1.08;
   const g=cx.createLinearGradient(sourceX,top,targetX,bottom);g.addColorStop(0,rgba(gold,.003));g.addColorStop(.25,rgba(gold,.022+i*.002));g.addColorStop(.7,rgba(gold,.005));g.addColorStop(1,rgba(gold,0));cx.fillStyle=g;
   for(let soft=0;soft<7;soft++){const breadth=w*(.16-soft*.016);cx.beginPath();cx.moveTo(sourceX-w*.018,top);cx.lineTo(targetX-breadth,bottom);cx.lineTo(targetX+breadth,bottom);cx.lineTo(sourceX+w*.018,top);cx.closePath();cx.fill();}
  }
  const sweep=.5+.5*Math.sin(time*.45-.8),x=w*(.1+.8*sweep),y=h*(.42+.025*Math.sin(time*.4));
  glow(cx,x,y,Math.min(w,h)*.15,'#FFE6B0',.13);
  const flare=cx.createLinearGradient(x-w*.3,0,x+w*.3,0);flare.addColorStop(0,rgba(gold,0));flare.addColorStop(.48,rgba(gold,.05));flare.addColorStop(.5,'#FFF3D580');flare.addColorStop(.52,rgba(gold,.05));flare.addColorStop(1,rgba(gold,0));cx.fillStyle=flare;cx.fillRect(x-w*.3,y,w*.6,Math.max(1,h*.002));
  for(let i=0;i<30;i++){const px=((hash(i,3)+time*(.005+hash(i,4)*.008))%1)*w,py=((hash(i,7)-time*.012)%1+1)%1*h,r=Math.max(.6,w*(.0005+hash(i,11)*.0009));cx.fillStyle=rgba('#FFE5A5',(.13+.25*Math.abs(Math.sin(time+i)))*hash(i,5));cx.beginPath();cx.arc(px,py,r,0,TAU);cx.fill();}
  cx.restore();
 }
 function drawScene(cx,id,t,w,h,colors=palette,overlay=false,options={}){
  cx.save();
  if(!overlay){cx.fillStyle=colors[0];cx.fillRect(0,0,w,h);}
  if(id==='gold-velvet'){
   const g=cx.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.hypot(w,h)*.55);g.addColorStop(0,tone(colors[1],-.58));g.addColorStop(.5,tone(colors[0],.014));g.addColorStop(1,'#030303');cx.fillStyle=g;cx.fillRect(0,0,w,h);
   glow(cx,w*(.63+.05*Math.sin(t*.13)),h*.34,w*.48,colors[2],.055);
   cx.strokeStyle=rgba(colors[2],.2);cx.lineWidth=Math.max(.6,w*.00065);for(const yy of [.25,.73]){cx.beginPath();cx.moveTo(w*.38,h*yy);cx.lineTo(w*.62,h*yy);cx.stroke();}
  }else if(id==='cinematic-smoke')drawSmoke(cx,t,w,h,colors,options);
  else if(id==='cinematic-lights')drawLights(cx,t,w,h,colors,options);
  cx.restore();
 }
 function paintText(cx,text,y,fontSize,width,t,options={}){
  const color=/^#[0-9a-f]{6}$/i.test(options.color)?options.color:palette[2],strength=clamp(options.goldGlow??defaults.goldGlow),shine=clamp(options.goldShine??defaults.goldShine),speed=clamp(options.goldSpeed??defaults.goldSpeed,.1,3);
  cx.save();cx.shadowColor=rgba(color,strength*.85);cx.shadowBlur=fontSize*.32*strength;cx.shadowOffsetY=0;cx.lineWidth=Math.max(.5,fontSize*.012);cx.strokeStyle=tone(color,-.48);cx.strokeText(text,0,y);
  const g=cx.createLinearGradient(0,y-fontSize*.55,0,y+fontSize*.48);
  for(const [stop,c] of [[0,tone(color,.82)],[.17,tone(color,.12)],[.4,tone(color,.65)],[.49,tone(color,-.42)],[.54,tone(color,.84)],[.76,tone(color,-.08)],[1,tone(color,.45)]])g.addColorStop(stop,c);
  cx.fillStyle=g;cx.fillText(text,0,y);
  if(shine){const span=Math.max(width,fontSize),center=(-.85+((t*speed/3.2)%1)*1.7)*span,sweep=cx.createLinearGradient(center-span*.17,0,center+span*.17,0);sweep.addColorStop(0,'#FFFFFF00');sweep.addColorStop(.42,`rgba(255,245,218,${shine*.25})`);sweep.addColorStop(.5,`rgba(255,255,241,${shine*.95})`);sweep.addColorStop(.58,`rgba(255,245,218,${shine*.25})`);sweep.addColorStop(1,'#FFFFFF00');cx.fillStyle=sweep;cx.shadowColor=rgba('#FFF0C1',shine*.5);cx.shadowBlur=fontSize*.12*shine;cx.fillText(text,0,y);}
  cx.restore();
 }
 return {sceneIds,defaults,palette,smokePixels,drawScene,paintText,tone};
});
