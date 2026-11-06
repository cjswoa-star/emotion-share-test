/* Recovery for presenter-forced phase changes. A skipped stage is never
   backfilled with fictional answers. The student's saved data remains intact. */
(function installForceRecovery(){
 'use strict';
 if(typeof routeParticipant!=='function'||typeof saveFocus!=='function')return;
 const previousRoute=routeParticipant;
 const previousEnsure=ensure;
 const previousSaveNick=saveNick;
 let stop=null,watched='',lastToken=null,inFlight=false;
 const nowMeta=()=>get('sessions/'+state.sessionId+'/meta');
 function hasOverride(m){return !!(m.forceSelectionAt||m.forceDialogue1At||m.forceDialogue2At);}
 function validScene(id){return SCENES.some(s=>s.id===id);}
 function isMissingScenes(){return !SCENES.every(s=>state.checkpoints?.[s.id]);}
 function renderQuick(phase){
   state.unsub?.();state.unsub=null;
   const name=phase==='selecting'?'더 깊게 살펴볼 장면 선택':
     phase==='dialogue1'?'첫 번째 만남에 합류':
     phase==='deep'?'마음 깊이 들여다보기':'두 번째 만남에 합류';
   const guidance=phase==='selecting'?'장면 선택 후 진행자가 첫 번째 만남을 열 때까지 기다립니다.':
     phase==='deep'?'장면을 선택한 뒤 마음의 이유를 살펴봅니다.':
     '장면을 고르면 현재 열려 있는 모둠으로 합류합니다.';
   app.innerHTML=shell('<div class="release-panel fp-force-scene"><div class="kicker">현재 수업 단계에 합류하기</div>'+
     '<h1>'+esc(name)+'</h1><p>앞선 활동을 다 마치지 못했더라도 지금부터 참여할 수 있습니다.</p>'+
     '<p class="small">이미 작성한 응답은 그대로 저장됩니다. 아래에서 장면을 선택해 주세요.</p>'+
     '<div class="fp-force-scene-grid">'+SCENES.map(s=>'<button type="button" class="fp-force-choice" data-force-scene="'+esc(s.id)+'"><span>'+s.n+'</span>'+esc(s.title)+'</button>').join('')+'</div>'+
     '<p class="small">'+esc(guidance)+'</p></div>');
   app.querySelectorAll('[data-force-scene]').forEach(btn=>btn.onclick=async()=>{
     btn.disabled=true;
     try{
       const current=await nowMeta()||{};
       if(current.phase!==phase){await routeParticipant();return;}
       const scene=btn.dataset.forceScene;
       if(!validScene(scene))throw new Error('장면 선택을 확인하세요.');
       await saveFocus(scene);
       if(phase==='deep')renderEmotion();
       else if(phase==='dialogue2')renderMeeting2();
       else renderMeeting1();
     }catch(e){
       showConnectionError(e);
       if(btn.isConnected)btn.disabled=false;
     }
   });
   qa();
 }
 function showLastReflection(){
   renderReflection();
   const back=app.querySelector('[data-back]');
   if(back){back.disabled=true;back.style.visibility='hidden';back.onclick=null;}
   const help=app.querySelector('.reflection-helper');
   if(help)help.textContent='완료하지 못한 앞 단계가 있어도 오늘의 경험과 생각을 정리할 수 있습니다.';
 }
 routeParticipant=async function(){
   if(!state.nickname||reviewMode||debugMode)return previousRoute();
   const meta=await nowMeta()||{};
   const phase=meta.phase;
   if(phase==='selecting'&&meta.forceSelectionAt&&!state.focusScene&&isMissingScenes())return renderQuick(phase);
   if(phase==='dialogue1'&&meta.forceDialogue1At&&!state.focusScene)return renderQuick(phase);
   if(phase==='deep'&&hasOverride(meta)&&!state.focusScene)return renderQuick(phase);
   if(phase==='dialogue2'&&meta.forceDialogue2At){
     if(!state.focusScene)return renderQuick(phase);
     // A participant who did not finish the reason step can still join the
     // discussion; the reason remains empty in Firebase.
     return renderMeeting2();
   }
   if((phase==='life'||phase==='reflection')&&hasOverride(meta)&&(!state.focusScene||!state.deepDive?.reason)){
     if(state.finalReflection?.completedAt)return renderComplete();
     if(!state.focusScene)return showLastReflection();
     // Preserve the SEL "real me" stages even when the earlier reason was skipped.
     const d=state.deepDive||{};
     if(d.nextAction)return renderSummary();
     if(d.lifeLink)return renderNextAction();
     return renderRoleTransition();
   }
   return previousRoute();
 };
 function watch(){
   const code=state.sessionId;
   if(reviewMode||debugMode||!state.nickname||!code||state.backend!=='firebase'||state.lateEntryPhase)return;
   if(stop&&watched===code)return;
   stop?.();watched=code;lastToken=null;
   stop=listen('sessions/'+code+'/meta',meta=>{
     if(!meta?.phase)return;
     // Route only when the phase changes, never when the marker is prewritten;
     // this avoids interrupting an unfinished textarea during the confirmation step.
     const token=meta.phase;
     if(lastToken===null){lastToken=token;return;}
     if(token===lastToken)return;
     lastToken=token;
     if(!hasOverride(meta)||inFlight||code!==state.sessionId)return;
     inFlight=true;
     Promise.resolve().then(()=>routeParticipant()).catch(showConnectionError).finally(()=>{inFlight=false;});
   });
 }
 ensure=async function(){await previousEnsure();watch();};
 saveNick=async function(n){await previousSaveNick(n);watch();};
 const st=document.createElement('style');
 st.textContent='.fp-force-scene{height:100%;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:20px!important}.fp-force-scene h1{font-size:clamp(21px,5.4vw,29px);line-height:1.25}.fp-force-scene-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0;min-height:0;overflow:auto}.fp-force-choice{display:flex;align-items:center;gap:9px;text-align:left;border-radius:14px;border:1px solid #bfd4db;background:#f6faf9;color:#35556a;padding:13px 10px;font-weight:800;font-size:clamp(12px,3.3vw,15px);line-height:1.35}.fp-force-choice span{font-weight:950;color:#bd765e}.fp-force-choice:disabled{opacity:.55}@media(min-width:700px){.fp-force-scene-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';
 document.head.appendChild(st);
 if(window.__FPSEL__)window.__FPSEL__.routeParticipant=(...args)=>routeParticipant(...args);
})();
