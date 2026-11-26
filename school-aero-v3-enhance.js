/* ===== تحسينات فهد ستوديو فوق مرجع الأدوار: واجهة، بلاط، أسفلت، سيارات، إنارة شارع ===== */
(function(){
function ready(f){ if(window.__ready) f(); else setTimeout(()=>ready(f),120); }
ready(function(){ try{ run(); }catch(e){ console.error('enhance failed',e); } });

function run(){
  const S = window.__school, scene = S.scene, G = S.G;
  const B = (x,y,z)=> new THREE.Vector3(x,z,-y);           // إحداثيات Blender -> three
  const rnd = seed => { let s=seed>>>0; return ()=> (s=(s*1664525+1013904223)>>>0)/4294967296; };
  const dirty = ()=>{ try{ S.applyVisibility(); }catch(e){} };

  /* ---------- 1) طلاء الجدران: ترابي من الخارج، كريمي من الداخل + بلاط الأرضيات ---------- */
  const GL_COMMON = `
  varying vec3 vWP;
  float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
  const WALL_BODY = `
  { vec3 gN = normalize(cross(dFdx(vWP), dFdy(vWP)));
    float lum = dot(diffuseColor.rgb, vec3(.299,.587,.114));
    if(abs(gN.y) < 0.5){
      float outward = dot(normalize(gN.xz+vec2(1e-4)), normalize(vWP.xz-vec2(-6.0,-4.0)));
      float k = smoothstep(-0.25,0.25,outward);
      vec3 nc = mix(vec3(0.89,0.76,0.47), vec3(0.66,0.36,0.115), k);
      vec2 w2 = vec2(vWP.x+vWP.z, vWP.y);
      float q = vn(w2*1.3)*0.6 + vn(w2*7.0)*0.4;
      nc *= 0.86 + 0.26*q;
      float crack = 1.0 - smoothstep(0.0, 0.02, abs(vn(w2*2.3+3.7)-0.5));
      nc *= 1.0 - 0.28*crack*k;
      diffuseColor.rgb = nc * (0.55 + 0.7*lum);
    } else { diffuseColor.rgb *= vec3(1.0,0.96,0.88); }
  }`;
  const FLOOR_BODY = `
  { vec3 gN = normalize(cross(dFdx(vWP), dFdy(vWP)));
    if(gN.y > 0.9){
      float lum = dot(diffuseColor.rgb, vec3(.299,.587,.114));
      vec2 q2 = vec2(vWP.x+vWP.z, vWP.x-vWP.z)*0.7071/0.42; vec2 g=fract(q2);
      float chk = mod(floor(q2.x)+floor(q2.y),2.0);
      vec3 tile = mix(vec3(0.80,0.78,0.68), vec3(0.60,0.73,0.66), chk);
      float line = min(min(g.x,1.-g.x),min(g.y,1.-g.y));
      tile *= mix(0.62,1.0,smoothstep(0.0,0.03,line));
      diffuseColor.rgb = tile * (0.78+0.4*lum);
    } }`;
  function patch(mat, body, key){
    if(mat.userData.fsPatched) return; mat.userData.fsPatched = true;
    mat.onBeforeCompile = sh=>{
      sh.vertexShader = sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>','#include <common>\n'+GL_COMMON)
        .replace('#include <color_fragment>','#include <color_fragment>\n'+body);
    };
    mat.customProgramCacheKey = ()=> key;
    mat.needsUpdate = true;
  }
  const hexOf = m=> m.color ? m.color.getHexString() : '';
  const seenM = new Set(); let road=null, wallN=0, floorN=0;
  scene.traverse(o=>{
    if(!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.isMeshStandardMaterial) return;
    const m = o.material, h = hexOf(m);
    if(h==='baa483' && !seenM.has(m)){ seenM.add(m); patch(m, WALL_BODY, 'fs_wall'); wallN++; }
    else if(h==='beb49d' && !seenM.has(m)){ seenM.add(m); patch(m, FLOOR_BODY, 'fs_floor'); floorN++; }
    else if(h==='171a1b' && !road){ road = o; }
  });

  /* ---------- 2) أسفلت محبّب كما في الصور ---------- */
  function canvasTex(size, draw){
    const c=document.createElement('canvas'); c.width=c.height=size; draw(c.getContext('2d'),size);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; return t;
  }
  let roadBox = null;
  if(road){
    const R=rnd(7);
    const map = canvasTex(1024,(g,Sz)=>{
      g.fillStyle='#8a847a'; g.fillRect(0,0,Sz,Sz);
      for(let i=0;i<26000;i++){ const x=R()*Sz,y=R()*Sz,r=1.2+R()*R()*5, v=115+R()*125|0, w=3+(R()*8|0);
        g.fillStyle=`rgba(${v+w},${v+w*0.6|0},${v-w*0.5|0},${0.55+R()*0.4})`; g.beginPath(); g.ellipse(x,y,r,r*(0.6+R()*0.4),R()*3,0,6.283); g.fill(); }
      for(let i=0;i<260;i++){ const x=R()*Sz,y=R()*Sz,r=12+R()*50, gr=g.createRadialGradient(x,y,0,x,y,r), d=R()<.55;
        gr.addColorStop(0,d?'rgba(20,19,18,.22)':'rgba(190,175,150,.10)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2); }
    });
    map.encoding = THREE.sRGBEncoding;
    const R2=rnd(11);
    const bump = canvasTex(1024,(g,Sz)=>{ g.fillStyle='#808080'; g.fillRect(0,0,Sz,Sz);
      for(let i=0;i<30000;i++){ const x=R2()*Sz,y=R2()*Sz,r=1.2+R2()*R2()*5, v=90+R2()*165|0; g.fillStyle=`rgb(${v},${v},${v})`; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill(); } });
    const old = road.material.map;
    // أبعاد الطريق بالمتر: نحسب التكرار بحيث تكون كل لبنة 5 أمتار
    road.updateWorldMatrix(true,false);
    const bb = new THREE.Box3().setFromObject(road); roadBox = bb;
    const sx = bb.max.x-bb.min.x, sz = bb.max.z-bb.min.z;
    const u = (sx>=sz?sx:sz)/5, vv = (sx>=sz?sz:sx)/5;
    map.repeat.set(u,vv); bump.repeat.set(u,vv);
    if(old){ map.rotation=old.rotation; }
    const m = road.material.clone(); m.map=map; m.bumpMap=bump; m.bumpScale=1.6; m.color.setHex(0xc4beb2); m.roughness=1; m.needsUpdate=true; road.material=m; road.receiveShadow=true;
  }

  /* ---------- 3) إبقاء 4 سيارات فقط أمام المبنى ---------- */
  let hidden=0;
  G.ground.children.slice().forEach(c=>{ if(c.type==='Group' && c.children.length===18){ const bb=new THREE.Box3().setFromObject(c), sz=bb.getSize(new THREE.Vector3());
    if(Math.min(sz.x,sz.z)<2.6 && Math.max(sz.x,sz.z)>4 && sz.y<2.2){ const front = bb.min.z>38 && bb.min.x>-40 && bb.min.x<10; if(!front){ G.ground.remove(c); hidden++; } } } });
  const old={length:hidden};

  /* ---------- 4) تفاصيل الشارع: أرصفة وأعمدة إنارة ---------- */
  if(roadBox){
    const mCurb=new THREE.MeshStandardMaterial({color:0xb9b2a4,roughness:.9}), mPole=new THREE.MeshStandardMaterial({color:0x2c2f33,roughness:.5,metalness:.6});
    const cx=(roadBox.min.x+roadBox.max.x)/2, L=Math.min(roadBox.max.x-roadBox.min.x,70);
    for(const z of [roadBox.min.z, roadBox.max.z]){
      const c=new THREE.Mesh(new THREE.BoxGeometry(L,.16,.28),mCurb); c.position.set(cx,.08,z); c.castShadow=c.receiveShadow=true; G.ground.add(c);
    }
    const farZ=roadBox.max.z+1.0;
    for(let x=-36;x<=36;x+=18){
      const g=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,6.4,10),mPole); pole.position.y=3.2; g.add(pole);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,1.5),mPole); arm.position.set(0,6.35,.7); g.add(arm);
      const head=new THREE.Mesh(new THREE.BoxGeometry(.34,.1,.7),mPole); head.position.set(0,6.3,1.35); g.add(head);
      g.position.set(x,0,farZ); g.rotation.y=Math.PI; g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.ground.add(g);
    }
  }
  console.log('[enhance] walls',wallN,'floors',floorN,'oldCars',old.length,'road',!!road);
  dirty(); setTimeout(dirty,800);
}
})();
