const fs=require('fs');
const s=fs.readFileSync('v10/index.html','utf8');
const toks=['function renderMeeting1','function renderMeeting2','function renderSummary','function renderEmotion','function renderReason','function renderJourney','function renderSelect','function routeParticipant','data-back','readOnly','reviewPast','historyOverlay','앞의 선택','이전 선택','내 선택 확인','이전으로','내 마음 다시 보기'];
console.log('SIZE',s.length);
for(const t of toks){
  let cursor=0,pos=[],n=0;
  while((cursor=s.indexOf(t,cursor))>=0){pos.push(cursor);n++;cursor+=t.length;if(n>1500)break;}
  console.log('TOKEN '+t+' count='+n+' first='+JSON.stringify(pos.slice(0,15)));
  if(['function renderMeeting1','function renderMeeting2','function renderSummary','function renderEmotion','function routeParticipant','function renderJourney','function renderSelect'].includes(t)&&pos.length){
    const p=pos[0];console.log('SNIP '+t+' '+s.slice(p,p+1350).replaceAll('\n',' '));
  }
}
const navs=[...s.matchAll(/document\.querySelector\('\[data-back\]'\)\.onclick\s*=\s*([^;]+);/g)].map(x=>x[1].slice(0,200));
console.log('BACK_HANDLERS',JSON.stringify(navs.slice(0,45)));
console.log('SCRIPTS',JSON.stringify([...s.matchAll(/<script[^>]*src=["']([^"' ]+)/g)].map(m=>m[1])));
