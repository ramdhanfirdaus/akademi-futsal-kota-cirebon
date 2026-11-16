import { afterEach } from "vitest";
import { closeTestDbs } from "./helpers/db";

// Each test makes its own in-memory Postgres; free it so long runs don't exhaust memory.
afterEach(closeTestDbs);
