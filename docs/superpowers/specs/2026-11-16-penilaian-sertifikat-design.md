# Penilaian semester & sertifikat — design

Status: draft for owner approval (2026-11-16)
App: `afkc/` (Next.js 16 route handlers + Drizzle + Postgres/Neon, deployed on Netlify free tier)

## 1. Intent

AFKC gives every student a semester report ("Raport Pembelajaran"): a printed certificate listing
each assessed skill with a grade. Today this is done by hand (Word mail-merge). The owner wants:

- coaches and admins to enter grades in the app,
- students to see their own grades in their account once the admin publishes them,
- students to download their certificate for that semester as a PDF,
- the certificate to look exactly like the academy's designed template, which changes each semester.

Success: at the end of a semester the admin uploads the new design, coaches fill grades, the admin
presses "Terbitkan", and every student can download a correct, numbered certificate — no Word,
no Google Drive, no per-student manual work.

## 2. Goals, non-goals, anti-goals

Goals
- Semesters with their own aspect lists and certificate templates.
- Two tracks: **Pemain** and **Kiper**, each with its own aspects and template.
- Grades are exactly one of **Cukup / Baik / Sangat Baik** per aspect. No totals, no averages.
- Grades entered in-app (grid) or by Excel upload, by admin or coach.
- Admin publishes; only then do students see grades and certificates.
- Certificate PDF generated on download from template + grades.
- Sequential certificate numbers per semester, e.g. `004/S.FKC/XII/2025`.

Non-goals (this version)
- Google Drive or any external file storage.
- Word/.docx templates.
- Coach comments/notes per student.
- Per-class aspect lists (aspects are the same for every class).
- Emailing/WhatsApp-ing certificates.
- Coach-specific permissions (a coach can grade any class — same as the rest of the app today).

Anti-goals (would be a failure even if it "works")
- A student seeing grades or a certificate before the admin publishes.
- A certificate number changing after it was published.
- Changing next semester's aspects or template altering an earlier semester's grades or certificates.
- Student A being able to download student B's certificate.
- A partial save of an Excel grade upload (same all-or-nothing rule as the student import).

## 3. Decisions made with the owner

1. Grade scale: `CUKUP`, `BAIK`, `SANGAT_BAIK` (displayed "Cukup", "Baik", "Sangat Baik").
2. No final grade or average.
3. Admin **and** coach can enter grades. Only admin publishes.
4. Students see grades only after the admin publishes the semester.
5. Aspects are the same for all classes; they differ between Pemain and Kiper.
6. The template design can differ every semester (and between Pemain and Kiper).
7. Track eligibility (evaluated from the student's current data when grading):
   - Position `KIPER` → **Kiper** only.
   - Any other position, including "belum ditentukan" (`null`) → **Pemain**.
   - Non-kiper with "Ikut latihan kiper" (`is_goalkeeper = true`) → **both** Pemain and Kiper (two
     assessments, two certificates).
8. Certificate number: sequence `001, 002, …` per semester, **one shared sequence** for Pemain and
   Kiper; the rest of the number (e.g. `S.FKC/XII/2025`) is the same for every certificate in the
   semester and is set by the admin.
9. Certificates are generated on download (approach A below), not stored.
10. Owner accepted these proposals:
    - semester name is free text (e.g. "2026 Semester 1");
    - aspects are stored per semester, copied from the previous semester when a new one is created;
    - each assessment stores the student's class at grading time;
    - grades can be entered in an in-app grid and via Excel;
    - numbers ordered by student name A–Z; a student with two certificates gets two consecutive
      numbers, Pemain first;
    - numbers are assigned at first publication and never change; unpublish → fix → republish
      keeps existing numbers, newly completed assessments get the next numbers;
    - after publication grades are locked until the admin unpublishes;
    - at publication the admin sees who is incomplete and may publish anyway; incomplete
      assessments get no number/certificate and stay hidden; students with no grades are simply
      not part of that semester;
    - no coach notes for now; class is stored but printing it is optional (a placeholder exists);
    - template = PDF-free **image** exported from Word/Canva with the per-student spots left blank;
      admin drags fields onto it; standard PDF fonts (Times/Helvetica/Courier, regular/bold).

## 4. Approaches considered

- **A. Generate PDF on download (chosen).** Store template image + field positions + grades; build
  the PDF per request (~1 s). Bulk "Unduh semua" builds PDFs in the admin's browser and zips them,
  avoiding Netlify's short function timeout. No file storage; corrections show up immediately.
- B. Generate all PDFs at publish and store them. Faster downloads, but storage grows every
  semester (Neon free = 0.5 GB), every correction needs regeneration, and generating hundreds of
  PDFs in one request risks the function timeout.
- C. HTML certificate + browser "Print → Save as PDF". No PDF library, but layout depends on the
  student's browser/printer and is awkward on phones.

The owner picked **A**.

## 5. Data model (new tables)

Names are a proposal; the builder may adjust names but not the semantics.

`assessment_semesters`
- `id`, `name` (varchar 255, unique among non-deleted), `number_format` (varchar 255, must contain
  `{urut}`; example `{urut}/S.FKC/XII/2025`), `certificate_date` (date, optional — the date the
  `published_date` field prints; defaults to the date of the first publish), `status` (`DRAFT` |
  `PUBLISHED`), `first_published_at` (timestamp, set once), `published_at` (latest publish),
  `created_at`, `updated_at`, `deleted_at`.

`assessment_aspects`
- `id`, `semester_id` → semesters, `track` (`PLAYER` | `GOALKEEPER`), `name` (varchar 255),
  `sort_order` (int). Unique `(semester_id, track, sort_order)`.

`assessment_templates`
- `semester_id`, `track` — primary key `(semester_id, track)`.
- `image` (bytea), `image_type` (`image/png` | `image/jpeg`), `width_px`, `height_px`,
  `fields` (jsonb — see §7), `updated_at`.

`assessments`
- `id`, `semester_id`, `student_id` → students, `track`, `class_id` (class at grading time),
  `scores` (jsonb: `{ "<aspect_id>": "CUKUP" | "BAIK" | "SANGAT_BAIK" }`),
  `certificate_seq` (int, null until numbered), `graded_by` (user id, last editor), timestamps.
- Unique `(semester_id, student_id, track)`; unique `(semester_id, certificate_seq)`.

"Complete" = has a score for every aspect of its semester+track.

## 6. Behaviour

### Semester lifecycle (admin)
1. **Buat semester**: name + number format. Aspects for both tracks are copied from the most
   recent semester (empty if none). Status `DRAFT`.
2. **Atur aspek** (draft only): add/rename/reorder/delete per track. Deleting an aspect removes
   its scores from that semester's assessments (confirm first). Adding one makes assessments
   incomplete until filled.
3. **Unggah template** per track (draft or published — the design may be fixed after publishing;
   it only changes look, not grades or numbers) and position fields (§7).
4. Grades are entered (below).
5. **Terbitkan**: shows counts — complete, incomplete (with names), per track. On confirm:
   assign `certificate_seq` to complete assessments that have none, continuing after the current
   max, ordered by student name (case-insensitive, `id` tiebreak), Pemain before Kiper; set status
   `PUBLISHED`, `published_at = now`. Publishing requires both a template for every track that has
   at least one complete assessment, and `number_format` containing `{urut}`.
6. **Batalkan terbit**: back to `DRAFT`; numbers stay. Grades editable again.

Builder-check rulings (builder's calls, marked so the owner can correct them):
- *Numbered but no longer complete* (an aspect added or scores cleared after unpublish): it keeps
  its number, is hidden from the student until complete again, and is listed as "belum lengkap"
  in the publish dialog. Numbers are never reused, so gaps are possible.
- *Number format* is editable only until the semester is first published; after that it is
  locked, so issued numbers never change.
- *Certificate date*: the `published_date` field prints `certificate_date` (admin-editable on the
  semester; defaults to the first publish date). Re-publishing never changes it on its own.
  (In the owner's example the date is part of the design image, so this field is optional.)
- *Eligibility* is checked when grading only. An existing complete assessment stays valid even if
  the student's position/"ikut latihan kiper" changes later (they were graded on that track this
  semester). Assessments of students whose account is deactivated are not numbered and not shown.
  The admin results table shows such leftovers with a "hapus penilaian" action.
- *Empty cells*: in Excel, an empty cell leaves the existing score unchanged (merge); in the grid,
  each cell has a "–" choice that clears the score. Saving merges into `scores`.

### Grade entry (admin or coach), draft semesters only
- **Grid**: pick semester → class → track. Rows = active students of that class eligible for the
  track (rule 7), sorted by name; columns = aspects; each cell a 3-option choice; quick "isi semua
  kolom dengan …" per column. Save writes the changed rows in one request (batched, like
  attendance). A row with no choices at all is not created.
- **Excel**: "Unduh template nilai" for semester+class+track produces a sheet pre-filled with the
  eligible students (columns: Username, Nama, then one column per aspect). Upload validates all
  rows first (unknown username, ineligible student, value not one of Cukup/Baik/Sangat Baik —
  accept case-insensitive and `C/B/SB`); any problem → nothing saved, errors per spreadsheet
  line, preview like the student import. Empty cells leave that score unset.
- Changing a student's class later does not move their assessment; `class_id` keeps the class
  at grading time. Grading again from another class's grid updates `class_id`.

### Student view
- New menu **Nilai** (students only). Lists published semesters in which the student has a
  numbered assessment, newest first. For each: track label (Pemain/Kiper), aspect → grade list,
  certificate number, button **Unduh sertifikat (PDF)**.
- Student dashboard: a small card linking to the latest published result when one exists.
- API must return only the caller's own published, numbered assessments.

### Admin/coach view of results
- Per semester: table of students with status per track (belum dinilai / belum lengkap / lengkap /
  bernomor), download one certificate, and **Unduh semua (ZIP)** (admin) built in the browser.

## 7. Certificate template & PDF

- Upload: PNG or JPEG, max 4 MB (base64 must fit Netlify's ~6 MB request limit), browser-resized
  only if over the limit. Recommend exporting A4 at 150–300 DPI with blank spots for per-student
  text.
- Page size: A4 width (595.28 pt), height from the image aspect ratio (supports portrait and
  landscape).
- `fields` jsonb: array of
  `{ key, x, y, width, fontSize, font, align, color }`, with `x`, `y`, `width` as fractions of the
  page (0–1, `y` = text baseline from the top), `fontSize` in pt at A4 width, `font` one of
  `TimesRoman | TimesRomanBold | Helvetica | HelveticaBold | Courier | CourierBold`, `align`
  `left | center | right`, `color` hex.
- Field keys: `name` (nama lengkap), `nickname`, `class`, `semester`, `number` (formatted number),
  `published_date` (e.g. "31 Desember 2025"), and `aspect:<aspect_id>` for each aspect's grade.
  Unplaced keys are simply not printed.
- Text longer than `width` shrinks font size down to 60 % then truncates with "…".
- Names with characters outside the standard fonts' WinAnsi set are transliterated (e.g. accents
  stripped) rather than failing.
- Editor: the template image shown at screen width; fields are draggable boxes showing sample text
  ("NAMA LENGKAP", "SANGAT BAIK", the formatted number); a side panel sets font/size/align; a
  **Pratinjau PDF** button renders a real PDF with the first graded student (or sample data).
- Generation uses **pdf-lib** (same code in the route handler and in the browser for ZIP);
  ZIP via **fflate** (already installed with read-excel-file).
- Filename: `Sertifikat-<Nama>-<Semester>-<Pemain|Kiper>.pdf` (sanitised).

## 8. Permissions summary

| Action | Admin | Coach | Student |
|---|---|---|---|
| Create semester, edit aspects, number format, templates | ✓ | — | — |
| Enter/import grades (draft semesters) | ✓ | ✓ | — |
| Publish / unpublish | ✓ | — | — |
| View all results, download any certificate | ✓ | ✓ | — |
| Download ZIP of all | ✓ | — | — |
| View own published grades, download own certificate | — | — | ✓ |

## 9. Constraints

- Netlify free: short synchronous function timeout and ~6 MB request body → single-certificate
  generation on the server, bulk generation in the browser; template upload ≤ 4 MB.
- Neon free 0.5 GB: only templates are stored as images (two per semester).
- Keep code host-agnostic; reuse existing patterns: `route()` wrapper, zod validation with
  `zodErrors`, batched writes with `chunks()`, all-or-nothing Excel import with dry run,
  `read-excel-file`/`write-excel-file` (pinned), TDD with PGlite tests.
- New migrations are additive; production (Neon) must be migrated before deploying.

## 10. Left to the builder

- Exact table/column names, indexes, API route shapes, component structure.
- Drag/resize interaction details in the template editor (mouse + touch).
- Visual design of the new pages within the existing app shell.
- Whether bulk ZIP is one file or split for very large semesters.
