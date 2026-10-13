import { type NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/server/lib/auth";

// Add paths that should be accessible without authentication
const publicPaths = [
  "/login",
  "/signup",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/data-deletion",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/trpc",
  "/api/rest",
];

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const path = nextUrl.pathname;

  // Check if it's a public path
  const isPublicPath = publicPaths.some((p) => path.startsWith(p));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get session from cookie
  const session = request.cookies.get("session")?.value;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verify session
    await decrypt(session);

    // If we're at the root or a dashboard path, we can optionally refresh the token here
    // For now, just let it pass if valid
    return NextResponse.next();
  } catch {
    // Session invalid or expired
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
