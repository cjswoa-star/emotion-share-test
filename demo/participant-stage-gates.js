/* Workshop 2026-11-07: staged scene selection and reselect until first group starts. */
(function installStageGates() {
  'use strict';
  if (typeof routeParticipant !== 'function' || typeof renderSelect !== 'function') {
    console.error('RAS stage gate: participant engine is not ready');
    return;
  }
  const originalWaiting = renderWaitingRoom;
  renderWaitingRoom = function () {
    originalWaiting();
    if (reviewMode) return;
    const panel = app.querySelector('.waiting-room');
    if (!panel) return;
    const intro = panel.querySelector('p');
    if (!intro) return;
    intro.textContent = '잠시 후 과정드라마의 대표적인 일곱 장면을 떠올리며 그때의 마음을 감정지도에 표시해 볼 거예요.';
    const next = document.createElement('p');
    next.textContent = '진행자가 활동을 시작하면 첫 장면으로 자동 이동합니다.';
    next.style.cssText = 'margin-top:12px;font-weight:700';
    intro.insertAdjacentElement('afterend', next);
  };

  const sessionMeta = () => get('sessions/' + state.sessionId + '/meta');
  const allScenesDone = () => SCENES.every(scene => !!state.checkpoints[scene.id]);
  let meetingGateUnsubscribe = null;
  function clearMeetingGate() {
    if (meetingGateUnsubscribe) {
      const stop = meetingGateUnsubscribe;
      meetingGateUnsubscribe = null;
      stop();
    }
  }
  function renderFocusSelectionWaiting() {
    clearMeetingGate();
    state.unsub?.();
    state.unsub = null;
    app.innerHTML = shell(`
      <div class="release-panel waiting-room focus-selection-waiting">
        <div class="kicker">일곱 장면의 마음 탐색 완료</div>
        <h1>${esc(state.nickname)}님,<br>잠시 기다려 주세요.</h1>
        <p>일곱 장면에서 느낀 마음을 모두 표시했습니다.</p>
        <p>잠시 후 그중 조금 더 깊게 돌아보고 싶은 장면을 한 가지 선택합니다.</p>
        <div class="waiting-symbol" aria-hidden="true">◷</div>
        <p>진행자가 장면 선택을 시작하면 다음 화면으로 자동 이동합니다.</p>
      </div>`);
    state.unsub = listen('sessions/' + state.sessionId + '/meta', meta => {
      if (!meta || meta.phase === 'collecting') return;
      const stop = state.unsub;
      state.unsub = null;
      stop?.();
      routeParticipant().catch(showConnectionError);
    });
    qa();
  }

  const previousRoute = routeParticipant;
  routeParticipant = async function () {
    const meta = await sessionMeta() || {};
    if (state.nickname && meta.phase === 'collecting' && allScenesDone()) {
      return renderFocusSelectionWaiting();
    }
    if (state.nickname && meta.phase === 'selecting') {
      if (state.focusScene) return renderMeeting1();
      if (allScenesDone()) return renderSelect();
    }
    return previousRoute();
  };

  const previousSelect = renderSelect;
  renderSelect = async function () {
    if (reviewMode || debugMode) return previousSelect();
    const meta = await sessionMeta() || {};
    if (meta.phase === 'collecting') return renderFocusSelectionWaiting();
    if (meta.phase !== 'selecting') return routeParticipant();
    if (!allScenesDone()) return routeParticipant();
    clearMeetingGate();
    state.unsub?.();
    state.unsub = null;
    previousSelect();
    const back = app.querySelector('[data-back]');
    if (back) {
      back.disabled = true;
      back.style.visibility = 'hidden';
      back.onclick = null;
    }
    const note = app.querySelector('.selection-note');
    if (note) {
      const msg = document.createElement('p');
      msg.textContent = '첫 번째 만남이 시작되기 전까지 장면을 다시 고를 수 있습니다. 이전 일곱 장면의 감정지도는 수정할 수 없습니다.';
      msg.style.cssText = 'font-size:14px;line-height:1.55;margin-top:10px;color:#607984';
      note.appendChild(msg);
      if (state.focusScene) {
        const cancel = document.createElement('button');
        cancel.id = 'returnMeetingWaiting';
        cancel.type = 'button';
        cancel.className = 'btn orange';
        cancel.style.cssText = 'width:100%;margin-top:15px';
        cancel.textContent = '바꾸지 않고 모둠 대기로 돌아가기';
        cancel.onclick = renderMeeting1;
        note.appendChild(cancel);
      }
    }
    app.querySelectorAll('[data-s]:not([disabled])').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          const live = await sessionMeta() || {};
          if (live.phase !== 'selecting') {
            await routeParticipant();
            return;
          }
          await saveFocus(button.dataset.s);
          renderMeeting1();
        } catch (e) {
          showConnectionError(e);
          if (button.isConnected) button.disabled = false;
        }
      };
    });
    qa();
  };

  const previousMeeting1 = renderMeeting1;
  renderMeeting1 = function () {
    clearMeetingGate();
    previousMeeting1();
    if (reviewMode || debugMode) return;
    const panel = app.querySelector('.meeting-card');
    if (!panel) return;
    const button = document.createElement('button');
    button.id = 'changeFocusScene';
    button.type = 'button';
    button.className = 'btn orange';
    button.textContent = '장면 다시 선택하기';
    button.hidden = true;
    button.style.cssText = 'width:100%;margin-top:15px';
    const lock = panel.querySelector('.waiting-lock');
    if (lock) lock.insertAdjacentElement('beforebegin', button);
    else panel.appendChild(button);
    button.onclick = async () => {
      button.disabled = true;
      try {
        const meta = await sessionMeta() || {};
        if (meta.phase !== 'selecting') {
          button.hidden = true;
          return;
        }
        clearMeetingGate();
        state.unsub?.();
        state.unsub = null;
        await renderSelect();
      } catch (e) {
        showConnectionError(e);
        if (button.isConnected) button.disabled = false;
      }
    };
    meetingGateUnsubscribe = listen('sessions/' + state.sessionId + '/meta', meta => {
      if (!button.isConnected) {
        clearMeetingGate();
        return;
      }
      const changeAllowed = meta?.phase === 'selecting' && !meta.dialogue1Open;
      button.hidden = !changeAllowed;
      button.disabled = !changeAllowed;
    });
  };
  if (window.__FPSEL__) {
    window.__FPSEL__.routeParticipant = (...args) => routeParticipant(...args);
  }
})();
