/* Group-management restoration: presenter manual and random placement, November 2026. */
(function(){
'use strict';
let draft=null,editing=null;
const baseDashboard=renderDashboard,baseOverlay=openOverlay;

const targetKey=k=>k==='edit1'?'groupSizeDialogue1':'groupSizeDialogue2';
const targetFrom=(data,k)=>{const n=Number(data?.meta?.[targetKey(k)]);return Number.isInteger(n)&&n>=3&&n<=8?n:4};
const target=k=>targetFrom(state.data||{},k);
function capacities(n,want){
 if(n<=2)return n?[n]:[];
 let candidates=[];
 for(let k=Math.ceil(n/8);k<=Math.floor(n/3);k++)candidates.push(k);
 const count=candidates.length?candidates.sort((a,b)=>Math.abs(n/a-want)-Math.abs(n/b-want)||a-b)[0]:1;
 const each=Math.floor(n/count),extra=n%count;
 return Array.from({length:count},(_,i)=>each+(i<extra?1:0));
}
function buildSized1(data,want){
 const o={},rr=rows(data);let gi=1;
 SCENES.forEach(sc=>{
   let a=rr.filter(r=>r.focusScene===sc.id).sort((a,b)=>a.id.localeCompare(b.id)),pos=0;
   capacities(a.length,want).forEach(n=>{
     o['g'+String(gi++).padStart(2,'0')]={sceneId:sc.id,sceneIds:[sc.id],
       members:a.slice(pos,pos+n).map(r=>r.id),targetSize:want,createdAt:Date.now()};
     pos+=n;
   });
 });return o;
}
function buildSized2(data,want){
 const rr=rows(data).filter(r=>r.focusScene&&(r.deepDive?.reason||data?.participants?.[r.id]?.lateEntryPhase));
 const b={};SCENES.forEach(sc=>b[sc.id]=rr.filter(r=>r.focusScene===sc.id).sort((a,z)=>a.id.localeCompare(z.id)));
 const ordered=[];
 while(Object.values(b).some(a=>a.length)){
   const active=SCENES.map(sc=>b[sc.id]).filter(a=>a.length).sort((a,z)=>z.length-a.length);
   active.forEach(a=>{if(a.length)ordered.push(a.shift())});
 }
 const gs=capacities(rr.length,want).map((cap,i)=>({id:'g'+String(i+1).padStart(2,'0'),cap,members:[],sceneIds:new Set()}));
 for(const p of ordered){
   const available=gs.filter(g=>g.members.length<g.cap);
   let choices=available.filter(g=>!g.sceneIds.has(p.focusScene));
   if(!choices.length)choices=available;
   const chosen=choices.sort((a,z)=>a.members.length/a.cap-z.members.length/z.cap||a.sceneIds.size-z.sceneIds.size||a.id.localeCompare(z.id))[0];
   if(!chosen)throw new Error('편성 정원 오류');
   chosen.members.push(p.id);chosen.sceneIds.add(p.focusScene);
 }

 // Improve scene diversity by swapping one member between already balanced groups.
 // Group capacities and participant membership remain unchanged.
 const sceneOf=new Map(rr.map(r=>[r.id,r.focusScene]));
 const penalty=g=>g.members.length-new Set(g.members.map(id=>sceneOf.get(id))).size;
 let improved=true;
 while(improved){
   improved=false;
   outer:for(let i=0;i<gs.length;i++){
     for(let j=i+1;j<gs.length;j++){
       const a=gs[i],b=gs[j],before=penalty(a)+penalty(b);
       if(!before)continue;
       for(let x=0;x<a.members.length;x++){
         for(let y=0;y<b.members.length;y++){
           const temp=a.members[x];a.members[x]=b.members[y];b.members[y]=temp;
           if(penalty(a)+penalty(b)<before){improved=true;break outer;}
           b.members[y]=a.members[x];a.members[x]=temp;
         }
       }
     }
   }
 }
 gs.forEach(g=>g.sceneIds=new Set(g.members.map(id=>sceneOf.get(id))));
 const o={};gs.forEach(g=>o[g.id]={mode:'mixedScenes',members:g.members,sceneIds:[...g.sceneIds],targetSize:want,createdAt:Date.now()});return o;
}
const buildWith=(k,data,want)=>k==='edit1'?buildSized1(data,want):buildSized2(data,want);

const keyFor=k=>k==='edit1'?'dialogue1':'dialogue2';
const eligible=k=>rows(state.data||{}).filter(r=>k==='edit1'?r.focusScene:(r.focusScene&&(r.deepDive?.reason||(state.data?.meta?.phase==='dialogue2'&&state.data?.participants?.[r.id]?.lateEntryPhase))));
const mutable=k=>k==='edit1'?['selecting','dialogue1'].includes(state.data?.meta?.phase):['deep','dialogue2'].includes(state.data?.meta?.phase);
const build=k=>buildWith(k,state.data||{},target(k));
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
 const sceneUnchanged=k!=='edit1'||Object.values(g||{}).every(x=>{const ss=[...new Set((x.members||[]).map(id=>byId.get(id)).filter(Boolean))];return ss.length<=1||x.lateJoinMixed===true});
 return sceneUnchanged&&expected.length===actual.length&&new Set(actual).size===actual.length&&expected.every(id=>actual.includes(id))&&Object.values(g).every(x=>x.members?.length>=1&&x.members.length<=8);
}
function getDraft(k){if(editing!==k||!draft){editing=k;draft=normalize(state.data?.groups?.[keyFor(k)]);if(!Object.keys(draft).length)draft=build(k);}return draft;}
function move(k,uid,to){
 const g=getDraft(k),from=Object.keys(g).find(id=>g[id].members.includes(uid));
 if(!from||!g[to]||from===to)return '이동할 사람과 다른 모둠을 선택해 주세요.';
 if(g[to].members.length>=8)return '한 모둠의 최대 인원은 8명입니다.';
 if(k==='edit1'&&g[to].sceneId!==rows(state.data||{}).find(r=>r.id===uid)?.focusScene)return '첫 번째 만남에서는 같은 장면 선택자끼리만 배치할 수 있습니다.';
 g[from].members=g[from].members.filter(id=>id!==uid);g[to].members.push(uid);refreshSceneFields(g);return '';
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mergeSingles(k){
 const g=getDraft(k),list=shuffle(Object.keys(g).filter(id=>g[id].members.length===1));let n=0;
 for(const id of list){
   if(!g[id]||g[id].members.length!==1)continue;
   let candidates=Object.keys(g).filter(t=>t!==id&&g[t].members.length<8);
   if(!candidates.length)continue;
   const uid=g[id].members[0],rr=rows(state.data||{}),scene=rr.find(r=>r.id===uid)?.focusScene;
   let same=candidates.filter(t=>g[t].members.some(m=>rr.find(r=>r.id===m)?.focusScene===scene)&&g[t].members.length>1);
   let established=candidates.filter(t=>g[t].members.length>1);
   let pool=k==='edit1'?same:(same.length?same:established.length?established:candidates);
   pool=shuffle(pool).sort((a,b)=>g[a].members.length-g[b].members.length);
   if(!pool.length)continue;
   g[pool[0]].members.push(uid);delete g[id];n++;
 }
 // A last isolated person can be paired with someone in an oversized group.
 for(const id of Object.keys(g).filter(t=>g[t].members.length===1)){
   let donor=Object.keys(g).filter(t=>t!==id&&g[t].members.length>=4&&(k!=='edit1'||g[t].sceneId===g[id].sceneId)).sort((a,b)=>g[b].members.length-g[a].members.length)[0];
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
 const commands=allowed?'<div class="gm-actions"><button class="btn soft" id="gmReset">선택 인원으로 다시 편성</button><button class="btn soft" id="gmRandom">1명 모둠 무작위 합류</button><button class="btn primary" id="gmSave">모둠 저장</button></div><div class="gm-move"><label>참가자<select id="gmStudent">'+studentOpts+'</select></label><label>옮길 곳<select id="gmTarget">'+groupOpts+'</select></label><button class="btn soft" id="gmMove">직접 배치</button></div>':'<p>이 단계에서는 이전 모둠을 수정할 수 없습니다.</p>';
 const body=el.querySelector('.overlay-body');
 const opts=[3,4,5,6,7,8].map(n=>'<option value="'+n+'"'+(target(k)===n?' selected':'')+'>'+n+'명</option>').join('');
 const chooser='<div class="gm-size"><label>기준 인원 <select id="gmSize"'+(allowed?'':' disabled')+'>'+opts+'</select></label><span>예상 모둠 인원: '+Object.values(g).map(x=>x.members.length+'명').join(' · ')+'</span></div>';
 body.innerHTML='<div class="gm-summary">배치 대상 '+rr.length+'명 · '+Object.keys(g).length+'모둠 · 기준 '+target(k)+'명 (최대 8명)</div>'+chooser+commands+'<p class="gm-msg">'+esc(msg)+'</p><div class="gm-grid">'+cards(k)+'</div>';
 if(!allowed)return;
 body.querySelector('#gmSize').onchange=async ev=>{
   const n=Number(ev.target.value),key=targetKey(k),code=state.sessionId;
   if(n<3||n>8||n===target(k))return;
   try{await upd('sessions/'+code+'/meta',{[key]:n});if(code!==state.sessionId)return;state.data.meta=state.data.meta||{};state.data.meta[key]=n;draft=build(k);editor(k,'기준 인원을 변경했습니다. 확정된 모둠은 변경되지 않으며, 검토 후 저장해야 반영됩니다.');}
   catch(e){editor(k,'인원 설정 저장 실패: '+String(e.message||e));}
 };
 body.querySelector('#gmReset').onclick=()=>{draft=build(k);editor(k,'장면별 기본 모둠을 만들었습니다. 저장 전에는 반영되지 않습니다.');};
 body.querySelector('#gmRandom').onclick=()=>{const n=mergeSingles(k);editor(k,n?n+'명을 무작위로 다른 모둠에 합류시켰습니다. 저장하세요.':'합류시킬 1명 모둠이 없거나 조정할 모둠이 없습니다.');};
 body.querySelector('#gmMove').onclick=()=>{const msg=move(k,body.querySelector('#gmStudent').value,body.querySelector('#gmTarget').value);editor(k,msg||'참가자 이동을 적용했습니다. 저장하세요.');};
 body.querySelector('#gmSave').onclick=async()=>{
   if(!good(g,k)){editor(k,'입장자 변경·누락·중복·인원 제한이 발생했습니다. 장면별 기본 모둠부터 다시 구성하세요.');return;}
   const button=body.querySelector('#gmSave');button.disabled=true;
   try{
     Object.values(g).forEach(x=>x.targetSize=target(k));
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
 const plan=k=>{const n=target(k),g=Object.values(build(k)),count=g.length;const list=[3,4,5,6,7,8].map(v=>'<option value="'+v+'"'+(v===n?' selected':'')+'>'+v+'명</option>').join('');return '<label class="gm-short">'+(k==='edit1'?'1차':'2차')+' 기준 <select id="gmSelect'+(k==='edit1'?'1':'2')+'">'+list+'</select> <small>예상 '+count+'모둠</small></label>'};
 buttons.innerHTML=plan('edit1')+plan('edit2')+'<button class="btn soft" type="button" id="gmEdit1">1차 모둠 미리보기·편집</button><button class="btn soft" type="button" id="gmEdit2">2차 모둠 미리보기·편집</button>';
 bar.appendChild(buttons);
 for(const [k,sel] of [['edit1','gmSelect1'],['edit2','gmSelect2']]){
   const input=document.getElementById(sel);input.disabled=!mutable(k);
   input.onchange=async()=>{
     const n=Number(input.value),key=targetKey(k),code=state.sessionId;
     if(!mutable(k)||n<3||n>8)return;
     input.disabled=true;
     try{await upd('sessions/'+code+'/meta',{[key]:n});if(code!==state.sessionId)return;state.data.meta=state.data.meta||{};state.data.meta[key]=n;draft=null;editing=null;renderDashboard();}
     catch(e){toast('기준 인원 저장 실패: '+String(e.message||e));input.disabled=false;}
   };
 }
 for(const [k,n] of [['edit1','gmEdit1'],['edit2','gmEdit2']]){
   document.getElementById(n).onclick=()=>{editing=k;draft=null;openOverlay(k);};
 }
 for(const [button,k] of [['regen1','edit1'],['regen2','edit2']]){
   const el=document.getElementById(button);if(!el)continue;
   el.onclick=async()=>{
     if(!window.confirm('현재 확정된 모둠을 다시 편성하시겠습니까?'))return;
     el.disabled=true;
     try{const live=await get('sessions/'+state.sessionId)||state.data||{};await setv('sessions/'+state.sessionId+'/groups/'+keyFor(k),buildWith(k,live,targetFrom(live,k)));toast('모둠을 다시 편성했습니다.');}
     catch(e){toast('재편성 실패: '+String(e.message||e));el.disabled=false;}
   };
 }
 // Do not discard a previously saved manual arrangement when starting a meeting.
 for(const [button,k] of [['open1','edit1'],['open2','edit2']]){
   const el=document.getElementById(button);if(!el)continue;
   el.onclick=async()=>{
     el.disabled=true;
     try{
       const data=await get('sessions/'+state.sessionId)||state.data;
       const stored=data.groups?.[keyFor(k)];
       const want=targetFrom(data,k),valid=stored&&Object.keys(stored).length&&good(stored,k),oldSize=valid?Number(Object.values(stored)[0]?.targetSize||want):want;
       if(valid&&oldSize!==want&&!window.confirm('저장된 모둠을 새 기준 인원으로 재편성하여 만남을 시작할까요?')){el.disabled=false;return;}
       const chosen=valid&&oldSize===want?stored:buildWith(k,data,want);
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
style.textContent+='.gm-size{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;margin:10px 0;background:#f4fafb;border:1px solid #d4e4e6;border-radius:12px}.gm-size label,.gm-short{font-size:13px;font-weight:900;color:#35556a}.gm-size select,.gm-short select{background:white;border:1px solid #bfd3d6;border-radius:10px;padding:8px;color:#35556a}.gm-short{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.gm-short small{font-size:12px;color:#647e87}.gm-short select:disabled{opacity:.5}';
document.head.appendChild(style);
})();