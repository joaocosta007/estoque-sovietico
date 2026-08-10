import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

const publicPaths = new Set([
  "/login",
  "/camaradas",
  "/catalogo",
  "/api/catalog",
  "/api/catalog-settings",
  "/api/push/config",
  "/api/push/subscriptions",
  "/api/auth/login",
  "/api/auth/logout",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    publicPaths.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.svg" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/og.png";

  if (isPublic) return NextResponse.next();

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (session) {
    const passwordChangeAllowed =
      pathname === "/trocar-senha" ||
      pathname === "/api/auth/password" ||
      pathname === "/api/auth/logout";
    if (session.mustChangePassword && !passwordChangeAllowed) {
      return NextResponse.redirect(new URL("/trocar-senha", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Sessão ausente ou expirada." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp)$).*)"],
};
