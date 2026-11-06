const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const jsQR=require('jsqr');
const assert=require('node:assert/strict');
const ROOT='https://cjswoa-star.github.io/emotion-share-test/workshop.html';
const LINKS=[
'https://cjswoa-star.github.io/emotion-magnifier/index-v3.html',
'https://cjswoa-star.github.io/emotion-share-test/admin.html',
'https://docs.google.com/forms/d/e/1FAIpQLSd3yFuKVfUkAIUVP_7iWorP7TSDpX2R4lH6y7KLCKz83kJ_Rg/viewform'
];
(async()=>{
const b=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
try{
 const page=await b.newPage({viewport:{width:1560,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(ROOT,{waitUntil:'load',timeout:30000});
 assert.equal(response.status(),200);console.log('PASS launcher HTTP 200');
 assert.equal(await page.locator('.card').count(),3);console.log('PASS 3 stage cards');
 const links=await page.locator('.card a.action').evaluateAll(xs=>xs.map(x=>x.href));
 assert.deepEqual(links,LINKS);console.log('PASS all 3 published URLs exact');
 for(const [key,target] of [['emotion',LINKS[0]],['survey',LINKS[2]]]){
   await page.locator('[data-qr="'+key+'"]').click();
   await page.locator('#qr svg').waitFor({timeout:7000});
   const picture=PNG.sync.read(await page.locator('#qr svg').screenshot());
   const found=jsQR(new Uint8ClampedArray(picture.data),picture.width,picture.height,{inversionAttempts:'attemptBoth'});
   assert.equal(found?.data,target);console.log('PASS '+key+' QR resolves to target');
   await page.locator('#closeQr').click();
   assert.equal(await page.locator('#modal').isHidden(),true);
 }
 assert.deepEqual(errors,[]);console.log('PASS no JavaScript exceptions');
 await page.screenshot({path:'workshop-launcher-verified.png',fullPage:true});
 console.log('WORKSHOP_LAUNCHER_VERIFIED');
}finally{await b.close()}
})().catch(e=>{console.error('WORKSHOP_LAUNCHER_FAILED',e.stack||e);process.exitCode=1});
