/* Extends APP with a reusable student profile modal. Load after core.js. */
(function(){

  async function openProfileModal(studentId, onEdit){
    const [students, photos, subjectsObj] = await Promise.all([
      APP.getStudents(), APP.getPhotos(), APP.getSubjects()
    ]);
    const st = students.find(s => s.id === studentId);
    if(!st){ APP.toast('Student not found', 'err'); return; }

    const subjects = APP.getEnrolledSubjects(st, APP.subjectsFlat(subjectsObj));
    const perSubject = [];
    let totalP = 0, totalA = 0, totalL = 0;
    for(const sub of subjects){
      const att = await APP.getAttendance(sub.id);
      const { p, a, l, pct } = APP.subjectStatsForStudent(att.records, st.id);
      totalP += p; totalA += a; totalL += l;
      perSubject.push({ name: sub.name, p, a, l, pct });
    }
    const overallTotal = totalP + totalA;
    const overallPct = overallTotal ? Math.round((totalP/overallTotal)*100) : null;

    const photo = APP.photoFor(photos, st);
    const flag = APP.detectFlag(st.mobile);
    const familyFlag = APP.detectFlag(st.familyNo);

    const html = `
      <div class="modal__head">
        <h2 class="mb-0">Student profile</h2>
        <button class="modal-close" data-close>${APP.ICONS.close}</button>
      </div>
      <div class="modal__body">
        <div class="profile-head">
          ${photo ? `<img class="avatar avatar-lg" src="${photo}" alt="">` : `<span class="avatar avatar-lg">${APP.initials(st.name)}</span>`}
          <div>
            <h2 class="mb-0">${APP.escapeHtml(st.name)}</h2>
            <div class="flex gap-8 wrap" style="margin-top:6px;">
              <span class="pill pill-level">${st.level}${st.section ? ' · Sec ' + st.section : ''}</span>
              ${st.course ? `<span class="pill ${APP.courseSlugPill(st.course)}">${st.course}</span>` : ''}
              <span class="pill ${st.status === 'Active' ? 'pill-it' : 'pill-unassigned'}">${st.status}</span>
            </div>
          </div>
        </div>

        <div class="profile-grid">
          <div class="item"><span>Registration No.</span><strong>${st.id}</strong></div>
          <div class="item"><span>Father's name</span><strong>${APP.escapeHtml(st.fatherName)||'—'}</strong></div>
          <div class="item"><span>Gender</span><strong>${st.gender||'—'}</strong></div>
          <div class="item"><span>Date of birth</span><strong>${APP.fmtDateShort(st.dob)}</strong></div>
          <div class="item"><span>Mobile no.</span><strong>${flag?`<img class="flag-icon" src="${flag}"> `:''}${st.mobile||'—'}</strong></div>
          <div class="item"><span>Family no.</span><strong>${familyFlag?`<img class="flag-icon" src="${familyFlag}"> `:''}${st.familyNo||'—'}</strong></div>
          <div class="item"><span>Father's CNIC / ID</span><strong>${st.fatherId||'—'}</strong></div>
          <div class="item"><span>Category</span><strong>${st.category||'—'}</strong></div>
          <div class="item"><span>Registration date</span><strong>${APP.fmtDateShort(st.regDate)}</strong></div>
          <div class="item"><span>Admission date</span><strong>${APP.fmtDateShort(st.admDate)}</strong></div>
        </div>

        <div class="divider"></div>
        <h3>Attendance by subject</h3>
        ${perSubject.length === 0 ? '<p class="muted small">No subjects configured for this level/course yet.</p>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th class="num">Present</th><th class="num">Absent</th><th class="num">Leave</th><th class="num">Attendance</th></tr></thead>
              <tbody>
                ${perSubject.map(s => `
                  <tr>
                    <td>${APP.escapeHtml(s.name)}</td>
                    <td class="num">${s.p}</td>
                    <td class="num">${s.a}</td>
                    <td class="num">${s.l}</td>
                    <td class="num">${s.pct === null ? '<span class="muted">—</span>' : `<span class="pct ${APP.pctClass(s.pct)}">${s.pct}%</span>`}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight:700;">
                  <td>Overall</td>
                  <td class="num">${totalP}</td>
                  <td class="num">${totalA}</td>
                  <td class="num">${totalL}</td>
                  <td class="num">${overallPct === null ? '<span class="muted">—</span>' : `<span class="pct ${APP.pctClass(overallPct)}">${overallPct}%</span>`}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>
      <div class="modal__foot">
        <button class="btn" data-close>Close</button>
        <button class="btn btn-primary" id="profile-edit-btn">${APP.ICONS.edit} Edit student</button>
      </div>
    `;
    const modal = APP.openModal(html, { width: 680 });
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', APP.closeModal));
    modal.querySelector('#profile-edit-btn').addEventListener('click', () => {
      APP.closeModal();
      if(onEdit) onEdit(st);
      else window.location.href = 'students.html?edit=' + st.id;
    });
  }

  APP.openProfileModal = openProfileModal;
})();
