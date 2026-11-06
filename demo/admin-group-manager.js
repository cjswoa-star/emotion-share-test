/* Group-management restoration: presenter manual and random placement, November 2026. */
(function(){
'use strict';
let draft=null,editing=null;
const baseDashboard=renderDashboard,baseOverlay=openOverlay;
const keyFor=k=>k==='edit1'?'dialogue1':'dialogue2';
const eligible=k=>rows(state.data||{}).filter(r=>k==='edit1'?r.focusScene:(r.focusScene&&(r.deepDive?.reason||(state.data?.meta?.phase==='dialogue2'&&state.data?.participants?.[r.id]?.lateEntryPhase))));
const mutable=k=>k==='edit1'?['selecting','dialogue1'].includes(state.data?.meta?.phase):['deep','dialogue2'].includes(state.data?.meta?.phase);
const build=k=>(k==='edit1'?build1:build2)(state.data||{});
function normalize(g){return JSON.parse(JSON.stringify(g||{}));}
function refreshSceneFields(g){
 const rr=rows(state.data||{});
 Object.keys(g).forEach(id=>{
   if(!g[id].members.length){delete g[id];return;}
   let sceneIds=[...new Set(g[id].members.map(uid=>rr.find(r=>r.id===uid)?.focusScene).filter(Boolean))];
   g[id].sceneIds=sceneIds;g[id].mixed=sceneIds.length>1;
   if(!g[id].sceneId)g[id].sceneId=sceneIds[0]||'';
 });
}
function good(g,k){
 const expected=eligible(k).map(r=>r.id),actual=Object.values(g||{}).flatMap(x=>x.members||[]);
 const byId=new Map(rows(state.data||{}).map(r=>[r.id,r.focusScene]));
 const sceneUnchanged=k!=='edit1'||Object.values(g||{}).every(x=>{const actualScenes=[...new Set((x.members||[]).map(id=>byId.get(id)).filter(Boolean))];const storedScenes=(x.sceneIds&&x.sceneIds.length?x.sceneIds:[x.sceneId]).filter(Boolean);return actualScenes.length===storedScenes.length&&actualScenes.every(sc=>storedScenes.includes(sc))});
 return sceneUnchanged&&expected.length===actual.length&&new Set(actual).size===actual.length&&expected.every(id=>actual.includes(id))&&Object.values(g).every(x=>x.members?.length>=1&&x.members.length<=5);
}
function getDraft(k){if(editing!==k||!draft){editing=k;draft=normalize(state.data?.groups?.[keyFor(k)]);if(!Object.keys(draft).length)draft=build(k);}return draft;}
function move(k,uid,to){
 const g=getDraft(k),from=Object.keys(g).find(id=>g[id].members.includes(uid));
 if(!from||!g[to]||from===to)return '이동할 사람과 다른 모둠을 선택해 주세요.';
 if(g[to].members.length>=5)return '한 모둠의 최대 인원은 5명입니다.';
 g[from].members=g[from].members.filter(id=>id!==uid);g[to].members.push(uid);refreshSceneFields(g);return '';
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mergeSingles(k){
 const g=getDraft(k),list=shuffle(Object.keys(g).filter(id=>g[id].members.length===1));let n=0;
 for(const id of list){
   if(!g[id]||g[id].members.length!==1)continue;
   let candidates=Object.keys(g).filter(t=>t!==id&&g[t].members.length<5);
   if(!candidates.length)continue;
   const uid=g[id].members[0],rr=rows(state.data||{}),scene=rr.find(r=>r.id===uid)?.focusScene;
   let same=candidates.filter(t=>g[t].members.some(m=>rr.find(r=>r.id===m)?.focusScene===scene)&&g[t].members.length>1);
   let established=candidates.filter(t=>g[t].members.length>1);
   let pool=same.length?same:established.length?established:candidates;
   pool=shuffle(pool).sort((a,b)=>g[a].members.length-g[b].members.length);
   g[pool[0]].members.push(uid);delete g[id];n++;
 }
 // A last isolated person can be paired with someone in an oversized group.
 for(const id of Object.keys(g).filter(t=>g[t].members.length===1)){
   let donor=Object.keys(g).filter(t=>t!==id&&g[t].members.length>=4).sort((a,b)=>g[b].members.length-g[a].members.length)[0];
   if(donor){g[id].members.push(g[donor].members.pop());n++;}
 }
 refreshSceneFields(g);return n;
}
function cards(k){
 const g=getDraft(k),rr=rows(state.data||{});
 return Object.entries(g).map(([id,x],i)=>{
   const people=x.members.map(uid=>rr.find(r=>r.id===uid)).filter(Boolean);
   let scenes=[...new Set(people.map(r=>r.focusScene))];
   const desc=scenes.length>1?'장면 혼합':(SCENES.find(s=>s.id===scenes[0])?.title||'장면 미정');
   return '<article class="gm-card '+(people.length===1?'gm-single':'')+'"><h3>모둠 '+(i+1)+' <small>'+people.length+'명</small></h3><p>'+esc(desc)+'</p><div>'+people.map(r=>'<span>'+esc(r.nickname)+'<small> '+esc(SCENES.find(s=>s.id===r.focusScene)?.n||'')+'</small></span>').join('')+'</div></article>';
 }).join('')||'<p>현재 배치할 참가자가 없습니다.</p>';
}
function editor(k,msg=''){
 const el=document.getElementById('overlay');if(!el)return;
 const g=getDraft(k),allowed=mutable(k),rr=eligible(k),title=k==='edit1'?'첫':'두';
 el.querySelector('.overlay-title').innerHTML='<div class="kicker">FAMOUS PEOPLE SEL · 진행자</div><h2>'+title+' 번째 만남 · 모둠 편집</h2><p>모둠 저장과 단계 시작은 별개입니다. 참가자는 진행자가 만남 시작을 누를 때 이동합니다.</p>';
 const groupOpts=Object.entries(g).map(([id,x],i)=>'<option value="'+esc(id)+'">모둠 '+(i+1)+' · '+x.members.length+'명</option>').join('');
 const studentOpts=rr.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.nickname)+'</option>').join('');
 const commands=allowed?'<div class="gm-actions"><button class="btn soft" id="gmReset">장면별 기본 모둠</button><button class="btn soft" id="gmRandom">1명 모둠 무작위 합류</button><button class="btn primary" id="gmSave">모둠 저장</button></div><div class="gm-move"><label>참가자<select id="gmStudent">'+studentOpts+'</select></label><label>옮길 곳<select id="gmTarget">'+groupOpts+'</select></label><button class="btn soft" id="gmMove">직접 배치</button></div>':'<p>이 단계에서는 이전 모둠을 수정할 수 없습니다.</p>';
 const body=el.querySelector('.overlay-body');
 body.innerHTML='<div class="gm-summary">배치 대상 '+rr.length+'명 · '+Object.keys(g).length+'모둠 · 1모둠 최대 5명</div>'+commands+'<p class="gm-msg">'+esc(msg)+'</p><div class="gm-grid">'+cards(k)+'</div>';
 if(!allowed)return;
 body.querySelector('#gmReset').onclick=()=>{draft=build(k);editor(k,'장면별 기본 모둠을 만들었습니다. 저장 전에는 반영되지 않습니다.');};
 body.querySelector('#gmRandom').onclick=()=>{const n=mergeSingles(k);editor(k,n?n+'명을 무작위로 다른 모둠에 합류시켰습니다. 저장하세요.':'합류시킬 1명 모둠이 없거나 조정할 모둠이 없습니다.');};
 body.querySelector('#gmMove').onclick=()=>{const msg=move(k,body.querySelector('#gmStudent').value,body.querySelector('#gmTarget').value);editor(k,msg||'참가자 이동을 적용했습니다. 저장하세요.');};
 body.querySelector('#gmSave').onclick=async()=>{
   if(!good(g,k)){editor(k,'입장자 변경·누락·중복·인원 제한이 발생했습니다. 장면별 기본 모둠부터 다시 구성하세요.');return;}
   const button=body.querySelector('#gmSave');button.disabled=true;
   try{
     await setv('sessions/'+state.sessionId+'/groups/'+keyFor(k),g);
     state.data.groups=state.data.groups||{};state.data.groups[keyFor(k)]=normalize(g);
     editor(k,'Firebase에 모둠 구성을 저장했습니다. 진행자가 시작/다음 단계 버튼으로 수업을 진행하세요.');
   }catch(e){editor(k,'저장 실패: '+String(e.message||e));}
 };
}
openOverlay=function(kind){
 if(kind==='edit1'||kind==='edit2'){
   baseOverlay(kind==='edit1'?'m1':'m2');
   state.present=kind;editor(kind);return;
 }
 baseOverlay(kind);
 // Highlight mixed-scene exceptions on the existing projector view.
 if(kind==='m1'){
   const gs=norm(state.data?.groups?.dialogue1);
   document.querySelectorAll('#overlay .group-card').forEach((card,i)=>{
     const r=gs[i]&&members(state.data||{},gs[i]);
     if(!r||new Set(r.map(x=>x.focusScene)).size<2)return;
     const rule=card.querySelector('.rule');if(rule)rule.textContent='진행자가 예외 합류시킨 장면 혼합 모둠';
   });
 }
};
renderDashboard=function(){
 baseDashboard();
 const bar=app.querySelector('.presentbar');if(!bar)return;
 const buttons=document.createElement('div');buttons.className='gm-actions';
 buttons.innerHTML='<button class="btn soft" type="button" id="gmEdit1">1차 모둠 편집·무작위 배치</button><button class="btn soft" type="button" id="gmEdit2">2차 모둠 편집·무작위 배치</button>';
 bar.appendChild(buttons);
 for(const [k,n] of [['edit1','gmEdit1'],['edit2','gmEdit2']]){
   document.getElementById(n).onclick=()=>{editing=k;draft=null;openOverlay(k);};
 }
 // Do not discard a previously saved manual arrangement when starting a meeting.
 for(const [button,k] of [['open1','edit1'],['open2','edit2']]){
   const el=document.getElementById(button);if(!el)continue;
   el.onclick=async()=>{
     el.disabled=true;
     try{
       const data=await get('sessions/'+state.sessionId)||state.data;
       const stored=data.groups?.[keyFor(k)];
       const chosen=stored&&Object.keys(stored).length&&good(stored,k)?stored:(k==='edit1'?build1(data):build2(data));
       await setv('sessions/'+state.sessionId+'/groups/'+keyFor(k),chosen);
       await upd('sessions/'+state.sessionId+'/meta',k==='edit1'?
         {phase:'dialogue1',dialogue1Open:true,dialogue1GeneratedAt:Date.now()}:
         {phase:'dialogue2',dialogue2Open:true,dialogue2Mode:'mixedScenes',dialogue2GeneratedAt:Date.now()});
     }catch(e){toast('모둠 시작 실패: '+String(e.message||e));el.disabled=false;}
   };
 }
};
const style=document.createElement('style');
style.textContent='.gm-summary{padding:12px;background:#ebf3f2;border-radius:12px;font-weight:900;margin-bottom:12px}.gm-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.gm-move{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:13px;background:#fff;border-radius:12px;margin:12px 0;border:1px solid #d0dfe1}.gm-move label{flex:1;min-width:170px;display:grid;gap:6px;font-size:13px;font-weight:900}.gm-move select{background:#fff;color:#35556a;padding:10px;border:1px solid #c6d3d8;border-radius:10px;min-width:0}.gm-msg{min-height:21px;color:#a3543b;font-weight:900;font-size:13px}.gm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:11px}.gm-card{background:#fff;border:2px solid #d2e0de;border-radius:16px;padding:14px}.gm-single{background:#fff8e9;border-color:#dda668}.gm-card h3{font-size:22px;margin:0 0 5px}.gm-card h3 small{font-size:13px;color:#607984}.gm-card p{color:#71848a;font-size:13px;margin:0 0 10px}.gm-card>div{display:flex;gap:6px;flex-wrap:wrap}.gm-card>div span{background:#e8f1ec;border-radius:11px;padding:8px;font-size:16px;font-weight:900}.gm-card>div small{font-size:11px;color:#698b93}';
document.head.appendChild(style);
})();