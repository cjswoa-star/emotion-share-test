/* FAMOUS PEOPLE SEL · 2026-09-30 participant feedback patch
   UI/wording only. Firebase Rules and the base app file are untouched. */
(function(){
  const STYLE_ID='fp-field-feedback-style';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .fp-transition{margin:auto 0;padding:22px 18px;border:1.5px solid #c8d7da;border-radius:24px;background:linear-gradient(180deg,#f6faf9,#eef5f3);text-align:center;box-shadow:0 10px 28px rgba(53,85,106,.08)}
      .fp-transition .icon{font-size:34px;margin-bottom:8px}.fp-transition h1{font-size:clamp(24px,7vw,34px);line-height:1.25;margin:6px 0 12px}.fp-transition p{font-size:15px;line-height:1.65;color:#607781;margin:0 0 12px}.fp-transition .axes{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:14px 0}.fp-transition .axis{background:#fff;border:1px solid #d5e0e2;border-radius:12px;padding:9px;font-size:12.5px;font-weight:800;color:#536d79}
      .fp-direct{margin-top:10px;padding:12px;border:1.5px dashed #8fb0ba;border-radius:16px;background:#f6fbfc}.fp-direct label{display:block;font-weight:950;color:#405f70;margin-bottom:7px}.fp-direct input{width:100%;height:44px;box-sizing:border-box;border:1.5px solid #b9ccd1;border-radius:11px;padding:0 12px;font-size:15px;font-weight:800;background:#fff}.fp-direct .hint{font-size:11.5px;color:#74878e;margin-top:5px;line-height:1.35}
      .choice-btn.selected,.next-btn.selected,.word.selected,.body-btn.selected{outline:3px solid rgba(53,85,106,.35)!important;box-shadow:0 0 0 2px #fff inset!important;transform:translateY(-1px)}
      @media(max-width:380px){.fp-transition{padding:16px 13px}.fp-transition p{font-size:13.5px}.fp-transition .axes{gap:5px}.fp-transition .axis{padding:7px;font-size:11.5px}.fp-direct{padding:9px}.fp-direct input{height:40px}}
      @media(max-height:650px){.fp-transition{margin:0;padding:13px}.fp-transition .icon{font-size:26px}.fp-transition h1{font-size:22px;margin:3px 0 7px}.fp-transition p{font-size:12.5px;line-height:1.45}.fp-transition .axes{margin:8px 0}.fp-transition .axis{padding:6px}.fp-direct{margin-top:6px;padding:7px}}
    `;document.head.appendChild(s);
  }

  function renderMoodBridge(){
    app.innerHTML=shell(`<div class="fp-transition"><div class="kicker">잠시, 나만의 공간으로</div><div class="icon">◌</div><h1>방금 지나온 드라마의 장면을<br>천천히 떠올려봅니다.</h1><p>정답을 고르는 시간이 아닙니다.<br>그 장면에서 내 마음이 <b>편했는지 불편했는지</b>,<br><b>에너지가 높았는지 낮았는지</b>를 먼저 느껴보세요.</p><div class="axes"><div class="axis">위쪽<br><b>에너지가 높음</b></div><div class="axis">아래쪽<br><b>에너지가 낮음</b></div><div class="axis">왼쪽<br><b>불편한 느낌</b></div><div class="axis">오른쪽<br><b>편안한 느낌</b></div></div><p>이제 휴대폰을 작은 일기장처럼 펼쳐,<br>여섯 장면의 마음을 가볍게 표시해봅니다.</p><button class="btn orange" id="fpMoodStart" style="width:100%">마음의 이동 시작하기</button></div>`);
    document.querySelector('[data-back]')&&(document.querySelector('[data-back]').onclick=renderEntry);
    document.getElementById('fpMoodStart').onclick=()=>renderScene(0);qa();
  }

  renderEntry=function(){
    app.innerHTML=shell(`<div class="entry"><div class="kicker">FAMOUS PEOPLE SEL</div><h1>오늘 사용할 이름을 정해볼까요?</h1><p class="subtitle">실명 대신 서로 알아볼 수 있는 짧은 닉네임이면 충분해요.</p><label for="nick">닉네임</label><input id="nick" class="nickname" maxlength="10" value="${esc(state.nickname)}" placeholder="예: 민들레" autocomplete="off"><p class="small" style="margin-top:9px">이 닉네임은 잠시 뒤 같은 장면이나 이유를 고른 사람과 만날 때 사용됩니다.</p><button class="btn orange" id="next" style="width:100%;margin-top:16px" disabled>입장하기</button></div>`);
    const i=document.getElementById('nick'),b=document.getElementById('next');const v=()=>b.disabled=!i.value.trim();i.oninput=v;v();b.onclick=async()=>{await saveNick(i.value);state.sceneIndex=0;renderMoodBridge()};qa();
  };

  renderMeeting2=function(){
    state.unsub?.();const d=deep(),s=SCENES.find(x=>x.id===state.focusScene);
    app.innerHTML=shell(`${topbar('두 번째 만남')}<div class="meeting-head"><div class="kicker">다른 장면의 사람들과 만나기</div><h1>이번에는 서로 다른 장면의 경험을 나눕니다.</h1><p>내가 고른 장면 · ${s.n} ${s.title}</p></div><div class="meeting-card"><div class="mode-badge" id="mode">${reviewMode?'테스트 · 서로 다른 장면을 섞은 모둠':'진행자가 모둠을 준비하고 있어요.'}</div><div class="names" id="names">${reviewMode?`<span class="name-chip self">${esc(state.nickname||'나')}<span class="group-scene-chip">${s.n}</span></span><span class="name-chip">단풍<span class="group-scene-chip">02</span></span><span class="name-chip">바다<span class="group-scene-chip">04</span></span>`:`<span class="name-chip self">${esc(state.nickname)}</span>`}</div><div class="dialogue-guide"><div class="dialogue-step"><b>1</b><div><strong>내가 고른 장면을 짧게 소개해 주세요.</strong>그 장면에서 느꼈던 마음과 몸의 반응을 한 가지 이야기해 주세요.</div></div><div class="dialogue-step"><b>2</b><div><strong>그 마음과 몸의 반응은 왜 나타났을까요?</strong>내가 찾은 이유를 내 말로 설명해보세요.</div></div><div class="dialogue-step"><b>3</b><div><strong>다른 사람의 이야기를 들으며 무엇이 같거나 달랐나요?</strong>새롭게 알게 된 점 하나를 말해보세요.</div></div></div><div class="waiting-note" id="note">${reviewMode?'전체 흐름을 확인하기 위한 예시 모둠입니다.':'진행자가 두 번째 만남을 열면 모둠이 나타납니다.'}</div>${reviewMode?'<button class="btn orange" id="reviewLife" style="margin-top:8px;width:100%">테스트 계속 · 역할 밖의 나로</button>':'<div class="waiting-lock">진행자가 다음 단계를 열면 자동으로 이동합니다.</div>'}</div>`);
    document.querySelector('[data-back]').onclick=renderReason;
    if(reviewMode){document.getElementById('reviewLife').onclick=renderRoleTransition;qa();return}
    state.unsub=listen(`sessions/${state.sessionId}`,data=>{if(data?.meta?.phase==='life'){state.unsub?.();state.unsub=null;renderRoleTransition();return}const open=!!data?.meta?.dialogue2Open,g=myStoredGroup(data,'dialogue2'),mine=g?memberRows(data,g):[];if(!open)return;document.getElementById('mode').textContent='서로 다른 장면을 섞은 모둠';document.getElementById('names').innerHTML=mine.length?mine.map(r=>{const sc=SCENES.find(s=>s.id===r.focusScene);return `<span class="name-chip ${r.id===state.participantId?'self':''}">${esc(r.nickname)}<span class="group-scene-chip">${sc?.n||''}</span></span>`}).join(''):`<span class="name-chip self">${esc(state.nickname)}</span>`;document.getElementById('note').textContent=mine.length>1?`${mine.length}명이 한 모둠이에요. 서로 다른 장면의 경험을 들어보세요.`:'지금은 함께 매칭할 사람이 없어요. 진행자에게 알려주세요.'});qa();
  };

  renderLife=function(){
    const d=deep();const opts=['있어요','잘 떠오르지 않아요'];
    app.innerHTML=shell(`${topbar('실제 나에게 연결하기')}<div class="choice-head"><h1>실제 나에게도<br>비슷한 마음이나 상황이 있었나요?</h1><p>구체적인 일을 말하거나 쓰지 않아도 됩니다. 지금 떠오르는 정도만 조용히 확인해보세요.</p></div><div class="choice-grid" style="grid-template-rows:repeat(2,1fr)">${opts.map(x=>`<button class="choice-btn ${d.lifeLink===x?'selected':''}" data-v="${x}">${x}</button>`).join('')}</div>`);
    document.querySelector('[data-back]').onclick=renderRoleTransition;document.querySelectorAll('[data-v]').forEach(b=>b.onclick=async()=>{d.lifeLink=b.dataset.v;await saveDeep();renderNextAction()});qa();
  };

  renderNextAction=function(){
    const d=deep(),custom=d.nextAction==='내가 직접 적어보기';
    const prompt=d.lifeLink==='있어요'?'비슷한 상황이 다시 온다면, 나는 어떻게 행동해보고 싶나요?':'앞으로 이런 상황이 생긴다면, 나는 어떻게 행동해보고 싶나요?';
    const preset=NEXT_ACTIONS.filter(x=>x!=='내가 직접 적어보기');
    app.innerHTML=shell(`${topbar('다음의 나')}<div class="choice-head"><h1>${prompt}</h1><p>감정을 없애는 방법이 아니라, 그 상황에서 내가 선택하고 싶은 행동을 생각해봅니다.</p></div><div class="next-grid">${preset.map(x=>`<button class="next-btn ${d.nextAction===x?'selected':''}" data-v="${x}">${x}</button>`).join('')}</div><div class="fp-direct"><label for="fpCustomAction">보기와 다른 생각이 있다면, 내가 직접 쓸래요.</label><input id="fpCustomAction" maxlength="40" value="${custom?esc(d.nextActionText||''):''}" placeholder="내가 해보고 싶은 행동을 적어보세요." autocomplete="off"><div class="hint">직접 적은 내용은 다른 선택지 대신 나의 답으로 저장됩니다.</div></div><button class="btn primary" id="fpNextDone" style="margin-top:8px;width:100%" ${d.nextAction&&!custom?'':'disabled'}>이 선택으로 정리하기</button>`);
    document.querySelector('[data-back]').onclick=renderLife;
    const input=document.getElementById('fpCustomAction'),done=document.getElementById('fpNextDone');
    document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{d.nextAction=b.dataset.v;d.nextActionText='';input.value='';document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('selected',x.dataset.v===d.nextAction));done.disabled=false});
    input.oninput=()=>{const v=input.value.trim().slice(0,40);if(v){d.nextAction='내가 직접 적어보기';d.nextActionText=v;document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('selected'));done.disabled=false}else{if(d.nextAction==='내가 직접 적어보기'){d.nextAction='';d.nextActionText=''}done.disabled=!d.nextAction}};
    done.onclick=async()=>{if(d.nextAction==='내가 직접 적어보기'){d.nextActionText=input.value.trim().slice(0,40);if(!d.nextActionText){input.focus();return}}await saveDeep();renderSummary()};qa();
  };

  renderReflection=function(){
    const f=state.finalReflection||{text:'',share:true};
    app.innerHTML=shell(`${topbar('나에게 한마디')}<div class="reflection-head"><h1>내 마음을 들여다본 지금,<br>나에게 해주고 싶은 한마디는 무엇인가요?</h1><p class="reflection-helper">오늘 활동에 대한 평가가 아니라, 지금의 나에게 남기고 싶은 말을 한 문장으로 적어보세요.</p></div><div class="reflection-card"><textarea id="reflection" maxlength="150" placeholder="예: 다음에는 조금 더 솔직해져도 괜찮아.">${esc(f.text||'')}</textarea></div><button class="btn primary" id="done">작성한 문장 공유하기</button>`);
    document.querySelector('[data-back]').onclick=renderSummary;document.getElementById('done').onclick=async()=>{const value=document.getElementById('reflection').value.trim().slice(0,150);if(!value){document.getElementById('reflection').focus();return}state.finalReflection={text:value,share:true,completedAt:Date.now()};await saveReflection();renderComplete()};qa();
  };

  console.info('[FAMOUS PEOPLE] field feedback participant patch active');
})();
