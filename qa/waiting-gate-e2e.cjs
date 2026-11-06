const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='https://cjswoa-star.github.io/emotion-share-test/';
const DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
let browser,code;
const checks=[];
function check(name,value,details=''){checks.push({name,pass:!!value});if(!value)throw Error(name+' '+details);console.log('PASS '+name+' '+details)}
async function data(path){const r=await fetch(DB+'/sessions/'+code+(path?'/'+path:'')+'.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Database HTTP '+r.status);return r.json()}
async function until(fn,t=18000){const deadline=Date.now()+t;while(Date.now()<deadline){try{if(await fn())return true}catch{}await new Promise(r=>setTimeout(r,600))}return false}
async function join(context,nickname){
 const p=await context.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>console.log('PHONE_BROWSER_ERROR '+nickname+' '+e.message));
 await p.goto(BASE+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:30000});
 await p.getByRole('button',{name:'시작하기'}).waitFor({timeout:30000});
 await p.getByRole('button',{name:'시작하기'}).click();
 await p.locator('#nick').waitFor({timeout:15000});
 await p.locator('#nick').fill(nickname);
 await p.locator('#next').click();
 await p.locator('.waiting-room').waitFor({timeout:16000});
 check(nickname+'_waits_before_teacher_start',await p.locator('.scene-counter').count()===0&&await p.locator('#mood').count()===0);
 return p;
}
(async()=>{try{
 browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
 const adminContext=await browser.newContext(),aContext=await browser.newContext(),bContext=await browser.newContext();
 const admin=await adminContext.newPage();
 const errors=[];admin.on('pageerror',e=>errors.push(e.message));
 await admin.goto(BASE+'admin.html',{waitUntil:'domcontentloaded',timeout:30000});
 await admin.getByRole('button',{name:'새 활동 만들기'}).waitFor({timeout:20000});
 await admin.getByRole('button',{name:'새 활동 만들기'}).click();
 await admin.locator('.session-code').waitFor({timeout:17000});
 code=(await admin.locator('.session-code').innerText()).trim();
 check('fresh_room_created',/^\d{6}$/.test(code));
 check('fresh_room_is_waiting',(await data('meta')).phase==='waiting');
 check('presenter_start_button_exists',await admin.locator('#beginScenes').count()===1);
 check('presenter_start_disabled_for_zero',await admin.locator('#beginScenes').isDisabled());
 const a=await join(aContext,'리허설가');
 check('presenter_sees_first_joiner',await until(async()=>await admin.locator('#admissionList').innerText().then(x=>x.includes('리허설가'))));
 check('presenter_start_enabled_after_join',await admin.locator('#beginScenes').isEnabled());
 await a.reload({waitUntil:'domcontentloaded'});
 await a.locator('.waiting-room').waitFor({timeout:20000});
 check('refresh_still_waits',await a.locator('.scene-counter').count()===0);
 const b=await join(bContext,'리허설나');
 check('two_joiners_visible',await until(async()=>{const t=await admin.locator('#admissionList').innerText();return t.includes('리허설가')&&t.includes('리허설나')&&t.includes('2명')}));
 check('teacher_has_not_started_yet',(await data('meta')).phase==='waiting');
 const pre=await data('participants');
 check('participants_have_no_checkpoints',Object.values(pre||{}).every(x=>!Object.keys(x.checkpoints||{}).length));
 await admin.locator('#beginScenes').click();
 check('phase_changes_after_teacher_start',await until(async()=>((await data('meta')).phase==='collecting')));
 await Promise.all([a.locator('.scene-counter').waitFor({timeout:20000}),b.locator('.scene-counter').waitFor({timeout:20000})]);
 check('both_students_automatically_enter_scene_1',await a.locator('#mood').count()===1&&await b.locator('#mood').count()===1);
 check('no_start_button_after_launch',await until(async()=>await admin.locator('#beginScenes').count()===0,11000));
 await a.locator('#mood').click({position:{x:110,y:96}});
 await a.locator('#next').click();
 check('student_can_advance_after_teacher_start',await a.locator('.scene-counter').innerText().then(x=>x.includes('02')));
 await a.screenshot({path:'screenshots/gate-after-start.png',fullPage:true});
 check('no_presenter_js_exceptions',errors.length===0,errors.join('|'));
 console.log('WAIT_GATE_QA_RESULT '+JSON.stringify(checks));
}catch(e){console.log('WAIT_GATE_QA_FAILED '+(e.stack||e));process.exitCode=1}
finally{
 if(code){try{const r=await fetch(DB+'/sessions/'+code+'.json',{method:'DELETE',signal:AbortSignal.timeout(15000)});console.log('WAIT_GATE_CLEANUP '+r.status);if(!r.ok)process.exitCode=1}catch(e){console.log('WAIT_GATE_CLEANUP_ERROR '+e.message);process.exitCode=1}}
 await browser?.close().catch(()=>{});
}})();