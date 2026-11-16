import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./helpers/db";
import { PNG_1X1, PNG_1X1_B64 } from "./helpers/images";
import type { Db } from "@/server/db";
import { fail } from "@/server/http";
import {
  createSemester,
  getSemester,
  saveAspects,
} from "@/server/services/assessments/semesters";
import {
  getTemplate,
  getTemplateMeta,
  MAX_TEMPLATE_BYTES,
  saveTemplateFields,
  saveTemplateImage,
} from "@/server/services/assessments/templates";
import type { TemplateField } from "@/lib/assessment";

let db: Db;
let semId: number;
let p1: number;
let k1: number;

beforeEach(async () => {
  db = await createTestDb();
  semId = (await createSemester(db, { name: "S1", number_format: "{urut}" }))
    .id;
  [p1] = (
    await saveAspects(db, semId, "PLAYER", [{ name: "Passing" }])
  ).aspects.PLAYER.map((a) => a.id);
  [k1] = (
    await saveAspects(db, semId, "GOALKEEPER", [{ name: "Positioning" }])
  ).aspects.GOALKEEPER.map((a) => a.id);
});

const status = async (p: Promise<unknown>) =>
  fail(
    await p.then(
      () => null,
      (e) => e,
    ),
  ).status;
const field = (
  key: string,
  extra: Partial<TemplateField> = {},
): TemplateField => ({
  key,
  x: 0.1,
  y: 0.5,
  width: 0.8,
  fontSize: 24,
  font: "TimesRomanBold",
  align: "center",
  color: "#083a63",
  ...extra,
});
const upload = (image: string) =>
  saveTemplateImage(db, semId, "PLAYER", {
    image,
    width_px: 2480,
    height_px: 3508,
  });

describe("certificate templates", () => {
  it("stores a PNG and reports it on the semester", async () => {
    await upload(PNG_1X1);
    const t = await getTemplate(db, semId, "PLAYER");
    expect(t).toMatchObject({
      image_type: "image/png",
      width_px: 2480,
      height_px: 3508,
      fields: [],
    });
    expect(Buffer.from(t!.image).toString("base64")).toBe(PNG_1X1_B64);
    expect((await getSemester(db, semId)).has_template).toEqual({
      PLAYER: true,
      GOALKEEPER: false,
    });
    expect((await getTemplateMeta(db, semId, "PLAYER"))!.image_url).toMatch(
      new RegExp(
        `^/api/assessments/semesters/${semId}/templates/PLAYER/image\\?v=`,
      ),
    );
    expect(await getTemplateMeta(db, semId, "GOALKEEPER")).toBeNull();
  });

  it("rejects a GIF, a renamed non-image and a file over 4 MB", async () => {
    const gif = `data:image/gif;base64,${Buffer.from("GIF89a").toString("base64")}`;
    const fake = `data:image/png;base64,${Buffer.from("hello, not an image").toString("base64")}`;
    const big = Buffer.alloc(MAX_TEMPLATE_BYTES + 1);
    Buffer.from(PNG_1X1_B64, "base64").copy(big);
    for (const image of [
      gif,
      fake,
      `data:image/png;base64,${big.toString("base64")}`,
    ]) {
      const err = await upload(image).catch((e) => e);
      expect(fail(err).status).toBe(422);
      expect(
        Object.values(err.errors ?? {})
          .flat()
          .join(" ") || err.issues?.[0]?.message,
      ).toContain("Template harus PNG atau JPG, maksimal 4 MB");
    }
    expect(await getTemplate(db, semId, "PLAYER")).toBeNull();
  });

  it("saves fields and keeps them when the image is replaced", async () => {
    await upload(PNG_1X1);
    await saveTemplateFields(db, semId, "PLAYER", [
      field("name"),
      field(`aspect:${p1}`, { align: "left" }),
    ]);
    await upload(PNG_1X1);
    expect(
      (await getTemplate(db, semId, "PLAYER"))!.fields.map((f) => f.key),
    ).toEqual(["name", `aspect:${p1}`]);
  });

  it("rejects unknown keys, aspects of the other track and out-of-range values", async () => {
    await upload(PNG_1X1);
    expect(
      await status(saveTemplateFields(db, semId, "PLAYER", [field("hobby")])),
    ).toBe(422);
    expect(
      await status(
        saveTemplateFields(db, semId, "PLAYER", [field(`aspect:${k1}`)]),
      ),
    ).toBe(422);
    expect(
      await status(
        saveTemplateFields(db, semId, "PLAYER", [field("name", { x: 1.5 })]),
      ),
    ).toBe(422);
    expect(
      await status(
        saveTemplateFields(db, semId, "PLAYER", [
          field("name", { color: "red" }),
        ]),
      ),
    ).toBe(422);
    expect(
      await status(
        saveTemplateFields(db, semId, "PLAYER", [
          field("name", { font: "Arial" as never }),
        ]),
      ),
    ).toBe(422);
  });

  it("fields need an uploaded image first", async () => {
    expect(
      await status(
        saveTemplateFields(db, semId, "GOALKEEPER", [field("name")]),
      ),
    ).toBe(404);
  });
});
