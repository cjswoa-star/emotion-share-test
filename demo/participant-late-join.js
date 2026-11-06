/* Preserve current group state when a participant joins mid-workshop. */
(function applyLateJoinRecovery() {
  'use strict';
  const priorEnsure = ensure;
  const priorSaveNick = saveNick;
  const priorRoute = routeParticipant;
  const priorSelect = renderSelect;
  const stageNames = {collecting:'일곱 장면 탐색',selecting:'더 깊게 볼 장면 선택',dialogue1:'첫 번째 모둠 만남',deep:'마음 깊이 보기',dialogue2:'두 번째 모둠 만남',life:'마무리 활동'};
  let phaseStop = null, watchingCode = '', lastPhase = null;
  const nowMeta = () => get('sessions/' + state.sessionId + '/meta');
  const participantPath = () => 'sessions/' + state.sessionId + '/participants/' + state.participantId;
  const validScene = id => SCENES.some(s => s.id === id);

  function inference(record,meta) {
    if (record?.lateEntryPhase) return record.lateEntryPhase;
    const joined = Number(record?.joinedAt || 0);
    if (!joined) return '';
    if (meta?.dialogue2GeneratedAt && joined > meta.dialogue2GeneratedAt) return 'dialogue2';
    if (meta?.dialogue1GeneratedAt && joined > meta.dialogue1GeneratedAt) return 'dialogue1';
    if (meta?.selectionOpenedAt && joined > meta.selectionOpenedAt) return 'selecting';
    if (meta?.scenesStartedAt && joined > meta.scenesStartedAt) return 'collecting';
    return '';
  }

  function watchLatePhase() {
    if (!state.lateEntryPhase) return;
    if (phaseStop && watchingCode === state.sessionId) return;
    phaseStop?.();
    watchingCode = state.sessionId;
    lastPhase = null;
    phaseStop = listen('sessions/' + state.sessionId + '/meta', m => {
      if (!m?.phase) return;
      if (lastPhase === null) {
        lastPhase = m.phase;
        return;
      }
      if (m.phase === lastPhase) return;
      lastPhase = m.phase;
      routeParticipant().catch(showConnectionError);
    });
  }

  ensure = async function () {
    await priorEnsure();
    const record = await get(participantPath()) || {};
    const meta = await nowMeta() || {};
    const late = inference(record,meta);
    state.lateEntryPhase = late;
    if (late && !record.lateEntryPhase) {
      await upd(participantPath(), {lateEntryPhase:late});
    }
    watchLatePhase();
  };

  saveNick = async function (nickname) {
    const existing = await get(participantPath()) || {};
    const meta = await nowMeta() || {};
    await priorSaveNick(nickname);
    const late = inference(existing,meta) || (
      !existing.nickname && meta.phase && meta.phase !== 'waiting' ? meta.phase : ''
    );
    if (late) {
      state.lateEntryPhase = late;
      await upd(participantPath(), {lateEntryPhase:late});
      watchLatePhase();
    }
  };

  // Transaction preserves existing groups; a late attendee is appended only, never
  // triggers group regeneration. Groups with capacity are preferred.
  async function joinExistingGroup(round,sceneId) {
    const kind = round === 1 ? 'dialogue1' : 'dialogue2';
    const meta = await nowMeta() || {};
    if (meta.phase !== kind || !meta[kind + 'Open']) return;
    const path = 'sessions/' + state.sessionId + '/groups/' + kind;
    if (typeof F?.runTransaction !== 'function') {
      throw new Error('실시간 모둠 배치 기능을 사용할 수 없습니다. 진행자에게 알려 주세요.');
    }
    const ref = F.ref(db,path);
    const tx = await F.runTransaction(ref, raw => {
      if (!raw || !Object.keys(raw).length) return;
      if (Object.values(raw).some(g => (g?.members || []).includes(state.participantId))) return;
      const groups = JSON.parse(JSON.stringify(raw));
      const entries = Object.entries(groups);
      const open = entries.filter(([,g]) => (g.members || []).length < 5);
      let chosen;
      if (round === 1) {
        const matching = open.filter(([,g]) => g.sceneId === sceneId);
        chosen = (matching.length ? matching : open).sort((a,b) => a[1].members.length-b[1].members.length)[0];
      } else {
        const mixed = open.filter(([,g]) => !(g.sceneIds||[]).includes(sceneId));
        chosen = (mixed.length ? mixed : open).sort((a,b) => a[1].members.length-b[1].members.length)[0];
      }
      if (chosen) {
        const [id,g] = chosen;
        g.members = [...(g.members || []),state.participantId];
        const scenes = new Set([...(g.sceneIds||[]),sceneId]);
        g.sceneIds = [...scenes];
        g.mixed = scenes.size > 1;
        if (round===1 && g.sceneId !== sceneId) {
          g.lateJoinMixed = true;
        }
        groups[id]=g;
      } else {
        const next = 'g' + String(Math.max(0,...entries.map(([id]) => parseInt(id.replace(/\D/g,''),10)||0))+1).padStart(2,'0');
        groups[next] = round===1
          ? {sceneId,members:[state.participantId],createdAt:Date.now(),lateJoin:true}
          : {mode:'mixedScenes',members:[state.participantId],sceneIds:[sceneId],createdAt:Date.now(),lateJoin:true};
      }
      return groups;
    },{applyLocally:false});
    if (!tx.committed) {
      const current = await get(path)||{};
      if (!Object.values(current).some(g => (g?.members||[]).includes(state.participantId))) {
        throw new Error('모둠 합류를 완료하지 못했습니다. 진행자에게 알려 주세요.');
      }
    }
  }

  function stageNotice(title,description) {
    app.innerHTML = shell(`
      <div class="release-panel waiting-room late-join-screen">
        <div class="kicker">중도 입장 · 현재 활동 합류</div>
        <h1>${esc(state.nickname)}님,<br>${esc(title)}</h1>
        <p>${esc(description)}</p>
        <p class="small">앞선 활동을 다시 진행하지 않아도 됩니다. 이미 작성한 응답은 보존됩니다.</p>
        <button class="btn orange" id="lateProceed" style="width:100%;margin-top:18px">현재 단계로 참여하기</button>
      </div>`);
  }

  async function quickChooser(phase) {
    state.unsub?.();
    state.unsub = null;
    const isMeeting = phase === 'dialogue1' || phase === 'dialogue2';
    const isDeep = phase === 'deep';
    app.innerHTML = shell(`
      <div class="release-panel late-focus-screen">
        <div class="kicker">중도 입장 · ${esc(stageNames[phase] || '현재 활동')}</div>
        <h1>조금 더 돌아보고 싶은 장면을 골라 주세요.</h1>
        <p>늦게 참여해도 괜찮습니다. 과정드라마 속 일곱 순간 중 기억나는 장면 하나를 선택해 주세요.</p>
        <p class="small">${isMeeting ? '장면을 고르면 진행 중인 모둠으로 연결됩니다.' : isDeep ? '장면을 고르면 마음 깊이 보기를 시작합니다.' : '장면을 고른 뒤 모둠 활동을 기다립니다.'}</p>
      </div>
      <div class="scene-grid late-focus-grid">${SCENES.map(s => `<button type="button" class="scene-card" data-late-focus="${esc(s.id)}"><span class="num">${s.n}</span><span class="title">${esc(s.title)}</span></button>`).join('')}</div>`);
    app.querySelectorAll('[data-late-focus]').forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const live = await nowMeta() || {};
          if (live.phase !== phase) {
            await routeParticipant();
            return;
          }
          const sceneId = btn.dataset.lateFocus;
          if (!validScene(sceneId)) throw new Error('장면 선택을 확인해 주세요.');
          await saveFocus(sceneId);
          if (phase === 'dialogue1') await joinExistingGroup(1,sceneId);
          if (phase === 'dialogue2') await joinExistingGroup(2,sceneId);
          if (phase === 'deep') {
            return renderEmotion();
          }
          if (phase === 'dialogue2') return renderMeeting2();
          return renderMeeting1();
        } catch(e) {
          showConnectionError(e);
          if (btn.isConnected) btn.disabled = false;
        }
      };
    });
    qa();
  }

  function lastActivity() {
    if (state.finalReflection?.completedAt) return renderComplete();
    const d = state.deepDive || {};
    if (!state.focusScene) return renderLateReflection();
    if (!d.lifeLink) return renderLife();
    if (!d.nextAction) return renderNextAction();
    return renderSummary();
  }

  function renderLateReflection() {
    renderReflection();
    const back=app.querySelector('[data-back]');
    if (back) {back.onclick=null;back.disabled=true;back.style.visibility='hidden';}
    const helper=app.querySelector('.reflection-helper');
    if (helper) helper.textContent='늦게 합류하셨더라도 오늘 경험한 활동이나 다른 사람의 이야기에서 느낀 점을 자유롭게 적어 보세요.';
  }

  routeParticipant = async function () {
    if (!state.nickname || !state.lateEntryPhase || reviewMode || debugMode) return priorRoute();
    const meta = await nowMeta() || {};
    const phase = meta.phase;
    if (phase === 'waiting') return priorRoute();
    if (phase === 'collecting') return priorRoute();
    if (phase === 'selecting' && !state.focusScene) return quickChooser(phase);
    if (phase === 'selecting') return renderMeeting1();
    if (phase === 'dialogue1' && !state.focusScene) return quickChooser(phase);
    if (phase === 'dialogue1') {
      await joinExistingGroup(1,state.focusScene);
      return renderMeeting1();
    }
    if (phase === 'deep' && !state.focusScene) return quickChooser(phase);
    if (phase === 'deep') return resumeDeep();
    if (phase === 'dialogue2' && !state.focusScene) return quickChooser(phase);
    if (phase === 'dialogue2') {
      await joinExistingGroup(2,state.focusScene);
      return renderMeeting2();
    }
    if (phase === 'life' || phase === 'reflection') return lastActivity();
    return priorRoute();
  };

  renderSelect = async function () {
    const meta = await nowMeta() || {};
    if (state.lateEntryPhase && !SCENES.every(s => state.checkpoints[s.id]) &&
        ['selecting','dialogue1','deep','dialogue2'].includes(meta.phase)) {
      if (meta.phase==='selecting'||!state.focusScene) return quickChooser(meta.phase);
    }
    return priorSelect();
  };

  // When a late attendee finishes the deep dive after the second meeting has
  // already started, add them to the existing second group without resetting it.
  const originalMeeting2=renderMeeting2;
  renderMeeting2=function(){
    originalMeeting2();
    if (state.lateEntryPhase) {
      joinExistingGroup(2,state.focusScene).catch(showConnectionError);
    }
  };

  if(window.__FPSEL__) window.__FPSEL__.routeParticipant=(...a)=>routeParticipant(...a);
})();
