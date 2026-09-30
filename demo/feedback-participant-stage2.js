/* FAMOUS PEOPLE SEL · simplified transition screen */
(function(){
  renderMoodBridge=function(){
    app.innerHTML=shell(`<div class="fp-transition" style="padding:28px 20px;text-align:center"><div class="kicker">마음을 돌아보는 시간</div><h1 style="margin:12px 0 14px">방금 경험한 장면을<br>천천히 떠올려봅니다.</h1><p style="font-size:16px;line-height:1.65;color:#607781;margin:0 0 22px">그 순간, 내 마음은 어디쯤에 있었을까요?</p><button class="btn orange" id="fpMoodStart" style="width:100%">내 마음 살펴보기</button></div>`);
    document.querySelector('[data-back]')&&(document.querySelector('[data-back]').onclick=renderEntry);
    document.getElementById('fpMoodStart').onclick=()=>renderScene(0);qa();
  };
  console.info('[FAMOUS PEOPLE] simplified mood transition active');
})();
