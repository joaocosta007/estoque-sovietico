import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (session) return null;
  return Response.json(
    { error: "Sessão ausente ou expirada." },
    { status: 401 },
  );
}
