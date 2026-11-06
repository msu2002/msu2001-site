/* Fahad Studio — MIT. Fonts remain local and travel with portable projects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FontKit=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function inspect(buffer,fileName='خط مستورد'){
  const v=new DataView(buffer),length=buffer.byteLength;
  if(length<12||length>12*1024*1024)throw Error('ملف الخط غير صالح أو يتجاوز 12 MB.');
  const tag=(offset)=>String.fromCharCode(...new Uint8Array(buffer,offset,4));
  const magic=tag(0),types={'OTTO':'otf','wOFF':'woff','wOF2':'woff2','true':'ttf'};
  const format=v.getUint32(0)===0x00010000?'ttf':types[magic];
  if(!format)throw Error('استخدم ملف TTF أو OTF أو WOFF أو WOFF2 صالحًا.');
  let name=fileName.replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[_]/g,' ').slice(0,100),weight='400',style='normal';
  if(format==='ttf'||format==='otf'){
   const count=v.getUint16(4),tables=new Map();if(count>256||12+count*16>length)throw Error('بنية الخط غير صالحة.');
   for(let i=0;i<count;i++){const p=12+i*16,offset=v.getUint32(p+8),size=v.getUint32(p+12);if(offset+size>length)throw Error('بيانات الخط غير مكتملة.');tables.set(tag(p),{offset,size});}
   const os=tables.get('OS/2');if(os?.size>=8){const w=v.getUint16(os.offset+4);if(w>=100&&w<=1000)weight=String(w);if(os.size>=64&&(v.getUint16(os.offset+62)&1))style='italic';}
   const fvar=tables.get('fvar');if(fvar?.size>=16){const start=v.getUint16(fvar.offset+4),axes=v.getUint16(fvar.offset+8),step=v.getUint16(fvar.offset+10);if(step>=20&&axes<32&&start+axes*step<=fvar.size){for(let i=0;i<axes;i++){const p=fvar.offset+start+i*step;if(tag(p)==='wght'){const min=Math.round(v.getInt32(p+4)/65536),max=Math.round(v.getInt32(p+12)/65536);if(min>=100&&max<=1000&&min<=max)weight=min===max?String(min):min+' '+max;}}}}
  }
  return {name,format,weight,style};
 }
 function validateRecords(records){
  if(!Array.isArray(records)||records.length>30)throw Error('الحد الأقصى ٣٠ ملف خط مستورد للمشروع.');const ids=new Set();
  for(const r of records){const weights=String(r.weight).split(' ').map(Number);if(!/^user-[a-z0-9-]{5,80}$/i.test(r.id)||ids.has(r.id)||typeof r.name!=='string'||r.name.length>100||typeof r.fileName!=='string'||r.fileName.length>200||!['ttf','otf','woff','woff2'].includes(r.format)||!['normal','italic'].includes(r.style)||!Number.isFinite(r.size)||r.size<12||r.size>12*1024*1024||weights.length>2||weights.some(n=>!Number.isInteger(n)||n<100||n>1000)||(weights.length===2&&weights[1]<weights[0]))throw Error('بيانات الخطوط المستوردة غير صالحة.');ids.add(r.id);}
  return records;
 }
 function weightsFor(record){const values=new Set();for(const face of record?.faces||[record||{weight:'400 700'}]){const [lo,hi=lo]=String(face.weight).split(' ').map(Number);values.add(lo);values.add(hi);for(let w=Math.ceil(lo/100)*100;w<=hi;w+=100)values.add(w);}return [...values].filter(Number.isFinite).sort((a,b)=>a-b);}
 function validateProject(p){validateRecords(p.fonts||[]);const ids=new Set((p.fonts||[]).map(f=>f.id));const references=[p.defaultFontId,p.defaultCaptionFontId,...(p.clips||[]).map(c=>c.fontId),...(p.assets||[]).flatMap(a=>[a.captionStyle?.fontId,...(a.captions||[]).map(q=>q.style?.fontId)])];for(const id of references){if(id===undefined)continue;if(typeof id!=='string'||!/^[a-z][a-z0-9-]{0,90}$/i.test(id)||id.startsWith('user-')&&!ids.has(id))throw Error('خط مستورد مستخدم في المشروع مفقود.');}}
 class FontLibrary{
  constructor(){this.catalog=[];this.custom=new Map();this.archive=new Map();this.faces=new Map();this.pending=new Map();this.errors=new Map();}
  async init(){this.base=new URL('./fonts/',document.baseURI).href;const response=await fetch(new URL('catalog.json',this.base));if(!response.ok)throw Error('تعذّر فتح مكتبة الخطوط.');const data=await response.json();if(!Array.isArray(data.families)||data.families.length>100)throw Error('فهرس الخطوط غير صالح.');this.catalog=data.families;return this;}
  list(){return [{id:'system',name:'System',label:'خط النظام',category:'system',faces:[{weight:'400'},{weight:'700'}]},...this.custom.values()].map(r=>r.id==='system'?r:{...r,label:r.name,category:'imported'}).concat(this.catalog);}
  lookup(id){return id==='system'||!id?this.list()[0]:this.custom.get(id)||this.catalog.find(f=>f.id===id);}
  name(id){const r=this.lookup(id);return r?.label||r?.name||'خط غير متاح';}
  family(id){return id&&id!=='system'?'FS_'+id.replace(/[^a-z0-9]/gi,''):'Tahoma';}
  css(id){return id&&id!=='system'?`"${this.family(id)}", Tahoma, Arial, sans-serif`:'Tahoma, Arial, sans-serif';}
  request(id){if(id&&id!=='system'&&this.lookup(id)&&!this.faces.has(id)&&!this.errors.has(id))this.ensure(id).catch(()=>{});return this.css(id);}
  async ensure(id){
   if(!id||id==='system')return;if(this.faces.has(id))return;if(this.pending.has(id))return this.pending.get(id);if(this.errors.has(id))throw this.errors.get(id);
   const r=this.lookup(id);if(!r)throw Error('خط مستخدم في المشروع غير متاح. أعد استيراده أو اختر خطًا آخر.');
   const promise=(async()=>{const loaded=[];try{for(const source of r.faces||[r]){const data=r.blob?await r.blob.arrayBuffer():`url(${JSON.stringify(new URL(source.file,this.base).href)})`;const face=new FontFace(this.family(id),data,{weight:source.weight||'400',style:source.style||r.style||'normal'});await face.load();document.fonts.add(face);loaded.push(face);}this.faces.set(id,loaded);}catch(error){loaded.forEach(f=>document.fonts.delete(f));const reason=Error('تعذّر تحميل الخط «'+this.name(id)+'».');this.errors.set(id,reason);throw reason;}finally{this.pending.delete(id);}})();
   this.pending.set(id,promise);return promise;
  }
  options(id){const r=this.lookup(id),real=weightsFor(r);if(real.includes(400)&&!real.includes(700))real.push(700);return real.sort((a,b)=>a-b).map(value=>({value,synthetic:!weightsFor(r).includes(value)}));}
  weight(id,desired=700){const options=this.options(id);return options.reduce((best,w)=>Math.abs(w.value-desired)<Math.abs(best-desired)?w.value:best,options[0]?.value||400);}
  descriptors(){return [...this.custom.values()].map(({id,name,fileName,format,weight,style,size})=>({id,name,fileName,format,weight,style,size}));}
  blobs(){return [...this.custom.values()].map(f=>({id:'font:'+f.id,blob:f.blob}));}
  async add(file){
   if(this.custom.size>=30)throw Error('وصل المشروع إلى الحد الأقصى: ٣٠ خطًا مستوردًا.');
   if(!/\.(ttf|otf|woff2?)$/i.test(file.name)||file.size>12*1024*1024)throw Error('استورد TTF أو OTF أو WOFF أو WOFF2 بحجم حتى 12 MB.');
   const info=inspect(await file.arrayBuffer(),file.name),id='user-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
   const entry={...info,id,fileName:file.name.slice(0,200),size:file.size,blob:file};validateRecords([entry]);this.custom.set(id,entry);this.archive.set(id,entry);
   try{await this.ensure(id);return entry;}catch(e){this.custom.delete(id);this.archive.delete(id);throw e;}
  }
  clearImported(){for(const id of this.archive.keys()){this.faces.get(id)?.forEach(f=>document.fonts.delete(f));this.faces.delete(id);this.errors.delete(id);this.pending.delete(id);}this.custom.clear();this.archive.clear();}
  async validateBlobs(records,blobs){validateRecords(records);for(const record of records){const blob=blobs.get('font:'+record.id);if(!blob||blob.size!==record.size)throw Error('ملف خط مستورد مفقود أو غير مكتمل.');const bytes=await blob.arrayBuffer();inspect(bytes,record.fileName);await new FontFace('FS_validate_'+record.id.replace(/[^a-z0-9]/gi,''),bytes,{weight:record.weight,style:record.style}).load();}}
  async restore(records,blobs){validateRecords(records);for(const record of records){const blob=blobs.get('font:'+record.id);if(!blob||blob.size!==record.size)throw Error('ملف خط مستورد مفقود من المشروع.');inspect(await blob.arrayBuffer(),record.fileName);const entry={...record,blob};this.custom.set(record.id,entry);this.archive.set(record.id,entry);await this.ensure(record.id);}}
  restoreMemory(records){validateRecords(records);const next=new Map();for(const r of records){const cached=this.archive.get(r.id);if(!cached)throw Error('تعذّر استعادة الخط المستورد.');next.set(r.id,{...cached,...r});}this.custom=next;}
  async prepareProject(p){await Promise.all([...new Set(p.clips.filter(c=>c.kind==='text').map(c=>c.fontId||'system'))].map(id=>this.ensure(id)));}
 }
 return {FontLibrary,inspect,validateRecords,weightsFor,validateProject};
});
