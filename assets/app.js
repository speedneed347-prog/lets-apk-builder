/* Let-S APK Builder — production frontend API client */
const API_BASE = (window.API_BASE || "https://lets-apk-builder-backend.onrender.com").replace(/\/+$/, "");
const API_TIMEOUT_MS = 30000;

const adminAuth = {
  getToken(){ return localStorage.getItem("admin_token"); },
  getUser(){ try{return JSON.parse(localStorage.getItem("admin_user")||"null")}catch{return null} },
  isLoggedIn(){ return !!this.getToken(); },
  logout(){ localStorage.removeItem("admin_token"); localStorage.removeItem("admin_user"); },
  authHeaders(){ const t=this.getToken(); return t?{Authorization:`Bearer ${t}`}:{ }; }
};

async function apiFetch(path, options={}){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(), options.timeout||API_TIMEOUT_MS);
  try{
    const headers={Accept:"application/json",...(options.body?{"Content-Type":"application/json"}:{}),...adminAuth.authHeaders(),...(options.headers||{})};
    const res=await fetch(`${API_BASE}${path}`,{...options,headers,signal:controller.signal});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data.error||`Request failed (${res.status})`);e.status=res.status;e.code=data.code;e.data=data;throw e;}
    return data;
  }catch(e){if(e.name==="AbortError")throw new Error("Request timed out. Please try again.");throw e;}
  finally{clearTimeout(timer);}
}

const api={
  platform:()=>apiFetch(`/api/platform?_=${Date.now()}`),
  health:()=>apiFetch(`/api/health?_=${Date.now()}`),
  ready:()=>apiFetch(`/api/health/ready?_=${Date.now()}`),
  createBuild:p=>apiFetch("/api/build",{method:"POST",body:JSON.stringify(p),timeout:60000}),
  getBuild:id=>apiFetch(`/api/build/${encodeURIComponent(id)}?_=${Date.now()}`),
  listBuilds:async(limit=20)=>(await apiFetch(`/api/builds?limit=${Math.min(Number(limit)||20,100)}&_=${Date.now()}`)).builds||[],
  getBuildHistory:async(id,limit=100)=>(await apiFetch(`/api/build/${encodeURIComponent(id)}/history?limit=${limit}&_=${Date.now()}`)).history||[],
  getBuildArtifacts:async id=>(await apiFetch(`/api/build/${encodeURIComponent(id)}/artifacts?_=${Date.now()}`)).artifacts||[],
  listCommonModules:async()=>(await apiFetch(`/api/common-modules?_=${Date.now()}`)).modules||[],
  downloadUrl:id=>`${API_BASE}/api/download/${encodeURIComponent(id)}`,
  streamUrl:id=>`${API_BASE}/api/build/${encodeURIComponent(id)}/stream`
};

function qs(name){return new URLSearchParams(location.search).get(name);}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
function escapeHtml(s){return String(s??"").replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"}[c]||c));}
function formatBytes(n){n=Number(n);if(!Number.isFinite(n)||n<0)return"—";if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(2)} MB`;}
function formatDate(v){if(!v)return"—";try{return new Date(v).toLocaleString()}catch{return String(v)}}
function formatDuration(ms){ms=Number(ms);if(!Number.isFinite(ms)||ms<0)return"—";const s=Math.floor(ms/1000),m=Math.floor(s/60),sec=s%60;return m?`${m}m ${sec}s`:`${sec}s`;}
function artifactLabel(type){return String(type||"").toLowerCase()==="aab"?"AAB":"APK";}

/* Icon processor */
const ICON_TARGET_SIZE=512, ICON_MAX_BYTES=500*1024;
function loadImage(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error("Cannot decode image"))};img.src=u;});}
async function iconToPngBase64(img,size){
  const c=document.createElement("canvas");c.width=c.height=size;const x=c.getContext("2d");x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";x.clearRect(0,0,size,size);
  const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height,side=Math.min(sw,sh);
  x.drawImage(img,(sw-side)/2,(sh-side)/2,side,side,0,0,size,size);
  const blob=await new Promise(r=>c.toBlob(r,"image/png",.92));if(!blob)throw new Error("Canvas failed");
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
  return{dataUrl:data,bytes:blob.size};
}
async function processIcon(file){
  const img=await loadImage(file),sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;let last;
  for(const size of[512,384,256,192,128]){const r=await iconToPngBase64(img,size);last=r;if(r.bytes<=ICON_MAX_BYTES)return{base64:r.dataUrl,bytes:r.bytes,width:size,height:size,originalBytes:file.size,originalWidth:sw,originalHeight:sh};}
  throw new Error(`Icon too large (${Math.round(last.bytes/1024)} KB)`);
}

document.addEventListener("DOMContentLoaded",()=>{
  const link=document.getElementById("adminNavLink");if(!link)return;
  if(adminAuth.isLoggedIn()){const u=adminAuth.getUser();link.textContent="Admin ✓";link.href="build.html";link.title=`Logged in as ${u?.email||"admin"}`;link.addEventListener("click",e=>{if(confirm("Log out of admin?")){e.preventDefault();adminAuth.logout();location.href="index.html";}});}
});
