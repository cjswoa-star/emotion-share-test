const fs=require('node:fs');
const file='v10/index.html', s=fs.readFileSync(file,'utf8');
const rules=[
  ['HTML maxlength', /max(?:L|l)ength\s*=\s*['\"]?\d+/g],
  ['set maxLength', /maxLength\s*[:=]\s*\d+/g],
  ['slice numeric', /\.slice\(\s*0\s*,\s*\d+\s*\)/g],
  ['substring numeric', /\.substring\(\s*0\s*,\s*\d+\s*\)/g],
  ['text length comparison', /(?:value|text|trim\(\)|message|reason|reflection|raw|input|v|word)\.length\s*(?:>|>=|<|<=|===|==)\s*\d+/g],
  ['maxlength words', /(?:maxChars|maxLength|MAX_LENGTH|CHAR_LIMIT|charLimit|글자 수|자 이내|자까지|글자 제한)/g],
  ['textarea', /<textarea\b/g],
  ['input', /<input\b/g],
];
console.log('SOURCE_SIZE',s.length);
for(const [name,re] of rules){
  const ms=[...s.matchAll(re)];console.log('RULE',name,'COUNT',ms.length);
  for(const m of ms.slice(0,100)){
    const i=m.index;const before=s.slice(Math.max(0,i-220),i);const after=s.slice(i,Math.min(s.length,i+250));
    const normalize=x=>x.replace(/[\r\n\t ]+/g,' ').replace(/data:image\/[a-z]+;base64,[^\s\"'<>]{70,}/g,'[embedded-image]');
    console.log('HIT',name,'at='+i,'matched='+m[0],'context='+normalize(before+after).slice(0,420));
  }
}
for(const token of ['function renderNickname','function renderReason','function renderNextAction','function renderReflection','function renderFinal','function saveDeep','function saveFinal','function saveNick','const CUSTOM_LABEL','function customInput','function renderBody','function renderUrge']){
 const i=s.indexOf(token);console.log('FUNC',token,i<0?'not found':s.slice(i,i+2600).replace(/data:image\/[a-z]+;base64,[^\s\"'<>]{70,}/g,'[embedded-image]').slice(0,2400));
}