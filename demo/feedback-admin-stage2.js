/* FAMOUS PEOPLE SEL · late-join placement without regrouping */
(function(){
  const assignedIds=raw=>new Set(Object.values(raw||{}).flatMap(g=>g.members||[]));
  const groupEntries=(d,key)=>Object.entries(d?.groups?.[key]||{}).map(([id,g])=>({id,...g}));
  const groupPeople=(d,g)=>members(d,g);

  function choicesFor(d,key,p){
    const gs=groupEntries(d,key);
    if(key==='dialogue1'){
      const same=gs.filter(g=>g.sceneId===p.focusScene).sort((a,b)=>(a.members?.length||0)-(b.members?.length||0));
      const other=gs.filter(g=>g.sceneId!==p.focusScene).sort((a,b)=>(a.members?.length||0)-(b.members?.length||0));
      return {same,other};
    }
    const scored=gs.map(g=>{
      const people=groupPeople(d,g),scenes=new Set(people.map(x=>x.focusScene).filter(Boolean));
      return {g,score:scenes.has(p.focusScene)?1:0,size:people.length};
    }).sort((a,b)=>a.score-b.score||a.size-b.size).map(x=>x.g);
    return {same:scored,other:[]};
  }

  async function placeOne(pid,key,gid){
    const latest=await get(`sessions/${state.sessionId}`)||{};
    const p=rows(latest).find(x=>x.id===pid);if(!p)throw new Error('참가자를 찾을 수 없습니다.');
    const raw=latest?.groups?.[key]||{};
    if(gid==='__new'){
      let n=1;while(raw['g'+String(n).padStart(2,'0')])n++;
      const id='g'+String(n).padStart(2,'0');
      const payload=key==='dialogue1'
        ?{sceneId:p.focusScene,members:[pid],createdAt:Date.now(),lateJoin:true}
        :{mode:'mixedScenes',members:[pid],sceneIds:[p.focusScene].filter(Boolean),createdAt:Date.now(),lateJoin:true};
      await setv(`sessions/${state.sessionId}/groups/${key}/${id}`,payload);
    }else{
      const g=raw[gid];if(!g)throw new Error('선택한 모둠을 찾을 수 없습니다.');
      const next=[...new Set([...(g.members||[]),pid])];
      await setv(`sessions/${state.sessionId}/groups/${key}/${gid}/members`,next);
      if(key==='dialogue2'){
        const sceneIds=[...new Set([...(g.sceneIds||[]),p.focusScene].filter(Boolean))];
        await setv(`sessions/${state.sessionId}/groups/${key}/${gid}/sceneIds`,sceneIds);
      }
    }
    await upd(`sessions/${state.sessionId}/meta`,{lateJoinPlacedAt:Date.now()});
  }

  function install(){
    try{
      if(!state?.sessionId||!state?.data)return;
      const control=document.querySelector('.panel.control');
      if(!control||control.querySelector('[data-latejoin-tools]'))return;
      const d=state.data,m=d.meta||{},rr=rows(d);let missing=[],key='';
      if(m.phase==='dialogue1'){
        const assigned=assignedIds(d?.groups?.dialogue1);missing=rr.filter(r=>r.focusScene&&!assigned.has(r.id));key='dialogue1';
      }else if(m.phase==='dialogue2'){
        const assigned=assignedIds(d?.groups?.dialogue2);missing=rr.filter(r=>r.focusScene&&r.deepDive?.reason&&!assigned.has(r.id));key='dialogue2';
      }
      if(!missing.length)return;
      const box=document.createElement('div');box.setAttribute('data-latejoin-tools','1');
      box.style.cssText='width:100%;display:grid;gap:8px;margin-top:8px;padding:10px;border:1px solid #e2b8a9;border-radius:12px;background:#fff7f3';
      box.innerHTML=`<div style="font-size:13px;font-weight:950;color:#9b4e36">늦게 합류한 참가자 ${missing.length}명 · 기존 모둠은 그대로 둡니다.</div>`;
      missing.forEach(p=>{
        const {same,other}=choicesFor(d,key,p),id='late_'+p.id.replace(/[^a-zA-Z0-9_-]/g,'');
        const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:#fff;border-radius:10px;padding:8px';
        const sameOptions=same.map(g=>`<option value="${esc(g.id)}">모둠 ${esc(g.id.replace(/^g0*/,''))} · ${g.members?.length||0}명${key==='dialogue1'?' · 같은 장면':''}</option>`).join('');
        const otherOptions=other.map(g=>`<option value="${esc(g.id)}">모둠 ${esc(g.id.replace(/^g0*/,''))} · ${g.members?.length||0}명 · 예외 합류</option>`).join('');
        row.innerHTML=`<b style="min-width:74px">${esc(p.nickname)}</b><span style="font-size:12px;color:#718288">${key==='dialogue1'?'장면 '+esc(SCENES.find(s=>s.id===p.focusScene)?.n||'--'):'2차 만남 준비 완료'}</span><select id="${id}" style="height:38px;min-width:180px;border:1px solid #c7d2d6;border-radius:9px;padding:0 8px;font-weight:800">${sameOptions}${otherOptions}<option value="__new">새 보충 모둠 만들기</option></select><button class="btn soft" type="button" data-place-late="${esc(p.id)}" data-select="${id}">이 모둠에 추가</button>`;
        box.appendChild(row);
      });
      const note=document.createElement('div');note.style.cssText='font-size:11.5px;line-height:1.45;color:#7a665e';note.textContent=key==='dialogue1'?'가능하면 같은 장면 모둠에 추가합니다. 기존 참가자의 모둠은 바뀌지 않습니다.':'기존 모둠은 유지하고 선택한 모둠에 한 명만 추가합니다.';box.appendChild(note);
      control.appendChild(box);
      box.querySelectorAll('[data-place-late]').forEach(btn=>btn.onclick=async()=>{
        btn.disabled=true;const sel=document.getElementById(btn.dataset.select);
        try{await placeOne(btn.dataset.placeLate,key,sel.value);toast('기존 모둠은 유지하고 참가자만 추가했습니다.')}catch(e){console.error(e);toast('합류 배치에 실패했습니다.')}finally{btn.disabled=false}
      });
    }catch(e){console.warn('late-join helper',e)}
  }
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(install,1200);install();
  console.info('[FAMOUS PEOPLE] late-join placement helper active');
})();
