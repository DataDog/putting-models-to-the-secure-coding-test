import crypto from 'node:crypto';
import argon2 from 'argon2';

const argonOptions = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
});

let dummyHashPromise;

export function hashPassword(password) {
  return argon2.hash(password, argonOptions);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function getDummyPasswordHash() {
  if (!dummyHashPromise) {
    const randomValue = crypto.randomBytes(32).toString('base64url');
    dummyHashPromise = hashPassword(randomValue);
  }
  return dummyHashPromise;
}

