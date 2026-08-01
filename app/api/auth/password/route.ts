import { NextResponse } from "next/server";
import { getSql } from "../../../../db";
import { getAdminSession, requireAdminApi } from "../../../../lib/auth";
import { hashPassword } from "../../../../lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/session";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");

  if (password.length < 10) {
    return NextResponse.redirect(
      new URL("/trocar-senha?erro=tamanho", request.url),
      303,
    );
  }
  if (password !== confirmation) {
    return NextResponse.redirect(
      new URL("/trocar-senha?erro=confirmacao", request.url),
      303,
    );
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const passwordHash = await hashPassword(password);
  const sql = getSql();
  const updated = await sql<{ id: string }[]>`
    UPDATE admin_users
    SET password_hash = ${passwordHash},
        must_change_password = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE email = ${session.email} AND active = true
    RETURNING id
  `;
  if (!updated[0]) {
    return NextResponse.redirect(
      new URL("/trocar-senha?erro=conta", request.url),
      303,
    );
  }

  const response = NextResponse.redirect(
    new URL("/?senha=alterada", request.url),
    303,
  );
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(session.email, false),
    sessionCookieOptions,
  );
  return response;
}
