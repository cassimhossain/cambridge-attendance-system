(async function(){
  APP.renderShell('index.html', 'Dashboard', 'Overview of students, classes and attendance health');
  const page = document.getElementById('page-content');
  page.innerHTML = `<div class="empty"><p>Loading…</p></div>`;

  const [students, subjectsObj, photos] = await Promise.all([
    APP.getStudents(), APP.getSubjects(), APP.getPhotos()
  ]);
  const subjects = APP.subjectsFlat(subjectsObj);
  const attendanceBySubject = {};
  await Promise.all(subjects.map(async sub => { attendanceBySubject[sub.id] = await APP.getAttendance(sub.id); }));

  const today = APP.todayISO();
  let classesToday = 0;
  subjects.forEach(sub => {
    const rec = attendanceBySubject[sub.id].records[today];
    if(rec && Object.keys(rec).length) classesToday++;
  });

  const activeStudents = students.filter(s => s.status !== 'Inactive');

  // One entry per (student, subject) they're enrolled in — the new per-subject granularity.
  const subjectRows = [];
  activeStudents.forEach(st => {
    const enrolled = APP.getEnrolledSubjects(st, subjects);
    enrolled.forEach(sub => {
      const stats = APP.subjectStatsForStudent(attendanceBySubject[sub.id].records, st.id);
      if(stats.pct !== null) subjectRows.push({ student: st, subject: sub, ...stats });
    });
  });

  const avgPct = subjectRows.length ? Math.round(subjectRows.reduce((s,r)=>s+r.pct,0)/subjectRows.length) : null;
  const lowAttendance = [...subjectRows].filter(r => r.pct < 75).sort((a,b)=>a.pct-b.pct).slice(0,8);

  const activity = APP.getActivity();

  page.innerHTML = `
    <div class="stat-row">
      <div class="stat">
        <div class="stat__label">Total students</div>
        <div class="stat__value">${activeStudents.length}</div>
      </div>
      <div class="stat stat--accent">
        <div class="stat__label">Average attendance</div>
        <div class="stat__value">${avgPct !== null ? avgPct + '%' : '—'} ${avgPct !== null ? '' : '<small>no data yet</small>'}</div>
        <div class="stat__label" style="margin-top:4px; font-weight:400;">across every student-subject</div>
      </div>
      <div class="stat">
        <div class="stat__label">Classes marked today</div>
        <div class="stat__value">${classesToday}<small> / ${subjects.length}</small></div>
      </div>
      <div class="stat stat--warn">
        <div class="stat__label">Below 75% (subject-level)</div>
        <div class="stat__value">${subjectRows.filter(r=>r.pct<75).length}</div>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <div>
          <h2>Quick actions</h2>
          <div class="card__sub">Jump straight into today's work</div>
        </div>
      </div>
      <div class="flex gap-10 wrap">
        <a class="btn btn-primary" href="attendance.html">${APP.ICONS.attendance} Mark today's attendance</a>
        <a class="btn" href="students.html">${APP.ICONS.plus} Add a student</a>
        <a class="btn" href="reports.html">${APP.ICONS.reports} View reports</a>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <div>
          <h2>Subjects to watch</h2>
          <div class="card__sub">Specific student-subject combinations below 75% (excused leave not counted against them)</div>
        </div>
        <a class="btn btn-sm" href="reports.html">See full report</a>
      </div>
      ${lowAttendance.length === 0 ? `
        <div class="empty" style="padding:24px 0;">
          <p>${subjectRows.length === 0 ? 'No attendance recorded yet — mark a class to see this list populate.' : 'Nobody is currently below 75% in any subject — nice.'}</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Level</th><th>Subject</th><th class="num">Present</th><th class="num">Absent</th><th class="num">Attendance</th></tr></thead>
            <tbody>
              ${lowAttendance.map(r => rowHtml(r, photos)).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <div class="card">
      <div class="card__head">
        <div>
          <h2>Recent activity</h2>
          <div class="card__sub">Local save &amp; sync log for this browser</div>
        </div>
      </div>
      ${activity.length === 0 ? `<p class="muted small">Nothing yet — actions you take will show up here.</p>` : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${activity.slice(0,8).map(a => `
            <div class="flex space-between small" style="border-bottom:1px solid var(--line-soft); padding-bottom:8px;">
              <span>${APP.escapeHtml(a.text)}</span>
              <span class="muted">${new Date(a.at).toLocaleString()}</span>
            </div>`).join('')}
        </div>
      `}
    </div>
  `;

  function rowHtml(r, photos){
    const st = r.student;
    const photo = APP.photoFor(photos, st);
    const flag = APP.detectFlag(st.mobile);
    return `
      <tr class="row-link" data-open="${st.id}">
        <td>
          <div class="person-cell">
            ${photo ? `<img class="avatar" src="${photo}" alt="">` : `<span class="avatar">${APP.initials(st.name)}</span>`}
            <div class="who">
              <strong>${APP.escapeHtml(st.name)}</strong>
              <span>${st.id} ${flag ? `&nbsp;<img class="flag-icon" src="${flag}">` : ''}</span>
            </div>
          </div>
        </td>
        <td><span class="pill pill-level">${st.level}${st.section ? ' · Sec ' + st.section : ''}</span></td>
        <td>${APP.escapeHtml(r.subject.name)}</td>
        <td class="num">${r.p}</td>
        <td class="num">${r.a}</td>
        <td class="num"><span class="pct ${APP.pctClass(r.pct)}">${r.pct}%</span></td>
      </tr>
    `;
  }

  page.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => APP.openProfileModal(el.dataset.open));
  });
})();
