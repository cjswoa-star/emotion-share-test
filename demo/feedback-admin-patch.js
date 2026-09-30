/* FAMOUS PEOPLE SEL · 2026-09-30 field feedback patch
   Safe overlay for the improvement branch only. Firebase Rules are untouched. */
(function(){
  const SIZE_KEY='FPSEL_GROUP_SIZE_V1';
  const getCap=()=>{
    const v=localStorage.getItem(SIZE_KEY)||'auto';
    return v==='3'||v==='4'?Number(v):'auto';
  };
  const shuffled=a=>{
    a=[...a];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  };
  const balancedSizes=(n,cap)=>{
    if(n<=0)return[];
    if(cap==='auto'){
      if(n<=5)return[n];
      const out=[];
      while(n>8){out.push(4);n-=4}
      if(n===6)return out.concat([3,3]);
      if(n===7)return out.concat([3,4]);
      if(n===8)return out.concat([4,4]);
      return out.concat([n]);
    }
    let groups=Math.ceil(n/cap);
    while(groups>1 && Math.floor(n/groups)<2)groups--;
    const base=Math.floor(n/groups),extra=n%groups,out=[];
    for(let i=0;i<groups;i++)out.push(base+(i<extra?1:0));
    return out;
  };
  const splitRandom=(rs,cap)=>{
    const a=shuffled(rs),out=[];let k=0;
    for(const z of balancedSizes(a.length,cap)){out.push(a.slice(k,k+z));k+=z}
    return out;
  };
  const groupKeyMap=raw=>{
    const out={};
    Object.values(raw||{}).forEach(g=>{
      const ids=[...(g.members||[])].sort();
      ids.forEach(id=>out[id]=ids.join('|'));
    });
    return out;
  };
  const overlapScore=(candidate,prev)=>{
    const p=groupKeyMap(prev),c=groupKeyMap(candidate);let score=0;
    Object.keys(c).forEach(id=>{if(p[id]&&p[id]===c[id])score++});
    return score;
  };

  sizes=function(n){return balancedSizes(n,getCap())};
  groups=function(rs){return splitRandom(rs,getCap())};

  build1=function(d){
    const rr=rows(d),cap=getCap(),prev=d?.groups?.dialogue1||{};
    let best=null,bestScore=Infinity;
    for(let attempt=0;attempt<12;attempt++){
      const o={};let gi=1;
      SCENES.forEach(s=>splitRandom(rr.filter(r=>r.focusScene===s.id),cap).forEach(g=>{
        o['g'+String(gi++).padStart(2,'0')]={sceneId:s.id,members:g.map(r=>r.id),createdAt:Date.now()};
      }));
      const score=overlapScore(o,prev);
      if(score<bestScore){best=o;bestScore=score}
      if(score===0)break;
    }
    return best||{};
  };

  build2=function(d){
    const rr=rows(d).filter(r=>r.focusScene&&r.deepDive?.reason),cap=getCap(),prev=d?.groups?.dialogue2||{};
    if(!rr.length)return{};
    const caps=balancedSizes(rr.length,cap);
    let best=null,bestScore=Infinity;
    for(let attempt=0;attempt<18;attempt++){
      const by={};SCENES.forEach(s=>by[s.id]=shuffled(rr.filter(r=>r.focusScene===s.id)));
      const ordered=[];let more=true;
      while(more){
        more=false;
        const active=shuffled(SCENES.map(s=>by[s.id]).filter(a=>a.length)).sort((a,b)=>b.length-a.length);
        for(const a of active)if(a.length){ordered.push(a.shift());more=true}
      }
      const gs=caps.map((z,i)=>({id:'g'+String(i+1).padStart(2,'0'),cap:z,members:[],sceneIds:new Set()}));
      for(const p of ordered){
        const available=gs.filter(g=>g.members.length<g.cap);
        const diverse=shuffled(available.filter(g=>!g.sceneIds.has(p.focusScene))).sort((a,b)=>a.members.length-b.members.length||a.sceneIds.size-b.sceneIds.size);
        const fallback=shuffled(available).sort((a,b)=>a.members.length-b.members.length);
        const t=diverse[0]||fallback[0];
        if(t){t.members.push(p.id);t.sceneIds.add(p.focusScene)}
      }
      const o={};gs.forEach(g=>o[g.id]={mode:'mixedScenes',members:g.members,sceneIds:[...g.sceneIds],createdAt:Date.now()});
      const score=overlapScore(o,prev);
      if(score<bestScore){best=o;bestScore=score}
      if(score===0)break;
    }
    return best||{};
  };

  function addFieldControls(){
    if(!state?.sessionId||!state?.data)return;
    const control=document.querySelector('.panel.control');
    if(!control||control.querySelector('[data-feedback-controls]'))return;
    const d=state.data,m=d.meta||{},rr=rows(d),cap=String(getCap());
    const focus=rr.filter(r=>r.focusScene),deep=rr.filter(r=>r.deepDive?.reason);
    const singles=SCENES.map(s=>({s,n:focus.filter(r=>r.focusScene===s.id).length})).filter(x=>x.n===1);
    const wrap=document.createElement('div');
    wrap.setAttribute('data-feedback-controls','1');
    wrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%;margin-top:8px;padding-top:8px;border-top:1px dashed #ccd7db';
    wrap.innerHTML=`<span style="font-size:13px;font-weight:900;color:#526b79">모둠 최대 인원</span><select id="fpGroupCap" style="height:38px;border:1px solid #b9c9cf;border-radius:10px;padding:0 10px;font-weight:800"><option value="auto" ${cap==='auto'?'selected':''}>자동</option><option value="3" ${cap==='3'?'selected':''}>3명</option><option value="4" ${cap==='4'?'selected':''}>4명</option></select>${singles.length?`<span style="font-size:12px;font-weight:800;color:#b7654b">1인 장면: ${singles.map(x=>x.s.n+'번').join(' · ')}</span>`:''}`;
    if(m.phase==='collecting'&&focus.length>0&&focus.length<rr.length){
      wrap.insertAdjacentHTML('beforeend',`<button id="fpForce1" class="btn soft" type="button">준비된 ${focus.length}명으로 1차 시작</button>`);
    }
    if(m.phase==='deep'&&deep.length>0&&deep.length<rr.length){
      wrap.insertAdjacentHTML('beforeend',`<button id="fpForce2" class="btn soft" type="button">준비된 ${deep.length}명으로 2차 시작</button>`);
    }
    control.appendChild(wrap);
    const sel=document.getElementById('fpGroupCap');
    sel.onchange=()=>{localStorage.setItem(SIZE_KEY,sel.value);toast(`모둠 최대 인원: ${sel.value==='auto'?'자동':sel.value+'명'}`)};
    const f1=document.getElementById('fpForce1');
    if(f1)f1.onclick=async()=>{
      await setv(`sessions/${state.sessionId}/groups/dialogue1`,build1(d));
      await upd(`sessions/${state.sessionId}/meta`,{phase:'dialogue1',dialogue1Open:true,dialogue1GeneratedAt:Date.now(),forcedStart:true});
    };
    const f2=document.getElementById('fpForce2');
    if(f2)f2.onclick=async()=>{
      await setv(`sessions/${state.sessionId}/groups/dialogue2`,build2(d));
      await upd(`sessions/${state.sessionId}/meta`,{phase:'dialogue2',dialogue2Open:true,dialogue2Mode:'mixedScenes',dialogue2GeneratedAt:Date.now(),forcedStart:true});
    };
    const r1=document.getElementById('regen1');if(r1)r1.textContent='모둠 다시 섞기';
    const r2=document.getElementById('regen2');if(r2)r2.textContent='모둠 다시 섞기';
  }
  const mo=new MutationObserver(()=>addFieldControls());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(addFieldControls,0);
  console.info('[FAMOUS PEOPLE] field feedback admin patch active');
})();
