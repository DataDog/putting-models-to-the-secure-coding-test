import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgres://localhost/document_portal_test';
process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-jwt-signing';

const { hashToken, randomToken, safeCompareHex } = await import('../src/security/tokens.js');

test('randomToken generates distinct opaque values', () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 32);
});

test('safeCompareHex only accepts matching hashes', () => {
  const hash = hashToken('known-token');
  assert.equal(safeCompareHex(hash, hashToken('known-token')), true);
  assert.equal(safeCompareHex(hash, hashToken('other-token')), false);
  assert.equal(safeCompareHex(hash, 'bad'), false);
});
