/* FAMOUS PEOPLE SEL — presenter board extensions, 2026-11 */
(function(){
  'use strict';
  var moodScope='all', moodShowNames=false, answerField='reason', focusSpot=null;
  var originalDashboard=renderDashboard;
  var originalOpenOverlay=openOverlay;
  var originalOpenFinalSpot=openFinalSpot;
  var originalListen=listen;

  // Stop the one-second Firebase poll from unnecessarily re-rendering a board
  // when the snapshot did not change. Changes still appear on the next poll.
  listen=function(path,callback){
    var previous=null;
    return originalListen(path,function(data){
      var next=JSON.stringify(data);
      if(next===previous)return;
      previous=next;callback(data);
    });
  };
  function finished(r){
    var f=r.finalReflection||{};
    return !!(f.completedAt || String(f.text||'').trim());
  }
  function published(r){
    var f=r.finalReflection||{};
    return !!(finished(r)&&String(f.text||'').trim()&&f.share!==false);
  }
  function has(v){return Array.isArray(v)?v.length>0:!!v;}
  function score(r){
    var d=r.deepDive||{},steps=SCENES.map(function(s){return has(r.checkpoints[s.id]);});
    steps.push(has(r.focusScene));
    steps.push(has(d.emotionWords) || has(d.emotionWord));
    steps.push(has(d.intensity));
    steps.push(has(d.bodySignals));
    steps.push(has(d.urge));
    steps.push(has(d.reason) && (d.reason!=='내 말로 적어볼게요'||has(d.reasonText)));
    steps.push(has(d.lifeLink));
    steps.push(has(d.nextAction) && (d.nextAction!=='내가 직접 적어보기'||has(d.nextActionText)));
    steps.push(finished(r));
    var n=steps.filter(Boolean).length;
    // An explicit final submission completes the workflow, even when the student chose not to name an emotion.
    if(finished(r))n=steps.length;
    return {count:n,total:steps.length,percent:Math.round(n/steps.length*100),done:finished(r)};
  }
  function peopleProgress(data){
    var rr=rows(data),done=rr.filter(finished),unfinished=rr.filter(function(r){return !finished(r);});
    var cards=rr.slice().sort(function(a,b){return score(a).percent-score(b).percent||a.nickname.localeCompare(b.nickname,'ko');}).map(function(r){
      var sc=score(r),cls=sc.done?'complete':'pending',txt=sc.done?'완료':'미완료';
      return '<div class="sel-student '+cls+'"><div class="sel-student-top"><b>'+esc(r.nickname)+'</b><span>'+sc.percent+'% · '+sc.count+'/'+sc.total+'항목</span><strong>'+txt+'</strong></div><div class="sel-track" role="progressbar" aria-label="'+esc(r.nickname)+' 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+sc.percent+'"><i style="width:'+sc.percent+'%"></i></div></div>';
    }).join('');
    return '<div class="sel-progress-head"><h2>참가자별 활동 완료율</h2><div class="sel-completion-totals"><b>전체 '+rr.length+'명</b><b>완료 '+done.length+'명</b><b>미완료 '+unfinished.length+'명</b></div></div><p class="sel-muted">7개 장면 확인 + 장면 선택 + 깊이 보기 5항목 + 실제 나 2항목 + 마지막 성찰 = 총 16항목. 장면을 ‘경험하지 않음’으로 넘겨도 확인을 마친 것으로 계산합니다.</p><div class="sel-student-grid">'+(cards||'<p>참가자가 아직 없습니다.</p>')+'</div>';
  }
  var fieldNames={
    emotion:'감정 이름',intensity:'감정의 세기',body:'몸의 반응',
    urge:'하고 싶었던 행동',reason:'그렇게 느낀 이유',
    life:'실제 나와 연결',next:'다음 행동'
  };
  function fieldValues(r,key){
    var d=r.deepDive||{},v;
    if(key==='emotion')v=d.emotionWords||d.emotionWord;
    if(key==='intensity')v=d.intensity;
    if(key==='body')v=d.bodySignals;
    if(key==='urge')v=d.urge;
    if(key==='reason')v=d.reason;
    if(key==='life')v=d.lifeLink;
    if(key==='next')v=d.nextAction;
    if(!has(v))return [];
    var detail='';
    if(key==='reason'&&d.reason==='내 말로 적어볼게요')detail=d.reasonText||'';
    if(key==='next'&&d.nextAction==='내가 직접 적어보기')detail=d.nextActionText||'';
    if(key==='urge'&&d.urge==='내가 직접 적어보기')detail=d.urgeText||'';
    var a=Array.isArray(v)?v:[v];
    return a.map(function(item){return {label:String(item),detail:String(detail||'')};});
  }
  function answerHTML(){
    var rr=rows(state.data||{}), keys=Object.keys(fieldNames), buckets=new Map(),responders=0;
    rr.forEach(function(r){
      var entries=fieldValues(r,answerField);
      if(entries.length)responders++;
      entries.forEach(function(v){
        if(!buckets.has(v.label))buckets.set(v.label,[]);
        buckets.get(v.label).push({person:r.nickname,detail:v.detail});
      });
    });
    var options=keys.map(function(k){return '<option value="'+k+'"'+(answerField===k?' selected':'')+'>'+fieldNames[k]+'</option>';}).join('');
    var cards=Array.from(buckets.entries()).sort(function(a,b){return b[1].length-a[1].length||a[0].localeCompare(b[0],'ko');}).map(function(pair){
      var label=pair[0],people=pair[1];
      return '<section class="sel-answer-card"><header><b>'+esc(label)+'</b><span>'+people.length+'명</span></header><div class="sel-answer-people">'+people.map(function(p){
        return '<div class="sel-answer-person"><b>'+esc(p.person)+'</b>'+(p.detail?'<p class="sel-direct-answer">'+esc(p.detail)+'</p>':'')+'</div>';
      }).join('')+'</div></section>';
    }).join('');
    return '<div class="sel-tools"><label>확인할 항목 <select id="selAnswerField">'+options+'</select></label><span>응답 '+responders+'/'+rr.length+'명 · 각 선택지별 인원과 닉네임</span></div><div class="sel-answer-grid">'+(cards||'<div class="overlay-empty">아직 이 항목에 응답한 사람이 없습니다.</div>')+'</div>';
  }
  function points(){
    var rr=rows(state.data||{}),all=[];
    rr.forEach(function(r,i){
      SCENES.forEach(function(s){
        if(moodScope!=='all'&&moodScope!==s.id)return;
        var p=r.checkpoints[s.id];
        if(p&&p.status==='experienced'&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))){
          var x=Math.max(0,Math.min(1,Number(p.x))),y=Math.max(0,Math.min(1,Number(p.y)));
          all.push({x:x,y:y,name:r.nickname,scene:s.n,anon:i+1});
        }
      });
    });
    return all;
  }
  function moodHTML(){
    var pp=points(),quads=[0,0,0,0],unique=new Set();
    pp.forEach(function(p){quads[(p.y>=.5?2:0)+(p.x>=.5?1:0)]++;unique.add(p.name);});
    var opts='<option value="all">전체 7개 장면</option>'+SCENES.map(function(s){return '<option value="'+s.id+'">'+s.n+' · '+esc(s.title)+'</option>';}).join('');
    var dots=pp.map(function(p){
      var label=moodShowNames?esc(p.name):'●',title=moodShowNames?p.name+' · '+p.scene+'번 장면':'익명 · '+p.scene+'번 장면';
      return '<span class="sel-mood-dot '+(moodShowNames?'named':'')+'" style="left:'+(p.x*100)+'%;top:'+(p.y*100)+'%" title="'+esc(title)+'" aria-label="'+esc(title)+'">'+label+'</span>';
    }).join('');
    var labels=['에너지 높음 · 불편함','에너지 높음 · 기분 좋음','에너지 낮음 · 불편함','에너지 낮음 · 기분 좋음'];
    return '<div class="sel-tools"><label>장면 <select id="selMoodScope">'+opts+'</select></label><button class="btn soft" id="selMoodNames" type="button">'+(moodShowNames?'이름 숨기기 · 익명':'이름 표시')+'</button><span>참가자 '+unique.size+'명 · 점 '+pp.length+'개'+(moodScope==='all'?' (장면별 응답)':'')+'</span></div><div class="sel-mood-layout"><div class="sel-mood-frame"><b class="sel-axis sel-top">에너지 높음</b><b class="sel-axis sel-left">불편함</b><div class="sel-mood-map">'+dots+'</div><b class="sel-axis sel-right">기분 좋음</b><b class="sel-axis sel-bottom">에너지 낮음</b></div><div class="sel-quads"><h3>사분면별 집계</h3>'+labels.map(function(l,i){return '<div class="sel-quad q'+i+'"><b>'+esc(l)+'</b><strong>'+quads[i]+'개</strong></div>';}).join('')+'<p>장면을 경험하지 않았거나 좌표가 없는 응답은 제외합니다. 경계선 위 점은 오른쪽·아래 사분면에 포함합니다.</p></div></div>';
  }
  function groupedOneHTML(kind){
    var first=kind.indexOf('m1')===0,key=first?'dialogue1':'dialogue2',id=kind.split(':')[1]||'';
    var gg=norm((state.data||{}).groups&&state.data.groups[key]).find(function(g){return g.id===id;});
    if(!gg)return '<div class="overlay-empty">해당 모둠이 없습니다.</div>';
    var mm=members(state.data||{},gg);
    var s=SCENES.find(function(x){return x.id===gg.sceneId;});
    var title=first?(s?s.n+' · '+s.title:'같은 장면끼리'):'서로 다른 장면의 사람들';
    return '<div class="sel-single-group"><p>'+esc(title)+' · '+mm.length+'명</p><div class="sel-single-names">'+mm.map(function(r){
      var sc=SCENES.find(function(x){return x.id===r.focusScene;});
      return '<div>'+esc(r.nickname)+(first?'':' <small>장면 '+(sc?sc.n:'–')+'</small>')+'</div>';
    }).join('')+'</div></div>';
  }
  function cardSize(n){if(n===25)return [5,5];if(n<=4)return [2,2];if(n<=9)return [3,3];if(n<=16)return [4,4];if(n<=25)return [5,5];return [6,Math.ceil(n/6)];}
  function textSize(txt){
    var n=Array.from(txt).length;
    return n<=25?25:n<=45?22:n<=70?19:n<=100?16:n<=125?14:12;
  }
  finalOverlay=function(){
    var rr=rows(state.data||{}).sort(function(a,b){return a.id.localeCompare(b.id);});
    var shared=rr.filter(published),priv=rr.filter(function(r){return finished(r)&&!published(r);}),waiting=rr.filter(function(r){return !finished(r);});
    var sz=cardSize(Math.max(1,rr.length));
    var cells=rr.map(function(r){
      if(!published(r)){
        return '<div class="final-card sel-empty-reflection"><b class="who">'+esc(r.nickname)+'</b><span>'+(finished(r)?'제출 완료 · 비공개':'작성 중')+'</span></div>';
      }
      var txt=String(r.finalReflection.text||'');
      return '<button type="button" class="final-card sel-shared-reflection" data-final-id="'+esc(r.id)+'" title="클릭하면 중앙에 크게 표시"><span class="who">'+esc(r.nickname)+'</span><span class="txt" style="--cellfont:'+textSize(txt)+'px">'+esc(txt)+'</span></button>';
    }).join('');
    return '<div class="final-meta"><span class="pill">공유 '+shared.length+'명</span><span class="pill">비공개 완료 '+priv.length+'명</span><span class="pill">작성 중 '+waiting.length+'명</span><span class="waiting">'+(waiting.length?'작성 중: '+waiting.map(function(r){return esc(r.nickname);}).join(' · '):'작성 중인 사람 없음')+'</span></div><div class="final-grid sel-final-grid" style="--cols:'+sz[0]+';--rows:'+sz[1]+'">'+(cells||'<div class="overlay-empty">입장한 참가자가 없습니다.</div>')+'</div>';
  };
  openFinalSpot=function(id){
    var rr=rows(state.data||{}),r=rr.find(function(x){return x.id===id;});
    if(!r||!published(r))return;
    focusSpot=id;originalOpenFinalSpot(id);
  };
  function renderExtraOverlay(kind){
    var o=document.getElementById('overlay'),title=o&&o.querySelector('.overlay-title'),body=o&&o.querySelector('.overlay-body');
    if(!o||!title||!body)return;
    if(kind==='mood'){title.innerHTML='<div class="kicker">FAMOUS PEOPLE SEL · 전체 무드미터</div><h2>우리의 마음 지도</h2><p>장면을 바꾸거나 이름 표시 여부를 전환할 수 있습니다.</p>';body.innerHTML=moodHTML();document.getElementById('selMoodScope').value=moodScope;document.getElementById('selMoodScope').onchange=function(e){moodScope=e.target.value;openOverlay('mood');};document.getElementById('selMoodNames').onclick=function(){moodShowNames=!moodShowNames;openOverlay('mood');};}
    else if(kind==='answers'){title.innerHTML='<div class="kicker">FAMOUS PEOPLE SEL · 응답 분석</div><h2>항목별 응답 현황</h2><p>각 항목의 인원, 닉네임, 직접 입력한 이유·행동을 확인합니다.</p>';body.innerHTML=answerHTML();document.getElementById('selAnswerField').value=answerField;document.getElementById('selAnswerField').onchange=function(e){answerField=e.target.value;openOverlay('answers');};}
    else if(kind==='students'){title.innerHTML='<div class="kicker">FAMOUS PEOPLE SEL · 진도 관리</div><h2>학생별 완료율과 미완료 현황</h2><p>입장한 참가자의 전체 과정 진행률을 한눈에 확인합니다.</p>';body.innerHTML=peopleProgress(state.data||{});}
    else if(kind.indexOf('m1:')===0||kind.indexOf('m2:')===0){var first=kind.indexOf('m1:')===0;var all=norm((state.data||{}).groups&&(state.data||{}).groups[first?'dialogue1':'dialogue2']);var i=all.findIndex(function(g){return g.id===kind.split(':')[1];});title.innerHTML='<div class="kicker">FAMOUS PEOPLE SEL · 모둠 확대</div><h2>'+(first?'첫 번째':'두 번째')+' 만남 · 모둠 '+(i+1)+'</h2><p>프로젝터에 해당 모둠만 표시합니다.</p>';body.innerHTML=groupedOneHTML(kind);}
  }
  openOverlay=function(kind){
    var hadSpot=kind==='final'&&!!document.getElementById('finalSpot');
    // Use the original overlay frame, preserving its fullscreen and close controls.
    var originalKind=(kind==='mood'||kind==='answers'||kind==='students'||kind.indexOf('m1:')===0||kind.indexOf('m2:')===0)?'m1':kind;
    originalOpenOverlay(originalKind);
    state.present=kind;
    if(originalKind!==kind)renderExtraOverlay(kind);
    if(kind==='m1'||kind==='m2'){
      var key=kind==='m1'?'dialogue1':'dialogue2',gg=norm((state.data||{}).groups&&(state.data||{}).groups[key]);
      var cards=document.querySelectorAll('#overlay .group-card');
      cards.forEach(function(card,i){if(!gg[i])return;var b=document.createElement('button');b.className='btn soft sel-group-zoom';b.type='button';b.textContent='이 모둠만 크게';b.onclick=function(){openOverlay(kind+':'+gg[i].id);};card.appendChild(b);});
    }
    if(kind==='final'){
      if(hadSpot&&focusSpot)openFinalSpot(focusSpot);
      else focusSpot=null;
    }
  };
  renderDashboard=function(){
    originalDashboard();
    var presentbar=app.querySelector('.presentbar');
    if(!presentbar)return;
    var actions=document.createElement('div');
    actions.className='sel-added-actions';
    actions.innerHTML='<button type="button" class="btn soft" data-sel-overlay="mood">전체 무드미터</button><button type="button" class="btn soft" data-sel-overlay="answers">항목별 응답·직접 입력</button><button type="button" class="btn soft" data-sel-overlay="students">학생별 완료율</button>';
    presentbar.appendChild(actions);
    actions.querySelectorAll('[data-sel-overlay]').forEach(function(b){b.onclick=function(){openOverlay(b.dataset.selOverlay);};});
    var panel=document.createElement('details');
    panel.className='panel sel-progress-panel';
    panel.innerHTML='<summary>학생별 진행 현황 <span>완료 '+rows(state.data||{}).filter(finished).length+'명 / 전체 '+rows(state.data||{}).length+'명 · 펼쳐서 확인</span></summary>'+peopleProgress(state.data||{});
    presentbar.insertAdjacentElement('afterend',panel);
    // The existing final-board button is available at every stage; it is
    // intentionally independent of when the life phase begins.
  };
  var css=String.raw` .sel-added-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.sel-progress-panel{padding:10px 16px;margin-bottom:14px}
.sel-progress-panel>summary{cursor:pointer;font-weight:950;font-size:16px;color:#35556a}
.sel-progress-panel>summary span{font-size:13px;font-weight:700;color:#697e84;margin-left:10px}
.sel-progress-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:14px 0 7px;flex-wrap:wrap}
.sel-progress-head h2{font-size:20px;margin:0}.sel-completion-totals{display:flex;gap:8px;flex-wrap:wrap}
.sel-completion-totals b{border-radius:9px;background:#eef4f2;padding:7px 10px;font-size:13px}
.sel-muted{font-size:12px;color:#718287;margin:0 0 10px;line-height:1.5}
.sel-student-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px;max-height:50vh;overflow:auto}
.sel-student{border:1px solid #d4e0df;background:#fff;border-radius:13px;padding:11px}
.sel-student.complete{background:#edf6e9}.sel-student-top{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:13px}
.sel-student-top b{margin-right:auto;font-size:15px}.sel-student-top strong{font-size:12px;border-radius:999px;background:#eef0f0;padding:3px 8px}
.sel-student.complete .sel-student-top strong{background:#d0e8c7;color:#37623a}
.sel-track{height:9px;background:#e5eeed;border-radius:20px;margin-top:8px;overflow:hidden}.sel-track i{height:100%;background:#719bb0;display:block;border-radius:20px}
.sel-student.complete .sel-track i{background:#73ad70}
.sel-tools{display:flex;align-items:center;flex-wrap:wrap;gap:12px;background:#fff;border:1px solid #d5e2e3;padding:13px;border-radius:14px;margin-bottom:14px}
.sel-tools label{display:flex;align-items:center;gap:8px;font-weight:900}.sel-tools select{max-width:min(66vw,340px);border:1.5px solid #a8c3c8;border-radius:9px;padding:9px;background:#fff;font:inherit;color:#35556a}
.sel-tools>span{color:#637b81;font-size:13px;font-weight:800}
.sel-answer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;align-content:start}
.sel-answer-card{background:#fff;border:1.5px solid #d4e0df;border-radius:16px;padding:14px}
.sel-answer-card header{display:flex;justify-content:space-between;gap:10px;align-items:start;border-bottom:1px dashed #c7d5d5;padding-bottom:10px;font-size:18px}
.sel-answer-card header span{color:#c46e5c;font-weight:950;white-space:nowrap}
.sel-answer-people{display:grid;gap:7px;margin-top:10px}.sel-answer-person{background:#f5f8f8;padding:8px 11px;border-radius:10px}
.sel-answer-person b{font-size:14px}.sel-direct-answer{margin:5px 0 0;color:#3a5869;line-height:1.5;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
.sel-mood-layout{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(240px,.7fr);height:min(100%,790px);gap:17px;align-items:stretch}
.sel-mood-frame{display:grid;grid-template-columns:70px minmax(0,1fr) 80px;grid-template-rows:28px minmax(0,1fr) 28px;justify-items:center;align-items:center;min-height:0}
.sel-axis{font-size:16px;white-space:nowrap;color:#35556a}.sel-top{grid-column:2;grid-row:1}.sel-left{grid-column:1;grid-row:2}.sel-right{grid-column:3;grid-row:2}.sel-bottom{grid-column:2;grid-row:3}
.sel-mood-map{grid-column:2;grid-row:2;position:relative;width:min(100%,min(64vh,680px));aspect-ratio:1;max-height:100%;border:2px solid #35556a;border-radius:9px;background:linear-gradient(135deg,#9f002b,#ff5b08) left top/50% 50% no-repeat,linear-gradient(120deg,#fff13d,#ff9800) right top/50% 50% no-repeat,linear-gradient(135deg,#2d197f,#04a9df) left bottom/50% 50% no-repeat,linear-gradient(120deg,#9cdd16,#008d2e) right bottom/50% 50% no-repeat,#fff}
.sel-mood-map:before,.sel-mood-map:after{content:"";pointer-events:none;position:absolute;z-index:1;background:#fff}.sel-mood-map:before{width:2px;top:0;bottom:0;left:50%}.sel-mood-map:after{height:2px;left:0;right:0;top:50%}
.sel-mood-dot{position:absolute;z-index:2;transform:translate(-50%,-50%);width:15px;height:15px;border:2px solid white;border-radius:50%;background:#233b4c;box-shadow:0 1px 5px #0007;color:#fff;font-size:0}
.sel-mood-dot.named{width:auto;min-width:35px;max-width:105px;height:auto;padding:3px 6px;font-size:12px;line-height:1.1;font-weight:900;border-radius:999px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sel-quads{background:#fff;border:1px solid #d4e0df;border-radius:18px;padding:18px;overflow:auto}.sel-quads h3{font-size:23px;margin:0 0 18px}
.sel-quad{display:flex;justify-content:space-between;gap:8px;align-items:center;border-radius:12px;margin:8px 0;padding:14px;font-size:14px}
.sel-quad strong{font-size:24px}.sel-quad.q0{background:#f6d8d6}.sel-quad.q1{background:#fff0b6}.sel-quad.q2{background:#dbdef8}.sel-quad.q3{background:#e1f4d1}.sel-quads p{font-size:12px;line-height:1.5;color:#6a7e83}
.sel-single-group{height:100%;max-width:1280px;margin:auto;border:3px solid #cbd8d9;border-radius:25px;background:#fff;padding:30px;display:flex;flex-direction:column}
.sel-single-group>p{font-size:clamp(22px,2.5vw,37px);font-weight:900;margin:0 0 22px}
.sel-single-names{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:17px;flex:1;align-content:stretch}
.sel-single-names>div{border-radius:20px;background:#e8f2e9;border:2px solid #c9ddc8;display:grid;place-content:center;text-align:center;padding:20px;font-size:clamp(24px,3.3vw,55px);font-weight:950}
.sel-single-names small{display:block;font-size:.45em;margin-top:12px;color:#65818b}
.sel-group-zoom{margin-top:auto;align-self:flex-end;font-size:13px!important;min-height:37px!important}
.sel-final-grid{height:calc(100% - 63px)!important;grid-template-columns:repeat(var(--cols),minmax(0,1fr))!important;grid-template-rows:repeat(var(--rows),minmax(0,1fr))!important}
.sel-final-grid .final-card{padding:clamp(5px,.65vw,12px);border-radius:13px;min-height:0}
.sel-final-grid .final-card .who{font-size:clamp(11px,.9vw,15px);margin-bottom:3px}
.sel-final-grid .final-card .txt{font-size:var(--cellfont)!important;line-height:1.21;display:block;-webkit-line-clamp:unset;overflow:auto;overflow-wrap:anywhere;white-space:pre-wrap;flex:1;min-height:0}
.sel-empty-reflection{opacity:.76;align-items:center;justify-content:center;text-align:center;border-style:dashed!important;background:#f5f6f2!important}
.sel-empty-reflection span{font-size:clamp(11px,1vw,17px);color:#7a8b89}
@media(max-width:960px){.sel-mood-layout{grid-template-columns:1fr;height:auto}.sel-mood-frame{max-height:70vh}.sel-quads{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sel-quads h3,.sel-quads p{grid-column:1/-1;margin:0}.sel-quad{padding:8px;font-size:12px}.sel-quad strong{font-size:18px}.sel-mood-frame{grid-template-columns:50px minmax(0,1fr) 62px}.sel-axis{font-size:12px}}
@media(max-width:660px){.sel-progress-panel>summary span{display:block;margin:4px 0 0}.sel-single-names{grid-template-columns:1fr 1fr}.sel-single-names>div{font-size:clamp(17px,5vw,28px);padding:12px}.sel-mood-frame{grid-template-columns:48px minmax(0,1fr) 58px}.sel-final-grid{gap:4px!important}.sel-final-grid .final-card .txt{font-size:clamp(9px,var(--cellfont),14px)!important}}`;
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
})();
