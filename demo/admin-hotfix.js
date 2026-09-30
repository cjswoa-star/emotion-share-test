(function(){
  const DB=CFG.databaseURL.replace(/\/$/,'');
  let sdk=null;
  async function rest(path,method='GET',body){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),5000);
    try{
      const url=DB+'/'+path.split('/').filter(Boolean).map(encodeURIComponent).join('/')+'.json'+(method==='GET'?('?ts='+Date.now()):'');
      const opt={method,cache:'no-store',signal:ctl.signal,headers:{'Content-Type':'application/json'}};
      if(body!==undefined)opt.body=JSON.stringify(body);
      const r=await fetch(url,opt);
      if(!r.ok)throw new Error('REST '+r.status);
      return method==='DELETE'?null:r.json();
    } finally { clearTimeout(timer); }
  }
  async function ensureSdk(){
    if(sdk)return sdk;
    const A=await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
    const D=await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js');
    const app=A.getApps().length?A.getApps()[0]:A.initializeApp(CFG);
    const db2=D.getDatabase(app);
    sdk={D,db2};
    return sdk;
  }
  async function sdkGet(path){const {D,db2}=await ensureSdk();const s=await D.get(D.ref(db2,path));return s.exists()?s.val():null}
  async function sdkSet(path,val){const {D,db2}=await ensureSdk();return D.set(D.ref(db2,path),val)}
  async function sdkUpd(path,val){const {D,db2}=await ensureSdk();return D.update(D.ref(db2,path),val)}
  async function dualGet(path){try{return await rest(path)}catch(e1){console.warn('REST get failed',e1);return sdkGet(path)}}
  async function dualSet(path,val){try{return await rest(path,'PUT',val)}catch(e1){console.warn('REST set failed',e1);return sdkSet(path,val)}}
  async function dualUpd(path,val){try{return await rest(path,'PATCH',val)}catch(e1){console.warn('REST update failed',e1);return sdkUpd(path,val)}}
  function dualListen(path,cb){let stopped=false,busy=false;const pull=async()=>{if(stopped||busy)return;busy=true;try{cb(await dualGet(path))}catch(e){console.error('listen failed',e)}finally{busy=false}};pull();const t=setInterval(pull,900);return()=>{stopped=true;clearInterval(t)}}
  get=dualGet; setv=dualSet; upd=dualUpd; listen=dualListen;
  genCode=async()=>String(Math.floor(100000+Math.random()*900000));
  createSession=async function(){
    const b=document.getElementById('newBtn'); if(!b)return;
    b.disabled=true; b.textContent='활동 만드는 중...';
    try{
      const c=String(Math.floor(100000+Math.random()*900000));
      const meta={createdAt:Date.now(),status:'active',phase:'collecting',dialogue1Open:false,dialogue2Open:false,version:'7.2-projector-hotfix'};
      await dualSet(`sessions/${c}/meta`,meta);
      state.sessionId=c;
      localStorage.setItem('FPSEL_LAST_ADMIN_SESSION',c);
      history.replaceState(null,'',aUrl(c));
      state.data={meta,participants:{}};
      renderDashboard();
      state.unsub?.();
      state.unsub=dualListen(`sessions/${c}`,d=>{state.data=d||{participants:{},meta};renderDashboard();refreshOverlay()});
    }catch(e){
      console.error('createSession failed',e);
      renderLanding('활동 생성 오류: '+(e?.message||String(e)));
    }finally{
      const nb=document.getElementById('newBtn'); if(nb){nb.disabled=false;nb.textContent='새 활동 만들기';}
    }
  };
})();