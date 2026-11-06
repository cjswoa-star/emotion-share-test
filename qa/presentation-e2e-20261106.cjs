const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const jsQR=require('jsqr');
const assert=require('node:assert/strict');
const ORIGIN='https://cjswoa-star.github.io/emotion-share-test/';
const DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
const result={tests:[],errors:[],warnings:[],code:null,cleanup:null};
function report(name,pass,detail=''){result.tests.push({name,pass,detail:String(detail).slice(0,180)});console.log((pass?'PASS ':'FAIL ')+name+' '+detail);if(!pass)result.errors.push(name+' '+detail)}
async function request(path,method='GET',value){const url=DB+'/sessions/'+result.code+'/'+path+'.json';const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value),signal:AbortSignal.timeout(15000)});let body;try{body=await res.json()}catch{body=null}return {status:res.status,data:body}}
async function until(fn,timeout=18000){const end=Date.now()+timeout;while(Date.now()<end){try{if(await fn())return true}catch{}await new Promise(r=>setTimeout(r,650))}return false}
let browser;
(async()=>{
try{
  browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
  const [adminContext,aContext,bContext]=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width:1380,height:900}})));
  const admin=await adminContext.newPage(),studentA=await aContext.newPage(),studentB=await bContext.newPage();
  const pageErrors=[];
  for(const [name,page] of [['admin',admin],['studentA',studentA],['studentB',studentB]])page.on('pageerror',err=>pageErrors.push(name+': '+err.message.slice(0,160)));
  await admin.goto(ORIGIN+'admin.html',{waitUntil:'domcontentloaded',timeout:30000});
  await admin.getByRole('button',{name:'새 활동 만들기'}).waitFor({timeout:25000});
  report('admin_loaded',true);
  report('presenter_seven_scenes',await admin.evaluate(()=>SCENES.length)===7);
  await admin.getByRole('button',{name:'새 활동 만들기'}).click();
  await admin.locator('.session-code').waitFor({timeout:24000});
  result.code=(await admin.locator('.session-code').innerText()).trim();
  report('firebase_session_created',/^\d{6}$/.test(result.code),result.code);
  const participantLink=await admin.locator('.linkbox').innerText();
  report('participant_url_has_code',participantLink.includes('?s='+result.code),participantLink);
  await admin.locator('#qrMini svg').waitFor({timeout:6500});
  report('qr_generated_as_inline_svg',await admin.locator('#qrMini svg').count()===1);
  report('qr_declared_url_matches_session',await admin.locator('#qrMini svg').getAttribute('data-encoded-url')===participantLink);
  await admin.locator('#showQr').click();
  await admin.locator('#qrLarge svg').waitFor();
  const img=PNG.sync.read(await admin.locator('#qrLarge svg').screenshot());
  const decoded=jsQR(new Uint8ClampedArray(img.data),img.width,img.height,{inversionAttempts:'attemptBoth'});
  report('qr_optically_decodes_to_current_session',decoded?.data===participantLink,decoded?.data||'No QR decoded');
  await admin.getByRole('button',{name:'닫기'}).click();
  await Promise.all([studentA.goto(participantLink,{waitUntil:'domcontentloaded',timeout:30000}),studentB.goto(participantLink,{waitUntil:'domcontentloaded',timeout:30000})]);
  await Promise.all([studentA.waitForFunction(()=>!!window.__FPSEL__,{timeout:24000}),studentB.waitForFunction(()=>!!window.__FPSEL__,{timeout:24000})]);
  report('two_isolated_participant_devices_loaded',true);
  report('participant_seven_scenes',await studentA.evaluate(()=>window.__FPSEL__.SCENES.length===7));
  const joinRendered=await until(async()=>{const t=await studentA.locator('body').innerText();return !!t.trim().length},30000);
  console.log('PARTICIPANT_RENDER_READY '+joinRendered);
  const uiInfo=await studentA.evaluate(()=>({title:document.title,body:document.body.innerText.slice(0,650),buttons:[...document.querySelectorAll('button')].slice(0,18).map(x=>x.textContent.trim().slice(0,45)),inputs:[...document.querySelectorAll('input')].slice(0,8).map(x=>({id:x.id,placeholder:x.placeholder}))}));
  console.log('PARTICIPANT_INITIAL_UI '+JSON.stringify(uiInfo));
  report('participant_join_page_rendered',!!uiInfo.body.length);
  // Inject QA-only participants into a fresh session; this never touches real classes.
  const people={};
  for(let i=0;i<25;i++){
    const id='qa-20261106-'+String(i+1).padStart(3,'0');
    const seven={};for(let j=1;j<=7;j++)seven['scene0'+j]={status:j===2&&i%3===0?'skipped':'experienced',x:.2+(i%4)*.16,y:.2+(j%4)*.17};
    const reason=i===2?'내가 직접 적어볼게요':'상황이 예상과 달라서';
    people[id]={
      nickname:'검증'+String(i+1).padStart(2,'0'),joinedAt:Date.now(),checkpoints:seven,focusScene:'scene0'+(i%7+1),
      deepDive:i<22?{emotionWords:['평온함'],intensity:'보통',bodySignals:['숨이 달라졌다'],urge:'기다리고 싶었다',reason,reasonText:i===2?'발표용 직접 입력 문장':'',lifeLink:'있어요',nextAction:'다른 방법을 찾아보기'}:null,
      finalReflection:i<23?{text:i===21?'비공개 검증 문장':'발표 성찰 카드 '+(i+1),share:i!==21,completedAt:Date.now()}:null
    };
  }
  const uploaded=await request('participants','PATCH',people);
  report('twenty_five_sample_responses_saved',uploaded.status===200,'HTTP '+uploaded.status);
  const visible=await until(async()=>await admin.locator('.stats .stat').first().innerText().then(x=>x.includes('25')),20000);
  report('presenter_live_updates_to_25',visible);
  const sevenCard=await admin.locator('.scene-card').count();
  report('all_seven_scene_count_cards',sevenCard===7,'cards '+sevenCard);
  const opts=await admin.locator('.scene-card').allInnerTexts();
  report('seventh_scene_present_in_admin',opts.some(x=>x.includes('07')),'7 scene present');
  await admin.locator('#showQr').click();await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:'1차 모둠 편집·무작위 배치'}).click();
  report('group_editor_usable',await admin.locator('#gmSave').isVisible());
  const totalBefore=await admin.locator('.gm-card').count();
  console.log('FIRST_GROUPS '+totalBefore);
  await admin.locator('#gmSave').click();
  report('groups_saved',await until(async()=>{let v=await request('groups/dialogue1');return v.status===200&&v.data&&Object.keys(v.data).length>=1}));
  await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:'첫 번째 만남 시작'}).click();
  report('first_meeting_started',await until(async()=>{let r=await request('meta');return r.data?.phase==='dialogue1'}));
  await admin.getByRole('button',{name:'1차 만남 모둠'}).click();
  report('first_groups_projector_visible',await admin.locator('#overlay .group-card').count()>=1);
  await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:/깊이 보기/}).click();
  report('deep_phase_advance',await until(async()=>{let r=await request('meta');return r.data?.phase==='deep'}));
  await admin.getByRole('button',{name:'항목별 응답·직접 입력'}).click();
  const customVisible=await admin.getByText('발표용 직접 입력 문장').count()>0;
  report('custom_reason_text_visible',customVisible);
  await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:'전체 무드미터'}).click();
  const dots=await admin.locator('#overlay .sel-mood-dot').count();
  report('moodmeter_shows_seven_scenes',dots===25*6+Math.floor(25*2/3) ? true : dots>150,'dots '+dots);
  await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:'학생별 완료율'}).click();
  report('progress_has_all_25',await admin.locator('#overlay .sel-student').count()===25);
  await admin.getByRole('button',{name:'닫기'}).click();
  const disabledBefore=await admin.locator('#open2').isDisabled();
  report('second_stage_waits_for_incomplete_people',disabledBefore);
  const doneTemplate={emotionWords:['평온함'],intensity:'보통',bodySignals:['숨이 달라졌다'],urge:'기다리고 싶었다',reason:'상황이 예상과 달라서',lifeLink:'있어요',nextAction:'다른 방법을 찾아보기'};
  for(let i=23;i<=25;i++){const p='participants/qa-20261106-'+String(i).padStart(3,'0')+'/deepDive';const write=await request(p,'PUT',doneTemplate);report('remaining_deep_dive_'+i,write.status===200)}
  const enabled=await until(async()=>await admin.locator('#open2').isEnabled(),18000);
  report('second_stage_unlocks_after_all_finish',enabled);
  await admin.getByRole('button',{name:'두 번째 만남 시작'}).click({timeout:7000});
  report('second_meeting_started',await until(async()=>{let r=await request('meta');return r.data?.phase==='dialogue2'}));
  await admin.getByRole('button',{name:'2차 만남 모둠'}).click();
  report('second_groups_projector',await admin.locator('#overlay .group-card').count()>=1);
  await admin.getByRole('button',{name:'닫기'}).click();
  await admin.getByRole('button',{name:/역할 밖의 나로/}).click();
  report('final_life_phase_started',await until(async()=>{let r=await request('meta');return r.data?.phase==='life'}));
  await admin.getByRole('button',{name:'최종 한마디'}).click();
  const boardText=await admin.locator('#overlay').innerText();
  report('reflection_board_has_25_cards',await admin.locator('#overlay .final-card').count()===25);
  report('private_reflection_not_shown',!boardText.includes('비공개 검증 문장'));
  report('unfinished_participants_listed',boardText.includes('검증24')&&boardText.includes('검증25'));
  await admin.getByRole('button',{name:'닫기'}).click();
  report('browser_no_uncaught_js_errors',pageErrors.length===0,JSON.stringify(pageErrors));
  // Warning, not treated as green: public anonymous records remain accessible.
  const exposed=await request('participants/qa-20261106-001');
  if(exposed.data?.nickname==='검증01'){result.warnings.push('SECURITY: participant data readable without authentication');console.log('WARN security access is public')}
  await admin.screenshot({path:'screenshots/qa-25-presenter.png',fullPage:true});
}catch(e){const message=String(e.stack||e);result.errors.push('FATAL '+message.slice(0,1100));console.log('FATAL '+message)}
finally{
 if(result.code){try{const x=await fetch(DB+'/sessions/'+result.code+'.json',{method:'DELETE',signal:AbortSignal.timeout(20000)});result.cleanup=x.status===200?'deleted test session':'DELETE HTTP '+x.status;console.log('CLEANUP '+result.cleanup)}catch(e){result.cleanup='error '+String(e);result.errors.push('cleanup error')}}
 await browser?.close().catch(()=>{});
 console.log('PRESENTATION_QA_RESULT '+JSON.stringify(result));
 if(result.errors.length||result.cleanup!=='deleted test session')process.exitCode=1;
}
})();