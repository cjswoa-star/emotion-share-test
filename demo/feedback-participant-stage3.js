/* FAMOUS PEOPLE SEL · diary-style entry and reflective transition */
(function(){
  const STYLE_ID='fp-diary-entry-style';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .fp-diary-cover,.fp-diary-page{position:relative;overflow:hidden;box-sizing:border-box;width:100%;min-height:62vh;border-radius:24px;box-shadow:0 16px 36px rgba(53,85,106,.10)}
      .fp-diary-cover{display:flex;flex-direction:column;justify-content:center;padding:32px 26px;background:linear-gradient(145deg,#526f78 0%,#35556a 72%);color:#fff;border:1px solid rgba(255,255,255,.16)}
      .fp-diary-cover:before{content:'';position:absolute;left:18px;top:20px;bottom:20px;width:2px;background:rgba(255,255,255,.22);box-shadow:6px 0 0 rgba(255,255,255,.07)}
      .fp-diary-cover .diary-kicker{font-size:12px;font-weight:900;letter-spacing:.14em;opacity:.74;margin:0 0 14px 12px}
      .fp-diary-cover h1{font-size:clamp(27px,7vw,36px);line-height:1.3;margin:0 0 10px 12px;color:#fff}
      .fp-diary-cover .diary-sub{font-size:14px;line-height:1.65;color:rgba(255,255,255,.78);margin:0 0 24px 12px}
      .fp-diary-cover label{font-size:13px;font-weight:900;margin:0 0 7px 12px;color:rgba(255,255,255,.88)}
      .fp-diary-cover .nickname{width:calc(100% - 12px);margin-left:12px;box-sizing:border-box;height:58px;border:0;border-radius:14px;padding:0 16px;background:#fff;color:#35556a;font-size:20px;font-weight:900;letter-spacing:.02em;box-shadow:0 8px 20px rgba(0,0,0,.10)}
      .fp-diary-cover .diary-note{font-size:11.5px;line-height:1.55;color:rgba(255,255,255,.62);margin:9px 0 0 12px}
      .fp-diary-cover .diary-btn{width:calc(100% - 12px);margin:18px 0 0 12px;height:52px;border:0;border-radius:14px;background:#f2b766;color:#2f4d5f;font-size:16px;font-weight:950;box-shadow:0 8px 18px rgba(0,0,0,.12)}
      .fp-diary-cover .diary-btn:disabled{opacity:.4;box-shadow:none}
      .fp-diary-page{display:flex;flex-direction:column;justify-content:center;padding:38px 28px 34px 46px;background:repeating-linear-gradient(to bottom,#fffdf8 0,#fffdf8 31px,#e9e2d6 32px);border:1px solid #ded7ca;color:#35556a}
      .fp-diary-page:before{content:'';position:absolute;left:28px;top:0;bottom:0;width:1px;background:#d9a7a0}
      .fp-diary-page:after{content:'';position:absolute;left:12px;top:24px;bottom:24px;width:6px;background:radial-gradient(circle,#bcc9c8 2.2px,transparent 2.5px) center top/6px 24px repeat-y;opacity:.8}
      .fp-diary-page .page-no{font-size:11px;font-weight:900;letter-spacing:.16em;color:#87979b;margin-bottom:14px}
      .fp-diary-page h1{font-size:clamp(26px,7vw,34px);line-height:1.35;margin:0 0 20px;color:#35556a}
      .fp-diary-page p{font-size:15px;line-height:1.85;color:#566d75;margin:0 0 14px}
      .fp-diary-page .diary-em{font-weight:900;color:#405f70}
      .fp-diary-page .diary-next{margin-top:18px;width:100%;height:52px;border:0;border-radius:14px;background:#35556a;color:#fff;font-size:16px;font-weight:950;box-shadow:0 8px 18px rgba(53,85,106,.16)}
      @media(max-width:380px){.fp-diary-cover{padding:26px 18px}.fp-diary-page{padding:30px 18px 28px 40px}.fp-diary-page p{font-size:14px}.fp-diary-cover h1,.fp-diary-page h1{font-size:25px}}
      @media(max-height:650px){.fp-diary-cover,.fp-diary-page{min-height:auto}.fp-diary-cover{padding-top:22px;padding-bottom:22px}.fp-diary-page{padding-top:24px;padding-bottom:22px}.fp-diary-page p{line-height:1.6;margin-bottom:9px}}
    `;
    document.head.appendChild(style);
  }

  function renderReflectiveBridge(){
    app.innerHTML=shell(`
      <div class="fp-diary-page">
        <div class="page-no">마음 일기장 · 첫 장</div>
        <h1>이제, 방금 지나온 장면들을<br>한 장씩 다시 펼쳐봅니다.</h1>
        <p>어떤 장면에서는 마음이 크게 움직였고,<br>어떤 장면은 조용히 지나갔을 수도 있습니다.</p>
        <p>여섯 장면을 하나씩 넘겨보며<br><span class="diary-em">그 순간 내 마음이 어디에 있었는지</span> 표시해봅니다.</p>
        <button class="diary-next" id="fpBridgeNext">첫 장면부터 넘겨보기</button>
      </div>`);
    const back=document.querySelector('[data-back]');if(back)back.onclick=renderEntry;
    document.getElementById('fpBridgeNext').onclick=()=>{state.sceneIndex=0;renderScene(0)};
    qa();
  }

  renderEntry=function(){
    app.innerHTML=shell(`
      <div class="fp-diary-cover">
        <div class="diary-kicker">MY FEELING NOTE</div>
        <h1>이 마음 기록에<br>어떤 이름을 남길까요?</h1>
        <p class="diary-sub">실명 대신, 서로 알아볼 수 있는 짧은 이름이면 충분합니다.</p>
        <label for="nick">오늘의 이름</label>
        <input id="nick" class="nickname" maxlength="10" value="${esc(state.nickname)}" placeholder="예: 민들레" autocomplete="off">
        <p class="diary-note">잠시 뒤 다른 사람과 만날 때 이 이름이 보입니다.</p>
        <button class="diary-btn" id="next" disabled>마음 기록 시작하기</button>
      </div>`);
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
  console.info('[FAMOUS PEOPLE] diary-style participant entry active');
})();
