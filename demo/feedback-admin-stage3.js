/* FAMOUS PEOPLE SEL · presenter stability patch */
(function(){
  const sig=()=>{try{return JSON.stringify(state?.data||{})}catch{return String(Date.now())}};
  const originalRender=renderDashboard;
  const originalRefresh=refreshOverlay;
  let lastSig='';
  let pointerBusy=false;
  let pending=false;
  let finalSpotId=null;

  document.addEventListener('pointerdown',e=>{if(e.target.closest?.('button,select,input'))pointerBusy=true},true);
  const release=()=>setTimeout(()=>{pointerBusy=false;if(pending){pending=false;lastSig='';renderDashboard()}},60);
  document.addEventListener('pointerup',release,true);
  document.addEventListener('pointercancel',release,true);

  renderDashboard=function(force=false){
    const s=sig();
    if(!force && s===lastSig && document.querySelector('.shell'))return;
    if(pointerBusy){pending=true;return}
    lastSig=s;
    return originalRender();
  };

  refreshOverlay=function(){
    if(finalSpotId&&document.getElementById('finalSpot'))return;
    return originalRefresh();
  };

  openFinalSpot=function(pid){
    const x=rows(state.data||{}).find(r=>r.id===pid);if(!x?.finalReflection?.text)return;
    document.getElementById('finalSpot')?.remove();
    finalSpotId=pid;
    const len=x.finalReflection.text.length,ff=len<=45?50:len<=80?42:len<=120?34:28,o=document.getElementById('overlay');if(!o)return;
    o.insertAdjacentHTML('beforeend',`<div id="finalSpot" class="final-spot"><div class="final-spot-card" style="--spotff:${ff}px"><div class="spot-who">${esc(x.nickname)}</div><div class="spot-text">${esc(x.finalReflection.text)}</div><button id="spotClose" class="btn primary" type="button" style="margin-top:24px;min-width:120px">닫기</button><div class="spot-hint">‘닫기’를 누르기 전까지 이 문장을 그대로 보여줍니다.</div></div></div>`);
    document.getElementById('spotClose').onclick=()=>{finalSpotId=null;document.getElementById('finalSpot')?.remove();originalRefresh()};
  };

  // Existing final-card binding calls the global openFinalSpot above.
  console.info('[FAMOUS PEOPLE] presenter stability patch active');
})();
