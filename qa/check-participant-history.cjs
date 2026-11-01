const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
 try{
  const admin=await b.newPage();
  await admin.goto('https://cjswoa-star.github.io/emotion-share-test/admin.html');
  await admin.waitForFunction(()=>typeof SCENES!=='undefined');
  if(await admin.evaluate(()=>SCENES.length)!==7)throw Error('Admin scenes not 7');
  console.log('PASS admin seven scenes');
  const page=await b.newPage({viewport:{width:390,height:844}});
  await page.goto('https://cjswoa-star.github.io/emotion-share-test/v10/index.html?s=000000');
  await page.waitForFunction(()=>!!window.__FPSEL__);
  await page.waitForTimeout(900);
  await page.evaluate(()=>{const o=window.__FPSEL__;o.state.nickname='검증학생';o.state.checkpoints={scene01:{status:'experienced',x:.2,y:.3}};o.state.focusScene='scene01';o.state.deepDive={emotionWords:['기쁨'],reason:'내가 직접 적어볼게요',reasonText:'확인용 이유 문장'};o.renderScene(0)});
  await page.locator('#my-past-open').waitFor({timeout:8000});
  const before=await page.evaluate(()=>JSON.stringify(window.__FPSEL__.state));
  await page.locator('#my-past-open').click();
  const content=await page.locator('#my-past-review').innerText();
  if(!content.includes('떠나기 전날')||!content.includes('확인용 이유 문장'))throw Error('Past selections missing');
  await page.screenshot({path:'screenshots/review-own-choices.png'});
  await page.locator('#my-past-close').click();
  const after=await page.evaluate(()=>JSON.stringify(window.__FPSEL__.state));
  if(before!==after)throw Error('Read-only view mutated participant state');
  console.log('PASS show prior choices, return with no mutation');
 }finally{await b.close()}
})().catch(e=>{console.error('QA_FAIL',String(e));process.exit(1)});
