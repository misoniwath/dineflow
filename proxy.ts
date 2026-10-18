import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@/types/Auth";
import { jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

const ROUTE_ROLES: { prefix: string; allowedRoles: Role[] }[] = [
  { prefix: "/user-management", allowedRoles: ["owner"] },
  { prefix: "/analytics", allowedRoles: ["manager", "owner"] },
  { prefix: "/inventory", allowedRoles: ["manager", "owner"] },
  { prefix: "/scheduling", allowedRoles: ["manager", "owner"] },
  // Add other guarded routes here as needed
];

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // 2. Define routes that are completely public (login, assets, api auth)
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  if (isPublicPath) {
    if (pathname === "/login" && token) {
      try {
        await jwtVerify(token, secretKey);
        return NextResponse.redirect(new URL("/", request.url));
      } catch {
        // Invalid token, stay on login
      }
    }
    return NextResponse.next();
  }

  // 3. Define routes that allow GUESTS
  const isGuestAllowedPath = pathname.startsWith("/order");

  if (!token) {
    if (isGuestAllowedPath) {
      return NextResponse.next(); // Allow unauthenticated/guest users through
    }

    // Otherwise, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Token exists, verify it and extract role payload
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const userRole = payload.role as Role;

    // 5. Check Role-Based Access Control (RBAC)
    const matchingRoute = ROUTE_ROLES.find((r) =>
      pathname.startsWith(r.prefix),
    );

    if (matchingRoute && !matchingRoute.allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
