# Penilaian Semester & Sertifikat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semester assessments (Cukup/Baik/Sangat Baik per aspect, Pemain & Kiper tracks) entered by admin/coach, published by admin, visible to students with a downloadable PDF certificate built from a per-semester template image.

**Architecture:** New Drizzle tables + `server/services/assessments/*` services behind thin `app/api/**` route handlers (existing `route()` wrapper). The PDF is built by one isomorphic module (`lib/certificate.ts`, pdf-lib) used by the download route and by the admin's browser for ZIP. Excel import/export reuses the student-import pattern (pure sheet helpers in `lib/`, server dry run, all-or-nothing).

**Tech Stack:** Next.js 16, Drizzle ORM 0.45 + Postgres (PGlite in tests), zod 4, vitest, pdf-lib 1.17.1, fflate 0.8.3, read-excel-file 9.3.12 / write-excel-file 4.1.1, Tailwind 3 with AFKC tokens (`laut`, `laut-dalam`, `laut-muda`, `pantai`, `daun`, `udang`).

**Spec:** `docs/superpowers/specs/2026-11-16-penilaian-sertifikat-design.md`

## Global Constraints

- Grades: exactly `CUKUP | BAIK | SANGAT_BAIK`, shown "Cukup", "Baik", "Sangat Baik". No totals or averages.
- Tracks: `PLAYER` (Pemain) and `GOALKEEPER` (Kiper). Eligibility: position `KIPER` → GOALKEEPER only; any other position incl. `null` → PLAYER; non-kiper with `is_goalkeeper = true` → both.
- Number format must contain `{urut}`; `{urut}` is the sequence zero-padded to 3 (`004`). One shared sequence per semester; order = student name A–Z (case-insensitive, id tiebreak), PLAYER before GOALKEEPER; assigned once, never reused, never changed. Format editable only until first publish.
- Students see only PUBLISHED semesters and only their own complete, numbered assessments of active accounts.
- Grades editable only while the semester is DRAFT. Admin + coach grade; admin-only: semesters, aspects, number format, certificate date, templates, publish/unpublish, delete assessment, ZIP.
- Template: PNG or JPEG ≤ 4 MB; page width A4 595.28 pt, height from image aspect. Fonts: `TimesRoman | TimesRomanBold | Helvetica | HelveticaBold | Courier | CourierBold`.
- Excel grade upload: all-or-nothing, dry run for preview, errors as `rows.<sheet line>.<field>`; accepts `Cukup/Baik/Sangat Baik` case-insensitive and `C/B/SB`; empty cell = leave score unchanged. Grid: "–" clears a score.
- Additive migrations only; Neon must be migrated before deploy. No new external storage. Pin new deps with `--save-exact` to versions ≥ 2 weeks old.
- UI copy in Indonesian; page titles via `AppHeader`; primary buttons `bg-laut-dalam hover:bg-laut`; class names via `classLabel()`.

## Review Focus

- A student requesting another student's certificate id, or one in a DRAFT semester → 404 (not 403, don't confirm existence). Test in Task 7.
- Unpublish → add an aspect → republish: previously numbered assessments keep their numbers, the now-incomplete one is hidden, new completes get max+1. Test in Task 5.
- Names with characters outside WinAnsi (e.g. "Nguyễn", emoji) and names longer than the field → PDF still builds; text shrinks to 60 % then ends with "…". Test in Task 6.
- Template upload that is a GIF, a renamed non-image, or > 4 MB → 422 with an Indonesian message. Test in Task 4.
- A coach saving grades (grid or Excel) into a PUBLISHED semester, or for a student not eligible for that track → 422/409, nothing written. Test in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/db/schema.ts` (modify) | 4 tables + 3 enums below |
| `drizzle/0006_assessments.sql` | generated migration |
| `server/services/assessments/semesters.ts` | semesters + aspects CRUD, lock rules |
| `server/services/assessments/grades.ts` | eligibility, grid read, save (merge/clear), delete assessment |
| `server/services/assessments/gradeImport.ts` | Excel import validation + save |
| `server/services/assessments/publish.ts` | publish summary, publish (numbering), unpublish, staff results |
| `server/services/assessments/templates.ts` | template image + fields |
| `server/services/assessments/certificates.ts` | certificate data with access checks, student "my grades" |
| `lib/assessment.ts` | shared constants/types: tracks, grades, labels, `formatCertificateNo`, `eligibleTracks` |
| `lib/gradeSheet.ts` | Excel template sheet + `gradeSheetToRows` (pure) |
| `lib/certificate.ts` | `layoutCertificate` (pure) + `buildCertificatePdf` (pdf-lib) |
| `app/api/assessments/**` | thin routes |
| `services/AssessmentService.ts` | FE API client |
| `app/app/assessments/**` | staff UI (list, semester detail tabs) |
| `app/app/grades/**` | student UI |

---

### Task 1: Schema, shared constants, dependencies

**Files:**
- Modify: `server/db/schema.ts`, `package.json`
- Create: `lib/assessment.ts`, `drizzle/0006_assessments.sql` (generated)
- Test: `tests/assessmentLib.test.ts`, extend `tests/schema.test.ts`

**Interfaces:**
- Produces (`lib/assessment.ts`):
  - `TRACKS = ['PLAYER','GOALKEEPER'] as const; type Track`
  - `GRADES = ['CUKUP','BAIK','SANGAT_BAIK'] as const; type Grade`
  - `TRACK_LABEL: Record<Track,string>` = `{ PLAYER: 'Pemain', GOALKEEPER: 'Kiper' }`
  - `GRADE_LABEL: Record<Grade,string>` = `{ CUKUP: 'Cukup', BAIK: 'Baik', SANGAT_BAIK: 'Sangat Baik' }`
  - `parseGrade(v: unknown): Grade | null | undefined` — `undefined` for empty, `null` for unparseable; accepts labels case-insensitive, enum values, `C`, `B`, `SB`
  - `eligibleTracks(s: { position: string | null; isGoalkeeper: boolean }): Track[]`
  - `formatCertificateNo(format: string, seq: number): string`
- Produces (schema, Drizzle names): `assessmentTrackEnum('assessment_track', TRACKS)`, `gradeEnum` not needed (scores are jsonb), `semesterStatusEnum('semester_status', ['DRAFT','PUBLISHED'])`; tables `assessmentSemesters`, `assessmentAspects`, `assessmentTemplates`, `assessments` with exactly the columns in spec §5 (camelCase in TS, snake_case in SQL). `assessments.scores: jsonb.$type<Record<string, Grade>>().notNull().default({})`. Unique `(semester_id, student_id, track)` and `(semester_id, certificate_seq)`. FKs: aspects/templates/assessments → semester `onDelete: cascade`; assessments.student_id → students cascade; assessments.class_id → classes restrict.

- [ ] **Step 1: Write failing tests**

```ts
it('eligibleTracks', () => {
  expect(eligibleTracks({ position: 'KIPER', isGoalkeeper: false })).toEqual(['GOALKEEPER']);
  expect(eligibleTracks({ position: 'KIPER', isGoalkeeper: true })).toEqual(['GOALKEEPER']);
  expect(eligibleTracks({ position: null, isGoalkeeper: false })).toEqual(['PLAYER']);
  expect(eligibleTracks({ position: 'ANCHOR', isGoalkeeper: true })).toEqual(['PLAYER', 'GOALKEEPER']);
});
it('parseGrade', () => {
  expect(['Cukup', 'c', 'CUKUP'].map(parseGrade)).toEqual(['CUKUP', 'CUKUP', 'CUKUP']);
  expect(['sangat baik', 'SB', 'Sangat  Baik'].map(parseGrade)).toEqual(['SANGAT_BAIK', 'SANGAT_BAIK', 'SANGAT_BAIK']);
  expect(parseGrade('')).toBeUndefined();
  expect(parseGrade(null)).toBeUndefined();
  expect(parseGrade('bagus')).toBeNull();
});
it('formatCertificateNo', () => {
  expect(formatCertificateNo('{urut}/S.FKC/XII/2025', 4)).toBe('004/S.FKC/XII/2025');
  expect(formatCertificateNo('{urut}', 1234)).toBe('1234');
});
```
Schema test: inserting two assessments with the same `(semester, student, track)` → pg code `23505`.

- [ ] **Step 2: Run** `npx vitest run tests/assessmentLib.test.ts tests/schema.test.ts` (PowerShell) — Expected: FAIL (module/tables missing)
- [ ] **Step 3: Implement** `lib/assessment.ts`; add tables to schema; `npx drizzle-kit generate --name assessments`; `npm install --save-exact pdf-lib@1.17.1 fflate@0.8.3`
- [ ] **Step 4: Run** same tests + `npx tsc --noEmit` — Expected: PASS, no type errors
- [ ] **Step 5: Commit** `feat(assessments): schema, constants, deps`

---

### Task 2: Semesters and aspects service

**Files:**
- Create: `server/services/assessments/semesters.ts`
- Test: `tests/assessmentSemesters.test.ts`

**Interfaces:**
- Consumes: Task 1 tables/constants.
- Produces:
  - `type SemesterDTO = { id; name; number_format; certificate_date: string|null /*YYYY-MM-DD*/; status: 'DRAFT'|'PUBLISHED'; first_published_at: string|null; published_at: string|null; aspects: Record<Track, { id: number; name: string; sort_order: number }[]>; has_template: Record<Track, boolean> }`
  - `listSemesters(db): Promise<SemesterDTO[]>` (newest first, non-deleted)
  - `getSemester(db, id): Promise<SemesterDTO>` (404 if missing/deleted)
  - `createSemester(db, input: { name; number_format }): Promise<SemesterDTO>` — copies aspects (both tracks, same order) from the most recently created non-deleted semester
  - `updateSemester(db, id, input: { name?; number_format?; certificate_date?: string|null }): Promise<SemesterDTO>` — `number_format` change after `first_published_at` → 409 "Format nomor sudah terkunci karena sertifikat sudah diterbitkan"
  - `deleteSemester(db, id)` — soft delete; refused (409) once `first_published_at` is set
  - `saveAspects(db, id, track, aspects: { id?: number; name: string }[]): Promise<SemesterDTO>` — DRAFT only (409 otherwise); diff-based like class schedules: ids kept/renamed, new inserted, missing deleted and their keys removed from every assessment's `scores` of that semester+track; `sort_order` = array index; names trimmed, 1–255 chars, no duplicates (422)
- Validation: `number_format` must contain `{urut}` (422 "Format nomor harus memuat {urut}"); `name` unique among non-deleted (409).

- [ ] **Step 1: Write failing tests** — create copies previous aspects; `{urut}` required; rename/reorder/delete aspects and the deleted aspect's score disappears from an existing assessment; saveAspects on PUBLISHED → 409; number_format locked after first publish (set `firstPublishedAt` directly in the test) but `name` and `certificate_date` still editable.
- [ ] **Step 2: Run** `npx vitest run tests/assessmentSemesters.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** functions above (zod schemas; `invalid`/`conflict`/`notFound` from `server/errors`).
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(assessments): semesters and aspects`

---

### Task 3: Grades (eligibility, grid, save)

**Files:**
- Create: `server/services/assessments/grades.ts`
- Test: `tests/assessmentGrades.test.ts`

**Interfaces:**
- Consumes: Task 1 `eligibleTracks`, Task 2 `getSemester`.
- Produces:
  - `type GridRow = { student_id; name; username; scores: Record<string /*aspect id*/, Grade> ; assessment_id: number|null; certificate_no: string|null }`
  - `getGradeGrid(db, semesterId, classId, track): Promise<{ aspects: {id;name}[]; rows: GridRow[] }>` — active students of the class eligible for the track, sorted by name; joins existing assessments of that semester+track
  - `saveGrades(db, actor: Actor, input: { semester_id; class_id; track; rows: { student_id; scores: Record<string, Grade | null> }[] }): Promise<{ saved: number }>` — DRAFT only (409 "Semester sudah diterbitkan; batalkan terbit untuk mengubah nilai"); each student must be active, in `class_id`, eligible for `track` (else 422 `rows.<i>.student_id`); aspect ids must belong to semester+track (422); `null` removes a key, a grade sets it, absent keys untouched; upsert on `(semester, student, track)`, sets `class_id` and `graded_by = actor.userId`; a new row whose merged scores are empty is not created; all in one transaction (batched via `chunks()`)
  - `deleteAssessment(db, assessmentId)` — admin-only at route level; allowed any status; numbers are not reused (just delete the row)
  - `isComplete(scores, aspectIds: number[]): boolean`

- [ ] **Step 1: Write failing tests** — grid lists only eligible students (KIPER only in Kiper grid; ANCHOR+is_goalkeeper in both; inactive excluded); save merges (second save of one aspect keeps the other), `null` clears; ineligible student → 422 and nothing written; PUBLISHED semester → 409; regrading from another class updates `class_id`; empty new row not created.
- [ ] **Step 2: Run** `npx vitest run tests/assessmentGrades.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(assessments): grade grid and save`

---

### Task 4: Templates and Excel grade import

**Files:**
- Create: `server/services/assessments/templates.ts`, `server/services/assessments/gradeImport.ts`, `lib/gradeSheet.ts`
- Test: `tests/assessmentTemplates.test.ts`, `tests/gradeImport.test.ts`, `tests/gradeSheet.test.ts`

**Interfaces:**
- Consumes: `imageData(maxBytes)` from `server/validation.ts`; Task 3 `saveGrades` semantics (reuse its internal validation/upsert helper — export `applyGrades(tx, semester, classId, track, rows, actor)` from `grades.ts` if needed).
- Produces:
  - `type TemplateField = { key: string; x: number; y: number; width: number; fontSize: number; font: FontName; align: 'left'|'center'|'right'; color: string }` and `FontName` — exported from `lib/certificate.ts` (Task 6) but declared here first if Task 6 isn't done: put both types in `lib/assessment.ts`.
  - `MAX_TEMPLATE_BYTES = 4 * 1024 * 1024`
  - `saveTemplateImage(db, semesterId, track, input: { image: string /*data URL*/; width_px: number; height_px: number }): Promise<void>` — PNG/JPEG only, ≤ 4 MB (422 "Template harus PNG atau JPG, maksimal 4 MB"); replacing the image keeps `fields`
  - `saveTemplateFields(db, semesterId, track, fields: TemplateField[]): Promise<void>` — zod: x,y,width in [0,1], fontSize 4–120, known font, align, `#rrggbb`, key one of `name|nickname|class|semester|number|published_date|aspect:<id of this semester+track>`; 404 if no image yet
  - `getTemplate(db, semesterId, track): Promise<{ image: Uint8Array; image_type; width_px; height_px; fields: TemplateField[] } | null>`; `getTemplateMeta(...)` without bytes, plus `image_url: /api/assessments/semesters/:id/templates/:track/image?v=<updated_at>`
  - `lib/gradeSheet.ts`: `gradeTemplateSheets(aspects: {id;name}[], rows: {username;name;scores}[], meta: { semester; className; track })` (sheet "Nilai": header `Username | Nama | <aspect names…>` prefilled with current grade labels; sheet "Petunjuk": allowed values) and `gradeSheetToRows(sheet: unknown[][], aspects: {id;name}[]): { rows: { _row; username; scores: Record<string, unknown> }[]; missing: string[] }` (match aspect columns by trimmed case-insensitive name; skip blank lines)
  - `importGrades(db, actor, input: { semester_id; class_id; track; dry_run?: boolean; rows: { _row?: number; username: string; scores: Record<string, unknown> }[] }): Promise<{ dry_run; count }>` — `parseGrade` each cell: `undefined` → unchanged, `null` → 422 `rows.<line>.aspect:<id>` "Isi Cukup, Baik, atau Sangat Baik"; unknown username / not in class / ineligible → 422 `rows.<line>.username`; then same write as `saveGrades`; max 500 rows

- [ ] **Step 1: Write failing tests** — template: GIF data URL → 422; 4 MB + 1 byte → 422; fields with unknown key or aspect of the other track → 422; re-upload keeps fields. Import: dry run writes nothing; `SB`/`c`/`Baik` parsed; empty cell keeps an existing grade; one bad row → nothing saved, error key `rows.5.aspect:<id>`; sheet round trip (`write-excel-file/node` → `read-excel-file/node` → `gradeSheetToRows`) returns the prefilled grades.
- [ ] **Step 2: Run** `npx vitest run tests/assessmentTemplates.test.ts tests/gradeImport.test.ts tests/gradeSheet.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(assessments): templates and Excel grade import`

---

### Task 5: Publish, unpublish, results

**Files:**
- Create: `server/services/assessments/publish.ts`
- Test: `tests/assessmentPublish.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `publishSummary(db, semesterId): Promise<{ tracks: Record<Track, { complete: number; incomplete: { student_id; name; class: string }[] }>; missing_templates: Track[]; can_publish: boolean }>` — counts only active students; `missing_templates` = tracks with ≥ 1 complete assessment but no template image
  - `publishSemester(db, semesterId): Promise<SemesterDTO>` — 409 if `missing_templates` non-empty; in one transaction: take complete assessments of active students with `certificate_seq IS NULL`, order by `lower(student.name)`, `student.id`, track (PLAYER first), assign `max(seq)+1…`; set `status='PUBLISHED'`, `published_at=now`, `first_published_at ??= now`, `certificate_date ??= today WIB`
  - `unpublishSemester(db, semesterId): Promise<SemesterDTO>` — status DRAFT, numbers untouched
  - `semesterResults(db, semesterId): Promise<{ student_id; name; class: string; track: Track; status: 'BELUM_LENGKAP'|'LENGKAP'|'BERNOMOR'|'NONAKTIF'; assessment_id; certificate_no: string|null; visible: boolean }[]>` — `visible` = semester PUBLISHED ∧ numbered ∧ complete ∧ active

- [ ] **Step 1: Write failing tests** — numbering A–Z with shared sequence and PLAYER before GOALKEEPER for a dual-track student (`001` Andi-Pemain, `002` Andi-Kiper, `003` Budi…); incomplete excluded; missing template → 409; **Review Focus:** unpublish → add aspect → complete only one of two numbered students → republish: both keep numbers, the incomplete one `visible=false`, a newly complete third gets `max+1`; deactivated student never numbered.
- [ ] **Step 2: Run** `npx vitest run tests/assessmentPublish.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(assessments): publish with stable certificate numbers`

---

### Task 6: Certificate PDF module

**Files:**
- Create: `lib/certificate.ts`
- Test: `tests/certificate.test.ts`

**Interfaces:**
- Consumes: `TemplateField`, `FontName` (Task 4 / `lib/assessment.ts`).
- Produces:
  - `type CertificateValues = Record<string, string>` — keys as field keys (`name`, `number`, `aspect:<id>`, …), values already formatted (grade labels upper-cased as in the template example, e.g. "SANGAT BAIK")
  - `A4_WIDTH = 595.28`
  - `pageSize(widthPx, heightPx): { width: number; height: number }`
  - `toWinAnsi(text: string): string` — NFD + strip combining marks, replace other non-WinAnsi chars with `?`
  - `layoutCertificate(fields: TemplateField[], values: CertificateValues, page: {width;height}, measure: (text, font, size) => number): { text; x; y; size; font; color }[]` — skip fields without a value; `x` from align within `[field.x*W, (field.x+field.width)*W]`; `y = H - field.y*H` (pdf-lib origin bottom-left); shrink size down to 60 % of `fontSize` to fit, then truncate with "…"
  - `buildCertificatePdf(input: { image: Uint8Array; imageType: 'image/png'|'image/jpeg'; widthPx; heightPx; fields: TemplateField[]; values: CertificateValues; title: string }): Promise<Uint8Array>` — one page, image drawn full-page, text via `StandardFonts`, metadata title
  - `certificateFileName(name, semester, track): string` — `Sertifikat-<Nama>-<Semester>-<Pemain|Kiper>.pdf`, non `[A-Za-z0-9-]` → `-`, collapsed

- [ ] **Step 1: Write failing tests** — `pageSize(2480, 3508)` ≈ A4 portrait (842 pt ±1); centered field x math; long name shrinks to ≥ 60 % then ends with "…"; **Review Focus:** `toWinAnsi('Nguyễn 😀')` contains no char > U+00FF and `buildCertificatePdf` with that name resolves; built PDF (1×1 PNG from earlier tests) reloads with `PDFDocument.load` → 1 page of the expected size.
- [ ] **Step 2: Run** `npx vitest run tests/certificate.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** (pdf-lib `embedPng`/`embedJpg`, `font.widthOfTextAtSize` as `measure`)
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(assessments): certificate PDF builder`

---

### Task 7: Certificate data, student grades, API routes

**Files:**
- Create: `server/services/assessments/certificates.ts`, `app/api/assessments/**/route.ts`, `app/api/me/grades/route.ts`
- Test: `tests/assessmentCertificates.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
  - `certificateInput(db, actor, assessmentId): Promise<Parameters<typeof buildCertificatePdf>[0] & { fileName: string }>` — student: only own, `visible` (Task 5 rule) else **404**; staff: any numbered or not (unnumbered prints number "—" as preview); values: `name`, `nickname`, `class` (via `classLabel`), `semester`, `number` (`formatCertificateNo`), `published_date` (Indonesian long date of `certificate_date`), `aspect:<id>` (GRADE_LABEL upper-case); 409 if the track has no template
  - `myGrades(db, actor): Promise<{ semester_id; semester: string; published_date; items: { assessment_id; track; certificate_no; class: string; aspects: { name; grade: Grade }[] }[] }[]>` — newest first, visible only
- Routes (all via `route()`; STAFF = admin+coach):
  - `GET/POST /api/assessments/semesters` (GET STAFF, POST ADMIN), `GET/PATCH/DELETE /api/assessments/semesters/[id]` (GET STAFF, others ADMIN)
  - `PUT /api/assessments/semesters/[id]/aspects` body `{ track, aspects }` ADMIN
  - `GET/PUT /api/assessments/semesters/[id]/grades?class_id&track` STAFF (PUT body per `saveGrades`)
  - `POST /api/assessments/semesters/[id]/grades/import` STAFF
  - `GET /api/assessments/semesters/[id]/publish` (summary) and `POST` (publish), `DELETE` (unpublish) ADMIN
  - `GET /api/assessments/semesters/[id]/results` STAFF
  - `GET/PUT /api/assessments/semesters/[id]/templates/[track]` (meta + fields) ADMIN; `PUT .../templates/[track]/image` ADMIN; `GET .../templates/[track]/image` STAFF (bytes, `Cache-Control: private, max-age=31536000, immutable`)
  - `DELETE /api/assessments/[assessmentId]` ADMIN
  - `GET /api/assessments/[assessmentId]/certificate` EVERYONE → `application/pdf`, `Content-Disposition: attachment; filename="<fileName>"`
  - `GET /api/assessments/[assessmentId]/certificate-input` ADMIN → JSON (image as base64) for browser ZIP
  - `GET /api/me/grades` STUDENT

- [ ] **Step 1: Write failing tests** — **Review Focus:** student B requesting A's assessment → 404; student A on DRAFT semester → 404; A on PUBLISHED + numbered → values contain formatted number and "SANGAT BAIK"; staff gets unnumbered preview; `myGrades` hides incomplete/numberless and other students.
- [ ] **Step 2: Run** `npx vitest run tests/assessmentCertificates.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** service + routes (routes stay thin: parse params, call service, `ok()` or `new Response(pdfBytes, headers)`)
- [ ] **Step 4: Run** full suite `npx vitest run` + `npx tsc --noEmit` — Expected: all PASS
- [ ] **Step 5: Commit** `feat(assessments): certificate download and API routes`

---

### Task 8: Staff UI — semesters, aspects, results, publish, ZIP

**Files:**
- Create: `services/AssessmentService.ts`, `app/app/assessments/page.tsx`, `app/app/assessments/Assessments.tsx` (list + create), `app/app/assessments/[id]/page.tsx`, `app/app/assessments/[id]/SemesterDetail.tsx` (tabs: Nilai · Aspek · Template · Hasil & Terbitkan), `app/app/assessments/[id]/AspectsTab.tsx`, `app/app/assessments/[id]/ResultsTab.tsx`
- Modify: `constants.tsx` (nav `{ id: 'assessments', label: 'Penilaian', icon: <ClipboardCheck/>, roles: ['ADMIN','COACH'], primary: false }`)

**Interfaces:**
- Consumes: Task 7 routes; `buildCertificatePdf`, `certificateFileName` (Task 6); `fflate.zipSync`.
- Produces: `AssessmentService` methods mirroring every route in Task 7 (names: `listSemesters, createSemester, getSemester, updateSemester, deleteSemester, saveAspects, getGrid, saveGrades, importGrades, publishSummary, publish, unpublish, results, getTemplate, saveTemplateFields, uploadTemplateImage, deleteAssessment, certificateUrl(id), certificateInput(id), myGrades`).

- [ ] **Step 1:** Build list page (AppHeader "Penilaian"; cards per semester with status badge DRAFT "Draf" / PUBLISHED "Terbit"; admin "Buat semester" modal: name, number format with hint `{urut}`).
- [ ] **Step 2:** Aspects tab: two columns (Pemain, Kiper), editable list (add, rename, ↑↓, delete with confirm "Nilai aspek ini akan ikut terhapus"), disabled with explanation when PUBLISHED.
- [ ] **Step 3:** Results tab: table (Nama, Kelas, Pemain/Kiper status chip, Nomor, Unduh); admin: certificate date field, "Terbitkan" opens summary dialog (complete/incomplete names, missing templates blocks), "Batalkan terbit", "Unduh semua (ZIP)" — sequentially fetch `certificateInput`, `buildCertificatePdf`, `zipSync`, progress "Membuat 12 dari 80…".
- [ ] **Step 4: Verify** `npx tsc --noEmit` and `npm run build` succeed; manual check against local DB: create semester → aspects copied, publish dialog lists incomplete students.
- [ ] **Step 5: Commit** `feat(assessments): staff semester pages`

---

### Task 9: Staff UI — grade grid, Excel, template editor

**Files:**
- Create: `app/app/assessments/[id]/GradesTab.tsx`, `app/app/assessments/[id]/GradeImport.tsx`, `app/app/assessments/[id]/TemplateTab.tsx`
- Test: none beyond Task 4/6 (pure logic already covered); manual check

**Interfaces:**
- Consumes: Task 8 `AssessmentService`; `lib/gradeSheet.ts`; `buildCertificatePdf`, `layoutCertificate`, `pageSize`.

- [ ] **Step 1:** Grades tab: class chips + track toggle (Pemain/Kiper); table students × aspects with a 4-choice segmented control per cell (`–`, Cukup, Baik, Sangat Baik), per-column "isi semua"; dirty tracking + `SaveBar` (components/SaveBar.tsx) above the table; read-only with notice when PUBLISHED; phone: one student per card with the aspect choices stacked.
- [ ] **Step 2:** Excel: "Unduh template nilai" (prefilled via `gradeTemplateSheets`), upload → `gradeSheetToRows` → dry run → preview table like `StudentImport` → save.
- [ ] **Step 3:** Template tab (admin): per track upload PNG/JPG (resize in browser only if > 4 MB, using `lib/image.ts` with max 3508 px), image shown at container width with absolutely-positioned field boxes in % (pointer drag to move; drag right edge to set width); side panel lists available keys (Nama lengkap, Panggilan, Kelas, Semester, Nomor, Tanggal, and each aspect) to add/remove, plus font, size, align, color for the selected field; "Simpan posisi"; "Pratinjau PDF" builds the PDF in the browser with the first graded student (or sample text) and opens it in a new tab.
- [ ] **Step 4: Verify** build + manual: upload the owner's example design, place Nama + Nomor + 4 aspect values, preview PDF lines up with the boxes.
- [ ] **Step 5: Commit** `feat(assessments): grade entry and template editor`

---

### Task 10: Student UI, dashboard card, docs

**Files:**
- Create: `app/app/grades/page.tsx`, `app/app/grades/Grades.tsx`
- Modify: `constants.tsx` (nav `{ id: 'grades', label: 'Nilai', icon: <Award/>, roles: ['STUDENT'], primary: true }`), `app/app/dashboard/StudentView.tsx` (card "Nilai semester terbaru" linking to `/app/grades` when `myGrades` non-empty), `README.md` (Penilaian section), `DEPLOY.md` (note: run migration 0006 on Neon before deploying)

- [ ] **Step 1:** Grades page: AppHeader "Nilai"; per semester card: semester name + date; per track a list aspect → grade chip (Cukup neutral, Baik `laut`, Sangat Baik `daun`, each with text); certificate no; button "Unduh sertifikat (PDF)" → `/api/assessments/:id/certificate`. Empty state: "Nilai akan tampil di sini setelah diterbitkan oleh admin."
- [ ] **Step 2:** Dashboard card + nav; docs.
- [ ] **Step 3: Verify** `npx vitest run`, `npx tsc --noEmit`, `npm run build`, `npx next build --webpack` all pass; manual: as student see only published grades and download PDF.
- [ ] **Step 4: Commit** `feat(assessments): student grades page`
