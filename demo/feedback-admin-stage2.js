/* FAMOUS PEOPLE SEL · late-join / recovery helpers */
(function(){
  const assignedIds=(raw)=>new Set(Object.values(raw||{}).flatMap(g=>g.members||[]));
  function install(){
    try{
      if(!state?.sessionId||!state?.data)return;
      const control=document.querySelector('.panel.control');
      if(!control||control.querySelector('[data-latejoin-tools]'))return;
      const d=state.data,m=d.meta||{},rr=rows(d);let missing=[];let phase='';
      if(m.phase==='dialogue1'){
        const assigned=assignedIds(d?.groups?.dialogue1);missing=rr.filter(r=>r.focusScene&&!assigned.has(r.id));phase='dialogue1';
      }else if(m.phase==='dialogue2'){
        const assigned=assignedIds(d?.groups?.dialogue2);missing=rr.filter(r=>r.focusScene&&r.deepDive?.reason&&!assigned.has(r.id));phase='dialogue2';
      }
      if(!missing.length)return;
      const box=document.createElement('div');box.setAttribute('data-latejoin-tools','1');
      box.style.cssText='width:100%;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;padding:9px 10px;border:1px solid #e2b8a9;border-radius:12px;background:#fff7f3';
      box.innerHTML=`<span style="font-size:13px;font-weight:900;color:#9b4e36">현재 모둠에 없는 참가자 ${missing.length}명 · ${missing.map(x=>esc(x.nickname)).join(' · ')}</span><button id="fpIncludeLate" class="btn soft" type="button">새 참가자 반영해 모둠 다시 만들기</button>`;
      control.appendChild(box);
      document.getElementById('fpIncludeLate').onclick=async()=>{
        if(phase==='dialogue1'){
          await setv(`sessions/${state.sessionId}/groups/dialogue1`,build1(d));
          await upd(`sessions/${state.sessionId}/meta`,{dialogue1GeneratedAt:Date.now(),lateJoinRefreshAt:Date.now()});
        }else{
          await setv(`sessions/${state.sessionId}/groups/dialogue2`,build2(d));
          await upd(`sessions/${state.sessionId}/meta`,{dialogue2GeneratedAt:Date.now(),lateJoinRefreshAt:Date.now()});
        }
        toast('새 참가자를 반영해 모둠을 다시 만들었습니다.');
      };
    }catch(e){console.warn('late-join helper',e)}
  }
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(install,1200);install();
  console.info('[FAMOUS PEOPLE] late-join recovery helper active');
})();
