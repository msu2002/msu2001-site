/* Fahad Studio — MIT. Pure timeline model, shared by the editor and tests. */
(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.StudioCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const uid = () => (globalThis.crypto?.randomUUID?.() || 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  const clone = value => JSON.parse(JSON.stringify(value));
  const duration = p => Math.max(0, ...p.clips.map(c => c.start + c.duration));
  const active = (c, t) => t >= c.start && t < c.start + c.duration;
  function project(name = 'حكاية جديدة') {
    return { format:'fahad-studio', version:1, id:uid(), name, width:1280, height:720, background:'#080d1c', defaultFontId:'cairo', fonts:[],
      tracks:[{id:'v2', name:'فيديو إضافي', kind:'visual', hidden:false, muted:false}, {id:'t1',name:'النصوص',kind:'text',hidden:false,muted:false}, {id:'v1',name:'الفيديو الرئيسي',kind:'visual',hidden:false,muted:false}, {id:'a1',name:'الصوت والموسيقى',kind:'audio',hidden:false,muted:false}], clips:[], assets:[] };
  }
  function clip(asset, start = 0, track) {
    start=clamp(start,0,3599.9);
    return {id:uid(), assetId:asset.id, kind:asset.type, name:asset.name, track:track || (asset.type==='audio'?'a1':'v1'), start:clamp(start,0,3599.9), duration:Math.min(asset.duration || 5, 3600-Math.max(0,start)), in:0, volume:1, opacity:1, scale:1, x:.5, y:.5, rotation:0, fit:'contain', brightness:1, saturation:1, transition:'none', transitionDuration:.5};
  }
  function textClip(start=0, style={}) {
    return {...clip({id:null,type:'text',name:'عنوان جديد',duration:4},start,'t1'), text:'اكتب حكايتك هنا',color:'#ffffff',fontSize:64,fontId:'cairo',bold:true,align:'center',animation:'fade',box:false,...style};
  }
  function split(p, id, t) {
    const c=p.clips.find(x=>x.id===id);
    if(!c || t<=c.start+.05 || t>=c.start+c.duration-.05) return null;
    const cut=t-c.start, right={...clone(c),id:uid(),start:t,in:c.in+cut,duration:c.duration-cut};
    c.duration=cut; p.clips.splice(p.clips.indexOf(c)+1,0,right); return right;
  }
  function trim(c, side, delta, sourceDuration=Infinity) {
    if(side==='left') {
      const d=clamp(delta,-Math.min(c.start,c.in),c.duration-.1);
      c.start+=d; c.in+=d; c.duration-=d;
    } else c.duration=clamp(c.duration+delta,.1,Math.max(.1,sourceDuration-c.in));
    return c;
  }
  function assetUsage(p, assetId) {
    const clips=p.clips.filter(c=>c.kind!=='text'&&c.assetId===assetId),ids=new Set(clips.map(c=>c.id));
    return {clips,subtitles:p.clips.filter(c=>c.subtitleOf&&ids.has(c.subtitleOf))};
  }
  function removeAsset(p, assetId) {
    const asset=p.assets.find(a=>a.id===assetId);if(!asset)return null;
    const usage=assetUsage(p,assetId),ids=new Set([...usage.clips,...usage.subtitles].map(c=>c.id));
    p.clips=p.clips.filter(c=>!ids.has(c.id));p.assets=p.assets.filter(a=>a.id!==assetId);
    return {asset,...usage};
  }
  function time(t, frames=false) {
    const n=Math.max(0,t), min=Math.floor(n/60),sec=Math.floor(n%60);
    return String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0')+(frames?':'+String(Math.floor((n%1)*30)).padStart(2,'0'):'');
  }
  function validate(p) {
    if(!p || p.format!=='fahad-studio' || p.version!==1) throw Error('ملف المشروع غير مدعوم.');
    if(typeof p.name!=='string'||p.name.length>100||!/^#[0-9a-f]{6}$/i.test(p.background)) throw Error('بيانات المشروع غير صالحة.');
    if(!Array.isArray(p.clips)||!Array.isArray(p.tracks)||!Array.isArray(p.assets)) throw Error('ملف المشروع غير مكتمل.');
    if(p.clips.length>2500 || p.assets.length>200 || p.tracks.length<4||p.tracks.length>12) throw Error('حجم المشروع أو مساراته غير مدعوم.');
    if(!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<100||p.height<100||p.width>1920||p.height>1920) throw Error('أبعاد غير صالحة.');
    if(p.luts!==undefined){if(!Array.isArray(p.luts)||p.luts.length>8||p.luts.some(l=>!l||!/^c[0-9]{1,3}$/.test(l.id)||typeof l.name!=='string'||l.name.length>60||!Number.isInteger(l.n)||l.n<2||l.n>33||typeof l.rgb!=='string'||l.rgb.length>200000))throw Error('ملفات LUT في المشروع غير صالحة.');}
    const kindOf=id=>typeof id==='string'&&/^[vta][1-9]$/.test(id)?{v:'visual',t:'text',a:'audio'}[id[0]]:null;
    const tracks=new Map(p.tracks.map(t=>[t.id,kindOf(t.id)]));
    if(new Set(p.tracks.map(t=>t.id)).size!==p.tracks.length || p.tracks.some(t=>!t||kindOf(t.id)!==t.kind||typeof t.name!=='string'||t.name.length>60) || !['v1','v2','t1','a1'].every(id=>tracks.has(id))) throw Error('مسارات غير صالحة.');
    if(new Set(p.clips.map(c=>c.id)).size!==p.clips.length || new Set(p.assets.map(a=>a.id)).size!==p.assets.length) throw Error('معرّفات مكررة.');
    for(const a of p.assets) {
      if(!['image','video','audio','scene'].includes(a.type)||!a.id||typeof a.name!=='string') throw Error('وسائط غير صالحة.');
      if(a.type==='scene' && !['aurora','dunes','orbit','mesh','waves','bokeh','paper','sunset','grid','ripple','neon','geometric','spotlight','particles','rings','ribbons','confetti','equalizer','countdown','corners','rays','bubbles','chevrons','stars','lower-third','speed-lines','hexagons','radar','dots','heartbeats','swirls','light-sweep','floating-cards','gold-velvet','cinematic-smoke','cinematic-lights'].includes(a.scene)) throw Error('مشهد غير صالح.');
      if(a.colors!==undefined&&(!Array.isArray(a.colors)||a.colors.length!==3||a.colors.some(v=>!/^#[0-9a-f]{6}$/i.test(v))))throw Error('ألوان المشهد غير صالحة.');
      if(a.overlay!==undefined&&typeof a.overlay!=='boolean')throw Error('نوع طبقة الموشن غير صالح.');
    }
    for(const c of p.clips) {
      if(!['image','video','audio','scene','text'].includes(c.kind)||!tracks.has(c.track)) throw Error('نوع مقطع غير صالح.');
      if((c.kind==='text'&&tracks.get(c.track)!=='text') || (c.kind==='audio'&&tracks.get(c.track)!=='audio') || (['image','video','scene'].includes(c.kind)&&tracks.get(c.track)!=='visual')) throw Error('المقطع لا يطابق المسار.');
      for(const key of ['start','duration','in','volume','opacity','scale','x','y','rotation','brightness','saturation','transitionDuration']) if(!Number.isFinite(c[key])) throw Error('قيمة مقطع غير صالحة.');
      if(c.start<0||c.start>3600||c.duration<.1||c.duration>3600||c.in<0||c.in>86400||c.volume<0||c.volume>2||c.opacity<0||c.opacity>1||c.scale<.1||c.scale>4) throw Error('توقيت أو خصائص خارج الحدود.');
      if(c.kind!=='text'&&!p.assets.some(a=>a.id===c.assetId&&(a.type===c.kind||(c.kind==='audio'&&a.type==='video')))) throw Error('وسائط المقطع مفقودة.');
      if(c.fontId!==undefined&&(typeof c.fontId!=='string'||!/^[a-z][a-z0-9-]{0,90}$/i.test(c.fontId)))throw Error('معرّف خط غير صالح.');
      if(c.fontWeight!==undefined&&(!Number.isInteger(c.fontWeight)||c.fontWeight<100||c.fontWeight>1000))throw Error('وزن خط غير صالح.');
      for(const key of ['motionAmount','effectStrength','goldGlow','goldShine','smokeDensity','lightStrength','lutStrength'])if(c[key]!==undefined&&(!Number.isFinite(c[key])||c[key]<0||c[key]>1))throw Error('قوة التأثير خارج الحدود.');
      for(const key of ['goldSpeed','smokeSpeed','lightSpeed'])if(c[key]!==undefined&&(!Number.isFinite(c[key])||c[key]<.1||c[key]>3))throw Error('سرعة التأثير خارج الحدود.');
      if(c.textStyle!==undefined&&!['plain','cinematic-gold'].includes(c.textStyle))throw Error('خامة نص غير صالحة.');
      for(const key of ['gTemp','gTint','gContrast'])if(c[key]!==undefined&&(!Number.isFinite(c[key])||c[key]<-1||c[key]>1))throw Error('ضبط اللون خارج الحدود.');
      if(c.lut!==undefined&&(typeof c.lut!=='string'||!/^[a-z][a-z0-9-]{0,40}$/.test(c.lut)))throw Error('معرّف LUT غير صالح.');
      for(const key of ['motion','effect','animation','transition'])if(c[key]!==undefined&&(typeof c[key]!=='string'||!/^[a-z][a-z-]{0,40}$/.test(c[key])))throw Error('معرّف حركة أو تأثير غير صالح.');
      if(c.paletteColors!==undefined&&(!Array.isArray(c.paletteColors)||c.paletteColors.length!==3||c.paletteColors.some(v=>!/^#[0-9a-f]{6}$/i.test(v))))throw Error('ألوان المقطع غير صالحة.');
      if(c.kind==='text' && (typeof c.text!=='string'||c.text.length>3000||!Number.isFinite(c.fontSize)||c.fontSize<8||c.fontSize>300)) throw Error('نص غير صالح.');
    }
    if(duration(p)>3600) throw Error('الحد الأقصى للمشروع ساعة واحدة.');
    return p;
  }
  return {uid,clamp,clone,duration,active,project,clip,textClip,split,trim,assetUsage,removeAsset,time,validate};
});
