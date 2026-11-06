/* Fahad Studio — MIT. Source-relative cues survive video trims and moves. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.StudioCore);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CaptionModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const styleKeys=['fontId','fontWeight','fontSize','color','bold','box','x','y','scale','opacity','rotation','animation','transition','transitionDuration','motion','motionAmount','effect','effectStrength','textStyle','goldGlow','goldShine','goldSpeed'];
 function normalize(result,duration){
  const chunks=Array.isArray(result.chunks)&&result.chunks.length?result.chunks:[{text:result.text||'',timestamp:[0,duration],estimated:true}];
  const cues=[];
  for(let index=0;index<chunks.length;index++){
   const chunk=chunks[index],text=String(chunk.text||'').replace(/<\|[^>]*\|>/g,'').replace(/\s+/g,' ').trim();
   if(!text)continue;
   const timestamps=chunk.timestamp||[],start=C.clamp(timestamps[0]??0,0,duration),end=C.clamp(timestamps[1]??chunks[index+1]?.timestamp?.[0]??duration,start,duration);
   if(end-start<.1)continue;
   const words=text.split(' '),groups=[];let group=[];
   for(const word of words){if(group.length&&(group.length>=7||[...group.join(' ')+' '+word].length>43)){groups.push(group.join(' '));group=[];}group.push(word);}if(group.length)groups.push(group.join(' '));
   const total=groups.reduce((n,g)=>n+[...g].length,0);let used=0;
   for(const g of groups){const a=start+(end-start)*used/total;used+=[...g].length;const b=start+(end-start)*used/total;if(b-a<.1)continue;cues.push({id:'cue-'+(cues.length+1),start:Number(a.toFixed(3)),end:Number(b.toFixed(3)),text:g,estimated:!!chunk.estimated||groups.length>1});}
  }
  return cues;
 }
 function validateAssets(assets){
  for(const a of assets){if(a.captions===undefined)continue;if(!Array.isArray(a.captions)||a.captions.length>2000)throw Error('بيانات الترجمة غير صالحة.');const ids=new Set();for(const q of a.captions){if(typeof q.id!=='string'||ids.has(q.id)||typeof q.text!=='string'||q.text.length>3000||!Number.isFinite(q.start)||!Number.isFinite(q.end)||q.start<0||q.end-q.start<.09||q.end>86400)throw Error('توقيت أو نص ترجمة غير صالح.');ids.add(q.id);}}
 }
 function reconcile(p){
  validateAssets(p.assets);
  const plain=p.clips.filter(c=>!c.subtitleOf),generated=[];
  for(const video of plain){if(video.kind!=='video'||video.captionsEnabled===false)continue;const asset=p.assets.find(a=>a.id===video.assetId);if(!asset?.captions?.length)continue;
   for(const cue of asset.captions){const start=Math.max(video.in,cue.start),end=Math.min(video.in+video.duration,cue.end);if(end-start<.1)continue;
    const styling={fontId:p.defaultCaptionFontId||p.defaultFontId||'system',fontSize:Math.max(28,Math.round(p.width*.042)),color:'#ffffff',bold:true,box:true,x:.5,y:.85,animation:'none',...asset.captionStyle,...cue.style};
    const c=C.textClip(video.start+start-video.in,styling);Object.assign(c,{id:'caption-'+video.id+'-'+cue.id,name:'ترجمة: '+cue.text.slice(0,35),text:cue.text,duration:end-start,in:0,subtitleOf:video.id,cueId:cue.id,estimated:!!cue.estimated});generated.push(c);
   }
  }
  p.clips=[...plain,...generated];return p;
 }
 function updateLinked(p,c,key,value){
  if(!c.subtitleOf)return false;const parent=p.clips.find(v=>v.id===c.subtitleOf),a=p.assets.find(a=>a.id===parent?.assetId),q=a?.captions?.find(q=>q.id===c.cueId);if(!q)return false;
  if(key==='text')q.text=String(value);
  else if(key==='start'){const dur=q.end-q.start;q.start=C.clamp(parent.in+value-parent.start,0,Math.max(0,a.duration-dur));q.end=q.start+dur;}
  else if(key==='duration')q.end=C.clamp(q.start+value,q.start+.1,a.duration);
  else if(styleKeys.includes(key)){q.style={...q.style,[key]:value};}
  return true;
 }
 function stamp(t){const ms=Math.round(Math.max(0,t)*1000),hour=Math.floor(ms/3600000),minute=Math.floor(ms/60000)%60,sec=Math.floor(ms/1000)%60;return [hour,minute,sec].map(n=>String(n).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');}
 function srt(p){const subtitles=p.clips.filter(c=>c.subtitleOf&&!p.tracks.find(t=>t.id===p.clips.find(v=>v.id===c.subtitleOf)?.track)?.hidden&&!p.tracks.find(t=>t.id==='t1')?.hidden).sort((a,b)=>a.start-b.start);return subtitles.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.start+c.duration)}\n${c.text}\n`).join('\n');}
 function restored(a){if(['queued','decoding','loading','transcribing'].includes(a.transcription?.status))return {...a,transcription:{...a.transcription,status:a.captions?.length?'complete':'cancelled'}};return a;}
 return {normalize,validateAssets,reconcile,updateLinked,srt,stamp,restored};
});
