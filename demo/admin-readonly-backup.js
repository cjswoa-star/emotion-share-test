/* Read-only presenter backup: intentionally never writes to Firebase. */
(function(){
  'use strict';
  const buttonId='fpSafeBackup';
  function attach(){
    const actions=document.querySelector('.top .actions');
    if(!actions||!window.state||!state.sessionId||document.getElementById(buttonId))return;
    const btn=document.createElement('button');
    btn.id=buttonId;btn.className='btn soft';btn.type='button';btn.textContent='활동 원본 백업(JSON)';
    btn.title='Firebase에서 활동 데이터를 읽어 JSON으로 보관합니다. 원본 데이터는 변경하지 않습니다.';
    btn.onclick=async function(){
      if(btn.disabled)return;
      btn.disabled=true;btn.textContent='원본 조회 중...';
      try{
        const code=state.sessionId;
        const data=await get('sessions/'+code);
        if(!data||!data.meta)throw Error('활동 데이터를 확인할 수 없습니다.');
        if(code!==state.sessionId)throw Error('활동 코드가 변경되었습니다. 다시 시도하세요.');
        const count=Object.keys(data.participants||{}).length;
        const payload={format:'FPSEL_SESSION_READONLY_BACKUP_V1',activityCode:code,exportedAt:new Date().toISOString(),participantCount:count,data};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
        const blobUrl=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=blobUrl;
        a.download='FAMOUS_PEOPLE_SEL_'+code+'_BACKUP_'+new Date().toISOString().slice(0,10)+'.json';
        document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),30000);
        btn.textContent='원본 백업 요청 완료 ('+count+'명)';
        if(typeof toast==='function')toast('백업 파일 다운로드를 확인해 주세요.');
      }catch(e){
        btn.textContent='백업 실패 · 다시 시도';
        window.alert('활동 원본 백업 실패: '+(e?.message||String(e))+'\n현재 화면을 닫거나 새로고침하지 말고 오류 내용을 알려주세요.');
      }finally{
        btn.disabled=false;
      }
    };
    actions.prepend(btn);
  }
  const observer=new MutationObserver(()=>attach());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();