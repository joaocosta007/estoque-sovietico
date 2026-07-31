import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/session";

const scrypt = promisify(scryptCallback);

async function validPassword(password: string, encoded: string) {
  const [algorithm, saltHex, expectedHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== 64) return false;
  const actual = (await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;
  return timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !passwordHash || !process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL("/login?erro=config", request.url), 303);
  }

  const authenticated =
    email === adminEmail && (await validPassword(password, passwordHash));
  if (!authenticated) {
    return NextResponse.redirect(
      new URL("/login?erro=credenciais", request.url),
      303,
    );
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(adminEmail),
    sessionCookieOptions,
  );
  return response;
}
