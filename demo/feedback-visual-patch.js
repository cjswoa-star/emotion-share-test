/* FAMOUS PEOPLE SEL · choice-state clarity */
(function(){
  const s=document.createElement('style');s.id='fp-choice-clarity';s.textContent=`
    .scene-grid .scene-card:not(.skipped){background:#fff!important;border:2px solid #cbd8dc!important;box-shadow:0 3px 9px rgba(53,85,106,.04)!important;transition:transform .08s ease,background .08s ease,border-color .08s ease!important}
    .scene-grid .scene-card:not(.skipped):active{background:#e7f0f2!important;border-color:#5f8796!important;transform:scale(.985)!important}
    .scene-grid .scene-card .num{background:#eef3f4!important;border:1px solid #d5e0e2!important}
    .word.selected,.choice-btn.selected,.body-btn.selected,.next-btn.selected{background:#d9e8ec!important;border-color:#557f8f!important;color:#244657!important;font-weight:950!important}
  `;document.head.appendChild(s);
  console.info('[FAMOUS PEOPLE] choice clarity active');
})();
