/* Arabic ASR executes in this worker. All dependencies and weights are same-origin. */
import {pipeline,env} from './vendor/transformers.min.js';
/* GitHub Pages: الملف الكبير مقسوم إلى أجزاء (حد الرفع 25MB)؛ يُجمَّع هنا عند الطلب. */
const SPLIT={'decoder_model_merged_quantized.onnx':['decoder_model_merged_quantized.onnx.part0','decoder_model_merged_quantized.onnx.part1','decoder_model_merged_quantized.onnx.part2']};
const nativeFetch=self.fetch.bind(self);
self.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:(input&&input.url)||String(input);
 const name=url.split('?')[0].split('/').pop();
 if(!SPLIT[name])return nativeFetch(input,init);
 const base=url.split('?')[0].slice(0,-name.length);
 const parts=await Promise.all(SPLIT[name].map(p=>nativeFetch(base+p,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('تعذر تحميل جزء النموذج: '+p);return r.arrayBuffer();})));
 const total=parts.reduce((n,b)=>n+b.byteLength,0);
 const whole=new Uint8Array(total);let o=0;for(const b of parts){whole.set(new Uint8Array(b),o);o+=b.byteLength;}
 return new Response(whole,{status:200,headers:{'Content-Type':'application/octet-stream','Content-Length':String(total)}});
};
env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath=new URL('./models/',import.meta.url).href;
env.useBrowserCache=false;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
let transcriber;
self.onmessage=async event=>{
 const {id,audio}=event.data;const send=(type,data={})=>self.postMessage({id,type,...data});
 try{
  if(!transcriber){send('loading');transcriber=await pipeline('automatic-speech-recognition','whisper-base',{device:'wasm',dtype:'q8',local_files_only:true,progress_callback:progress=>{if(/\.onnx$/.test(progress.file||''))send('loading',{progress:progress.progress??(progress.status==='done'?100:0)});}});}
  send('transcribing');
  const result=await transcriber(new Float32Array(audio),{language:'arabic',task:'transcribe',return_timestamps:true,chunk_length_s:30,stride_length_s:5,max_new_tokens:384,do_sample:false});
  send('complete',{result});
 }catch(error){transcriber=null;send('error',{message:error?.message||String(error)});}
};
