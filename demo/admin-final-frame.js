/* Restores the originally approved v8.4 exhibition frame in the separate presenter board.
   Names default to hidden and are a presenter-only local display preference.
   Preserves Firebase participation and the existing final-card click handler. */
(function restoreFinalFrame(){
 'use strict';
 let showNames=false,loadedFor='';
 const previousSpot=openFinalSpot;
 const previousOverlay=openOverlay;
 function safeName(v){return esc(String(v==null?'':v));}
 function prefKey(){return 'FPSEL_FINAL_NAMES::'+String(state.sessionId||'');}
 function readPref(){
   const code=String(state.sessionId||'');
   if(code===loadedFor)return;
   loadedFor=code;
   try{showNames=localStorage.getItem(prefKey())==='true';}catch{showNames=false;}
 }
 function isFinished(r){
   const f=r.finalReflection||{};
   return !!(f.completedAt||String(f.text||'').trim());
 }
 function isPublic(r){
   const f=r.finalReflection||{};
   return isFinished(r)&&!!String(f.text||'').trim()&&f.share!==false;
 }
 function cardsPerRow(n){return n<=4?2:n<=9?3:n<=16?4:n<=25?5:6;}
 finalOverlay=function(){
   readPref();
   const people=rows(state.data||{}).slice().sort((a,b)=>a.id.localeCompare(b.id));
   const publicPeople=people.filter(isPublic);
   const privatePeople=people.filter(r=>isFinished(r)&&!isPublic(r));
   const pending=people.filter(r=>!isFinished(r));
   const columns=cardsPerRow(Math.max(people.length,1));
   const rowsCount=Math.ceil(Math.max(people.length,1)/columns);
   let number=0;
   const grid=people.map(r=>{
     if(!isPublic(r)){
       const label=showNames?safeName(r.nickname):'';
       const status=isFinished(r)?'제출 완료 · 비공개':'작성 중';
       return '<div class="final-card sel-empty-reflection"><b class="who">'+label+'</b><span>'+status+'</span></div>';
     }
     number++;
     const text=String(r.finalReflection.text||'');
     const label=showNames?safeName(r.nickname):'문장 '+number;
     const size=text.length<=25?25:text.length<=45?22:text.length<=70?19:text.length<=100?16:14;
     return '<button type="button" class="final-card sel-shared-reflection" data-final-id="'+safeName(r.id)+'" aria-label="'+safeName(label)+' 확대" title="클릭하면 금색 액자로 크게 표시"><span class="who">'+label+'</span><span class="txt" style="--cellfont:'+size+'px">'+safeName(text)+'</span></button>';
   }).join('');
   const toolbar='<div class="fp-final-tools"><label><input type="checkbox" id="fpFinalShowNames"'+(showNames?' checked':'')+'>닉네임 표시</label><small>체크하면 문장 카드와 금색 액자 아래에 작성자가 표시됩니다.</small></div>';
   const waiting=showNames&&pending.length?' · 작성 중: '+pending.map(r=>safeName(r.nickname)).join(' · '):'';
   const meta='<div class="final-meta"><span class="pill">공유 '+publicPeople.length+'명</span><span class="pill">비공개 완료 '+privatePeople.length+'명</span><span class="pill">작성 중 '+pending.length+'명</span><span class="waiting">'+waiting+'</span></div>';
   return toolbar+meta+'<div class="final-grid fp-final-grid sel-final-grid" style="--cols:'+columns+';--rows:'+rowsCount+'">'+(grid||'<div class="overlay-empty">참가자가 아직 없습니다.</div>')+'</div>';
 };
 openFinalSpot=function(id){
   readPref();
   const entry=rows(state.data||{}).find(r=>r.id===id);
   if(!entry||!isPublic(entry))return;
   previousSpot(id); // keep original spotlight state and live-update behavior
   const spot=document.getElementById('finalSpot');
   if(!spot)return;
   const text=safeName(entry.finalReflection.text);
   const signature=showNames&&entry.nickname?'<div class="quote-signature">— '+safeName(entry.nickname)+'</div>':'';
   spot.classList.add('fp-final-frame-overlay');
   spot.setAttribute('role','dialog');spot.setAttribute('aria-modal','true');
   spot.setAttribute('aria-label','오늘 활동을 마치며 · 문장 확대');
   spot.innerHTML='<div class="quote-frame"><button type="button" class="quote-close" aria-label="문장 목록으로 돌아가기">×</button><div class="quote-inner"><div class="quote-emblem" aria-hidden="true">❦</div><div class="quote-kicker">오늘 활동을 마치며</div><div class="quote-rule" aria-hidden="true"></div><div class="quote-text">'+text+'</div><div class="quote-rule quote-rule-bottom" aria-hidden="true"></div>'+signature+'</div></div>';
   const close=()=>spot.remove();
   spot.onclick=e=>{if(e.target===spot)close();};
   spot.querySelector('.quote-close').onclick=close;
   spot.querySelector('.quote-close').focus();
 };
 openOverlay=function(kind){
   previousOverlay(kind);
   if(kind!=='final')return;
   const toggle=document.getElementById('fpFinalShowNames');
   if(!toggle)return;
   toggle.onchange=()=>{
     showNames=toggle.checked;
     try{localStorage.setItem(prefKey(),String(showNames));}catch{}
     openOverlay('final');
   };
 };
})();
