(function(){
"use strict";
const A=()=>window.__FPSEL__;
const E=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const V=x=>E(Array.isArray(x)?x.join(" · "):x||"선택 기록 없음");
const row=(name,value)=>'<p class="rrow"><b>'+E(name)+'</b><span>'+V(value)+'</span></p>';
function text(){
const s=A()?.state||{},sc=A()?.SCENES||[],d=s.deepDive||{};
let out='<h2>내 선택 다시 보기</h2><p>읽기 전용입니다. 수업 단계나 저장된 답은 바뀌지 않습니다.</p><h3>장면별 마음</h3>';
for(const item of sc){const c=s.checkpoints?.[item.id];out+=row(item.n+' '+item.title,c?.status==='skipped'?'경험하지 않음':c?.status==='experienced'?'마음 위치 선택 완료':'선택 전');}
if(s.focusScene){out+='<h3>깊이 들여다본 장면</h3>'+row('선택한 장면',sc.find(x=>x.id===s.focusScene)?.title)+row('감정',d.emotionWords)+row('강도',d.intensity)+row('몸의 반응',d.bodySignals)+row('하고 싶었던 것',d.urgeText||d.urge)+row('이유',d.reasonText||d.reason)+row('실제 나',d.lifeLink)+row('다음 행동',d.nextActionText||d.nextAction);}
return out;
}
function close(){document.getElementById('my-past-review')?.remove();}
function open(){
if(document.getElementById('my-past-review'))return;
const div=document.createElement('div');div.id='my-past-review';div.setAttribute('role','dialog');div.setAttribute('aria-modal','true');
div.innerHTML='<div class="shade"></div><div class="sheet"><div class="content">'+text()+'</div><button type="button" id="my-past-close">현재 수업 화면으로 돌아가기</button></div>';
document.body.appendChild(div);div.querySelector('.shade').onclick=close;div.querySelector('#my-past-close').onclick=close;
}
function enhance(){
const s=A()?.state;if(!s?.nickname||!Object.keys(s.checkpoints||{}).length)return;
const nav=document.querySelector('#app .topbar');if(!nav||nav.querySelector('#my-past-open'))return;
nav.classList.add('past-nav');const b=document.createElement('button');b.id='my-past-open';b.textContent='내 선택 확인';b.type='button';b.onclick=open;
if(nav.lastElementChild?.tagName==='SPAN')nav.lastElementChild.replaceWith(b);else nav.appendChild(b);
}
const st=document.createElement('style');st.textContent='.past-nav{grid-template-columns:38px minmax(0,1fr) 100px!important}#my-past-open{font-size:11px;font-weight:900;border:1px solid #aacbc4;background:#e8f4f0;color:#285775;border-radius:12px;height:32px}#my-past-review{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;font-family:system-ui;color:#294958}#my-past-review .shade{position:absolute;inset:0;background:#102c40ae}#my-past-review .sheet{position:relative;background:#f8faf7;width:min(92vw,570px);max-height:90dvh;border-radius:17px;display:flex;flex-direction:column;overflow:hidden}#my-past-review .content{padding:20px;overflow:auto;flex:1}#my-past-review h2{font-size:24px;margin:0 0 8px}#my-past-review h3{font-size:17px;margin:17px 0 8px}#my-past-review .content>p{font-size:13px}#my-past-review .rrow{display:grid;gap:4px;border-bottom:1px solid #dae6e1;padding:9px 0;font-size:13px}#my-past-review .rrow b{color:#67808b}#my-past-review .rrow span{overflow-wrap:anywhere}#my-past-close{background:#285775;color:white;font-size:14px;font-weight:900;border:0;padding:15px}';
document.head.appendChild(st);const start=()=>{const app=document.getElementById('app');if(app){new MutationObserver(()=>queueMicrotask(enhance)).observe(app,{childList:true});enhance();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();