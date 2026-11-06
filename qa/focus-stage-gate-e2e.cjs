/* live Chrome integration QA */
(function scenario(){
  const {chromium}=require('playwright');
  const assert=require('node:assert/strict');
  const BASE='https://cjswoa-star.github.io/emotion-share-test/';
  const DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
  let browser,code;
  const issues=[];
  function yes(name,condition,details=''){assert(condition,name+' '+details);console.log('PASS '+name+' '+details)}
  async function eventually(fn,ms=18000){
    const end=Date.now()+ms;
    while(Date.now()<end){
      try{if(await fn())return true}catch(e){}
      await new Promise(res=>setTimeout(res,650));
    }
    return false;
  }
  async function db(path){
    const r=await fetch(DB+'/sessions/'+code+(path?'/'+path:'')+'.json',{signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw Error('DB '+r.status+' '+path);
    return r.json();
  }
  async function newPerson(context,name){
    const p=await context.newPage({viewport:{width:390,height:844}});
    p.on('pageerror',e=>issues.push(name+': '+e.message));
    await p.goto(BASE+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:35000});
    await p.getByRole('button',{name:'시작하기'}).waitFor({timeout:20000});
    await p.getByRole('button',{name:'시작하기'}).click();
    await p.locator('#nick').fill(name);
    await p.locator('#next').click();
    await p.locator('.waiting-room').waitFor({timeout:15000});
    yes(name+'_initial_instruction', (await p.locator('.waiting-room').innerText()).includes('잠시 후 과정드라마의 대표적인 일곱 장면을 떠올리며'));
    return p;
  }
  async function seven(p,name){
    for(let i=1;i<=7;i++){
      await p.locator('.scene-counter').waitFor({timeout:12000});
      await p.locator('#mood').click({position:{x:125,y:110}});
      await p.locator('#next').click();
      if(i<7)yes(name+'_scene_'+i,(await p.locator('.scene-counter').innerText()).startsWith(String(i+1).padStart(2,'0')));
    }
    await p.locator('.journey-head').waitFor({timeout:12000});
    await p.locator('#choose').click();
    await p.locator('.focus-selection-waiting').waitFor({timeout:16000});
    yes(name+'_focus_gate_blocks',await p.locator('.select-head').count()===0);
  }
  async function main(){
    try{
      browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
      const admin=await (await browser.newContext()).newPage();
      admin.on('pageerror',e=>issues.push('admin: '+e.message));
      await admin.goto(BASE+'admin.html',{waitUntil:'domcontentloaded',timeout:25000});
      await admin.getByRole('button',{name:'새 활동 만들기'}).click();
      await admin.locator('.session-code').waitFor({timeout:18000});
      code=(await admin.locator('.session-code').innerText()).trim();
      yes('session_waiting',(await db('meta')).phase==='waiting');
      const a=await newPerson(await browser.newContext(),'장면가');
      const b=await newPerson(await browser.newContext(),'장면나');
      yes('both_joined',await eventually(async()=>(await admin.locator('#admissionList').innerText()).includes('2명')));
      await admin.locator('#beginScenes').click();
      await Promise.all([a.locator('#mood').waitFor({timeout:18000}),b.locator('#mood').waitFor({timeout:18000})]);
      yes('first_unlock',(await db('meta')).phase==='collecting');
      yes('focus_button_initially_disabled',await admin.locator('#beginSelect').isDisabled());
      await seven(a,'first');
      yes('focus_button_blocks_until_all_seven',await admin.locator('#beginSelect').isDisabled());
      await a.reload({waitUntil:'domcontentloaded'});
      await a.locator('.focus-selection-waiting').waitFor({timeout:15000});
      yes('focus_wait_survives_refresh',await a.locator('.select-head').count()===0);
      await seven(b,'second');
      yes('both_seven_persisted',await eventually(async()=>Object.values(await db('participants')).every(x=>Object.keys(x.checkpoints||{}).length===7)));
      yes('presenter_unlock_focus_after_all',await eventually(async()=>await admin.locator('#beginSelect').isEnabled()));
      yes('waiting_screens_block_selection_before_presenter',await a.locator('.select-head').count()===0&&await b.locator('.select-head').count()===0);
      await admin.locator('#beginSelect').click();
      yes('phase_selecting',await eventually(async()=>(await db('meta')).phase==='selecting'));
      await Promise.all([a.locator('.select-head').waitFor({timeout:18000}),b.locator('.select-head').waitFor({timeout:18000})]);
      yes('both_chooser_unlocked',await a.locator('[data-s="scene01"]').isVisible()&&await b.locator('[data-s="scene01"]').isVisible());
      yes('chooser_cannot_return_to_7_scenes',await a.locator('[data-back]').isHidden());
      await a.locator('[data-s="scene01"]').click();
      await a.locator('.meeting-card').waitFor({timeout:14000});
      yes('reselect_available_before_meeting',await eventually(async()=>await a.locator('#changeFocusScene').isVisible()));
      await a.locator('#changeFocusScene').click();
      await a.locator('.select-head').waitFor({timeout:12000});
      yes('reselect_has_no_back_to_seven',await a.locator('[data-back]').isHidden()&&await a.locator('#mood').count()===0);
      yes('reselect_cancel_option',await a.locator('#returnMeetingWaiting').isVisible());
      await a.locator('[data-s="scene03"]').click();
      await a.locator('.meeting-card').waitFor({timeout:12000});
      await b.locator('[data-s="scene01"]').click();
      await b.locator('.meeting-card').waitFor({timeout:12000});
      yes('reselection_saved_firestore_rtdb',await eventually(async()=>{
        const ps=await db('participants');
        const found=Object.values(ps||{});
        return found.some(p=>p.nickname==='장면가'&&p.focusScene==='scene03')&&found.some(p=>p.nickname==='장면나'&&p.focusScene==='scene01');
      }));
      yes('presenter_updated_scene_counts',await eventually(async()=>(await admin.locator('.scene-grid').innerText()).includes('장면가')&&(await admin.locator('.scene-grid').innerText()).includes('장면나')));
      yes('first_meeting_enabled',await eventually(async()=>await admin.locator('#open1').isEnabled()));
      await admin.locator('#open1').click();
      yes('meeting_open',(await eventually(async()=>(await db('meta')).phase==='dialogue1')));
      yes('reselect_locked_after_first_meeting',await eventually(async()=>await a.locator('#changeFocusScene').isHidden()));
      await a.reload({waitUntil:'domcontentloaded'});
      await a.locator('.meeting-card').waitFor({timeout:16000});
      yes('reselect_stays_locked_after_refresh',await a.locator('#changeFocusScene').isHidden());
      yes('meeting_back_locked',await a.locator('[data-back]').isHidden());
      const gs=await db('groups/dialogue1');
      const ps=await db('participants');
      const byId=Object.fromEntries(Object.entries(ps).map(([id,p])=>[id,p]));
      yes('first_groups_respect_updated_focus',Object.values(gs||{}).every(g=>g.members.every(id=>byId[id]?.focusScene===g.sceneId)));
      yes('no_uncaught_javascript_errors',issues.length===0,issues.join('; '));
      console.log('FOCUS_STAGE_GATE_ALL_PASS');
    }catch(e){console.log('FOCUS_STAGE_GATE_FAILED '+(e.stack||e));process.exitCode=1}
    finally{
      if(code){try{const r=await fetch(DB+'/sessions/'+code+'.json',{method:'DELETE',signal:AbortSignal.timeout(12000)});console.log('CLEANUP_SESSION_HTTP '+r.status);if(!r.ok)process.exitCode=1}catch(e){console.log('CLEANUP_FAILED '+e.message);process.exitCode=1}}
      await browser?.close().catch(()=>{});
    }
  }
  main();
})();
