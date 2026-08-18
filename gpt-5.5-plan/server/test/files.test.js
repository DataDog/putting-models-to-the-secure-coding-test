// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

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
