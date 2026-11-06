/* Session-specific QR. MIT QR generator supplied in demo/vendor/qrcode.js. */
(function(){
'use strict';
qr=function(el,url,size){
 if(!el)return;
 const address=String(url||'');
 try{
   if(typeof window.qrcode!=='function')throw Error('QR generator is unavailable');
   const matrix=window.qrcode(0,'M');
   matrix.addData(address,'Byte');
   matrix.make();
   el.innerHTML=matrix.createSvgTag({cellSize:3,margin:12,scalable:true,alt:'해당 활동의 참가자 접속 QR'});
   const svg=el.querySelector('svg');
   if(svg){svg.setAttribute('role','img');svg.setAttribute('aria-label','참가자 접속 QR');svg.style.width=Math.max(45,Number(size)||160)+'px';svg.style.height=Math.max(45,Number(size)||160)+'px';svg.style.maxWidth='100%';svg.style.display='block';svg.style.shapeRendering='crispEdges';svg.dataset.encodedUrl=address;}
 }catch(error){
   el.replaceChildren();
   const link=document.createElement('a');
   link.href=address;link.textContent='QR을 표시할 수 없습니다. 참가자 주소 열기';
   link.target='_blank';link.rel='noopener noreferrer';
   el.appendChild(link);
   console.error('QR 생성 오류',error);
 }
};
})();