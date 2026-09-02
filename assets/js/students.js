(async function(){
  APP.renderShell('students.html', 'Students', 'Roster, contact details and class assignment');
  const page = document.getElementById('page-content');
  page.innerHTML = `<div class="empty"><p>Loading…</p></div>`;

  let students = await APP.getStudents();
  const subjectsObj = await APP.getSubjects();
  const levels = Object.keys(subjectsObj);
  const coursesByLevel = {};
  levels.forEach(l => { coursesByLevel[l] = APP.isBTECLevel(l) ? Object.keys(subjectsObj[l]) : []; });

  const filters = { level: 'all', course: 'all', q: '' };

  render();

  const params = new URLSearchParams(window.location.search);
  if(params.get('open')) APP.openProfileModal(params.get('open'), openEditModal);
  if(params.get('edit')){
    const st = students.find(s => s.id === params.get('edit'));
    if(st) openEditModal(st);
  }

  function render(){
    const filtered = students.filter(s => {
      if(filters.level !== 'all' && s.level !== filters.level) return false;
      if(filters.course !== 'all' && s.course !== filters.course) return false;
      if(filters.q){
        const q = filters.q.toLowerCase();
        if(!s.name.toLowerCase().includes(q) && !s.id.includes(q)) return false;
      }
      return true;
    }).sort((a,b) => a.name.localeCompare(b.name));

    const allCourses = [...new Set(levels.flatMap(l => coursesByLevel[l]))];

    page.innerHTML = `
      <div class="card">
        <div class="control-row">
          <div class="field search-input" style="flex:2;">
            <label>Search</label>
            ${APP.ICONS.search}
            <input type="text" id="q" placeholder="Search by name or registration no." value="${filters.q}">
          </div>
          <div class="field">
            <label>Level</label>
            <select id="f-level">
              <option value="all">All levels</option>
              ${levels.map(l => `<option value="${l}" ${filters.level===l?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Course</label>
            <select id="f-course">
              <option value="all">All courses</option>
              ${allCourses.map(c => `<option value="${c}" ${filters.course===c?'selected':''}>${c}</option>`).join('')}
              <option value="Unassigned" ${filters.course==='Unassigned'?'selected':''}>Unassigned</option>
            </select>
          </div>
          <button class="btn btn-primary" id="add-student">${APP.ICONS.plus} Add student</button>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <div>
            <h2>${filtered.length} student${filtered.length===1?'':'s'}</h2>
            <div class="card__sub">Click a row to view the full profile</div>
          </div>
        </div>
        ${filtered.length === 0 ? `
          <div class="empty">${APP.ICONS.empty}<h3>No students match</h3><p>Try clearing filters or add a new student.</p></div>
        ` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Level / Course</th><th>Mobile</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(rowHtml).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>
    `;

    document.getElementById('q').addEventListener('input', e => { filters.q = e.target.value; render(); });
    document.getElementById('f-level').addEventListener('change', e => { filters.level = e.target.value; render(); });
    document.getElementById('f-course').addEventListener('change', e => { filters.course = e.target.value; render(); });
    document.getElementById('add-student').addEventListener('click', () => openEditModal(null));

    page.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => APP.openProfileModal(el.dataset.view, openEditModal)));
    page.querySelectorAll('[data-edit]').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = students.find(s => s.id === el.dataset.edit);
      openEditModal(st);
    }));
    page.querySelectorAll('[data-del]').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = students.find(s => s.id === el.dataset.del);
      if(confirm(`Remove ${st.name} from the roster? This does not delete their past attendance history.`)){
        students = students.filter(s => s.id !== st.id);
        APP.saveStudents(students);
        APP.logActivity('Removed student ' + st.name);
        APP.toast('Student removed', 'ok');
        render();
      }
    }));
  }

  function rowHtml(st){
    const flag = APP.detectFlag(st.mobile);
    return `
      <tr class="row-link" data-view="${st.id}">
        <td>
          <div class="person-cell">
            <span class="avatar">${APP.initials(st.name)}</span>
            <div class="who"><strong>${APP.escapeHtml(st.name)}</strong><span>${st.id}</span></div>
          </div>
        </td>
        <td>
          <span class="pill pill-level">${st.level}${st.section ? ' · Sec ' + st.section : ''}</span>
          ${st.course ? `<span class="pill ${APP.courseSlugPill(st.course)}">${st.course}</span>` : ''}
        </td>
        <td>${flag?`<img class="flag-icon" src="${flag}"> `:''}${st.mobile||'—'}</td>
        <td><span class="pill ${st.status==='Active'?'pill-it':'pill-unassigned'}">${st.status}</span></td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-ghost" data-edit="${st.id}">${APP.ICONS.edit}</button>
            <button class="btn btn-sm btn-ghost" data-del="${st.id}">${APP.ICONS.trash}</button>
          </div>
        </td>
      </tr>
    `;
  }

  // ---- Registration ID suggestion for new Cambridge students (BTEC uses real issued numbers, left blank) ----
  function suggestNextId(level){
    if(APP.isBTECLevel(level)) return '';
    const prefix = level + '-';
    let max = 0;
    students.forEach(s => {
      if(s.id && s.id.startsWith(prefix)){
        const n = parseInt(s.id.slice(prefix.length), 10);
        if(!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function openEditModal(existing){
    const isNew = !existing;
    const st = existing || {
      id: '', sr: (Math.max(0,...students.map(s=>s.sr||0))+1), level: levels[0]||'', course: '',
      section: 'A', name: '', subjects: [], fatherName: '', status: 'Active', gender: 'Male',
      regDate: APP.todayISO(), admDate: APP.todayISO(), dob: '', mobile: '', familyNo: '', fatherId: '', category: ''
    };
    const courseOptions = (level) => [...(coursesByLevel[level]||[]), 'Unassigned'];
    let lastSuggestedId = isNew ? suggestNextId(st.level) : '';

    // ---- Dynamic block: Course (BTEC only) / Section (sectioned grades only) / Subjects checklist (Cambridge only) ----
    function dynamicFieldsHtml(level, course, section, subjectIds){
      const isBTEC = APP.isBTECLevel(level);
      const showSection = APP.levelHasSections(level);
      let html = `<div class="field-row cols-3">`;
      if(isBTEC){
        html += `
          <div class="field">
            <label>Course</label>
            <select name="course" id="f-modal-course">${courseOptions(level).map(c => `<option ${c===course?'selected':''}>${c}</option>`).join('')}</select>
          </div>`;
      }
      if(showSection){
        html += `
          <div class="field">
            <label>Section</label>
            <input type="text" name="section" value="${section||'A'}" maxlength="2">
          </div>`;
      }
      html += `</div>`;
      if(!isBTEC){
        const subs = APP.getSubjectsFor(subjectsObj, level, null);
        html += `
          <div class="field">
            <label>Enrolled subjects</label>
            ${subs.length === 0 ? '<p class="hint">No subjects configured for this level yet — add some in Settings.</p>' : `
              <div class="checkbox-grid">
                ${subs.map(s => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="subj" value="${s.id}" ${subjectIds.includes(s.id)?'checked':''}>
                    <span>${APP.escapeHtml(s.name)}</span>
                  </label>
                `).join('')}
              </div>
            `}
            <div class="hint">Each checked subject becomes a separate attendance roster this student appears on.</div>
          </div>`;
      }
      return html;
    }

    const html = `
      <div class="modal__head">
        <h2 class="mb-0">${isNew ? 'Add student' : 'Edit student'}</h2>
        <button class="modal-close" data-close>${APP.ICONS.close}</button>
      </div>
      <div class="modal__body">
        <form id="student-form">
          <div class="field-row cols-2">
            <div class="field">
              <label>Registration no.</label>
              <input type="text" name="id" value="${isNew ? lastSuggestedId : st.id}" ${isNew ? '' : 'readonly'} required>
              ${isNew ? '<div class="hint">Suggested — edit freely, especially for BTEC (use the real registration number).</div>' : '<div class="hint">Registration no. can\'t be changed once created — it links to attendance history.</div>'}
            </div>
            <div class="field">
              <label>Full name</label>
              <input type="text" name="name" value="${APP.escapeHtml(st.name)}" required>
            </div>
          </div>
          <div class="field">
            <label>Level</label>
            <select name="level" id="f-modal-level">${levels.map(l => `<option ${l===st.level?'selected':''}>${l}</option>`).join('')}</select>
          </div>
          <div id="dynamic-fields">${dynamicFieldsHtml(st.level, st.course, st.section, st.subjects||[])}</div>
          <div class="field-row cols-2">
            <div class="field">
              <label>Father's name</label>
              <input type="text" name="fatherName" value="${APP.escapeHtml(st.fatherName)}">
            </div>
            <div class="field">
              <label>Father's CNIC / ID</label>
              <input type="text" name="fatherId" value="${APP.escapeHtml(st.fatherId)}">
            </div>
          </div>
          <div class="field-row cols-3">
            <div class="field">
              <label>Status</label>
              <select name="status"><option ${st.status==='Active'?'selected':''}>Active</option><option ${st.status==='Inactive'?'selected':''}>Inactive</option></select>
            </div>
            <div class="field">
              <label>Gender</label>
              <select name="gender"><option value="" ${!st.gender?'selected':''}>—</option><option ${st.gender==='Male'?'selected':''}>Male</option><option ${st.gender==='Female'?'selected':''}>Female</option></select>
            </div>
            <div class="field">
              <label>Date of birth</label>
              <input type="date" name="dob" value="${st.dob||''}">
            </div>
          </div>
          <div class="field-row cols-2">
            <div class="field">
              <label>Mobile no.</label>
              <input type="tel" name="mobile" value="${st.mobile||''}" placeholder="e.g. 923001234567">
            </div>
            <div class="field">
              <label>Family / parent contact no.</label>
              <input type="tel" name="familyNo" value="${st.familyNo||''}">
            </div>
          </div>
          <div class="field-row cols-2">
            <div class="field">
              <label>Registration date</label>
              <input type="date" name="regDate" value="${st.regDate||''}">
            </div>
            <div class="field">
              <label>Admission date</label>
              <input type="date" name="admDate" value="${st.admDate||''}">
            </div>
          </div>
          <div class="field">
            <label>Category</label>
            <input type="text" name="category" value="${APP.escapeHtml(st.category)}" placeholder="e.g. PTM School (Renewal)">
          </div>
        </form>
      </div>
      <div class="modal__foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-student">${APP.ICONS.check} ${isNew ? 'Add student' : 'Save changes'}</button>
      </div>
    `;
    const modal = APP.openModal(html, { width: 680 });
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', APP.closeModal));

    modal.querySelector('#f-modal-level').addEventListener('change', (e) => {
      const newLevel = e.target.value;
      modal.querySelector('#dynamic-fields').innerHTML = dynamicFieldsHtml(newLevel, courseOptions(newLevel)[0], 'A', []);
      if(isNew){
        const idInput = modal.querySelector('input[name="id"]');
        if(idInput.value === lastSuggestedId){
          lastSuggestedId = suggestNextId(newLevel);
          idInput.value = lastSuggestedId;
        }
      }
    });

    modal.querySelector('#save-student').addEventListener('click', () => {
      const form = modal.querySelector('#student-form');
      if(!form.reportValidity()) return;
      const fd = new FormData(form);
      const level = fd.get('level');
      const isBTEC = APP.isBTECLevel(level);
      const data = Object.fromEntries(fd.entries());
      if(!data.id.trim()){ APP.toast('Registration no. is required', 'err'); return; }
      if(isNew && students.some(s => s.id === data.id.trim())){
        APP.toast('That registration no. already exists', 'err'); return;
      }

      let subjects = [];
      let course = null;
      if(isBTEC){
        course = data.course || null;
        subjects = APP.getSubjectsFor(subjectsObj, level, course).map(s => s.id);
      }else{
        subjects = fd.getAll('subj');
      }
      const section = APP.levelHasSections(level) ? (data.section || '').trim() : null;

      const record = {
        ...st, ...data,
        id: data.id.trim(), name: data.name.trim(), fatherName: data.fatherName.trim(), category: data.category.trim(),
        level, course, section, subjects
      };
      if(isNew){
        students.push(record);
        APP.logActivity('Added student ' + record.name);
        APP.toast('Student added', 'ok');
      }else{
        students = students.map(s => s.id === record.id ? record : s);
        APP.logActivity('Updated student ' + record.name);
        APP.toast('Changes saved', 'ok');
      }
      APP.saveStudents(students);
      APP.closeModal();
      render();
    });
  }
})();
