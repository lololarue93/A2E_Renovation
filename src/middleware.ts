import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    try {
      const encoded = authorization.slice("Basic ".length);
      const decoded = atob(encoded);
      const separatorIndex = decoded.indexOf(":");
      const email = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";
      const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";
      if (email === expectedEmail && password === expectedPassword) return NextResponse.next();
    } catch {
      // A malformed Authorization header must remain a normal 401, never a 500.
    }
  }

  return new NextResponse("Authentification admin requise", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="A2E Admin"'
    }
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
