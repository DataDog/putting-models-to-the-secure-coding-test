// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

export function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// Minimum bar for a password. Deliberately not "clever" (no forced
// mixed-case/symbol rules, which push users toward predictable patterns) —
// length is the strongest single factor.
export function isPasswordStrongEnough(plaintext) {
  return typeof plaintext === 'string' && plaintext.length >= 12 && plaintext.length <= 256;
}
