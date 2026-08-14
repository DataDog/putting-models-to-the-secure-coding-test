import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildStoredFilename, resolveUploadPath } from "../src/files.js";
import { config } from "../src/config.js";

test("buildStoredFilename preserves only a safe extension", () => {
  const stored = buildStoredFilename("Quarterly Report.PDF");

  assert.match(stored, /^[0-9a-f-]+\.pdf$/);
});

test("resolveUploadPath keeps files inside upload directory", () => {
  const resolved = resolveUploadPath("document.pdf");

  assert.equal(path.dirname(resolved), config.uploadDir);
  assert.throws(() => resolveUploadPath("../document.pdf"), /escaped/);
});
