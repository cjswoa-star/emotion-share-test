/* Auto-seat late arrivals using the presenter board's rights. */
(function installPresenterLatePlacement() {
  'use strict';
  const previousRender = renderDashboard;
  let pending = false, busy = false;
  const groupsFor = phase => phase === 'dialogue1' ? 'dialogue1' : 'dialogue2';

  function missing(data) {
    const phase = data?.meta?.phase;
    if (!['dialogue1','dialogue2'].includes(phase)) return [];
    const current = data?.groups?.[groupsFor(phase)] || {};
    const override = phase === 'dialogue1' ? data?.meta?.forceDialogue1At : data?.meta?.forceDialogue2At;
    if (!Object.keys(current).length && !override) return [];
    const assigned = new Set(Object.values(current).flatMap(g => g.members || []));
    return Object.entries(data?.participants || {})
      .filter(([id,p]) => !!p?.focusScene && !assigned.has(id) && (p?.lateEntryPhase || override))
      .map(([id,p]) => ({id,sceneId:p.focusScene,nickname:p.nickname}));
  }

  function append(groups,entry,phase) {
    const options = Object.entries(groups).filter(([,g]) => (g.members || []).length < 8);
    let best;
    if (phase === 'dialogue1') {
      const same = options.filter(([,g]) => g.sceneId === entry.sceneId);
      best = same.sort((a,b)=>a[1].members.length-b[1].members.length)[0]; // never mix different scenes automatically in first meeting
    } else {
      const different = options.filter(([,g])=>!(g.sceneIds||[]).includes(entry.sceneId));
      best = (different.length ? different : options).sort((a,b)=>a[1].members.length-b[1].members.length)[0];
    }
    if (best) {
      const [id,g] = best;
      g.members = [...(g.members||[]),entry.id];
      const all = new Set([...(g.sceneIds||[]),g.sceneId,entry.sceneId].filter(Boolean));
      g.sceneIds = [...all];
      g.mixed = all.size > 1;
      if (phase==='dialogue1'&&g.sceneId!==entry.sceneId) g.lateJoinMixed = true;
      groups[id]=g;
    } else {
      const ids = Object.keys(groups).map(id=>Number(id.replace(/[^0-9]/g,''))||0);
      const newId='g'+String(Math.max(0,...ids)+1).padStart(2,'0');
      groups[newId]=phase==='dialogue1'
        ? {sceneId:entry.sceneId,sceneIds:[entry.sceneId],members:[entry.id],createdAt:Date.now(),lateJoin:true}
        : {mode:'mixedScenes',sceneIds:[entry.sceneId],members:[entry.id],createdAt:Date.now(),lateJoin:true};
    }
  }

  async function reconcile() {
    if (busy || !state.sessionId) return;
    busy = true;
    const code = state.sessionId;
    try {
      const data = await get('sessions/'+code) || {};
      if (code !== state.sessionId) return;
      const phase = data.meta?.phase;
      if (!['dialogue1','dialogue2'].includes(phase)) return;
      const kind = groupsFor(phase);
      const source = data.groups?.[kind] || {};
      const override = phase === 'dialogue1' ? data.meta?.forceDialogue1At : data.meta?.forceDialogue2At;
      if (!Object.keys(source).length && !override) return;
      const incoming = missing(data);
      if (!incoming.length) return;
      const groups = JSON.parse(JSON.stringify(source));
      incoming.forEach(p=>append(groups,p,phase));
      // The presenter's Firebase credentials are used, not participant credentials.
      // Update only this round, preserving all existing groups and other data.
      if (code !== state.sessionId) return;
      await setv('sessions/'+code+'/groups/'+kind,groups);
      console.log('중도 참가자 모둠 배정 완료',incoming.map(p=>p.nickname).join(' · '));
    } catch (e) {
      console.error('중도 참가자 자동 모둠 배정 실패',e);
    } finally {
      busy = false;
    }
  }

  function schedule(data) {
    if (pending || !missing(data).length) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      reconcile().catch(console.error);
    },300);
  }

  renderDashboard = function () {
    previousRender();
    schedule(state.data);
  };
})();
