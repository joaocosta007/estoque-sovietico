import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error(
    "Uso: npm run auth:hash -- 'uma-senha-forte-com-pelo-menos-10-caracteres'",
  );
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
