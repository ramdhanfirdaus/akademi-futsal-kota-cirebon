import { describe, expect, it } from "vitest";
import writeExcelFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import { gradeSheetToRows, gradeTemplateSheets } from "@/lib/gradeSheet";

const aspects = [
  { id: 11, name: "Passing" },
  { id: 12, name: "Dribbling" },
];

describe("grade sheet", () => {
  it("round trips the prefilled grades", async () => {
    const sheets = gradeTemplateSheets(
      aspects,
      [
        { username: "andi01", name: "Andi", scores: { "11": "SANGAT_BAIK" } },
        { username: "budi02", name: "Budi", scores: {} },
      ],
      { semester: "2026 Semester 1", className: "Kelas A", track: "PLAYER" },
    );
    const buffer = await writeExcelFile(sheets as never).toBuffer();
    const sheet = (await readSheet(buffer)) as unknown[][];
    const { rows, missing } = gradeSheetToRows(sheet, aspects);
    expect(missing).toEqual([]);
    expect(rows).toEqual([
      { _row: 2, username: "andi01", scores: { "11": "Sangat Baik" } },
      { _row: 3, username: "budi02", scores: {} },
    ]);
    const guide = (await readSheet(buffer, "Petunjuk")) as unknown[][];
    expect(guide.flat()).toEqual(
      expect.arrayContaining(["Cukup", "Baik", "Sangat Baik"]),
    );
  });

  it("matches aspect columns by name in any order and skips blank lines", () => {
    const { rows, missing } = gradeSheetToRows(
      [
        ["dribbling ", "Nama", "USERNAME"],
        ["B", "Andi", "andi01"],
        [null, null, null],
        ["sb", "", ""],
      ],
      aspects,
    );
    expect(missing).toEqual(["Passing"]);
    expect(rows).toEqual([
      { _row: 2, username: "andi01", scores: { "12": "B" } },
      { _row: 4, username: "", scores: { "12": "sb" } },
    ]);
  });

  it("reports a missing Username column", () => {
    expect(
      gradeSheetToRows([["Nama", "Passing", "Dribbling"]], aspects).missing,
    ).toEqual(["Username"]);
  });
});
