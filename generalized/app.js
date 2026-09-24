const APP_KEY='meet-reflect-builder-v1';

const blockCatalog={
  intro:{label:'안내 화면',sub:'활동 소개',color:'#dff2ff'},
  choice:{label:'장면/상황 선택',sub:'선택지 고르기',color:'#fff0c9'},
  reflection:{label:'개인 응답',sub:'질문과 말문',color:'#e8efff'},
  meet:{label:'만남',sub:'모둠 대화',color:'#ffdce5'},
  mood:{label:'감정 다시 보기',sub:'무드미터',color:'#e6dcff'},
  connection:{label:'삶과 연결',sub:'경험 연결',color:'#dcf2e8'},
  share:{label:'전체 공유',sub:'응답 모아보기',color:'#dff7ef'},
  final:{label:'마지막 한마디',sub:'마무리 응답',color:'#dff1e5'}
};

function id(){return Math.random().toString(36).slice(2,9)}
function clone(x){return JSON.parse(JSON.stringify(x))}

const defaultActivity={
  title:'감정으로 만나고, 돌아보기',
  blocks:[
    {id:id(),type:'intro',name:'안내 화면',title:'오늘은 여러 상황을 통해 내 마음을 들여다봅니다.',body:'정답은 없습니다. 느낀 점을 천천히 기록하고 친구의 이야기도 들어보세요.'},
    {id:id(),type:'choice',name:'상황 선택',title:'어떤 장면이 가장 마음에 남나요?',options:['친구와 의견이 엇갈렸던 순간','발표를 앞둔 순간','새로운 친구를 만났던 순간','실수하고 다시 해보았던 순간']},
    {id:id(),type:'reflection',name:'개인 응답',title:'그때 내 마음은 어땠나요?',questions:['어떤 감정을 느꼈나요?','감정의 강도는 어느 정도였나요?','그렇게 느낀 이유를 적어보세요.'],starters:['처음에는…','가장 크게 느껴진 감정은…','그 이유는…']},
    {id:id(),type:'meet',name:'만남 1',title:'친구와 이야기 나누기',method:'same',groupSize:'auto',minutes:3,questions:['서로 어떤 감정을 느꼈는지 이야기해 보세요.','같은 상황을 다르게 느낀 점이 있었나요?'],starters:['나는 이 부분에서…','친구 이야기를 듣고…'],avoidRepeat:true},
    {id:id(),type:'mood',name:'감정 다시 보기',title:'지금 이 경험을 떠올렸을 때 내 마음은 어디쯤인가요?',note:'무드미터에서 지금 마음과 가까운 위치를 골라보세요.'},
    {id:id(),type:'meet',name:'만남 2',title:'다른 친구와 이야기 나누기',method:'different',groupSize:'4',minutes:4,questions:['이야기를 들으며 새롭게 보인 점은 무엇인가요?','서로 다른 마음이 생긴 이유는 무엇일까요?'],starters:['내 생각과 달랐던 점은…','새롭게 알게 된 것은…'],avoidRepeat:true},
    {id:id(),type:'connection',name:'삶과 연결',title:'이 경험이 지금 내 생활과 어떻게 닿아 있나요?',questions:['비슷한 경험이 있었나요?','다음에 비슷한 일이 생기면 어떻게 해보고 싶나요?'],starters:['나도 예전에…','다음에는…']},
    {id:id(),type:'final',name:'마지막 한마디',title:'오늘 활동을 한 문장으로 정리해 보세요.',starters:['오늘 나는…','친구 이야기를 들으며…','앞으로는…']}
  ]
};

let state={screen:'home',activity:loadActivity(),selectedId:null,modal:false};
state.selectedId=state.activity.blocks[0]?.id||null;

function loadActivity(){
  try{const v=localStorage.getItem(APP_KEY);return v?JSON.parse(v):clone(defaultActivity)}catch(e){return clone(defaultActivity)}
}
function saveActivity(){localStorage.setItem(APP_KEY,JSON.stringify(state.activity));toast('저장했습니다.')}
function resetActivity(){state.activity=clone(defaultActivity);state.selectedId=state.activity.blocks[0].id;render()}
function selected(){return state.activity.blocks.find(b=>b.id===state.selectedId)||state.activity.blocks[0]}

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function render(){
  document.getElementById('app').innerHTML=state.screen==='home'?homeHTML():editorHTML();
  bind();
}

function sidebar(active){return `<aside class="sidebar">
  <div class="brand"><div class="brand-mark">🌿</div><div><b>만나고, 돌아보다</b><small>함께 만드는 수업 활동</small></div></div>
  <div class="nav">
    <button class="${active==='home'?'active':''}" data-nav="home">⌂ 홈</button>
    <button data-nav="mine">▣ 내 활동</button>
    <button class="${active==='new'?'active':''}" data-nav="new">＋ 새로 만들기</button>
    <button data-action="template">▤ 예시 활동</button>
    <button data-action="export">⇩ JSON 내보내기</button>
    <button data-action="import">⇧ JSON 불러오기</button>
    <button data-action="firebase">⚙ Firebase 연결</button>
  </div>
</aside>`}

function homeHTML(){return `<div class="shell">${sidebar('home')}<main class="main">
  <div class="topbar"><div><h1>활동 만들기</h1><div class="muted">질문, 만남, 감정 탐색을 원하는 순서로 구성합니다.</div></div></div>
  <section class="hero">
    <h2>새로운 활동을 만들어보세요</h2>
    <p>필요한 단계만 골라 순서를 정하고, 질문과 말문을 직접 바꿀 수 있습니다.</p>
    <div class="start-grid">
      <article class="start-card" data-start="blank"><div class="ico" style="background:#e8f4ff">✎</div><h3>처음부터 만들기</h3><p>빈 활동에서 시작해 안내, 질문, 만남, 무드미터, 공유 단계를 직접 추가합니다.</p><div class="quick"><span class="chip">순서 자유</span><span class="chip">질문 수정</span><span class="chip">만남 위치 자유</span></div></article>
      <article class="start-card" data-start="sample"><div class="ico" style="background:#e7f6ef">▤</div><h3>예시 활동에서 시작하기</h3><p>감정 탐색과 두 번의 만남이 들어간 기본 구조를 불러온 뒤 필요한 부분만 바꿉니다.</p><div class="quick"><span class="chip">무드미터 포함</span><span class="chip">2회 만남</span><span class="chip">삶 연결</span></div></article>
    </div>
  </section>
</main></div>`}

function editorHTML(){const b=selected();return `<div class="shell">${sidebar('new')}<main class="main">
  <div class="topbar"><div><button class="btn" data-nav="home">←</button> <input id="activityTitle" value="${esc(state.activity.title)}" style="border:0;background:transparent;font-weight:900;font-size:22px;width:min(520px,60vw)"></div>
  <div class="top-actions"><button class="btn" data-action="previewAll">미리보기</button><button class="btn soft" data-action="save">저장하기</button><button class="btn primary" data-action="run">활동 실행</button></div></div>
  <div class="editor">
    <section class="panel"><div class="panel-head"><h3>1. 활동 단계</h3><span class="muted">${state.activity.blocks.length}개</span></div><div class="panel-body"><div class="flow-list">${state.activity.blocks.map((x,i)=>flowCard(x,i)).join('')}</div><button class="add-stage" data-action="add">＋ 단계 추가</button></div></section>
    <section class="panel"><div class="panel-head"><h3>2. 단계 설정</h3><div><button class="btn" data-action="up">↑</button> <button class="btn" data-action="down">↓</button></div></div><div class="panel-body">${settingsHTML(b)}</div></section>
    <section class="panel"><div class="panel-head"><h3>3. 학생 화면 미리보기</h3><span class="muted">모바일</span></div><div class="preview-wrap">${phoneHTML(b)}</div></section>
  </div>${state.modal?modalHTML():''}
</main></div>`}
}

function flowCard(b,i){const c=blockCatalog[b.type]||blockCatalog.reflection;return `<div class="flow-card ${b.id===state.selectedId?'active':''}" data-select="${b.id}"><div class="num" style="background:${c.color}">${i+1}</div><div><b>${esc(b.name||c.label)}</b><small>${esc(c.sub)}</small></div><div class="drag">⋮⋮</div></div>`}

function settingsHTML(b){if(!b)return '<p>단계를 선택하세요.</p>';
  const common=`<div class="field"><label>단계 이름</label><input data-field="name" value="${esc(b.name||'')}"></div><div class="field"><label>학생에게 보일 제목</label><input data-field="title" value="${esc(b.title||'')}"></div>`;
  if(b.type==='intro')return common+`<div class="field"><label>안내 내용</label><textarea data-field="body">${esc(b.body||'')}</textarea></div>`+deleteBlock();
  if(b.type==='choice')return common+listEditor('선택지','options',b.options||[],'선택지 추가')+deleteBlock();
  if(['reflection','connection'].includes(b.type))return common+listEditor('질문','questions',b.questions||[],'질문 추가')+startersEditor(b)+deleteBlock();
  if(b.type==='mood')return common+`<div class="field"><label>안내 문장</label><textarea data-field="note">${esc(b.note||'')}</textarea></div><div class="advanced"><div class="section-title">무드미터</div><p class="muted">기존 활동의 감정 좌표 선택 구조를 일반화 블록으로 유지합니다. 질문 문장은 자유롭게 바꿀 수 있습니다.</p></div>`+deleteBlock();
  if(b.type==='meet')return common+`<div class="section-title">기본 설정</div><div class="field"><label>만남 방식</label><div class="radio-grid">${[['same','같은 선택끼리'],['different','다른 선택끼리'],['random','무작위'],['manual','진행자 직접 지정']].map(([v,l])=>`<div class="radio-option ${b.method===v?'selected':''}" data-method="${v}">${l}</div>`).join('')}</div></div><div class="inline"><div class="field"><label>모둠 인원</label><select data-field="groupSize"><option value="auto" ${b.groupSize==='auto'?'selected':''}>자동</option><option value="2" ${b.groupSize==='2'?'selected':''}>2명</option><option value="3" ${b.groupSize==='3'?'selected':''}>3명</option><option value="4" ${b.groupSize==='4'?'selected':''}>4명</option></select></div><div class="field"><label>진행 시간</label><select data-field="minutes">${[2,3,4,5,7,10].map(n=>`<option value="${n}" ${Number(b.minutes)===n?'selected':''}>${n}분</option>`).join('')}</select></div></div>${listEditor('만남 질문','questions',b.questions||[],'질문 추가')}${startersEditor(b)}<div class="advanced"><label><input type="checkbox" data-field="avoidRepeat" ${b.avoidRepeat!==false?'checked':''}> 이전 만남에서 만난 사람은 가능한 한 다시 만나지 않기</label></div>`+deleteBlock();
  if(b.type==='share')return common+`<div class="field"><label>공개 범위</label><select data-field="scope"><option>전체</option><option>모둠</option><option>진행자만</option></select></div>`+deleteBlock();
  if(b.type==='final')return common+startersEditor(b)+deleteBlock();
  return common+deleteBlock();
}

function listEditor(label,key,arr,addLabel){return `<div class="field"><label>${label}</label>${arr.map((q,i)=>`<div class="question-row"><input data-list="${key}" data-index="${i}" value="${esc(q)}"><button class="icon-btn" data-remove-list="${key}" data-index="${i}">×</button></div>`).join('')}<button class="subbtn" data-add-list="${key}">＋ ${addLabel}</button></div>`}
function startersEditor(b){return `<div class="field"><label>말문 도움 <span class="muted">학생에게 버튼으로 제시</span></label>${(b.starters||[]).map((q,i)=>`<div class="starter-row"><input data-list="starters" data-index="${i}" value="${esc(q)}"><button class="icon-btn" data-remove-list="starters" data-index="${i}">×</button></div>`).join('')}<button class="subbtn" data-add-list="starters">＋ 말문 추가</button></div>`}
function deleteBlock(){return `<div class="advanced"><button class="btn" style="color:#a33" data-action="delete">이 단계 삭제</button></div>`}

function phoneHTML(b){if(!b)return '';
  let body='';
  if(b.type==='intro')body=`<p>${esc(b.body||'')}</p>`;
  if(b.type==='choice')body=`<div class="scene-grid">${(b.options||[]).slice(0,4).map(x=>`<div class="scene">${esc(x)}</div>`).join('')}</div>`;
  if(['reflection','connection'].includes(b.type))body=`<div class="preview-card"><b>${esc((b.questions||[])[0]||'질문을 입력하세요.')}</b><p style="text-align:left">${(b.starters||[]).slice(0,3).map(s=>`<span class="chip">${esc(s)}</span>`).join(' ')}</p><textarea style="width:100%;border:1px solid #dde5eb;border-radius:10px;min-height:86px"></textarea></div>`;
  if(b.type==='meet')body=`<p>${esc((b.questions||[])[0]||'친구와 이야기를 나누세요.')}</p><div class="preview-card" style="text-align:center"><div style="font-size:42px">👥</div><b>${b.method==='same'?'같은 선택을 한 친구들과':b.method==='different'?'다른 선택을 한 친구들과':'새로운 친구들과'} 만나 이야기해요</b><div style="font-size:28px;font-weight:900;margin-top:15px">${String(b.minutes||3).padStart(2,'0')}:00</div></div>`;
  if(b.type==='mood')body=`<p>${esc(b.note||'')}</p><div class="mood-grid">${Array.from({length:16},()=>'<span></span>').join('')}</div><p>불쾌함 ← 에너지 → 활기</p>`;
  if(b.type==='share')body=`<div class="preview-card"><b>친구들의 생각</b><p>응답이 이곳에 모여 보여집니다.</p></div>`;
  if(b.type==='final')body=`<p>오늘 활동을 돌아보며 한 문장으로 남겨보세요.</p><textarea style="width:100%;border:1px solid #dde5eb;border-radius:10px;min-height:120px"></textarea><p style="text-align:left">${(b.starters||[]).slice(0,3).map(s=>`<span class="chip">${esc(s)}</span>`).join(' ')}</p>`;
  return `<div class="phone"><div class="phone-top"></div><div class="phone-screen"><h4>${esc(b.title||b.name)}</h4>${body}<button class="preview-btn">다음으로</button></div></div>`
}

function modalHTML(){return `<div class="modal-backdrop" data-close-modal><div class="modal" onclick="event.stopPropagation()"><h3>단계 추가</h3><p class="muted">필요한 블록을 원하는 위치에 추가할 수 있습니다.</p><div class="block-grid">${Object.entries(blockCatalog).map(([type,c])=>`<div class="block-choice" data-add-type="${type}" style="background:linear-gradient(180deg,white,${c.color}55)"><b>${c.label}</b><small>${c.sub}</small></div>`).join('')}</div><div style="text-align:right;margin-top:16px"><button class="btn" data-action="closeModal">닫기</button></div></div></div>`}

function newBlock(type){const c=blockCatalog[type];const base={id:id(),type,name:c.label,title:c.label};
  if(type==='intro')Object.assign(base,{title:'활동을 시작합니다.',body:'오늘 활동에 대해 안내해 주세요.'});
  if(type==='choice')Object.assign(base,{title:'어떤 것을 선택하겠나요?',options:['선택 1','선택 2','선택 3','선택 4']});
  if(type==='reflection')Object.assign(base,{title:'지금 떠오르는 생각을 적어보세요.',questions:['어떤 생각이나 감정이 들었나요?'],starters:['나는…','그때…']});
  if(type==='meet')Object.assign(base,{title:'친구와 이야기 나누기',method:'random',groupSize:'auto',minutes:3,questions:['서로의 생각을 이야기해 보세요.'],starters:['나는…','친구 이야기를 듣고…'],avoidRepeat:true});
  if(type==='mood')Object.assign(base,{title:'지금 내 마음은 어디쯤인가요?',note:'무드미터에서 현재 마음과 가까운 위치를 골라보세요.'});
  if(type==='connection')Object.assign(base,{title:'이 경험이 내 생활과 어떻게 이어지나요?',questions:['비슷한 경험이 있었나요?'],starters:['나도 예전에…','다음에는…']});
  if(type==='share')Object.assign(base,{title:'우리의 생각을 함께 봅니다.',scope:'전체'});
  if(type==='final')Object.assign(base,{title:'오늘 활동을 한 문장으로 정리해 보세요.',starters:['오늘 나는…','새롭게 알게 된 것은…']});
  return base;
}

function bind(){
  document.querySelectorAll('[data-nav="home"]').forEach(x=>x.onclick=()=>{state.screen='home';render()});
  document.querySelectorAll('[data-nav="new"]').forEach(x=>x.onclick=()=>{state.screen='editor';render()});
  document.querySelectorAll('[data-start]').forEach(x=>x.onclick=()=>{
    if(x.dataset.start==='blank')state.activity={title:'새 활동',blocks:[newBlock('intro')]};else state.activity=clone(defaultActivity);
    state.selectedId=state.activity.blocks[0].id;state.screen='editor';render();
  });
  document.querySelectorAll('[data-select]').forEach(x=>x.onclick=()=>{state.selectedId=x.dataset.select;render()});
  const title=document.getElementById('activityTitle');if(title)title.oninput=e=>state.activity.title=e.target.value;
  document.querySelectorAll('[data-field]').forEach(el=>{
    const k=el.dataset.field;const b=selected();
    const handler=e=>{b[k]=el.type==='checkbox'?el.checked:(k==='minutes'?Number(el.value):el.value);renderSoft()};
    el.onchange=handler;if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')el.oninput=e=>{b[k]=el.type==='checkbox'?el.checked:el.value;renderPreviewOnly()};
  });
  document.querySelectorAll('[data-list]').forEach(el=>el.oninput=()=>{const b=selected(),k=el.dataset.list,i=Number(el.dataset.index);b[k][i]=el.value;renderPreviewOnly()});
  document.querySelectorAll('[data-add-list]').forEach(el=>el.onclick=()=>{const b=selected(),k=el.dataset.addList;b[k]=b[k]||[];b[k].push(k==='starters'?'말문을 입력하세요.':'질문을 입력하세요.');render()});
  document.querySelectorAll('[data-remove-list]').forEach(el=>el.onclick=()=>{const b=selected(),k=el.dataset.removeList,i=Number(el.dataset.index);b[k].splice(i,1);render()});
  document.querySelectorAll('[data-method]').forEach(el=>el.onclick=()=>{selected().method=el.dataset.method;render()});
  document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>handleAction(el.dataset.action));
  document.querySelectorAll('[data-add-type]').forEach(el=>el.onclick=()=>{const b=newBlock(el.dataset.addType);const idx=state.activity.blocks.findIndex(x=>x.id===state.selectedId);state.activity.blocks.splice(idx+1,0,b);state.selectedId=b.id;state.modal=false;render()});
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.onclick=()=>{state.modal=false;render()});
}

function handleAction(a){
  const blocks=state.activity.blocks,idx=blocks.findIndex(x=>x.id===state.selectedId);
  if(a==='add'){state.modal=true;render()}
  if(a==='closeModal'){state.modal=false;render()}
  if(a==='save')saveActivity();
  if(a==='delete'&&blocks.length>1){blocks.splice(idx,1);state.selectedId=blocks[Math.max(0,idx-1)].id;render()}
  if(a==='up'&&idx>0){[blocks[idx-1],blocks[idx]]=[blocks[idx],blocks[idx-1]];render()}
  if(a==='down'&&idx<blocks.length-1){[blocks[idx+1],blocks[idx]]=[blocks[idx],blocks[idx+1]];render()}
  if(a==='template'){state.activity=clone(defaultActivity);state.selectedId=state.activity.blocks[0].id;state.screen='editor';render()}
  if(a==='export')exportJSON();
  if(a==='import')importJSON();
  if(a==='firebase')alert('Firebase 연결 설정은 다음 단계에서 추가합니다. 운영자는 자신의 Firebase 프로젝트 정보를 넣어 독립적으로 사용할 수 있게 만들 예정입니다.');
  if(a==='previewAll')alert('현재는 선택한 단계가 오른쪽에 즉시 미리보기 됩니다. 전체 학생 흐름 재생은 다음 작업에서 연결합니다.');
  if(a==='run')alert('편집기 1차 골격이 완성되었습니다. 다음 단계에서 Firebase 세션 생성·학생 참여·진행자 현황판을 연결합니다.');
}

function renderPreviewOnly(){const p=document.querySelector('.preview-wrap');if(p)p.innerHTML=phoneHTML(selected())}
function renderSoft(){render()}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function exportJSON(){const blob=new Blob([JSON.stringify(state.activity,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.activity.title||'activity')+'.json';a.click();URL.revokeObjectURL(a.href)}
function importJSON(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.blocks))throw new Error();state.activity=data;state.selectedId=data.blocks[0]?.id||null;state.screen='editor';render();toast('활동을 불러왔습니다.')}catch(e){alert('활동 JSON 형식을 확인해주세요.')}};r.readAsText(f)};inp.click()}

render();
