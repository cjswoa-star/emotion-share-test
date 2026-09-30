/* FAMOUS PEOPLE SEL · hard bypass for obsolete mood bridge */
(function(){
  renderEntry=function(){
    app.innerHTML=shell(`<div class="entry"><div class="kicker">FAMOUS PEOPLE SEL</div><h1>오늘 사용할 이름을 정해볼까요?</h1><p class="subtitle">실명 대신 서로 알아볼 수 있는 짧은 닉네임이면 충분해요.</p><label for="nick">닉네임</label><input id="nick" class="nickname" maxlength="10" value="${esc(state.nickname)}" placeholder="예: 민들레" autocomplete="off"><p class="small" style="margin-top:9px">이 닉네임은 잠시 뒤 같은 장면이나 이유를 고른 사람과 만날 때 사용됩니다.</p><button class="btn orange" id="next" style="width:100%;margin-top:16px" disabled>입장하기</button></div>`);
    const i=document.getElementById('nick'),b=document.getElementById('next');
    const valid=()=>b.disabled=!i.value.trim();
    i.oninput=valid;valid();
    b.onclick=async()=>{
      await saveNick(i.value);
      state.sceneIndex=0;
      renderScene(0);
    };
    qa();
  };
  console.info('[FAMOUS PEOPLE] obsolete mood bridge bypassed');
})();
