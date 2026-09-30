(function(){
  const API_KEY='AIzaSyB6mWBT6IYc9BkGBPvPhIb0HBDA0Vj3Bxo';
  const STORE='FPSEL_FIREBASE_AUTH_V1';
  let inflight=null;
  function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
  function save(v){localStorage.setItem(STORE,JSON.stringify(v));return v}
  async function signup(){
    const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(API_KEY),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j?.error?.message||('AUTH '+r.status));
    return save({uid:j.localId,idToken:j.idToken,refreshToken:j.refreshToken,expiresAt:Date.now()+Number(j.expiresIn||3600)*1000});
  }
  async function refresh(s){
    const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+encodeURIComponent(API_KEY),{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:s.refreshToken})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j?.error?.message||('AUTH REFRESH '+r.status));
    return save({uid:j.user_id||s.uid,idToken:j.id_token,refreshToken:j.refresh_token||s.refreshToken,expiresAt:Date.now()+Number(j.expires_in||3600)*1000});
  }
  async function ensure(){
    if(inflight)return inflight;
    inflight=(async()=>{
      let s=load();
      if(s?.idToken&&s?.uid&&s.expiresAt>Date.now()+5*60*1000)return s;
      if(s?.refreshToken){try{return await refresh(s)}catch(e){console.warn('Auth refresh failed; new anonymous session',e);localStorage.removeItem(STORE)}}
      return signup();
    })();
    try{return await inflight}finally{inflight=null}
  }
  async function dbUrl(base,path,method='GET'){
    const a=await ensure();
    const u=new URL(base.replace(/\/$/,'')+'/'+path.split('/').filter(Boolean).map(encodeURIComponent).join('/')+'.json');
    u.searchParams.set('auth',a.idToken);
    if(method==='GET')u.searchParams.set('ts',Date.now());
    return u.toString();
  }
  window.FPAuth={ensure,dbUrl,clear:()=>localStorage.removeItem(STORE)};
})();