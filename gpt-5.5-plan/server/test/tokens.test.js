// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import test from "node:test";
import assert from "node:assert/strict";
import { createOpaqueToken, hashToken } from "../src/tokens.js";

test("createOpaqueToken returns a URL-safe opaque token", () => {
  const token = createOpaqueToken();

  assert.equal(typeof token, "string");
  assert.ok(token.length >= 40);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test("hashToken is deterministic and does not expose the token", () => {
  const token = "sample-reset-token";
  const first = hashToken(token);
  const second = hashToken(token);

  assert.equal(first, second);
  assert.notEqual(first, token);
  assert.match(first, /^[a-f0-9]{64}$/);
});
