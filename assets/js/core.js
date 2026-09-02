/* ==========================================================================
   Cambridge Attendance — Core
   Data layer (localStorage-backed, optional GitHub sync), shared layout,
   and small utilities used across every page.
   ========================================================================== */

const APP = (() => {

  const LS_KEYS = {
    students: 'cas_students',
    subjects: 'cas_subjects',
    photos:   'cas_photos',
    settings: 'cas_settings',
    activity: 'cas_activity',
    attendancePrefix: 'cas_attendance_' // + subjectId
  };

  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l2 2 4-4"/><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>',
    students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17.5" cy="8.5" r="2.6"/><path d="M15.5 14.2c2.9.4 5 2.5 5 5.8"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 000-3l1.9-1.5-2-3.4-2.2.9a7.6 7.6 0 00-2.6-1.5L14 2h-4l-.5 2.4a7.6 7.6 0 00-2.6 1.5l-2.2-.9-2 3.4L4.6 10a7.6 7.6 0 000 3l-1.9 1.6 2 3.4 2.2-.9c.8.7 1.6 1.2 2.6 1.5L10 22h4l.5-2.4a7.6 7.6 0 002.6-1.5l2.2.9 2-3.4z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a4.5 4.5 0 01-.5-9 6 6 0 0111.4-1.8A4.5 4.5 0 0117.5 18H7z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h3l1.5 5-2 1.5a11 11 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2.2 2A17 17 0 014 5.2 2 2 0 016 3z"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 12h8M8 16h5"/></svg>'
  };

  // ------------------------------------------------------------------ utils
  function todayISO(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtDateLong(iso){
    if(!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }
  function fmtDateShort(iso){
    if(!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }
  function initials(name){
    if(!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]||'')[0] + (parts.length>1 ? parts[parts.length-1][0] : '')).toUpperCase();
  }
  function courseSlugPill(course){
    if(course === 'BTEC IT') return 'pill-it';
    if(course === 'BTEC Business') return 'pill-bus';
    return 'pill-unassigned';
  }
  // Grades that use the BTEC grade→course→fixed-subjects tier
  function isBTECLevel(level){ return typeof level === 'string' && level.startsWith('BTEC'); }
  // Grades that carry a meaningful Section (A/B) — BTEC always has one, plus Cambridge IG1/IG2
  function levelHasSections(level){ return ['BTEC-I','BTEC-II','IG1','IG2'].includes(level); }
  function pctClass(p){
    if(p === null || p === undefined || isNaN(p)) return '';
    if(p < 65) return 'low';
    if(p < 80) return 'mid';
    return 'high';
  }
  function detectFlag(mobile){
    if(!mobile) return null;
    const m = String(mobile).replace(/\D/g,'');
    if(m.startsWith('92') || (m.length === 10 && m.startsWith('3'))) return 'assets/img/flag-pk.svg';
    if(m.startsWith('90')) return 'assets/img/flag-tr.svg';
    return null;
  }
  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,9); }

  // ------------------------------------------------------------------ toast
  function ensureToastHost(){
    let host = document.getElementById('toast-host');
    if(!host){
      host = document.createElement('div');
      host.id = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(msg, type = 'info', ms = 3200){
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ------------------------------------------------------------------ modal
  function openModal(innerHtml, opts = {}){
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal';
    backdrop.innerHTML = `<div class="modal" style="${opts.width ? 'max-width:'+opts.width+'px' : ''}">${innerHtml}</div>`;
    backdrop.addEventListener('mousedown', (e) => { if(e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', escCloseOnce);
    return backdrop;
  }
  function escCloseOnce(e){ if(e.key === 'Escape'){ closeModal(); } }
  function closeModal(){
    const m = document.getElementById('active-modal');
    if(m) m.remove();
    document.removeEventListener('keydown', escCloseOnce);
  }

  // ------------------------------------------------------------------ storage (generic get/set with localStorage cache)
  function lsGet(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function lsSet(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ console.error('storage failed', e); }
  }

  // ------------------------------------------------------------------ bootstrapped fetch (seed localStorage from /data/*.json on first run)
  async function fetchJSON(path){
    const res = await fetch(path, { cache: 'no-store' });
    if(!res.ok) throw new Error('fetch failed: ' + path);
    return res.json();
  }

  async function getStudents(){
    let s = lsGet(LS_KEYS.students, null);
    if(s) return s;
    try{ s = await fetchJSON('data/students.json'); }catch(e){ s = []; }
    lsSet(LS_KEYS.students, s);
    return s;
  }
  function saveStudents(list){
    lsSet(LS_KEYS.students, list);
    queueSync('data/students.json', list, 'Update students.json');
  }

  async function getSubjects(){
    let s = lsGet(LS_KEYS.subjects, null);
    if(s) return s;
    try{ s = await fetchJSON('data/subjects.json'); }catch(e){ s = {}; }
    lsSet(LS_KEYS.subjects, s);
    return s;
  }
  function saveSubjects(obj){
    lsSet(LS_KEYS.subjects, obj);
    queueSync('data/subjects.json', obj, 'Update subjects.json');
  }
  // Handles both subjects.json shapes:
  //  - BTEC:      { "BTEC-I": { "BTEC IT": [{id,name}, ...], "BTEC Business": [...] } }
  //  - Cambridge: { "IG1": [{id,name}, ...], "AS": [...] }   (no course tier)
  function subjectsFlat(subjectsObj){
    const out = [];
    Object.entries(subjectsObj||{}).forEach(([level, val]) => {
      if(Array.isArray(val)){
        val.forEach(s => out.push({ ...s, level, course: null }));
      }else{
        Object.entries(val||{}).forEach(([course, subs]) => {
          (subs||[]).forEach(s => out.push({ ...s, level, course }));
        });
      }
    });
    return out;
  }
  // Subjects offered for a given level (+ course, only meaningful for BTEC)
  function getSubjectsFor(subjectsObj, level, course){
    const val = (subjectsObj||{})[level];
    if(!val) return [];
    if(Array.isArray(val)) return val;
    return (course && val[course]) ? val[course] : [];
  }
  // A student's actual enrolled subjects, resolved against the flat subject list.
  // Falls back to old level+course matching for any record missing a subjects[] array.
  function getEnrolledSubjects(student, flatSubjects){
    if(!student) return [];
    if(Array.isArray(student.subjects)){
      return flatSubjects.filter(sub => student.subjects.includes(sub.id));
    }
    return flatSubjects.filter(sub => sub.level === student.level && sub.course === student.course);
  }
  // Present/Absent/Leave counts + percentage for one student within one subject's attendance records
  function subjectStatsForStudent(records, studentId){
    let p=0,a=0,l=0;
    Object.values(records||{}).forEach(day => {
      const m = day[studentId];
      if(m==='P') p++; else if(m==='A') a++; else if(m==='L') l++;
    });
    const total = p+a;
    const pct = total>0 ? Math.round((p/total)*100) : null;
    return { p, a, l, pct };
  }

  async function getPhotos(){
    let p = lsGet(LS_KEYS.photos, null);
    if(p) return p;
    try{ p = await fetchJSON('data/photos.json'); }catch(e){ p = {}; }
    lsSet(LS_KEYS.photos, p);
    return p;
  }
  function savePhotos(obj){
    lsSet(LS_KEYS.photos, obj);
    queueSync('data/photos.json', obj, 'Update photos.json');
  }
  function photoFor(photosObj, student){
    if(!photosObj || !student) return '';
    // Keyed primarily by student ID (guaranteed unique — some names repeat across
    // grades, e.g. two different "Haider Ali"s). Falls back to name for older entries.
    return photosObj[student.id] || photosObj[student.name] || '';
  }

  async function getAttendance(subjectId){
    const key = LS_KEYS.attendancePrefix + subjectId;
    let a = lsGet(key, null);
    if(a) return a;
    try{ a = await fetchJSON('data/attendance/' + subjectId + '.json'); }
    catch(e){ a = { subjectId, subjectName: '', records: {} }; }
    lsSet(key, a);
    return a;
  }
  function saveAttendance(subjectId, data){
    lsSet(LS_KEYS.attendancePrefix + subjectId, data);
    queueSync('data/attendance/' + subjectId + '.json', data, 'Attendance update: ' + subjectId + ' ' + todayISO());
  }

  function getSettings(){
    return lsGet(LS_KEYS.settings, { owner:'', repo:'', branch:'main', token:'', syncEnabled:false });
  }
  function saveSettings(s){ lsSet(LS_KEYS.settings, s); }

  function logActivity(text){
    const log = lsGet(LS_KEYS.activity, []);
    log.unshift({ text, at: new Date().toISOString() });
    lsSet(LS_KEYS.activity, log.slice(0, 30));
  }
  function getActivity(){ return lsGet(LS_KEYS.activity, []); }

  // ------------------------------------------------------------------ GitHub sync
  function b64EncodeUnicode(str){
    return btoa(unescape(encodeURIComponent(str)));
  }
  async function queueSync(path, jsonObj, message){
    const s = getSettings();
    updateSyncDot('pending');
    if(!s.syncEnabled || !s.owner || !s.repo || !s.token){
      updateSyncDot('off');
      return;
    }
    try{
      await githubPutFile(s, path, JSON.stringify(jsonObj, null, 2), message);
      updateSyncDot('on');
      logActivity('Synced ' + path + ' to GitHub');
    }catch(err){
      console.error(err);
      updateSyncDot('off');
      toast('GitHub sync failed for ' + path + ' — check Settings.', 'err', 4500);
    }
  }
  async function githubGetSha(s, path){
    const url = `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${path}?ref=${encodeURIComponent(s.branch||'main')}`;
    const res = await fetch(url, { headers: { 'Authorization': 'token ' + s.token, 'Accept': 'application/vnd.github+json' } });
    if(res.status === 404) return null;
    if(!res.ok) throw new Error('GitHub GET failed: ' + res.status);
    const j = await res.json();
    return j.sha;
  }
  async function githubPutFile(s, path, content, message){
    const sha = await githubGetSha(s, path);
    const url = `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${path}`;
    const body = {
      message: message || ('Update ' + path),
      content: b64EncodeUnicode(content),
      branch: s.branch || 'main'
    };
    if(sha) body.sha = sha;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': 'token ' + s.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error('GitHub PUT failed: ' + res.status + ' ' + t);
    }
    return res.json();
  }
  async function testGithubConnection(s){
    const url = `https://api.github.com/repos/${s.owner}/${s.repo}`;
    const res = await fetch(url, { headers: s.token ? { 'Authorization': 'token ' + s.token } : {} });
    if(!res.ok) throw new Error('Repository not reachable (' + res.status + '). Check owner/repo/token.');
    return res.json();
  }
  function updateSyncDot(state){
    document.querySelectorAll('.sync-dot').forEach(el => {
      el.classList.remove('on','off');
      if(state === 'on') el.classList.add('on');
      else if(state === 'off') el.classList.add('off');
    });
    const label = document.getElementById('sync-label');
    if(label){
      const s = getSettings();
      if(!s.syncEnabled) label.textContent = 'Local only';
      else if(state === 'on') label.textContent = 'Synced to GitHub';
      else if(state === 'pending') label.textContent = 'Syncing…';
      else label.textContent = 'Sync issue — check Settings';
    }
  }

  // ------------------------------------------------------------------ layout / nav
  const NAV = [
    { href: 'index.html', icon: 'dashboard', label: 'Dashboard' },
    { href: 'attendance.html', icon: 'attendance', label: 'Take Attendance' },
    { href: 'students.html', icon: 'students', label: 'Students' },
    { href: 'reports.html', icon: 'reports', label: 'Reports' },
    { href: 'settings.html', icon: 'settings', label: 'Settings' }
  ];

  function renderShell(activeHref, pageTitle, pageSubtitle){
    const shell = document.getElementById('app-shell');
    const s = getSettings();
    shell.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__brand">
          <img src="assets/img/logo.svg" alt="Logo">
          <div class="sidebar__brand-text">
            <strong>Cambridge</strong>
            <span>Attendance System</span>
          </div>
        </div>
        <nav class="sidebar__nav">
          ${NAV.map(n => `
            <a class="sidebar__link ${n.href === activeHref ? 'active' : ''}" href="${n.href}">
              ${ICONS[n.icon]}<span>${n.label}</span>
            </a>`).join('')}
        </nav>
        <div class="sidebar__foot">
          <span class="sync-dot ${s.syncEnabled ? '' : 'off'}"></span><span id="sync-label">${s.syncEnabled ? 'Local · GitHub' : 'Local only'}</span>
        </div>
      </aside>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <div class="main">
        <div class="topbar">
          <div class="flex">
            <button class="menu-toggle" id="menu-toggle">${ICONS.menu}</button>
            <div class="topbar__title">
              <h1>${pageTitle}</h1>
              ${pageSubtitle ? `<div class="topbar__meta">${pageSubtitle}</div>` : ''}
            </div>
          </div>
          <div class="topbar__right">
            <div class="today-chip">${ICONS.calendar}<span id="topbar-date"></span></div>
          </div>
        </div>
        <main class="page" id="page-content"></main>
      </div>
    `;
    document.getElementById('topbar-date').textContent = fmtDateLong(todayISO());
    const sidebarEl = document.getElementById('sidebar');
    const backdropEl = document.getElementById('sidebar-backdrop');
    document.getElementById('menu-toggle').addEventListener('click', () => {
      sidebarEl.classList.toggle('open');
      backdropEl.classList.toggle('show');
    });
    backdropEl.addEventListener('click', () => {
      sidebarEl.classList.remove('open');
      backdropEl.classList.remove('show');
    });
    updateSyncDot(s.syncEnabled ? 'on' : 'off');
  }

  return {
    ICONS, LS_KEYS,
    todayISO, fmtDateLong, fmtDateShort, initials, courseSlugPill, pctClass, detectFlag, escapeHtml, uid,
    isBTECLevel, levelHasSections,
    toast, openModal, closeModal,
    getStudents, saveStudents,
    getSubjects, saveSubjects, subjectsFlat, getSubjectsFor, getEnrolledSubjects, subjectStatsForStudent,
    getPhotos, savePhotos, photoFor,
    getAttendance, saveAttendance,
    getSettings, saveSettings,
    logActivity, getActivity,
    queueSync, testGithubConnection, updateSyncDot,
    renderShell
  };
})();
