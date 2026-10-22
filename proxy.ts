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

// Match "/order" and "/order/..." but NOT "/orders" or "/order-history"
const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    matchesPath(pathname, "/api/auth");

  // Add every API route the guest order page calls
  const isGuestAllowedPath =
    matchesPath(pathname, "/order") ||
    matchesPath(pathname, "/api/floor-plans") ||
    matchesPath(pathname, "/api/orders");

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

  if (!token) {
    if (isGuestAllowedPath) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const userRole = payload.role as Role;

    // Guest-allowed routes skip RBAC entirely
    if (isGuestAllowedPath) return NextResponse.next();

    const matchingRoute = ROUTE_ROLES.find((r) =>
      matchesPath(pathname, r.prefix),
    );

    if (matchingRoute && !matchingRoute.allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    // Bad/expired token: guests still get through, just clear the cookie
    const response = isGuestAllowedPath
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    // Skip static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};
