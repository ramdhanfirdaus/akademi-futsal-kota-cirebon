/**
 * The grade import spreadsheet: a sheet prefilled with a class's students and current grades,
 * and turning a read sheet back into API rows. Pure functions (no browser APIs).
 */
import { GRADE_LABEL, TRACK_LABEL, type Grade, type Track } from "./assessment";

type Aspect = { id: number; name: string };
type Cell = {
  value: string;
  fontWeight?: "bold";
  backgroundColor?: string;
  type?: typeof String;
} | null;

const norm = (v: unknown) =>
  String(v ?? "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const bold = (value: string, backgroundColor?: string): Cell => ({
  value,
  fontWeight: "bold",
  ...(backgroundColor ? { backgroundColor } : {}),
});

export function gradeTemplateSheets(
  aspects: Aspect[],
  rows: { username: string; name: string; scores: Record<string, Grade> }[],
  meta: { semester: string; className: string; track: Track },
) {
  const head: Cell[] = [
    bold("Username", "#F9CF00"),
    bold("Nama", "#E6F2FA"),
    ...aspects.map((a) => bold(a.name, "#F9CF00")),
  ];
  const body: Cell[][] = rows.map((r) => [
    { value: r.username, type: String },
    { value: r.name, type: String },
    ...aspects.map((a): Cell => {
      const g = r.scores[String(a.id)];
      return g ? { value: GRADE_LABEL[g], type: String } : null;
    }),
  ]);
  const guide: Cell[][] = [
    [bold("Semester"), { value: meta.semester }],
    [bold("Kelas"), { value: meta.className }],
    [bold("Jalur"), { value: TRACK_LABEL[meta.track] }],
    [],
    [bold("Nilai yang boleh diisi")],
    [{ value: "Cukup" }, { value: "atau C" }],
    [{ value: "Baik" }, { value: "atau B" }],
    [{ value: "Sangat Baik" }, { value: "atau SB" }],
    [],
    [{ value: "Sel kosong = nilai yang sudah ada tidak diubah." }],
    [
      {
        value:
          "Jangan ubah kolom Username. Kolom Nama hanya sebagai keterangan.",
      },
    ],
  ];
  return [
    {
      sheet: "Nilai",
      data: [head, ...body],
      columns: [
        { width: 16 },
        { width: 26 },
        ...aspects.map(() => ({ width: 16 })),
      ],
      stickyRowsCount: 1,
    },
    { sheet: "Petunjuk", data: guide, columns: [{ width: 26 }, { width: 50 }] },
  ];
}

export type GradeSheetRow = {
  _row: number;
  username: string;
  scores: Record<string, unknown>;
};

/**
 * Sheet rows (row 1 = header) → `{ _row, username, scores: { <aspect id>: raw cell } }`.
 * Columns are matched by header text (case-insensitive); blank lines are skipped.
 * `missing` lists expected headers not found (Username and any aspect).
 */
export function gradeSheetToRows(
  sheet: unknown[][],
  aspects: Aspect[],
): { rows: GradeSheetRow[]; missing: string[] } {
  const [header = [], ...body] = sheet;
  const heads = header.map(norm);
  const userCol = heads.indexOf("username");
  const aspectCols = aspects.map((a) => ({
    id: String(a.id),
    name: a.name,
    col: heads.indexOf(norm(a.name)),
  }));
  const missing = [
    ...(userCol < 0 ? ["Username"] : []),
    ...aspectCols.filter((a) => a.col < 0).map((a) => a.name),
  ];

  const rows: GradeSheetRow[] = [];
  body.forEach((cells, i) => {
    const text = (col: number) =>
      col < 0 || cells[col] === null || cells[col] === undefined
        ? ""
        : String(cells[col]).trim();
    const username = text(userCol);
    const scores: Record<string, unknown> = {};
    for (const a of aspectCols) {
      const v = text(a.col);
      if (v) scores[a.id] = v;
    }
    if (username || Object.keys(scores).length)
      rows.push({ _row: i + 2, username, scores });
  });
  return { rows, missing };
}
