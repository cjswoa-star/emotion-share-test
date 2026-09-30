/* FAMOUS PEOPLE SEL · emotion free-input patch
   Adds an optional free-text emotion name after the first same-scene meeting.
   Custom emotion text is stored directly in deepDive.emotionWords so existing
   summaries/statistics display the student's own word instead of a placeholder. */
(function(){
  const STYLE_ID='fp-emotion-free-input-style';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .emotion-free{flex:0 0 auto;margin-top:7px;padding:7px 9px;border:1.5px solid #cbdde2;border-radius:12px;background:#f4fafb}
      .emotion-free label{display:block;font-size:12.5px;font-weight:900;color:#587487;margin-bottom:5px}
      .emotion-free input{width:100%;height:38px;border:1.5px solid #c7d9de;border-radius:10px;background:#fff;padding:0 10px;font-size:14px;font-weight:800;outline:none}
      .emotion-free input:focus{border-color:#7fa6b2;box-shadow:0 0 0 3px rgba(127,166,178,.16)}
      .emotion-free .small{margin-top:4px;font-size:11.5px;line-height:1.25;color:#73858d}
      @media(max-width:340px) and (max-height:620px){
        .emotion-free{margin-top:5px;padding:5px 7px}.emotion-free label{font-size:11.5px;margin-bottom:3px}.emotion-free input{height:32px;font-size:12.5px}.emotion-free .small{font-size:10.5px;margin-top:2px}
      }
    `;
    document.head.appendChild(style);
  }

  if(typeof renderEmotion!=='function'||typeof deep!=='function'||typeof nearestWords!=='function'){
    console.warn('[FAMOUS PEOPLE] emotion free-input patch: required functions not found');
    return;
  }

  renderEmotion=function(){
    const d=deep();
    const p=state.checkpoints[state.focusScene];
    const cands=nearestWords(p,8);
    const selected=new Set(d.emotionWords||[]);
    const legacyLabel=(typeof CUSTOM_LABEL!=='undefined'?CUSTOM_LABEL:'내 말로 적어볼게요');
    let savedCustom=String(d.emotionText||'').trim().slice(0,20);

    // Migrate the earlier placeholder representation if it exists.
    if(selected.has(legacyLabel)){
      selected.delete(legacyLabel);
      if(savedCustom)selected.add(savedCustom);
    }
    let customActive=!!(savedCustom&&selected.has(savedCustom));

    app.innerHTML=shell(`${topbar('내 마음 깊이 들여다보기')}${roleFrame()}${contextHTML()}<div class="emotion-question">그 장면의 나에게 가까운 마음 이름은 무엇인가요?</div><div class="word-grid">${cands.map(w=>`<button class="word ${selected.has(w.word)?'selected':''}" data-word="${esc(w.word)}">${esc(w.word)}</button>`).join('')}</div><div class="emotion-free"><label for="emotionOther">목록에 없다면, 내 말로 감정 이름을 적어도 괜찮아요.</label><input id="emotionOther" maxlength="20" value="${esc(savedCustom)}" placeholder="내 마음 이름을 적어보세요." autocomplete="off"><div class="small" id="emotionMsg">직접 적은 말도 선택 1개로 셉니다.</div></div><div class="deep-footer"><span class="deep-count"><b id="wc">${selected.size}</b> / 2 선택</span><button class="btn primary" id="wordNext" ${selected.size?'':'disabled'}>이 마음으로 볼게요</button></div>`);

    document.querySelector('[data-back]').onclick=renderMeeting1;
    const input=document.getElementById('emotionOther');
    const msg=document.getElementById('emotionMsg');
    const next=document.getElementById('wordNext');

    const currentInput=()=>input.value.trim().slice(0,20);
    const sync=()=>{
      d.emotionWords=[...selected];
      d.emotionText=customActive?currentInput():'';
      d.emotionCustomActive=customActive;
      document.querySelectorAll('[data-word]').forEach(x=>x.classList.toggle('selected',selected.has(x.dataset.word)));
      document.getElementById('wc').textContent=selected.size;
      const pending=currentInput()&&!customActive;
      next.disabled=!selected.size||pending;
    };
    const tryActivateCustom=()=>{
      const v=currentInput();
      if(!v){customActive=false;return true}
      if(customActive&&savedCustom&&savedCustom!==v)selected.delete(savedCustom);
      if(!customActive&&selected.size>=2)return false;
      if(customActive&&savedCustom)selected.delete(savedCustom);
      selected.add(v);
      savedCustom=v;
      customActive=true;
      return true;
    };

    document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>{
      const w=b.dataset.word;
      if(selected.has(w)){
        selected.delete(w);
        if(currentInput()&&!customActive&&selected.size<2&&tryActivateCustom())msg.textContent='내 말로 적은 감정이 선택에 포함되었습니다.';
      }else{
        if(selected.size>=2){msg.textContent='최대 2개까지 고를 수 있어요. 하나를 빼고 선택해 주세요.';return}
        selected.add(w);
      }
      if(!currentInput())msg.textContent='직접 적은 말도 선택 1개로 셉니다.';
      sync();
    });

    input.addEventListener('input',()=>{
      const v=currentInput();
      if(customActive&&savedCustom){selected.delete(savedCustom);customActive=false}
      if(!v){savedCustom='';msg.textContent='직접 적은 말도 선택 1개로 셉니다.';sync();return}
      if(selected.size>=2){savedCustom=v;msg.textContent='직접 적으려면 선택한 감정 하나를 먼저 빼주세요.';sync();return}
      selected.add(v);savedCustom=v;customActive=true;
      msg.textContent='내 말로 적은 감정이 선택에 포함되었습니다.';
      sync();
    });

    next.onclick=()=>{
      const v=currentInput();
      if(v&&!customActive){msg.textContent='직접 적은 감정을 포함하려면 선택한 감정 하나를 먼저 빼주세요.';input.focus();return}
      d.emotionWords=[...selected];
      d.emotionText=customActive?v:'';
      d.emotionCustomActive=customActive;
      renderIntensity();
    };
    sync();
    qa();
  };

  console.info('[FAMOUS PEOPLE] emotion free-input patch active');
})();
