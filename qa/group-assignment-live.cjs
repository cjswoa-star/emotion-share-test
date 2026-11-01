const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base='https://cjswoa-star.github.io/emotion-share-test/',db='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
let browser,code,owner=null;const checks=[];
const log=(name,ok,info='')=>{checks.push({name,ok,info});console.log((ok?'PASS ':'FAIL ')+name+' '+info);if(!ok)throw Error(name+': '+info)};
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function get(p,token){const r=await fetch(db+'/sessions/'+code+'/'+p+'.json'+(token?'?auth='+encodeURIComponent(token):''));return {status:r.status,data:await r.json()}}
async function auth(){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyB6mWBT6IYc9BkGBPvPhIb0HBDA0Vj3Bxo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const j=await r.json();assert(r.ok);return {uid:j.localId,token:j.idToken}}
async function put(p,token,v){const r=await fetch(db+'/sessions/'+code+'/'+p+'.json?auth='+encodeURIComponent(token),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});assert(r.ok)}
async function waitFor(f){for(let i=0;i<28;i++){if(await f())return true;await sleep(750)}return false}
(async()=>{try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 const admin=await browser.newPage({viewport:{width:1450,height:970},deviceScaleFactor:1});
 await admin.goto(base+'admin.html',{waitUntil:'domcontentloaded'});
 await admin.getByRole('button',{name:'새 활동 만들기'}).click();
 await admin.locator('.session-code').waitFor({timeout:20000});
 code=(await admin.locator('.session-code').innerText()).trim();
 owner=(await admin.evaluate(async()=>window.FPAuth.ensure())).idToken;
 log('test_activity_created',/^\d{6}$/.test(code));
 const a=await auth(),b=await auth(),q=[a,b];
 for(let i=0;i<2;i++)await put('participants/'+q[i].uid,q[i].token,{nickname:'모둠검수'+(i+1),focusScene:'scene0'+(i+1),checkpoints:Object.fromEntries(Array.from({length:6},(_,n)=>['scene0'+(n+1),{status:'experienced',x:.3,y:.7}])),joinedAt:Date.now()});
 log('two_participants_visible',await waitFor(async()=>{const t=await admin.locator('body').innerText();return t.includes('모둠검수1')&&t.includes('모둠검수2')}));
 await admin.screenshot({path:'screenshots/presenter-dashboard.png',fullPage:true});
 await admin.getByRole('button',{name:'1차 모둠 편집·무작위 배치'}).click();
 log('group_editor_open',await admin.locator('#gmRandom').isVisible());
 log('two_singletons_initial',await admin.locator('.gm-single').count()===2);
 await admin.locator('#gmRandom').click();
 log('random_singleton_merge',await admin.locator('.gm-card').count()===1);
 await admin.locator('#gmSave').click();
 let g=await get('groups/dialogue1',owner);
 log('random_group_saved',g.status===200&&Object.values(g.data||{}).some(v=>v.members.length===2));
 await admin.locator('#gmReset').click();
 log('reset_two_singletons',await admin.locator('.gm-single').count()===2);
 const opts=await admin.locator('#gmTarget option').evaluateAll(nodes=>nodes.map(n=>n.value));
 await admin.locator('#gmStudent').selectOption(a.uid);
 await admin.locator('#gmTarget').selectOption(opts[1]);
 await admin.locator('#gmMove').click();
 log('manual_move_applied',await admin.locator('.gm-card').count()===1);
 await admin.locator('#gmSave').click();
 g=await get('groups/dialogue1',owner);
 log('manual_group_saved',g.status===200&&Object.values(g.data||{}).some(v=>v.members.includes(a.uid)&&v.members.includes(b.uid)));
 await admin.screenshot({path:'screenshots/presenter-group-manager.png',fullPage:true});
 await admin.getByRole('button',{name:'닫기'}).click();
 await admin.getByRole('button',{name:'첫 번째 만남 시작'}).click();
 const hasStage=await waitFor(async()=>{const m=await get('meta',owner);return m.data?.phase==='dialogue1'});
 g=await get('groups/dialogue1',owner);
 log('manual_group_preserved_on_stage_start',hasStage&&Object.values(g.data||{}).some(v=>v.members.includes(a.uid)&&v.members.includes(b.uid)));
 await admin.getByRole('button',{name:'1차 만남 모둠'}).click();
 log('projector_one_group',await admin.locator('.group-card').count()===1);
 await admin.screenshot({path:'screenshots/presenter-first-meeting.png',fullPage:true});
 await admin.getByRole('button',{name:'닫기'}).click();
 await admin.getByRole('button',{name:/깊이 보기/}).click();
 log('stage_gated_by_presenter',await waitFor(async()=>{const m=await get('meta',owner);return m.data?.phase==='deep'}));
 }catch(e){console.log('FAIL_DETAIL '+String(e.stack||e));process.exitCode=1;
 }finally{
  if(code&&owner){try{const r=await fetch(db+'/sessions/'+code+'.json?auth='+encodeURIComponent(owner),{method:'DELETE'});console.log('QA_CLEANUP',r.status);if(!r.ok)process.exitCode=1}catch(e){console.log('QA_CLEANUP_ERROR '+e.message);process.exitCode=1}}
  await browser?.close().catch(()=>{});console.log('QA_SUMMARY '+JSON.stringify(checks))
 }
})();