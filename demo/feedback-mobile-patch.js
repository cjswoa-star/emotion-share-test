/* FAMOUS PEOPLE SEL · mobile viewport hardening · iPhone Safari fix */
(function(){
  const root=document.documentElement;
  const s=document.createElement('style');s.id='fp-mobile-hardening';s.textContent=`
    :root{--fp-map-size:min(68vw,280px)}
    html,body,#app,.screen{min-height:0;max-width:100%;}
    #app,.screen{height:var(--appH)!important;max-height:var(--appH)!important}
    .screen{box-sizing:border-box!important;overflow:hidden!important}
    .screen-inner{box-sizing:border-box!important;min-height:0!important;overflow:hidden!important}

    /* The scene mood meter must fit the REAL visible Safari viewport, not width alone. */
    .fp-live-mood-screen .mood-stage{
      flex:0 0 auto!important;
      min-height:0!important;
      width:100%!important;
      grid-template-columns:48px var(--fp-map-size) 48px!important;
      grid-template-rows:19px var(--fp-map-size) 19px!important;
      align-content:center!important;
    }
    .fp-live-mood-screen .mood-map{
      width:var(--fp-map-size)!important;
      max-width:var(--fp-map-size)!important;
      height:var(--fp-map-size)!important;
      max-height:var(--fp-map-size)!important;
      aspect-ratio:1!important;
    }
    .fp-live-mood-screen .mood-label{font-size:13px!important}
    .fp-live-mood-screen .scene-head p{min-height:0!important}

    /* Last-resort safety: only this screen may scroll when browser chrome leaves too little height. */
    .fp-live-mood-screen.fp-needs-scroll{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain}
    .fp-live-mood-screen.fp-needs-scroll .screen-inner{height:auto!important;min-height:100%!important;overflow:visible!important}

    .deep-footer{position:sticky;bottom:0;z-index:4;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(248,250,249,.96) 20%);padding-top:6px;padding-bottom:max(3px,env(safe-area-inset-bottom));}
    .word-grid,.choice-grid,.body-grid,.next-grid{min-height:0!important;overflow:auto!important;overscroll-behavior:contain}

    @media(max-height:720px){
      .screen{padding-top:calc(4px + var(--safeT))!important;padding-bottom:calc(4px + var(--safeB))!important}
      .fp-live-mood-screen .topbar{height:32px!important}
      .fp-live-mood-screen .icon-btn{height:32px!important}
      .fp-live-mood-screen .scene-head h1{font-size:clamp(22px,6vw,27px)!important;line-height:1.1!important;margin:0 0 3px!important}
      .fp-live-mood-screen .scene-head p{font-size:12.5px!important;line-height:1.28!important;margin:0!important}
      .fp-live-mood-screen .question{font-size:17px!important;line-height:1.18!important;margin:2px 0!important}
      .fp-live-mood-screen .map-hint{min-height:38px!important;padding:5px 7px!important;font-size:12.5px!important;line-height:1.22!important}
      .fp-live-mood-screen .scene-actions{margin-top:4px!important;gap:6px!important}
      .fp-live-mood-screen .skip,.fp-live-mood-screen .next-scene{min-height:40px!important;font-size:12.5px!important;padding:5px 7px!important}
      .deep-context{grid-template-columns:88px 1fr!important;gap:7px!important}.deep-context .mini-map{width:82px!important}
      .word,.choice-btn,.body-btn,.next-btn{font-size:12.5px!important;min-height:42px!important}
      .emotion-free{margin-top:4px!important;padding:5px 7px!important}.emotion-free input{height:34px!important}
      .choice-head h1{font-size:20px!important}.choice-head p{font-size:12.5px!important}
    }
    @media(max-height:580px){
      .fp-live-mood-screen .scene-head p{font-size:11.5px!important;line-height:1.2!important}
      .fp-live-mood-screen .question{font-size:15.5px!important}
      .fp-live-mood-screen .mood-label{font-size:11.5px!important}
      .fp-live-mood-screen .mood-stage{grid-template-columns:42px var(--fp-map-size) 42px!important;grid-template-rows:17px var(--fp-map-size) 17px!important}
      .fp-live-mood-screen .map-hint{font-size:11.5px!important;min-height:34px!important}
      .fp-live-mood-screen .skip,.fp-live-mood-screen .next-scene{min-height:38px!important;font-size:11.5px!important}
    }
    @media(max-width:360px){.screen{padding-left:7px!important;padding-right:7px!important}.dialogue-step{font-size:12.5px!important}}
  `;document.head.appendChild(s);

  let raf=0;
  function visibleSize(){
    const vv=window.visualViewport;
    return {
      w:Math.max(280,Math.round(vv?.width||window.innerWidth||360)),
      h:Math.max(320,Math.round(vv?.height||window.innerHeight||640))
    };
  }
  function fit(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const {w,h}=visibleSize();
      /* Keep enough vertical room for title, question, hint and bottom buttons. */
      const map=Math.max(150,Math.min(286,Math.floor(w*.68),Math.floor(h*.34)));
      root.style.setProperty('--fp-map-size',map+'px');

      document.querySelectorAll('.screen').forEach(screen=>{
        const isMood=!!screen.querySelector('#mood');
        screen.classList.toggle('fp-live-mood-screen',isMood);
        if(!isMood){screen.classList.remove('fp-needs-scroll');return}
        screen.classList.remove('fp-needs-scroll');
        const inner=screen.querySelector('.screen-inner');
        requestAnimationFrame(()=>{
          if(!inner||!screen.isConnected)return;
          const overflow=inner.scrollHeight>screen.clientHeight+2;
          screen.classList.toggle('fp-needs-scroll',overflow);
        });
      });
    });
  }

  new MutationObserver(fit).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('resize',fit,{passive:true});
  addEventListener('orientationchange',fit,{passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',fit,{passive:true});
    visualViewport.addEventListener('scroll',fit,{passive:true});
  }
  fit();
  console.info('[FAMOUS PEOPLE] mobile hardening active · Safari viewport fix');
})();
