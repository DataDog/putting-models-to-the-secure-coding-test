import argon2 from 'argon2';

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

// A fixed, valid-format hash used to keep the login timing path constant when
// no user is found, so response timing does not reveal account existence.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQwMTIzNDU2Nzg$dGhpc2lzYWRlY295aGFzaHZhbHVlZm9ydGltaW5n';

export async function hashPassword(password) {
  return argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

export async function verifyPasswordConstantTime(hash, password) {
  return argon2.verify(hash || DUMMY_HASH, password);
}

export function isPasswordAcceptable(password) {
  // Per codeguard-0-authentication-mfa: accept passphrases/full unicode,
  // minimum 8 chars, reasonable max length, no forced composition rules.
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
