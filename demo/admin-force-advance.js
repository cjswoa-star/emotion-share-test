/* Presenter-controlled stage override for blocked workshop transitions.
   No response, focus selection, or deep-dive answer is fabricated or deleted. */
(function enablePresenterOverride(){
 'use strict';
 const originalDashboard=renderDashboard;
 const stages={
   collecting:{next:'selecting',label:'더 깊게 볼 장면 선택',key:'forceSelectionAt',button:'beginSelect'},
   selecting:{next:'dialogue1',label:'첫 번째 만남',key:'forceDialogue1At',button:'open1'},
   deep:{next:'dialogue2',label:'두 번째 만남',key:'forceDialogue2At',button:'open2'}
 };
 let busy=false;
 function participants(d){return rows(d).filter(r=>!d?.participants?.[r.id]?.lateEntryPhase);}
 function pending(d,phase){
   return participants(d).filter(r=>{
     if(phase==='collecting')return !SCENES.every(s=>!!r.checkpoints?.[s.id]);
     if(phase==='selecting')return !r.focusScene;
     if(phase==='deep')return !r.deepDive?.reason;
     return false;
   });
 }
 function alertText(phase,missing,total){
   const labels=missing.slice(0,18).map(r=>r.nickname||'닉네임 없음');
   const additional=missing.length>18?'\n외 '+(missing.length-18)+'명':'';
   const guide=phase==='collecting'?'남은 장면을 완료하지 않았더라도 장면을 선택할 수 있습니다.':
       phase==='selecting'?'미선택자는 직접 장면을 고른 뒤 현재 모둠에 합류할 수 있습니다.':
       '이유 작성이 끝나지 않은 사람도 현재 단계로 합류할 수 있습니다.';
   return '아직 완료하지 않은 참가자 '+missing.length+'명 / '+total+'명\n\n'+
     labels.join(' · ')+additional+'\n\n'+guide+
     '\n\n기존 응답은 보존되며, 미완료 항목을 임의로 채우지 않습니다.\n다음 단계로 진행하시겠습니까?';
 }
 async function advance(){
   if(busy||!state.sessionId)return;
   const code=state.sessionId;
   busy=true;
   const trigger=document.getElementById('fpForceAdvance');
   if(trigger)trigger.disabled=true;
   try{
     const path='sessions/'+code;
     const live=await get(path)||{};
     const phase=live?.meta?.phase;
     const rule=stages[phase];
     if(!rule||live.meta?.status==='closed')throw new Error('진행 가능한 단계가 아닙니다.');
     const total=participants(live).length;
     const missing=pending(live,phase);
     if(!total)throw new Error('참가자가 없습니다.');
     if(!missing.length){toast('미완료자가 없습니다. 일반 다음 단계 버튼을 사용하세요.');return;}
     if(!window.confirm(alertText(phase,missing,total)))return;
     if(code!==state.sessionId)throw new Error('활동 코드가 변경되었습니다.');
     const latest=await get(path+'/meta')||{};
     if(latest.phase!==phase||latest.status==='closed')throw new Error('다른 화면에서 단계가 변경되었습니다. 현황판을 새로고침하여 확인하세요.');
     const at=Date.now();
     // This marker is deliberately separate from participant answers.
     await upd(path+'/meta',{[rule.key]:at});
     if(code!==state.sessionId)throw new Error('활동 코드가 변경되었습니다.');
     state.data=state.data||{meta:{}};
     state.data.meta=state.data.meta||{};
     state.data.meta[rule.key]=at;
     if(phase==='collecting'){
       await upd(path+'/meta',{phase:'selecting',selectionOpenedAt:at});
     }else{
       // Reuse the presenter-owned grouping handler, including the 3-8 size,
       // saved manual placement and Firebase writes. Disabled normal buttons
       // are intentionally invoked only after presenter confirmation.
       const normal=document.getElementById(rule.button);
       if(!normal||typeof normal.onclick!=='function')throw new Error('모둠 시작 기능을 찾지 못했습니다.');
       await normal.onclick.call(normal);
     }
     const after=await get(path+'/meta')||{};
     if(after.phase!==rule.next)throw new Error('다음 단계 전환이 완료되지 않았습니다. 오류 안내를 확인하세요.');
     toast('미완료자 '+missing.length+'명이 있는 상태로 '+rule.label+'을 시작했습니다.');
   }catch(e){
     console.error('Presenter override failed',e);
     toast('강제 단계 진행 실패: '+String(e.message||e));
   }finally{
     busy=false;
     const el=document.getElementById('fpForceAdvance');if(el)el.disabled=false;
   }
 }
 renderDashboard=function(){
   originalDashboard();
   const data=state.data||{},phase=data.meta?.phase,rule=stages[phase];
   if(!rule||data.meta?.status==='closed')return;
   const missing=pending(data,phase),total=participants(data).length;
   if(!total||!missing.length)return;
   const panel=app.querySelector('.panel.control');
   if(!panel)return;
   const holder=document.createElement('div');
   holder.className='fp-override-controls';
   const btn=document.createElement('button');
   btn.id='fpForceAdvance';btn.type='button';btn.className='btn soft fp-override-button';
   btn.textContent='미완료자 포함 다음 단계 진행';
   btn.onclick=advance;
   const note=document.createElement('span');
   note.className='fp-override-note';
   note.textContent=total+'명 중 '+missing.length+'명 미완료 · 진행자 확인 후 '+rule.label+' 가능';
   holder.append(btn,note);
   panel.appendChild(holder);
 };
 const style=document.createElement('style');
 style.textContent='.fp-override-controls{width:100%;display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding-top:9px;border-top:1px solid #d8e2e0}.fp-override-button{border:1px solid #d3a36e!important;background:#fff4e6!important;color:#8a4e21!important;font-weight:900!important}.fp-override-note{font-size:13px;color:#795d49;font-weight:800}';
 document.head.appendChild(style);
})();
