(async function(){
  APP.renderShell('attendance.html', 'Take Attendance', 'Pick a class, mark the roster, save');
  const page = document.getElementById('page-content');
  page.innerHTML = `<div class="empty"><p>Loading…</p></div>`;

  const [students, subjectsObj] = await Promise.all([APP.getStudents(), APP.getSubjects()]);
  const levels = Object.keys(subjectsObj);

  function firstCourseFor(level){
    return APP.isBTECLevel(level) ? Object.keys(subjectsObj[level])[0] : null;
  }
  function subjectsForState(level, course){
    return APP.getSubjectsFor(subjectsObj, level, course);
  }
  function showSectionFilter(level){
    return ['IG1', 'IG2'].includes(level);
  }

  let state = {
    level: levels[0] || '',
    course: '',
    section: 'all',
    subjectId: '',
    date: APP.todayISO(),
    marks: {} // studentId -> 'P'|'A'|'L'
  };
  state.course = firstCourseFor(state.level);
  const firstSubs = subjectsForState(state.level, state.course);
  state.subjectId = firstSubs[0] ? firstSubs[0].id : '';

  render();

  async function render(){
    const isBTEC = APP.isBTECLevel(state.level);
    const courses = isBTEC ? Object.keys(subjectsObj[state.level]) : [];
    const subs = subjectsForState(state.level, state.course);
    const withSection = showSectionFilter(state.level);

    page.innerHTML = `
      <div class="card">
        <div class="control-row">
          <div class="field">
            <label>Level</label>
            <select id="sel-level">
              ${levels.map(l => `<option value="${l}" ${l===state.level?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          ${isBTEC ? `
            <div class="field">
              <label>Course</label>
              <select id="sel-course">
                ${courses.map(c => `<option value="${c}" ${c===state.course?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${withSection ? `
            <div class="field">
              <label>Section</label>
              <select id="sel-section">
                <option value="all" ${state.section==='all'?'selected':''}>All sections</option>
                <option value="A" ${state.section==='A'?'selected':''}>Section A</option>
                <option value="B" ${state.section==='B'?'selected':''}>Section B</option>
              </select>
            </div>
          ` : ''}
          <div class="field">
            <label>Subject</label>
            <select id="sel-subject">
              ${subs.map(s => `<option value="${s.id}" ${s.id===state.subjectId?'selected':''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Class date</label>
            <input type="date" id="sel-date" value="${state.date}" max="${APP.todayISO()}">
          </div>
        </div>
      </div>
      <div id="roster-zone"></div>
    `;

    document.getElementById('sel-level').addEventListener('change', e => {
      state.level = e.target.value;
      state.course = firstCourseFor(state.level);
      state.section = showSectionFilter(state.level) ? 'all' : null;
      const s0 = subjectsForState(state.level, state.course);
      state.subjectId = s0[0] ? s0[0].id : '';
      render();
    });
    const courseSel = document.getElementById('sel-course');
    if(courseSel) courseSel.addEventListener('change', e => {
      state.course = e.target.value;
      const s0 = subjectsForState(state.level, state.course);
      state.subjectId = s0[0] ? s0[0].id : '';
      render();
    });
    const sectionSel = document.getElementById('sel-section');
    if(sectionSel) sectionSel.addEventListener('change', e => {
      state.section = e.target.value;
      renderRoster();
    });
    document.getElementById('sel-subject').addEventListener('change', e => {
      state.subjectId = e.target.value;
      renderRoster();
    });
    document.getElementById('sel-date').addEventListener('change', e => {
      state.date = e.target.value || APP.todayISO();
      renderRoster();
    });

    await renderRoster();
  }

  async function renderRoster(){
    const zone = document.getElementById('roster-zone');
    zone.innerHTML = `<div class="card"><p class="muted">Loading roster…</p></div>`;

    const roster = students.filter(s => {
      if(!(s.subjects||[]).includes(state.subjectId)) return false;
      if(state.section && state.section !== 'all' && s.section !== state.section) return false;
      return s.status !== 'Inactive';
    }).sort((a,b) => a.name.localeCompare(b.name));

    if(!state.subjectId){
      zone.innerHTML = `<div class="card"><div class="empty">${APP.ICONS.empty}<h3>No subject configured</h3><p>Add subjects for this level in Settings first.</p></div></div>`;
      return;
    }
    if(roster.length === 0){
      zone.innerHTML = `<div class="card"><div class="empty">${APP.ICONS.empty}<h3>No students enrolled</h3><p>No student has this subject in their enrolled subjects yet. Add or edit students from the Students page.</p></div></div>`;
      return;
    }

    const attData = await APP.getAttendance(state.subjectId);
    const existing = attData.records[state.date] || null;
    state.marks = {};
    roster.forEach(st => { state.marks[st.id] = existing ? (existing[st.id] || null) : null; });

    const photos = await APP.getPhotos();
    const subs = subjectsForState(state.level, state.course);
    const subjectName = (subs.find(s=>s.id===state.subjectId) || {}).name || '';

    zone.innerHTML = `
      <div class="card">
        <div class="card__head">
          <div>
            <h2>${APP.escapeHtml(subjectName)}</h2>
            <div class="card__sub">${state.level}${state.course ? ' · ' + state.course : ''}${state.section && state.section!=='all' ? ' · Section ' + state.section : ''} · ${APP.fmtDateLong(state.date)} ${existing ? ' · <span style="color:var(--gold); font-weight:600;">editing a previously saved sheet</span>' : ''}</div>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-sm" id="mark-all-present">${APP.ICONS.check} Mark all present</button>
          </div>
        </div>
        <div id="summary-strip" class="flex gap-14 wrap small muted" style="margin-bottom:14px;"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Status</th></tr></thead>
            <tbody id="roster-body">
              ${roster.map(st => rowHtml(st, photos)).join('')}
            </tbody>
          </table>
        </div>
        <div class="flex space-between" style="margin-top:16px;">
          <span class="small muted">Marks save to this browser instantly, and sync to GitHub if configured in Settings.</span>
          <button class="btn btn-primary" id="save-attendance">${APP.ICONS.check} Save attendance</button>
        </div>
      </div>
    `;

    updateSummary();

    document.getElementById('mark-all-present').addEventListener('click', () => {
      roster.forEach(st => setMark(st.id, 'P'));
    });
    document.getElementById('save-attendance').addEventListener('click', async () => {
      const unmarked = roster.filter(st => !state.marks[st.id]);
      if(unmarked.length){
        const proceed = confirm(unmarked.length + ' student(s) are not marked yet and will be left unmarked. Save anyway?');
        if(!proceed) return;
      }
      const data = await APP.getAttendance(state.subjectId);
      data.subjectName = subjectName;
      // Merge into the existing day record rather than replacing it outright, so
      // marking a filtered subset (e.g. just Section A) never wipes out marks that
      // were already saved for students outside the current filter.
      const dayRecord = { ...(data.records[state.date] || {}) };
      roster.forEach(st => {
        if(state.marks[st.id]) dayRecord[st.id] = state.marks[st.id];
        else delete dayRecord[st.id];
      });
      data.records[state.date] = dayRecord;
      APP.saveAttendance(state.subjectId, data);
      APP.logActivity(`Marked attendance — ${subjectName} (${state.level}${state.course ? ' ' + state.course : ''}) on ${state.date}`);
      APP.toast('Attendance saved for ' + APP.fmtDateShort(state.date), 'ok');
    });

    roster.forEach(st => {
      const cell = document.getElementById('marks-' + st.id);
      cell.querySelectorAll('.mark-btn').forEach(btn => {
        btn.addEventListener('click', () => setMark(st.id, btn.dataset.mark));
      });
    });
    zone.querySelectorAll('[data-open]').forEach(el => {
      el.addEventListener('click', () => APP.openProfileModal(el.dataset.open));
    });

    function setMark(id, mark){
      state.marks[id] = state.marks[id] === mark ? null : mark; // click again to unmark
      const cell = document.getElementById('marks-' + id);
      cell.querySelectorAll('.mark-btn').forEach(b => b.classList.toggle('active', state.marks[id] === b.dataset.mark));
      updateSummary();
    }
    function updateSummary(){
      const vals = Object.values(state.marks);
      const p = vals.filter(v=>v==='P').length;
      const a = vals.filter(v=>v==='A').length;
      const l = vals.filter(v=>v==='L').length;
      const u = roster.length - p - a - l;
      document.getElementById('summary-strip').innerHTML = `
        <span><strong style="color:var(--present)">${p}</strong> present</span>
        <span><strong style="color:var(--absent)">${a}</strong> absent</span>
        <span><strong style="color:var(--leave)">${l}</strong> leave</span>
        <span><strong>${u}</strong> unmarked</span>
      `;
    }
  }

  function rowHtml(st, photos){
    const photo = APP.photoFor(photos, st);
    const mark = state.marks[st.id];
    return `
      <tr>
        <td>
          <div class="person-cell">
            ${photo ? `<img class="avatar" src="${photo}" alt="">` : `<span class="avatar">${APP.initials(st.name)}</span>`}
            <div class="who">
              <strong class="row-link" data-open="${st.id}">${APP.escapeHtml(st.name)}</strong>
              <span>Sr. ${st.sr} · ${st.id}${st.section ? ' · Sec ' + st.section : ''}</span>
            </div>
          </div>
        </td>
        <td id="marks-${st.id}">
          <div class="mark-group">
            <button type="button" class="mark-btn p ${mark==='P'?'active':''}" data-mark="P">P</button>
            <button type="button" class="mark-btn a ${mark==='A'?'active':''}" data-mark="A">A</button>
            <button type="button" class="mark-btn l ${mark==='L'?'active':''}" data-mark="L">L</button>
          </div>
        </td>
      </tr>
    `;
  }
})();
