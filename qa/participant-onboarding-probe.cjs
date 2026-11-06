const {chromium}=require('playwright');
const DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
const URL='https://cjswoa-star.github.io/emotion-share-test/';
const fs=require('fs');
let browser,code;
const snap=async(p,n)=>{const x=await p.evaluate(()=>({title:document.title,body:document.body?.innerText?.slice(0,900)||'',inputs:[...document.querySelectorAll('input')].map(y=>({id:y.id,placeholder:y.placeholder,type:y.type,value:y.value})).slice(0,20),buttons:[...document.querySelectorAll('button')].filter(y=>y.offsetParent!==null).map(y=>({id:y.id,text:y.innerText.trim().slice(0,80),disabled:y.disabled})).slice(0,30)}));console.log('ONBOARD_'+n+' '+JSON.stringify(x));return x};
(async()=>{
try{
  const source=fs.readFileSync('v10/index.html','utf8');
  for(const term of ['function renderIntro','function renderJoin','function joinSession','function renderNickname','function saveNickname']){const n=source.indexOf(term);if(n>=0)console.log('SOURCE '+term+' '+source.slice(n,n+2200).replaceAll('\n',' '));}
  browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
  const admin=await browser.newPage();
  await admin.goto(URL+'admin.html');
  await admin.getByRole('button',{name:'새 활동 만들기'}).click();
  await admin.locator('.session-code').waitFor({timeout:20000});
  code=(await admin.locator('.session-code').innerText()).trim();
  console.log('ACTIVITY '+code);
  const phone=await browser.newPage({viewport:{width:390,height:844}});
  phone.on('pageerror',e=>console.log('BROWSER_ERROR '+e.message.slice(0,200)));
  await phone.goto(URL+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:30000});
  await phone.getByRole('button',{name:'시작하기'}).waitFor({timeout:30000});
  await snap(phone,'initial');
  await phone.getByRole('button',{name:'시작하기'}).click();
  await phone.waitForTimeout(1200);
  await snap(phone,'after_start');
  const inputs=await phone.locator('input').count();
  console.log('INPUT_COUNT '+inputs);
  await phone.screenshot({path:'screenshots/participant-onboarding-step.png'});
  await phone.locator('#nick').fill('리허설학생');
  await phone.locator('#next').click();
  await phone.locator('.scene-counter').waitFor({timeout:20000});
  console.log('PASS_UI nickname accepted and first scene rendered');
  for(let i=0;i<7;i++){
    await phone.locator('#mood').waitFor({timeout:8000});
    const box=await phone.locator('#mood').boundingBox();
    if(!box)throw Error('Mood stage missing at scene '+(i+1));
    await phone.locator('#mood').click({position:{x:Math.round(box.width*.62),y:Math.round(box.height*.4)}});
    await phone.locator('#next').click();
    console.log('PASS_UI scene '+(i+1)+' mood checkpoint saved');
  }
  await phone.locator('#choose').waitFor({timeout:9000});
  await phone.locator('#choose').click();
  await phone.locator('[data-s="scene01"]').click();
  await phone.waitForTimeout(1200);
  const st=await phone.evaluate(()=>window.__FPSEL__.state);
  if(st.focusScene!=='scene01'||Object.keys(st.checkpoints||{}).length!==7)throw Error('Student choices missing after selection');
  const server=await fetch(DB+'/sessions/'+code+'/participants/'+encodeURIComponent(st.participantId)+'.json').then(r=>r.json());
  if(!server||server.nickname!=='리허설학생'||Object.keys(server.checkpoints||{}).length!==7||server.focusScene!=='scene01')throw Error('Firebase participant full flow not persisted');
  console.log('PASS_UI real student 7 scenes + focus persisted to Firebase');
  await phone.locator('#my-past-open').waitFor({timeout:6500});
  await phone.locator('#my-past-open').click();
  if(!(await phone.locator('#my-past-review').innerText()).includes('내 선택 다시 보기'))throw Error('Past choices dialog missing');
  await phone.locator('#my-past-close').click();
  console.log('PASS_UI student can inspect past choices and return');
  await phone.screenshot({path:'screenshots/participant-first-meeting.png'});
  console.log('ONBOARD_PROBE_SUCCESS');
}catch(e){console.log('ONBOARD_PROBE_ERROR '+(e.stack||e));process.exitCode=1}
finally{
  if(code)try{let r=await fetch(DB+'/sessions/'+code+'.json',{method:'DELETE'});console.log('ONBOARD_CLEANUP '+r.status)}catch(e){console.log('CLEANUP_ERROR '+e.message)}
  await browser?.close().catch(()=>{});
}
})();