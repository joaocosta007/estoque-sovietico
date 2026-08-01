import { NextResponse } from "next/server";
import { getSql } from "../../../../db";
import { verifyPassword } from "../../../../lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/session";

type AdminUserRow = {
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
};

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL("/login?erro=config", request.url), 303);
  }

  const sql = getSql();
  const users = await sql<AdminUserRow[]>`
    SELECT
      email, password_hash AS "passwordHash",
      must_change_password AS "mustChangePassword"
    FROM admin_users
    WHERE email = ${email} AND active = true
    LIMIT 1
  `;
  let user = users[0];

  if (!user) {
    const fallbackEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const fallbackHash = process.env.ADMIN_PASSWORD_HASH;
    if (fallbackEmail === email && fallbackHash) {
      user = {
        email: fallbackEmail,
        passwordHash: fallbackHash,
        mustChangePassword: false,
      };
    }
  }

  const authenticated =
    Boolean(user) && (await verifyPassword(password, user!.passwordHash));
  if (!authenticated) {
    return NextResponse.redirect(
      new URL("/login?erro=credenciais", request.url),
      303,
    );
  }

  const destination = user!.mustChangePassword ? "/trocar-senha" : "/";
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(user!.email, user!.mustChangePassword),
    sessionCookieOptions,
  );
  return response;
}
