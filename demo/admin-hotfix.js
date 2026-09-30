(function(){
  const DB=CFG.databaseURL.replace(/\/$/,'');
  let authState=null;
  let authTried=false;

  function openUrl(path,method='GET'){
    const u=new URL(DB+'/'+path.split('/').filter(Boolean).map(encodeURIComponent).join('/')+'.json');
    if(method==='GET')u.searchParams.set('ts',Date.now());
    return u.toString();
  }
  async function req(url,method='GET',body){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),7000);
    try{
      const opt={method,cache:'no-store',signal:ctl.signal,headers:{'Content-Type':'application/json'}};
      if(body!==undefined)opt.body=JSON.stringify(body);
      const r=await fetch(url,opt);
      const text=await r.text();
      let data=null; try{data=text?JSON.parse(text):null}catch{data=text||null}
      if(!r.ok){const e=new Error((data&&data.error)||('Firebase '+r.status));e.status=r.status;throw e}
      return data;
    } finally { clearTimeout(timer); }
  }
  async function ensureAuthOptional(){
    if(authState)return authState;
    if(authTried)return null;
    authTried=true;
    try{
      if(window.FPAuth?.ensure) authState=await FPAuth.ensure();
      return authState;
    }catch(e){
      console.warn('Anonymous Firebase auth unavailable; trying public database mode.',e);
      return null;
    }
  }
  async function authUrl(path,method='GET'){
    const a=authState||await ensureAuthOptional();
    if(!a?.idToken)throw new Error('AUTH_UNAVAILABLE');
    if(window.FPAuth?.dbUrl)return FPAuth.dbUrl(DB,path,method);
    const u=new URL(openUrl(path,method));u.searchParams.set('auth',a.idToken);return u.toString();
  }
  async function smart(path,method='GET',body){
    try{return await req(openUrl(path,method),method,body)}catch(openErr){
      try{return await req(await authUrl(path,method),method,body)}catch(authErr){
        const e=new Error(`데이터 연결 실패 (${openErr.message} / ${authErr.message})`);e.openError=openErr;e.authError=authErr;throw e;
      }
    }
  }
  async function authSmart(path,method='GET',body){
    const a=await ensureAuthOptional();
    if(a?.idToken){
      try{return await req(await authUrl(path,method),method,body)}catch(e){console.warn('Authenticated request failed; trying public mode.',e)}
    }
    return req(openUrl(path,method),method,body);
  }

  initBackend=async function(){state.backend='firebase'};
  get=async p=>smart(p,'GET');
  setv=async(p,v)=>smart(p,'PUT',v);
  upd=async(p,v)=>smart(p,'PATCH',v);
  listen=function(p,cb){
    let stopped=false,busy=false;
    const pull=async()=>{if(stopped||busy)return;busy=true;try{cb(await get(p))}catch(e){console.error('listen failed',e)}finally{busy=false}};
    pull(); const t=setInterval(pull,1000);
    return()=>{stopped=true;clearInterval(t)};
  };

  genCode=async function(){
    for(let i=0;i<30;i++){
      const c=String(Math.floor(100000+Math.random()*900000));
      try{if(!(await get(`sessions/${c}/meta`)))return c}catch(e){
        if(i>2)return c;
      }
    }
    throw new Error('활동 코드 생성 실패');
  };

  createSession=async function(){
    const b=document.getElementById('newBtn'); if(!b)return;
    b.disabled=true;b.textContent='활동 만드는 중...';
    try{
      const c=await genCode();
      const a=await ensureAuthOptional();
      const base={createdAt:Date.now(),status:'active',phase:'collecting',dialogue1Open:false,dialogue2Open:false,version:'7.2-recovery'};
      const meta=a?.uid?{...base,ownerUid:a.uid}:base;
      await authSmart(`sessions/${c}/meta`,'PUT',meta);
      state.sessionId=c;localStorage.setItem('FPSEL_LAST_ADMIN_SESSION',c);history.replaceState(null,'',aUrl(c));
      state.data={meta,participants:{}};renderDashboard();
      state.unsub?.();state.unsub=listen(`sessions/${c}`,d=>{state.data=d||{participants:{},meta};renderDashboard();refreshOverlay()});
    }catch(e){
      console.error('createSession failed',e);
      renderLanding('활동 생성 오류: '+(e?.message||String(e))+' · Firebase 익명 인증 또는 Database 규칙을 확인해 주세요.');
    }finally{
      const n=document.getElementById('newBtn');if(n){n.disabled=false;n.textContent='새 활동 만들기'}
    }
  };

  openSession=async function(code){
    code=String(code||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(code))return renderLanding('6자리 활동 코드를 입력해 주세요.');
    try{
      const meta=await get(`sessions/${code}/meta`);
      if(!meta)return renderLanding('해당 활동을 찾을 수 없습니다.');
      const a=await ensureAuthOptional();
      if(meta.ownerUid&&a?.uid&&meta.ownerUid!==a.uid)return renderLanding('이 활동은 다른 브라우저에서 만든 활동입니다. 만든 브라우저에서 다시 열어 주세요.');
      state.sessionId=code;localStorage.setItem('FPSEL_LAST_ADMIN_SESSION',code);history.replaceState(null,'',aUrl(code));state.unsub?.();
      state.unsub=listen(`sessions/${code}`,d=>{state.data=d||{participants:{},meta};renderDashboard();refreshOverlay()});
    }catch(e){renderLanding('활동 열기 오류: '+(e?.message||String(e)))}
  };

  addEventListener('unhandledrejection',e=>{
    console.error('Unhandled presenter error',e.reason);
    const a=document.getElementById('app');
    if(a&&!a.textContent.trim())a.innerHTML='<div style="max-width:720px;margin:8vh auto;padding:24px;font-family:system-ui;color:#35556a"><h1>진행자 화면을 불러오지 못했습니다.</h1><p>브라우저 새로고침 후 다시 시도해 주세요.</p><pre style="white-space:pre-wrap;background:#fff;padding:12px;border-radius:12px">'+String(e.reason?.message||e.reason||'알 수 없는 오류').replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</pre></div>';
  });
})();
