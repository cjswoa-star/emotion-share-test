const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ORIGIN='https://cjswoa-star.github.io/emotion-share-test/';
const DB='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app/sessions/';
const KEY='AIzaSyB6mWBT6IYc9BkGBPvPhIb0HBDA0Vj3Bxo';
const report={checks:{},errors:[],testCode:null,cleanup:null};
function check(name,condition,details=''){report.checks[name]={ok:!!condition,details:String(details).slice(0,300)};console.log((condition?'PASS ':'FAIL ')+name+' '+details);if(!condition)report.errors.push(name+': '+details)}
async function json(url,method='GET',body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(18000)});let d;try{d=await r.json()}catch{d=null}return {status:r.status,data:d}}
async function anon(){const r=await json('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+KEY,'POST',{returnSecureToken:true});if(r.status!==200||!r.data?.idToken)throw Error('Anonymous auth: '+JSON.stringify(r.data));return {uid:r.data.localId,token:r.data.idToken}}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function poll(f,ms=17000){let end=Date.now()+ms;while(Date.now()<end){if(await f())return true;await delay(700)}return false}
async function dbBrowser(page,path,token,method='GET',body){return page.evaluate(async a=>{const url=a.db+a.path+'.json?auth='+encodeURIComponent(a.token);const r=await fetch(url,{method:a.method,headers:{'Content-Type':'application/json'},body:a.body===undefined?undefined:JSON.stringify(a.body)});let data;try{data=await r.json()}catch{data=null}return {status:r.status,data};},{db:DB,path,token,method,body})}
(async()=>{
let browser,code,ownerToken,students=[];
try{
 const deployed=await json(ORIGIN+'admin.html');check('admin_http_200',deployed.status===200,deployed.status);
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 const contexts=await Promise.all([0,1,2].map(()=>browser.newContext()));
 const [admin,studentA,studentB]=await Promise.all(contexts.map(x=>x.newPage()));
 for(let [n,p] of [['admin',admin],['A',studentA],['B',studentB]])p.on('pageerror',e=>console.log('BROWSER_ERROR '+n+' '+e.message.slice(0,180)));
 await admin.goto(ORIGIN+'admin.html',{waitUntil:'domcontentloaded',timeout:25000});
 await admin.getByRole('button',{name:'새 활동 만들기'}).waitFor({timeout:16000});
 check('admin_page_rendered',true);
 await admin.getByRole('button',{name:'새 활동 만들기'}).click();
 await admin.locator('.session-code').waitFor({timeout:18000});
 code=(await admin.locator('.session-code').innerText()).trim();
 report.testCode=code;
 check('test_session_created',/^\d{6}$/.test(code),'code='+code);
 const owner=await admin.evaluate(async()=>await window.FPAuth?.ensure?.());
 ownerToken=owner?.idToken;
 check('admin_anonymous_auth',!!ownerToken,owner?.uid?.slice(0,6)||'missing');
 await Promise.all([studentA,studentB].map(p=>p.goto(ORIGIN+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:25000})));
 await delay(1700);
 const titles=await Promise.all([studentA.title(),studentB.title()]);
 check('two_isolated_participant_contexts',titles.every(x=>x.length>0),JSON.stringify(titles));
 const pages=[studentA,studentB];
 const auths=await Promise.all([anon(),anon()]);
 check('distinct_authenticated_clients',auths[0].uid!==auths[1].uid);
 const checkpoints=Object.fromEntries(Array.from({length:6},(_,i)=>['scene0'+(i+1),{status:'experienced',x:i%2?.75:.25,y:i%3?.65:.25}]));
 for(let i=0;i<2;i++){
   const rec={nickname:'QA실시간'+(i+1),joinedAt:Date.now(),checkpoints,focusScene:'scene0'+(i+1)};
   const r=await dbBrowser(pages[i],code+'/participants/'+auths[i].uid,auths[i].token,'PUT',rec);
   check('device'+(i+1)+'_writes_firebase',r.status===200,'HTTP '+r.status);
   students.push({...auths[i],page:pages[i],nickname:rec.nickname});
 }
 const visible=await poll(async()=>students.every(s=>(admin.locator('body').innerText()).then(t=>t.includes(s.nickname))&&false),3000).catch(()=>false);
 const visible2=await poll(async()=>{const body=await admin.locator('body').innerText();return students.every(x=>body.includes(x.nickname))});
 check('admin_realtime_receives_two_students',visible2,'2 distinct clients');
 try{
   await admin.getByRole('button',{name:'첫 번째 만남 시작'}).click({timeout:4500});
   check('presenter_first_meeting_started',await poll(async()=>{const r=await json(DB+code+'/meta.json');return r.data?.phase==='dialogue1'}));
 }catch(e){check('presenter_first_meeting_started',false,e.message)}
 try{
   await admin.getByRole('button',{name:'1차 만남 모둠'}).click({timeout:4500});
   const c=await admin.locator('#overlay .group-card').count();
   check('first_meeting_groups_projector',c>=1,'cards='+c);
   await admin.getByRole('button',{name:'닫기'}).click();
 }catch(e){check('first_meeting_groups_projector',false,e.message)}
 for(let i=0;i<2;i++){
   const record={emotionWords:['평온함'],intensity:'보통',bodySignals:['심장'],urge:'기다림',reason:i?'상황이 예상과 달라서':'내 말로 적어볼게요',reasonText:i?'':'QA에서 입력한 직접 이유',lifeLink:'있어요',nextAction:'다른 방법을 찾아보기'};
   const r=await dbBrowser(students[i].page,code+'/participants/'+students[i].uid+'/deepDive',students[i].token,'PUT',record);
   check('device'+(i+1)+'_deep_answer_saved',r.status===200,'HTTP '+r.status);
 }
 try{
   await admin.getByRole('button',{name:'항목별 응답·직접 입력'}).click({timeout:4500});
   const seen=await poll(async()=>await admin.getByText('QA에서 입력한 직접 이유').count()>0,10000);
   check('presenter_shows_custom_reason_text',seen);
   await admin.getByRole('button',{name:'닫기'}).click();
 }catch(e){check('presenter_shows_custom_reason_text',false,e.message)}
 try{
   await admin.getByRole('button',{name:'전체 무드미터'}).click({timeout:4500});
   const count=await admin.locator('.sel-mood-dot').count();
   check('presenter_moodmeter_points',count>=2,'dots='+count);
   await admin.getByRole('button',{name:'이름 표시'}).click();
   check('moodmeter_name_toggle',await admin.locator('.sel-mood-dot.named').count()>=2);
   await admin.getByRole('button',{name:'닫기'}).click();
 }catch(e){check('presenter_moodmeter_points',false,e.message)}
 for(let i=0;i<2;i++){
   const record={text:'QA 검증 문장 '+(i+1),share:i===0,completedAt:Date.now()};
   const r=await dbBrowser(students[i].page,code+'/participants/'+students[i].uid+'/finalReflection',students[i].token,'PUT',record);
   check('device'+(i+1)+'_reflection_saved',r.status===200);
 }
 try{
   await admin.getByRole('button',{name:'최종 한마디'}).click({timeout:4500});
   const ready=await poll(async()=>{const t=await admin.locator('#overlay').innerText();return t.includes('QA 검증 문장 1')});
   const all=await admin.locator('#overlay').innerText();
   check('shared_reflection_realtime',ready);
   check('private_reflection_hidden',!all.includes('QA 검증 문장 2'));
   await admin.getByRole('button',{name:'닫기'}).click();
 }catch(e){check('shared_reflection_realtime',false,e.message)}
 const unauth=await json(DB+code+'/participants/'+students[0].uid+'.json');
 check('anonymous_privacy',unauth.data?.nickname!==students[0].nickname,'HTTP '+unauth.status);
 const cross=await dbBrowser(studentB,code+'/participants/'+students[0].uid,students[1].token);
 check('cross_account_privacy',cross.data?.nickname!==students[0].nickname,'HTTP '+cross.status);
 }catch(e){check('fatal_test_error',false,e.stack||e.message)}
 finally{
  if(code&&ownerToken){
   try{
     const d=await json(DB+code+'.json?auth='+encodeURIComponent(ownerToken),'DELETE');
     if(d.status===200){report.cleanup='deleted';check('qa_data_deleted',true);}
     else{
       const p=await json(DB+code+'/meta.json?auth='+encodeURIComponent(ownerToken),'PATCH',{status:'closed',endedAt:Date.now()});
       report.cleanup='delete HTTP '+d.status+' close HTTP '+p.status;
       check('qa_activity_closed',p.status===200,report.cleanup);
     }
   }catch(e){check('qa_cleanup_error',false,e.message)}
  }
  await browser?.close().catch(()=>{});
  console.log('QA_RESULT '+JSON.stringify(report));
  if(report.errors.length)process.exitCode=1;
 }
})();