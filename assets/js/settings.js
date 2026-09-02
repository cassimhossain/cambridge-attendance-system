(async function(){
  APP.renderShell('settings.html', 'Settings', 'GitHub sync, subjects, photos and backups');
  const page = document.getElementById('page-content');

  let activeTab = 'sync';
  let subjectsObj = await APP.getSubjects();
  let photos = await APP.getPhotos();
  let students = await APP.getStudents();

  render();

  function render(){
    page.innerHTML = `
      <div class="tabs">
        <div class="tab ${activeTab==='sync'?'active':''}" data-tab="sync">GitHub Sync</div>
        <div class="tab ${activeTab==='subjects'?'active':''}" data-tab="subjects">Subjects</div>
        <div class="tab ${activeTab==='photos'?'active':''}" data-tab="photos">Photos</div>
        <div class="tab ${activeTab==='data'?'active':''}" data-tab="data">Backup &amp; reset</div>
      </div>
      <div id="tab-zone"></div>
    `;
    page.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { activeTab = t.dataset.tab; render(); }));
    if(activeTab === 'sync') renderSync();
    if(activeTab === 'subjects') renderSubjects();
    if(activeTab === 'photos') renderPhotos();
    if(activeTab === 'data') renderData();
  }

  // ---------------------------------------------------------- GitHub Sync
  function renderSync(){
    const s = APP.getSettings();
    const zone = document.getElementById('tab-zone');
    zone.innerHTML = `
      <div class="card page-narrow">
        <div class="card__head">
          <div>
            <h2>Sync to GitHub</h2>
            <div class="card__sub">Push students, subjects, photos and attendance straight to your repo's main branch</div>
          </div>
        </div>
        <p class="small">
          Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained personal access token</a>
          scoped to <strong>only this repository</strong>, with <strong>Contents: Read and write</strong> permission and nothing else.
          The token is stored only in this browser's local storage and is sent directly to GitHub's API — never anywhere else.
          Don't use this on a shared or public computer.
        </p>
        <form id="sync-form">
          <div class="field">
            <label><input type="checkbox" id="sync-enabled" ${s.syncEnabled?'checked':''}> Enable GitHub sync</label>
          </div>
          <div class="field-row cols-2">
            <div class="field"><label>GitHub username / org</label><input type="text" name="owner" value="${s.owner||''}" placeholder="e.g. mschool-admin"></div>
            <div class="field"><label>Repository name</label><input type="text" name="repo" value="${s.repo||''}" placeholder="e.g. attendance-system"></div>
          </div>
          <div class="field-row cols-2">
            <div class="field"><label>Branch</label><input type="text" name="branch" value="${s.branch||'main'}"></div>
            <div class="field">
              <label>Personal access token</label>
              <div class="flex gap-8">
                <input type="password" name="token" id="token-input" value="${s.token||''}" placeholder="github_pat_…">
                <button type="button" class="btn btn-sm" id="toggle-token">Show</button>
              </div>
            </div>
          </div>
        </form>
        <div class="flex gap-10 wrap" style="margin-top:6px;">
          <button class="btn btn-primary" id="save-sync">${APP.ICONS.check} Save settings</button>
          <button class="btn" id="test-sync">${APP.ICONS.cloud} Test connection</button>
        </div>
        <div id="sync-status" class="small" style="margin-top:10px;"></div>
      </div>
    `;
    document.getElementById('toggle-token').addEventListener('click', () => {
      const inp = document.getElementById('token-input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('save-sync').addEventListener('click', () => {
      const fd = new FormData(document.getElementById('sync-form'));
      const newSettings = {
        owner: fd.get('owner').trim(), repo: fd.get('repo').trim(),
        branch: (fd.get('branch')||'main').trim() || 'main',
        token: fd.get('token').trim(),
        syncEnabled: document.getElementById('sync-enabled').checked
      };
      APP.saveSettings(newSettings);
      document.querySelectorAll('.sync-dot').forEach(el => el.classList.toggle('off', !newSettings.syncEnabled));
      const label = document.getElementById('sync-label');
      if(label) label.textContent = newSettings.syncEnabled ? 'Local · GitHub' : 'Local only';
      APP.toast('Sync settings saved', 'ok');
    });
    document.getElementById('test-sync').addEventListener('click', async () => {
      const fd = new FormData(document.getElementById('sync-form'));
      const testS = { owner: fd.get('owner').trim(), repo: fd.get('repo').trim(), token: fd.get('token').trim() };
      const status = document.getElementById('sync-status');
      status.textContent = 'Testing…';
      try{
        await APP.testGithubConnection(testS);
        status.innerHTML = '<span style="color:var(--present); font-weight:600;">Connected — repository reachable.</span>';
      }catch(err){
        status.innerHTML = `<span style="color:var(--absent); font-weight:600;">${err.message}</span>`;
      }
    });
  }

  // ---------------------------------------------------------- Subjects
  function renderSubjects(){
    const zone = document.getElementById('tab-zone');
    zone.innerHTML = `
      <div class="card">
        <div class="card__head">
          <div><h2>Subjects</h2><div class="card__sub">Rename freely — attendance history stays attached to each subject's ID</div></div>
        </div>
        ${Object.entries(subjectsObj).map(([level, val]) => Array.isArray(val) ? `
          <h3 style="margin-top:18px;">${level}</h3>
          <div class="card" style="background:var(--paper); box-shadow:none;">
            <div class="card__head">
              <div><strong>All subjects offered at this grade</strong></div>
              <button class="btn btn-sm" data-add-flat="${level}">${APP.ICONS.plus} Add subject</button>
            </div>
            ${val.map(s => `
              <div class="flex gap-10" style="margin-bottom:8px;">
                <input type="text" data-rename-flat="${level}|${s.id}" value="${APP.escapeHtml(s.name)}" style="flex:1;">
                <span class="small muted" style="width:90px;">${s.id}</span>
                <button class="btn btn-sm btn-ghost" data-remove-flat="${level}|${s.id}">${APP.ICONS.trash}</button>
              </div>
            `).join('') || '<p class="small muted">No subjects yet.</p>'}
          </div>
        ` : `
          <h3 style="margin-top:18px;">${level}</h3>
          ${Object.entries(val).map(([course, subs]) => `
            <div class="card" style="background:var(--paper); box-shadow:none;">
              <div class="card__head">
                <div><strong>${course}</strong></div>
                <button class="btn btn-sm" data-add="${level}|${course}">${APP.ICONS.plus} Add subject</button>
              </div>
              ${subs.map(s => `
                <div class="flex gap-10" style="margin-bottom:8px;">
                  <input type="text" data-rename="${level}|${course}|${s.id}" value="${APP.escapeHtml(s.name)}" style="flex:1;">
                  <span class="small muted" style="width:90px;">${s.id}</span>
                  <button class="btn btn-sm btn-ghost" data-remove-subject="${level}|${course}|${s.id}">${APP.ICONS.trash}</button>
                </div>
              `).join('') || '<p class="small muted">No subjects yet.</p>'}
            </div>
          `).join('')}
        `).join('')}
        <button class="btn btn-primary" id="save-subjects" style="margin-top:8px;">${APP.ICONS.check} Save subjects</button>
      </div>
    `;
    zone.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => {
      const [level, course] = btn.dataset.add.split('|');
      const name = prompt('New subject name:');
      if(!name) return;
      const n = (subjectsObj[level][course]?.length || 0) + 1;
      const levelSlug = level.replace('BTEC-', 'L');
      const courseSlug = course === 'BTEC IT' ? 'IT' : course === 'BTEC Business' ? 'BUS' : 'GEN';
      let id = `${levelSlug}-${courseSlug}-${n}`;
      while(subjectsObj[level][course].some(s => s.id === id)) id += 'x';
      subjectsObj[level][course].push({ id, name });
      renderSubjects();
    }));
    zone.querySelectorAll('[data-remove-subject]').forEach(btn => btn.addEventListener('click', () => {
      const [level, course, id] = btn.dataset.removeSubject.split('|');
      if(!confirm('Remove this subject from the list? Its past attendance data is kept but the subject will no longer appear in dropdowns.')) return;
      subjectsObj[level][course] = subjectsObj[level][course].filter(s => s.id !== id);
      renderSubjects();
    }));
    zone.querySelectorAll('[data-add-flat]').forEach(btn => btn.addEventListener('click', () => {
      const level = btn.dataset.addFlat;
      const name = prompt('New subject name:');
      if(!name) return;
      const levelSlug = level.replace('BTEC-', 'L');
      const nameSlug = name.replace(/[^A-Za-z0-9]+/g, '').toUpperCase().slice(0, 8) || 'SUBJ';
      let id = `${levelSlug}-${nameSlug}`;
      while(subjectsObj[level].some(s => s.id === id)) id += 'X';
      subjectsObj[level].push({ id, name });
      renderSubjects();
    }));
    zone.querySelectorAll('[data-remove-flat]').forEach(btn => btn.addEventListener('click', () => {
      const [level, id] = btn.dataset.removeFlat.split('|');
      if(!confirm('Remove this subject from the list? Its past attendance data is kept but the subject will no longer appear in dropdowns, and students will lose it from their enrolled subjects.')) return;
      subjectsObj[level] = subjectsObj[level].filter(s => s.id !== id);
      renderSubjects();
    }));
    document.getElementById('save-subjects').addEventListener('click', () => {
      zone.querySelectorAll('[data-rename]').forEach(inp => {
        const [level, course, id] = inp.dataset.rename.split('|');
        const sub = subjectsObj[level][course].find(s => s.id === id);
        if(sub) sub.name = inp.value.trim() || sub.name;
      });
      zone.querySelectorAll('[data-rename-flat]').forEach(inp => {
        const [level, id] = inp.dataset.renameFlat.split('|');
        const sub = subjectsObj[level].find(s => s.id === id);
        if(sub) sub.name = inp.value.trim() || sub.name;
      });
      APP.saveSubjects(subjectsObj);
      APP.logActivity('Updated subjects list');
      APP.toast('Subjects saved', 'ok');
    });
  }

  // ---------------------------------------------------------- Photos
  function renderPhotos(){
    const zone = document.getElementById('tab-zone');
    let photoQuery = '';

    function draw(){
      const sorted = [...students]
        .filter(st => !photoQuery || st.name.toLowerCase().includes(photoQuery.toLowerCase()) || st.id.toLowerCase().includes(photoQuery.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));
      zone.innerHTML = `
        <div class="card">
          <div class="card__head">
            <div>
              <h2>Student photos</h2>
              <div class="card__sub">Paste a direct image link for each student. This maps to <code>data/photos.json</code>, keyed by registration/ID number (shown next to each name) — you or a future automated tool can also edit that file directly.</div>
            </div>
          </div>
          <div class="field search-input" style="max-width:320px; margin-bottom:14px;">
            ${APP.ICONS.search}
            <input type="text" id="photo-search" placeholder="Search by name or ID…" value="${APP.escapeHtml(photoQuery)}">
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${sorted.length === 0 ? '<p class="small muted">No students match that search.</p>' : sorted.map(st => `
              <div class="flex gap-10">
                <span class="avatar" id="prev-${st.id}">${APP.initials(st.name)}</span>
                <div style="flex:1;">
                  <div class="small" style="font-weight:600;">${APP.escapeHtml(st.name)} <span class="muted" style="font-weight:400;">· ${st.id}</span></div>
                  <input type="url" data-photo="${st.id}" value="${photos[st.id]||''}" placeholder="https://…">
                </div>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary" id="save-photos" style="margin-top:14px;">${APP.ICONS.check} Save photos</button>
        </div>
      `;
      document.getElementById('photo-search').addEventListener('input', e => { photoQuery = e.target.value; draw(); });
      wireInputs(sorted);
      document.getElementById('save-photos').addEventListener('click', () => {
        const newPhotos = { ...photos };
        zone.querySelectorAll('[data-photo]').forEach(inp => { newPhotos[inp.dataset.photo] = inp.value.trim(); });
        photos = newPhotos;
        APP.savePhotos(photos);
        APP.logActivity('Updated student photos');
        APP.toast('Photos saved', 'ok');
      });
    }

    function wireInputs(sorted){
      zone.querySelectorAll('[data-photo]').forEach(inp => {
        const id = inp.dataset.photo;
        const st = sorted.find(s => s.id === id);
        inp.addEventListener('change', () => {
          const el = document.getElementById('prev-' + st.id);
          if(inp.value){ el.outerHTML = `<img class="avatar" id="prev-${st.id}" src="${inp.value}" onerror="this.outerHTML='<span class=&quot;avatar&quot; id=&quot;prev-${st.id}&quot;>${APP.initials(st.name)}</span>'">`; }
          else{ el.outerHTML = `<span class="avatar" id="prev-${st.id}">${APP.initials(st.name)}</span>`; }
        });
      });
    }

    draw();
  }

  // ---------------------------------------------------------- Data / backup
  function renderData(){
    const zone = document.getElementById('tab-zone');
    zone.innerHTML = `
      <div class="card page-narrow">
        <h2>Backup</h2>
        <p class="small">Download everything (students, subjects, photos and attendance) as one JSON file — handy before making big changes, or as a manual backup alongside GitHub sync.</p>
        <button class="btn" id="export-all">${APP.ICONS.cloud} Export full backup</button>
      </div>
      <div class="card page-narrow">
        <h2>Restore</h2>
        <p class="small">Restore from a previously exported backup file. This replaces current data in this browser.</p>
        <input type="file" id="import-file" accept="application/json">
      </div>
      <div class="card page-narrow">
        <h2>Reset</h2>
        <p class="small">Clear all locally saved data in this browser and reload the original roster shipped with the project. This can't be undone unless you have a backup.</p>
        <button class="btn btn-danger" id="reset-all">${APP.ICONS.trash} Reset app data</button>
      </div>
    `;
    document.getElementById('export-all').addEventListener('click', async () => {
      const subs = APP.subjectsFlat(subjectsObj);
      const attendance = {};
      for(const s of subs) attendance[s.id] = await APP.getAttendance(s.id);
      const bundle = { students, subjects: subjectsObj, photos, attendance, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `attendance-backup-${APP.todayISO()}.json`;
      a.click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const bundle = JSON.parse(reader.result);
          if(bundle.students) { students = bundle.students; APP.saveStudents(students); }
          if(bundle.subjects) { subjectsObj = bundle.subjects; APP.saveSubjects(subjectsObj); }
          if(bundle.photos) { photos = bundle.photos; APP.savePhotos(photos); }
          if(bundle.attendance){
            Object.entries(bundle.attendance).forEach(([id, data]) => APP.saveAttendance(id, data));
          }
          APP.logActivity('Restored data from backup file');
          APP.toast('Backup restored', 'ok');
        }catch(err){ APP.toast('Could not read that file', 'err'); }
      };
      reader.readAsText(file);
    });
    document.getElementById('reset-all').addEventListener('click', () => {
      if(!confirm('This clears all locally saved data in this browser. Continue?')) return;
      Object.keys(localStorage).filter(k => k.startsWith('cas_')).forEach(k => localStorage.removeItem(k));
      APP.toast('App data reset — reloading…', 'ok');
      setTimeout(() => window.location.href = 'index.html', 800);
    });
  }
})();
