const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const origin='https://cjswoa-star.github.io/emotion-share-test/';
const db='https://emotion-share-test-default-rtdb.asia-southeast1.firebasedatabase.app';
let browser,code;
function pass(n,v){assert(v,n);console.log('PASS '+n)}
(async()=>{
try{
 browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
 const admin=await browser.newPage();
 await admin.goto(origin+'admin.html',{waitUntil:'domcontentloaded',timeout:25000});
 await admin.getByRole('button',{name:'새 활동 만들기'}).click();
 await admin.locator('.session-code').waitFor();
 code=(await admin.locator('.session-code').innerText()).trim();
 console.log('TEST_ACTIVITY_CREATED');
 const phone=await browser.newPage({viewport:{width:390,height:844}});
 phone.on('pageerror',e=>console.log('PAGE_ERROR '+e.message));
 await phone.goto(origin+'index.html?s='+code,{waitUntil:'domcontentloaded',timeout:25000});
 await phone.getByRole('button',{name:'시작하기'}).waitFor({timeout:30000});
 await phone.getByRole('button',{name:'시작하기'}).click();
 await phone.locator('#nick').fill('길이검사');
 await phone.locator('#next').click();
 await phone.locator('.scene-counter').waitFor({timeout:12000});
 await phone.evaluate(()=>{const st=window.__FPSEL__.state;st.focusScene='scene01';st.checkpoints.scene01={status:'experienced',x:.4,y:.6};window.__FPSEL__.renderBody()});
 await phone.locator('[data-v="내가 직접 적어볼게요"]').click();
 let b=phone.locator('#bodyOther');
 pass('body_input_max_300',await b.getAttribute('maxlength')==='300');
 await b.fill('가'.repeat(330));pass('body_browser_prevents_overflow',await b.inputValue()==='가'.repeat(300));
 await phone.locator('#bodyNext').click();
 await phone.locator('.urge-grid').waitFor({timeout:10000});
 await phone.locator('[data-v="내가 직접 적어볼게요"]').click();
 let u=phone.locator('#urgeOther');pass('urge_max_300',await u.getAttribute('maxlength')==='300');
 await u.fill('나'.repeat(330));pass('urge_browser_prevents_overflow',await u.inputValue()==='나'.repeat(300));
 await phone.locator('#urgeOtherDone').click();
 await phone.locator('#reasonCustomBtn').waitFor({timeout:10000});
 await phone.locator('#reasonCustomBtn').click();
 let r=phone.locator('#reasonOther');pass('reason_max_600',await r.getAttribute('maxlength')==='600');
 await r.fill('다'.repeat(630));pass('reason_browser_prevents_overflow',await r.inputValue()==='다'.repeat(600));
 await phone.locator('#reasonDone').click();
 await phone.locator('#mode').waitFor({timeout:10000});
 await phone.evaluate(()=>window.__FPSEL__.renderNextAction());
 await phone.locator('[data-v="내가 직접 적어보기"]').click();
 let n=phone.locator('#customInput');pass('next_action_max_300',await n.getAttribute('maxlength')==='300');
 await n.fill('라'.repeat(350));pass('next_action_browser_prevents_overflow',await n.inputValue()==='라'.repeat(300));
 await phone.locator('#customDone').click();
 await phone.locator('#reflect').waitFor({timeout:10000});
 await phone.locator('#reflect').click();
 const f=phone.locator('#reflection');pass('final_reflection_max_1000',await f.getAttribute('maxlength')==='1000');
 await f.fill('마'.repeat(1050));pass('reflection_browser_prevents_overflow',await f.inputValue()==='마'.repeat(1000));
 await phone.locator('#donePrivate').click();
 await phone.waitForTimeout(500);
 const st=await phone.evaluate(()=>window.__FPSEL__.state);
 const resp=await fetch(db+'/sessions/'+code+'/participants/'+encodeURIComponent(st.participantId)+'.json');
 const record=await resp.json();
 const deep=record?.deepDive||{},final=record?.finalReflection||{};
 pass('body_saved_300',deep.bodySignalText?.length===300);
 pass('urge_saved_300',deep.urgeText?.length===300);
 pass('reason_saved_600',deep.reasonText?.length===600);
 pass('next_action_saved_300',deep.nextActionText?.length===300);
 pass('final_reflection_saved_1000',final.text?.length===1000);
 console.log('CHAR_LIMIT_E2E_ALL_PASS');
}catch(e){console.log('CHAR_LIMIT_E2E_FAIL '+String(e.stack||e));process.exitCode=1}
finally{
 if(code){const c=await fetch(db+'/sessions/'+code+'.json',{method:'DELETE'});console.log('TEST_SESSION_DELETE_HTTP '+c.status);if(!c.ok)process.exitCode=1}
 await browser?.close().catch(()=>{});
}
})();