# Cambridge Attendance System

A lightweight, self-contained student attendance manager covering both the
**BTEC** programme (BTEC-I / BTEC-II, IT and Business) and the **Cambridge**
programme (IG1, IG2, IG3, AS, A2), designed to run entirely as a static site
on **GitHub Pages** — no server, no database, no build step.

It covers:
- Taking attendance per class, marking **Present / Absent / Leave**. For BTEC
  that's Level → Course → Subject → Date; for Cambridge it's Level → (Section,
  for IG1/IG2 only) → Subject → Date, since Cambridge subjects are chosen per
  student rather than fixed by a course.
- Attendance tracked **per student, per subject** — every student gets a
  blended overall %, plus a separate % for each subject they're enrolled in.
- A student roster with add / edit / remove. BTEC students get their course's
  3 subjects automatically; Cambridge students get an editable checklist to
  pick their own subjects. A profile view shows contact details and a
  per-subject attendance breakdown.
- Reports with **one row per student, per subject** — sortable, exportable to
  CSV, each row flagging that specific subject's % if it drops below 75%,
  alongside a blended overall % column for context.
- A dashboard with a class-wide average and a "subjects to watch" list —
  specific student/subject combinations under 75%.
- Student photos via a simple, editable `data/photos.json` file, keyed by
  each student's unique registration/ID number (a few names repeat across
  185 students, so name-only keys aren't safe — the Settings UI still shows
  names, just keyed by ID underneath).
- Optional **live sync to your GitHub repo's main branch**, so every save
  also commits the updated JSON files to GitHub.

---

## 1. Quick start (just try it locally)

You can't open `index.html` directly by double-clicking it (browsers block
`fetch()` on `file://` URLs). Run a tiny local server instead:

```bash
cd attendance-system
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Everything works immediately with all 185 students (BTEC + Cambridge)
already imported — no setup required.

## 2. Deploying to GitHub Pages

1. Create a new repository on GitHub (public or private — Pages works with
   both on paid plans; public repos get free Pages hosting).
2. Upload the **contents** of this folder to the repository's `main` branch
   (drag-and-drop on github.com works fine, or `git push`).
3. In the repo, go to **Settings → Pages**, set **Source** to `main` branch,
   root folder, and save.
4. GitHub gives you a URL like `https://yourusername.github.io/your-repo/`.
   That's your live attendance system.

That's it — the whole app is static HTML/CSS/JS, so there's nothing to build
or install on GitHub's side.

## 3. How data storage works

The app has two layers, so it's fully usable even if you never touch the
GitHub sync feature:

- **Browser storage (always on):** every save (attendance, student edits,
  photos, subjects) is written instantly to your browser's `localStorage`.
  This is what the app reads from on every visit — it's fast and works
  offline. The first time you open the app on a given browser, it seeds
  itself from the JSON files in `/data`.
- **GitHub sync (optional):** if you turn it on in **Settings → GitHub
  Sync**, every save is *also* pushed straight to the matching file in
  `/data` on your repo's main branch, using GitHub's REST API. This is what
  makes the data show up for anyone else who opens the deployed site (since
  they don't share your browser's local storage).

Because `localStorage` is per-browser, if you take attendance on your phone
and then open the site on a laptop, the laptop won't see today's marks
**unless GitHub sync is on** (or you use the manual backup/restore in
Settings → Backup & reset). If you'll ever use more than one device, turning
on sync is worth it.

### Setting up GitHub sync

1. Go to **Settings → GitHub Sync** in the app.
2. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
   scoped to **only this repository**, with **Contents: Read and write**
   permission and nothing else. Don't use a broad classic token.
3. Enter your GitHub username, the repository name, the branch (`main`), and
   the token. Click **Test connection**, then **Save settings**.
4. The token is stored only in that browser's local storage and is sent
   directly to GitHub's API — never anywhere else. Don't enable this on a
   shared or public computer, and don't commit the token anywhere.

## 4. Adding student photos

Go to **Settings → Photos** — every student is listed with a text field.
Paste a direct image URL (any publicly reachable link) and click **Save
photos**. A live thumbnail preview appears as you type.

Under the hood this writes to `data/photos.json`, a flat file keyed by each
student's unique registration/ID number (not their name — a few names repeat
across the full 185-student roster, e.g. two different students are both
named "Haider Ali", so name-only keys would collide):

```json
{
  "302162": "https://example.com/photos/sami.jpg",
  "IG1-001": ""
}
```

You (or a future script) can also edit this file directly — look up the
student's ID on the Students page or in Settings → Photos (shown next to
their name), paste a link next to it, and it'll pick up the next time that
browser reloads from `/data`, or immediately if GitHub sync pushes the
change back down. Empty string = no photo yet, shows the student's initials
instead.

## 5. Renaming or adding subjects, and how enrollment works

Go to **Settings → Subjects**. Every subject has a stable ID next to an
editable name field — rename freely, the ID (and therefore all attendance
history for that subject) doesn't change. **Add subject** appends a new one;
the trash icon removes a subject from the dropdowns (past attendance for it
is kept, just hidden).

- **BTEC** subjects are still nested under Level → Course (e.g. `L1-IT-2`)
  and are fixed — every student on that course gets all 3 automatically via
  their `subjects[]` array, with no per-student choice.
- **Cambridge** subjects are a flat list per grade (e.g. `IG1-PHY`) since
  Cambridge has no course tier. Each student's `subjects[]` array is their
  own individual pick, set via a checklist in their edit modal on the
  Students page.

The subjects shipped with this project are realistic placeholders (for BTEC)
or parsed from your provided spreadsheet (for Cambridge) — rename anything
that doesn't match your actual curriculum.

## 6. Attendance percentage logic

For each student/subject, the app counts **Present** and **Absent** marks.
**Leave** is treated as excused and is shown separately but doesn't count
against the percentage:

```
Attendance % = Present / (Present + Absent) × 100
```

A student's **overall %** (shown on their profile, and as a column in
Reports) pools Present/Absent across *every* subject they're enrolled in —
so it stays meaningful even while you're looking at just one of their
subjects. The Dashboard and Reports "below 75%" flags apply at the
individual subject level, so a student who's fine overall but slipping in
one specific subject still gets surfaced.

The "Below 75%" indicators on the Dashboard and Reports page use this
figure. A student with zero marked classes shows "no data" rather than 0%.

## 7. Two things to fix after import

- Three **BTEC** students had no course listed in the original spreadsheet
  (Abdullah Kiani, Muhammad Muneeb Khan, Muhammad Talal Tahir) — imported
  with course **"Unassigned"**. Open each from Students and set their real
  course; their `subjects[]` will populate automatically once you do.
- Some **Cambridge** students had a blank Subjects cell in the raw sheet (2
  in IGCSE III, 2 in AS, 6 in A2) — imported with an empty `subjects: []`.
  Open each and tick their subjects from the checklist when you have the
  info.

## 8. Backup, restore, and reset

**Settings → Backup & reset**:
- **Export full backup** downloads one JSON file with every student,
  subject, photo, and attendance record — good practice before big changes.
- **Restore** loads a previously exported backup back into the current
  browser.
- **Reset app data** wipes this browser's local copy and reloads the
  original `/data` files shipped with the project.

## 9. Data model reference

```json
// data/students.json — one entry per student, BTEC and Cambridge mixed together
{
  "id": "IG1-001",            // unique — BTEC uses real registration numbers, Cambridge uses placeholders
  "level": "IG1",              // "BTEC-I" | "BTEC-II" | "IG1" | "IG2" | "IG3" | "AS" | "A2"
  "section": "A",               // only meaningful for BTEC-I/II and IG1/IG2 — null otherwise
  "course": null,                // "BTEC IT" | "BTEC Business" | "Unassigned" for BTEC — always null for Cambridge
  "subjects": ["IG1-PHY", "IG1-CHEM", "IG1-BIO", "IG1-ICT"],  // the actual enrollment — this is what drives rosters
  "name": "Abdul Hadi Ejaz",
  "...": "fatherName, mobile, dob, category, etc. — same fields for both programmes"
}
```

```json
// data/subjects.json — two shapes live side by side
{
  "BTEC-I": { "BTEC IT": [{"id":"L1-IT-1","name":"..."}], "BTEC Business": [...] },  // nested: level → course → subjects
  "IG1":    [{"id":"IG1-PHY","name":"Physics"}, ...]                                 // flat: level → subjects directly
}
```

Every page reads subjects through `APP.subjectsFlat()` / `APP.getSubjectsFor()`
in `core.js`, which handle both shapes transparently — so a page never needs
to know or care whether a given level uses the BTEC or Cambridge shape.

## 10. Project structure

```
attendance-system/
├── index.html            Dashboard
├── attendance.html       Take Attendance
├── students.html         Student roster, add/edit, profiles
├── reports.html          Attendance reports + CSV export
├── settings.html         GitHub sync, subjects, photos, backups
├── assets/
│   ├── css/style.css     Design system
│   ├── js/
│   │   ├── core.js       Data layer, GitHub sync engine, shared layout,
│   │   │                 subjectsFlat/getEnrolledSubjects/subjectStatsForStudent
│   │   ├── profile.js    Shared student profile modal
│   │   ├── dashboard.js / attendance.js / students.js / reports.js / settings.js
│   └── img/               Logo + flag icons
└── data/
    ├── students.json      Roster — BTEC (backfilled) + Cambridge, 185 total
    ├── subjects.json      BTEC nested by course; Cambridge flat by grade
    ├── photos.json        Student ID → photo URL (not name — see §4)
    └── attendance/         One JSON file per subject (60 total), records keyed by date
```

## 11. Browser support

Built with plain HTML/CSS/JS — works in any modern browser (Chrome, Edge,
Safari, Firefox) on desktop or mobile. No build tools, frameworks, or npm
install required.
