/* FAMOUS PEOPLE SEL · mobile viewport hardening */
(function(){
  const s=document.createElement('style');s.id='fp-mobile-hardening';s.textContent=`
    :root{--fp-dvh:100dvh}
    html,body,#app,.screen{min-height:100%;max-width:100%;}
    @supports(height:100dvh){#app,.screen{height:100dvh!important}}
    .screen{box-sizing:border-box!important;overflow:hidden!important}
    .screen-inner{box-sizing:border-box!important;min-height:0!important;overflow:hidden!important}
    .deep-footer{position:sticky;bottom:0;z-index:4;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(248,250,249,.96) 20%);padding-top:6px;padding-bottom:max(3px,env(safe-area-inset-bottom));}
    .word-grid,.choice-grid,.body-grid,.next-grid{min-height:0!important;overflow:auto!important;overscroll-behavior:contain}
    @media(max-height:700px){
      .deep-context{grid-template-columns:88px 1fr!important;gap:7px!important}.deep-context .mini-map{width:82px!important}
      .word,.choice-btn,.body-btn,.next-btn{font-size:12.5px!important;min-height:42px!important}
      .emotion-free{margin-top:4px!important;padding:5px 7px!important}.emotion-free input{height:34px!important}
      .choice-head h1{font-size:20px!important}.choice-head p{font-size:12.5px!important}
    }
    @media(max-width:360px){.screen{padding-left:7px!important;padding-right:7px!important}.dialogue-step{font-size:12.5px!important}}
  `;document.head.appendChild(s);
  console.info('[FAMOUS PEOPLE] mobile hardening active');
})();
