import "server-only";

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const HASH_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, HASH_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltHex, expectedHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== HASH_LENGTH) return false;

  const actual = (await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;
  return timingSafeEqual(actual, expected);
}
