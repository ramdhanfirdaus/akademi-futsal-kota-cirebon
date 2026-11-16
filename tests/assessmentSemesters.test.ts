import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./helpers/db";
import { makeClass, makeCoach, makeStudent } from "./helpers/fixtures";
import { assessmentSemesters, assessments } from "@/server/db/schema";
import type { Db } from "@/server/db";
import { fail } from "@/server/http";
import {
  createSemester,
  deleteSemester,
  getSemester,
  listSemesters,
  saveAspects,
  updateSemester,
} from "@/server/services/assessments/semesters";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const status = async (p: Promise<unknown>) =>
  fail(
    await p.then(
      () => null,
      (e) => e,
    ),
  ).status;
const names = (list: { name: string }[]) => list.map((a) => a.name);

describe("semesters", () => {
  it("creates a draft semester and copies aspects from the latest one", async () => {
    const first = await createSemester(db, {
      name: "2025 Semester 2",
      number_format: "{urut}/S.FKC/XII/2025",
    });
    expect(first.status).toBe("DRAFT");
    expect(first.aspects).toEqual({ PLAYER: [], GOALKEEPER: [] });
    await saveAspects(db, first.id, "PLAYER", [
      { name: "Passing" },
      { name: "Dribbling" },
    ]);
    await saveAspects(db, first.id, "GOALKEEPER", [{ name: "Positioning" }]);

    const second = await createSemester(db, {
      name: "2026 Semester 1",
      number_format: "{urut}/S.FKC/VI/2026",
    });
    expect(names(second.aspects.PLAYER)).toEqual(["Passing", "Dribbling"]);
    expect(names(second.aspects.GOALKEEPER)).toEqual(["Positioning"]);
    expect(second.aspects.PLAYER[0].id).not.toBe(
      (await getSemester(db, first.id)).aspects.PLAYER[0].id,
    );
    expect((await listSemesters(db)).map((s) => s.name)).toEqual([
      "2026 Semester 1",
      "2025 Semester 2",
    ]);
  });

  it("requires {urut} in the number format", async () => {
    const err = await createSemester(db, {
      name: "S1",
      number_format: "001/S.FKC",
    }).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(
      err.issues.map((i: { path: string[] }) => i.path.join(".")),
    ).toContain("number_format");
  });

  it("rejects a duplicate name but allows reusing a deleted one", async () => {
    const s = await createSemester(db, { name: "S1", number_format: "{urut}" });
    expect(
      await status(createSemester(db, { name: "S1", number_format: "{urut}" })),
    ).toBe(409);
    await deleteSemester(db, s.id);
    await expect(
      createSemester(db, { name: "S1", number_format: "{urut}" }),
    ).resolves.toMatchObject({ name: "S1" });
    expect(await status(getSemester(db, s.id))).toBe(404);
  });

  it("renames, reorders and deletes aspects; a deleted aspect loses its scores", async () => {
    const { coachId } = await makeCoach(db);
    const { classId } = await makeClass(db, { coachId });
    const { studentId } = await makeStudent(db, { classId });
    const s = await createSemester(db, { name: "S1", number_format: "{urut}" });
    const withAspects = await saveAspects(db, s.id, "PLAYER", [
      { name: "A" },
      { name: "B" },
      { name: "C" },
    ]);
    const [a, b, c] = withAspects.aspects.PLAYER;
    await db
      .insert(assessments)
      .values({
        semesterId: s.id,
        studentId,
        track: "PLAYER",
        classId,
        scores: { [a.id]: "BAIK", [b.id]: "CUKUP", [c.id]: "SANGAT_BAIK" },
      });

    const next = await saveAspects(db, s.id, "PLAYER", [
      { id: c.id, name: "C2" },
      { id: a.id, name: "A" },
      { name: "D" },
    ]);
    expect(next.aspects.PLAYER.map((x) => [x.name, x.sort_order])).toEqual([
      ["C2", 0],
      ["A", 1],
      ["D", 2],
    ]);
    expect(next.aspects.PLAYER[0].id).toBe(c.id);
    const [row] = await db.select().from(assessments);
    expect(row.scores).toEqual({ [a.id]: "BAIK", [c.id]: "SANGAT_BAIK" });
  });

  it("validates aspect names", async () => {
    const s = await createSemester(db, { name: "S1", number_format: "{urut}" });
    expect(await status(saveAspects(db, s.id, "PLAYER", [{ name: " " }]))).toBe(
      422,
    );
    expect(
      await status(
        saveAspects(db, s.id, "PLAYER", [
          { name: "Passing" },
          { name: "passing " },
        ]),
      ),
    ).toBe(422);
    expect(
      await status(saveAspects(db, s.id, "PLAYER", [{ id: 99999, name: "X" }])),
    ).toBe(422);
  });

  it("locks aspects while published and the number format after the first publish", async () => {
    const s = await createSemester(db, { name: "S1", number_format: "{urut}" });
    await db
      .update(assessmentSemesters)
      .set({ status: "PUBLISHED", firstPublishedAt: "2026-06-30 10:00:00" })
      .where(eq(assessmentSemesters.id, s.id));
    expect(await status(saveAspects(db, s.id, "PLAYER", [{ name: "X" }]))).toBe(
      409,
    );
    expect(
      await status(updateSemester(db, s.id, { number_format: "{urut}/X" })),
    ).toBe(409);
    expect(await status(deleteSemester(db, s.id))).toBe(409);
    const updated = await updateSemester(db, s.id, {
      name: "S1 baru",
      certificate_date: "2026-06-30",
      number_format: "{urut}",
    });
    expect(updated).toMatchObject({
      name: "S1 baru",
      certificate_date: "2026-06-30",
      number_format: "{urut}",
    });
  });
});
