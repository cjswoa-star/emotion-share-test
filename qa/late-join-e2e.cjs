/* late entry all-phase live Chrome QA */
(function lateJoinTest(){
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE='https://cjswoa-star.github.io/emotion-share-test/',DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
let browser,code;
const pass=(name,v)=>{assert(v,name);console.log('PASS '+name)};
async function db(path=''){const r=await fetch(DB+'/sessions/'+code+(path?'/'+path:'')+'.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('DB GET '+r.status);return r.json()}
async function patch(path,v){const r=await fetch(DB+'/sessions/'+code+'/'+path+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(v),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('DB PATCH '+r.status);}
async function until(cb,max=20000){const deadline=Date.now()+max;while(Date.now()<deadline){try{if(await cb())return true}catch(e){}await new Promise(r=>setTimeout(r,500))}return false;}
async function join(name){
 const p=await (await browser.newContext({viewport:{width:390,height:844}})).newPage();
 p.on('pageerror',e=>console.log('PAGE_ERROR '+name+' '+e.message));
 await p.goto(BASE+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:30000});
 await p.getByRole('button',{name:'시작하기'}).waitFor({timeout:22000});
 await p.getByRole('button',{name:'시작하기'}).click();
 await p.locator('#nick').fill(name);await p.locator('#next').click();return p;
}
async function choose(p,sc){await p.locator('[data-late-focus="'+sc+'"]').waitFor({timeout:22000});await p.locator('[data-late-focus="'+sc+'"]').click();}
async function seven(p){for(let i=0;i<7;i++){await p.locator('#mood').waitFor({timeout:15000});await p.locator('#mood').click({position:{x:100,y:110}});await p.locator('#next').click()}await p.locator('.journey-head').waitFor({timeout:15000});await p.locator('#choose').click();await p.locator('.focus-selection-waiting').waitFor({timeout:15000});}
(async()=>{
try{
 browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
 const admin=await browser.newPage();await admin.goto(BASE+'admin.html',{waitUntil:'domcontentloaded'});
 await admin.getByRole('button',{name:'새 활동 만들기'}).click();
 await admin.locator('.session-code').waitFor({timeout:18000});
 code=(await admin.locator('.session-code').innerText()).trim();
 pass('room_waiting',(await db('meta')).phase==='waiting');
 const core=await join('정시가');await core.locator('.waiting-room').waitFor({timeout:14000});
 await admin.locator('#beginScenes').click();await core.locator('#mood').waitFor({timeout:17000});
 const collecting=await join('늦게A');await collecting.locator('#mood').waitFor({timeout:15000});
 pass('late_collecting_reaches_scene_one',await collecting.locator('.scene-counter').count()===1);
 pass('late_collecting_flagged',await until(async()=>Object.values(await db('participants')).some(x=>x.nickname==='늦게A'&&x.lateEntryPhase==='collecting')));
 await seven(core);
 pass('late_collecting_does_not_block_teacher',await until(async()=>await admin.locator('#beginSelect').isEnabled()));
 await admin.locator('#beginSelect').click();
 await core.locator('.select-head').waitFor({timeout:15000});
 await collecting.locator('.late-focus-screen').waitFor({timeout:18000});
 pass('late_collecting_moves_to_chooser',await collecting.locator('.late-focus-grid').count()===1);
 await core.locator('[data-s="scene01"]').click();await core.locator('.meeting-card').waitFor({timeout:14000});
 await choose(collecting,'scene02');await collecting.locator('.meeting-card').waitFor({timeout:14000});
 const selecting=await join('늦게B');await choose(selecting,'scene03');await selecting.locator('.meeting-card').waitFor({timeout:14000});
 pass('late_selecting_direct_scene_choice',await selecting.locator('#changeFocusScene').count()===1);
 pass('late_selecting_does_not_block_group_start',await until(async()=>await admin.locator('#open1').isEnabled()));
 await admin.locator('#open1').click();
 pass('first_group_opened',await until(async()=>(await db('meta')).phase==='dialogue1'));
 const originalGroups=await db('groups/dialogue1'),oldMembers=Object.values(originalGroups).flatMap(g=>g.members||[]);
 const dialogue1=await join('늦게C');await choose(dialogue1,'scene01');await dialogue1.locator('.meeting-card').waitFor({timeout:16000});
 const cId=Object.entries(await db('participants')).find(([,x])=>x.nickname==='늦게C')?.[0];assert(cId);
 pass('late_first_meeting_grouped',await until(async()=>Object.values(await db('groups/dialogue1')).some(g=>(g.members||[]).includes(cId))));
 const afterGroup=await db('groups/dialogue1'),afterMembers=Object.values(afterGroup).flatMap(g=>g.members||[]);
 pass('old_groups_preserved',oldMembers.every(id=>afterMembers.includes(id)));
 pass('late_first_group_joined_without_reset',afterMembers.length===oldMembers.length+1);
 await admin.locator('#deep').click();
 pass('deep_opened',await until(async()=>(await db('meta')).phase==='deep'));
 const deep=await join('늦게D');await choose(deep,'scene02');await deep.locator('.word-grid').waitFor({timeout:15000});
 pass('late_deep_in_emotion_activity',await deep.locator('[data-word]').count()>0);
 const coreId=Object.entries(await db('participants')).find(([,x])=>x.nickname==='정시가')?.[0];assert(coreId);
 await patch('participants/'+coreId,{deepDive:{sceneId:'scene01',emotionWords:['슬픔'],reason:'나의 생각이 복잡해서'}});
 pass('late_deep_does_not_block_next_meeting',await until(async()=>await admin.locator('#open2').isEnabled()));
 await admin.locator('#open2').click();
 pass('second_group_opened',await until(async()=>(await db('meta')).phase==='dialogue2'));
 const dialogue2=await join('늦게E');await choose(dialogue2,'scene04');await dialogue2.locator('.meeting-card').waitFor({timeout:16000});
 const eId=Object.entries(await db('participants')).find(([,x])=>x.nickname==='늦게E')?.[0];assert(eId);
 pass('late_second_group_joined',await until(async()=>Object.values(await db('groups/dialogue2')).some(g=>(g.members||[]).includes(eId))));
 await admin.locator('#life').click();
 pass('life_opened',await until(async()=>(await db('meta')).phase==='life'));
 const last=await join('늦게F');await last.locator('#reflection').waitFor({timeout:15000});
 await last.locator('#reflection').fill('늦게 들어왔지만 오늘 들은 이야기를 돌아봅니다.');
 await last.locator('#done').click();await last.locator('.complete-art').waitFor({timeout:15000});
 pass('late_last_reflection_saved',Object.values(await db('participants')).some(x=>x.nickname==='늦게F'&&x.finalReflection?.text?.includes('늦게 들어왔지만')));
 await patch('participants/'+eId,{lateEntryPhase:null});
 await dialogue2.reload({waitUntil:'domcontentloaded'});
 pass('old_stuck_entry_recovers_on_refresh',await until(async()=>(await db('participants/'+eId))?.lateEntryPhase==='dialogue2'));
 console.log('LATE_JOIN_E2E_ALL_PASS');
}catch(e){console.log('LATE_JOIN_E2E_FAILED '+(e.stack||e));process.exitCode=1}
finally{
 if(code){try{const r=await fetch(DB+'/sessions/'+code+'.json',{method:'DELETE',signal:AbortSignal.timeout(15000)});console.log('LATE_JOIN_CLEANUP_HTTP '+r.status);if(!r.ok)process.exitCode=1}catch(e){console.log('LATE_JOIN_CLEANUP_ERROR '+e.message);process.exitCode=1}}
 await browser?.close().catch(()=>{});
}
})();
})();
