(async function(){
  APP.renderShell('reports.html', 'Reports', 'Attendance percentage by student, class and subject');
  const page = document.getElementById('page-content');
  page.innerHTML = `<div class="empty"><p>Loading…</p></div>`;

  const [students, subjectsObj] = await Promise.all([APP.getStudents(), APP.getSubjects()]);
  const levels = Object.keys(subjectsObj);
  const flatSubs = APP.subjectsFlat(subjectsObj);

  function firstCourseFor(level){
    return APP.isBTECLevel(level) ? Object.keys(subjectsObj[level])[0] : null;
  }

  const state = { level: levels[0]||'', course: '', subjectId: 'all', sortBy: 'pct', sortDir: 'asc' };
  state.course = firstCourseFor(state.level);

  let currentRows = [];
  const attCache = {};
  async function getAtt(id){
    if(!attCache[id]) attCache[id] = await APP.getAttendance(id);
    return attCache[id];
  }

  render();

  async function render(){
    const isBTEC = APP.isBTECLevel(state.level);
    const courses = isBTEC ? Object.keys(subjectsObj[state.level]) : [];
    const subs = APP.getSubjectsFor(subjectsObj, state.level, state.course);

    page.innerHTML = `
      <div class="card">
        <div class="control-row">
          <div class="field">
            <label>Level</label>
            <select id="f-level">${levels.map(l=>`<option value="${l}" ${l===state.level?'selected':''}>${l}</option>`).join('')}</select>
          </div>
          ${isBTEC ? `
            <div class="field">
              <label>Course</label>
              <select id="f-course">${courses.map(c=>`<option value="${c}" ${c===state.course?'selected':''}>${c}</option>`).join('')}</select>
            </div>
          ` : ''}
          <div class="field">
            <label>Subject</label>
            <select id="f-subject">
              <option value="all">All subjects (one row each)</option>
              ${subs.map(s=>`<option value="${s.id}" ${s.id===state.subjectId?'selected':''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <button class="btn" id="export-csv">${APP.ICONS.reports} Export CSV</button>
        </div>
      </div>
      <div id="report-zone"></div>
    `;

    document.getElementById('f-level').addEventListener('change', e => {
      state.level = e.target.value;
      state.course = firstCourseFor(state.level);
      state.subjectId = 'all';
      render();
    });
    const courseSel = document.getElementById('f-course');
    if(courseSel) courseSel.addEventListener('change', e => {
      state.course = e.target.value; state.subjectId = 'all'; render();
    });
    document.getElementById('f-subject').addEventListener('change', e => {
      state.subjectId = e.target.value; renderTable();
    });
    document.getElementById('export-csv').addEventListener('click', exportCsv);

    await renderTable();
  }

  // One row per (student, subject) — plus a blended "overall" % computed across
  // every subject that student is enrolled in (not just the ones shown here).
  async function computeRows(){
    const isBTEC = APP.isBTECLevel(state.level);
    const roster = students.filter(s => {
      if(s.level !== state.level) return false;
      if(isBTEC && s.course !== state.course) return false;
      return true;
    });

    const rows = [];
    for(const st of roster){
      const enrolled = APP.getEnrolledSubjects(st, flatSubs);
      let totalP = 0, totalA = 0;
      const subjectStats = [];
      for(const sub of enrolled){
        const att = await getAtt(sub.id);
        const stats = APP.subjectStatsForStudent(att.records, st.id);
        totalP += stats.p; totalA += stats.a;
        subjectStats.push({ sub, stats });
      }
      const overallTotal = totalP + totalA;
      const overallPct = overallTotal > 0 ? Math.round((totalP/overallTotal)*100) : null;

      const relevant = state.subjectId === 'all'
        ? subjectStats
        : subjectStats.filter(x => x.sub.id === state.subjectId);

      relevant.forEach(({ sub, stats }) => {
        rows.push({ student: st, subject: sub, p: stats.p, a: stats.a, l: stats.l, pct: stats.pct, overallPct });
      });
    }
    return rows;
  }

  async function renderTable(){
    const zone = document.getElementById('report-zone');
    zone.innerHTML = `<div class="card"><p class="muted">Crunching numbers…</p></div>`;
    currentRows = await computeRows();

    if(currentRows.length === 0){
      zone.innerHTML = `<div class="card"><div class="empty">${APP.ICONS.empty}<h3>Nothing to show</h3><p>No students enrolled in this level/course/subject combination yet.</p></div></div>`;
      return;
    }

    const sorted = [...currentRows].sort((a,b) => {
      let av, bv;
      if(state.sortBy === 'name'){ av=a.student.name; bv=b.student.name; }
      else if(state.sortBy === 'subject'){ av=a.subject.name; bv=b.subject.name; }
      else if(state.sortBy === 'overallPct'){ av = a.overallPct ?? -1; bv = b.overallPct ?? -1; }
      else{ av = a[state.sortBy] ?? -1; bv = b[state.sortBy] ?? -1; }
      if(av < bv) return state.sortDir === 'asc' ? -1 : 1;
      if(av > bv) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const withData = currentRows.filter(r=>r.pct!==null);
    const avgPct = withData.length ? Math.round(withData.reduce((s,r)=>s+r.pct,0)/withData.length) : null;

    zone.innerHTML = `
      <div class="stat-row" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat"><div class="stat__label">Rows shown</div><div class="stat__value">${currentRows.length}<small> · ${new Set(currentRows.map(r=>r.student.id)).size} students</small></div></div>
        <div class="stat stat--accent"><div class="stat__label">Subject average</div><div class="stat__value">${avgPct!==null?avgPct+'%':'—'}</div></div>
        <div class="stat stat--warn"><div class="stat__label">Below 75% (this subject)</div><div class="stat__value">${currentRows.filter(r=>r.pct!==null&&r.pct<75).length}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="sortable" data-sort="name" style="cursor:pointer;">Student ${sortArrow('name')}</th>
                <th class="sortable" data-sort="subject" style="cursor:pointer;">Subject ${sortArrow('subject')}</th>
                <th class="num sortable" data-sort="p" style="cursor:pointer;">Present ${sortArrow('p')}</th>
                <th class="num sortable" data-sort="a" style="cursor:pointer;">Absent ${sortArrow('a')}</th>
                <th class="num sortable" data-sort="l" style="cursor:pointer;">Leave ${sortArrow('l')}</th>
                <th class="num sortable" data-sort="pct" style="cursor:pointer;">Subject % ${sortArrow('pct')}</th>
                <th class="num sortable" data-sort="overallPct" style="cursor:pointer;">Overall % ${sortArrow('overallPct')}</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(r => `
                <tr class="row-link" data-open="${r.student.id}">
                  <td>
                    <div class="person-cell">
                      <span class="avatar">${APP.initials(r.student.name)}</span>
                      <div class="who"><strong>${APP.escapeHtml(r.student.name)}</strong><span>${r.student.id}</span></div>
                    </div>
                  </td>
                  <td>${APP.escapeHtml(r.subject.name)}</td>
                  <td class="num">${r.p}</td>
                  <td class="num">${r.a}</td>
                  <td class="num">${r.l}</td>
                  <td class="num">
                    ${r.pct===null ? '<span class="muted">No data</span>' : `
                      <span class="bar"><span class="bar__fill ${APP.pctClass(r.pct)}" style="width:${r.pct}%;"></span></span>
                      <span class="pct ${APP.pctClass(r.pct)}" style="margin-left:8px;">${r.pct}%</span>
                    `}
                  </td>
                  <td class="num">${r.overallPct===null ? '<span class="muted">—</span>' : `<span class="pct ${APP.pctClass(r.overallPct)}">${r.overallPct}%</span>`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    zone.querySelectorAll('[data-sort]').forEach(th => th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if(state.sortBy === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortBy = key; state.sortDir = 'asc'; }
      renderTable();
    }));
    zone.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => APP.openProfileModal(el.dataset.open)));
  }

  function sortArrow(key){
    if(state.sortBy !== key) return '';
    return state.sortDir === 'asc' ? '↑' : '↓';
  }

  function exportCsv(){
    const rows = [['Registration No','Name','Level','Course/Section','Subject','Present','Absent','Leave','Subject %','Overall %']];
    currentRows.forEach(r => rows.push([
      r.student.id, r.student.name, r.student.level,
      r.student.course || (r.student.section ? 'Section ' + r.student.section : ''),
      r.subject.name, r.p, r.a, r.l, r.pct ?? '', r.overallPct ?? ''
    ]));
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${state.level}_${state.course||'all'}_${APP.todayISO()}.csv`;
    a.click();
  }
})();
