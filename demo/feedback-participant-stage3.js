/* FAMOUS PEOPLE SEL · reflective transition after nickname */
(function(){
  function renderReflectiveBridge(){
    app.innerHTML=shell(`
      <div class="fp-reflective-bridge" style="min-height:62vh;display:flex;flex-direction:column;justify-content:center;padding:30px 22px;text-align:center;background:linear-gradient(180deg,#f7faf8 0%,#edf4f1 100%);border:1.5px solid #d3dfdc;border-radius:26px;box-shadow:0 12px 30px rgba(53,85,106,.08)">
        <div class="kicker" style="margin-bottom:14px">드라마에서 나로</div>
        <div style="width:42px;height:2px;background:#9eb4ad;margin:0 auto 18px;border-radius:999px"></div>
        <h1 style="font-size:clamp(25px,7vw,34px);line-height:1.32;margin:0 0 18px;color:#35556a">잠깐,<br>방금의 장면으로 돌아가 봅니다.</h1>
        <p style="font-size:16px;line-height:1.75;color:#536f79;margin:0 0 14px">가장 마음에 남아 있는 순간 하나를 떠올려보세요.<br>그때의 나는 어떤 마음이었을까요?</p>
        <p style="font-size:13px;line-height:1.6;color:#7a8e94;margin:0 0 24px">말로 설명하지 않아도 괜찮습니다.<br>먼저 마음이 머문 곳을 찾아봅니다.</p>
        <button class="btn orange" id="fpBridgeNext" style="width:100%;max-width:420px;margin:0 auto">내 마음 살펴보기</button>
      </div>`);
    const back=document.querySelector('[data-back]');if(back)back.onclick=renderEntry;
    document.getElementById('fpBridgeNext').onclick=()=>{state.sceneIndex=0;renderScene(0)};
    qa();
  }

  renderEntry=function(){
    app.innerHTML=shell(`<div class="entry"><div class="kicker">FAMOUS PEOPLE SEL</div><h1>오늘 사용할 이름을 정해볼까요?</h1><p class="subtitle">실명 대신 서로 알아볼 수 있는 짧은 닉네임이면 충분해요.</p><label for="nick">닉네임</label><input id="nick" class="nickname" maxlength="10" value="${esc(state.nickname)}" placeholder="예: 민들레" autocomplete="off"><p class="small" style="margin-top:9px">이 닉네임은 잠시 뒤 같은 장면이나 이유를 고른 사람과 만날 때 사용됩니다.</p><button class="btn orange" id="next" style="width:100%;margin-top:16px" disabled>입장하기</button></div>`);
    const i=document.getElementById('nick'),b=document.getElementById('next');
    const valid=()=>b.disabled=!i.value.trim();
    i.oninput=valid;valid();
    b.onclick=async()=>{
      await saveNick(i.value);
      state.sceneIndex=0;
      renderReflectiveBridge();
    };
    qa();
  };
  window.renderReflectiveBridge=renderReflectiveBridge;
  console.info('[FAMOUS PEOPLE] reflective transition active');
})();
