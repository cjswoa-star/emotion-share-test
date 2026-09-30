(function(){
  const DB=CFG.databaseURL.replace(/\/$/,'');
  async function rest(path,method='GET',body){
    const url=await FPAuth.dbUrl(DB,path,method);
    const opt={method,cache:'no-store',headers:{'Content-Type':'application/json'}};
    if(body!==undefined)opt.body=JSON.stringify(body);
    const r=await fetch(url,opt);const text=await r.text();let j=null;try{j=text?JSON.parse(text):null}catch{}
    if(!r.ok)throw new Error(j?.error||('Firebase '+r.status));
    return j;
  }
  initBackend=async function(){await FPAuth.ensure();state.backend='firebase'};
  get=async p=>rest(p,'GET');
  setv=async(p,v)=>rest(p,'PUT',v);
  upd=async(p,v)=>rest(p,'PATCH',v);
  listen=function(p,cb){let stopped=false,busy=false;const pull=async()=>{if(stopped||busy)return;busy=true;try{cb(await get(p))}catch(e){console.error('listen failed',e)}finally{busy=false}};pull();const t=setInterval(pull,900);return()=>{stopped=true;clearInterval(t)}};
  genCode=async function(){for(let i=0;i<30;i++){const c=String(Math.floor(100000+Math.random()*900000));if(!(await get(`sessions/${c}/meta`)))return c}throw new Error('활동 코드 생성 실패')};
  createSession=async function(){
    const b=document.getElementById('newBtn');if(!b)return;b.disabled=true;b.textContent='활동 만드는 중...';
    try{
      const a=await FPAuth.ensure(),c=await genCode();
      const meta={createdAt:Date.now(),status:'active',phase:'collecting',dialogue1Open:false,dialogue2Open:false,ownerUid:a.uid,version:'7.2-auth'};
      await setv(`sessions/${c}/meta`,meta);
      state.sessionId=c;localStorage.setItem('FPSEL_LAST_ADMIN_SESSION',c);history.replaceState(null,'',aUrl(c));
      state.unsub?.();state.unsub=listen(`sessions/${c}`,d=>{state.data=d||{participants:{},meta};renderDashboard();refreshOverlay()});
    }catch(e){console.error(e);renderLanding('활동 생성 오류: '+(e?.message||String(e)))}
    finally{const n=document.getElementById('newBtn');if(n){n.disabled=false;n.textContent='새 활동 만들기'}}
  };
  openSession=async function(code){
    code=String(code||'').replace(/\D/g,'').slice(0,6);if(!/^\d{6}$/.test(code))return renderLanding('6자리 활동 코드를 입력해 주세요.');
    try{
      const a=await FPAuth.ensure(),meta=await get(`sessions/${code}/meta`);
      if(!meta)return renderLanding('해당 활동을 찾을 수 없습니다.');
      if(meta.ownerUid!==a.uid)return renderLanding('이 브라우저에서 만든 활동이 아닙니다. 만든 브라우저에서 다시 열어 주세요.');
      state.sessionId=code;localStorage.setItem('FPSEL_LAST_ADMIN_SESSION',code);history.replaceState(null,'',aUrl(code));state.unsub?.();
      state.unsub=listen(`sessions/${code}`,d=>{state.data=d||{participants:{},meta};renderDashboard();refreshOverlay()});
    }catch(e){renderLanding('활동 열기 오류: '+(e?.message||String(e)))}
  };
})();