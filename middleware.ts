export { adminMiddleware as middleware } from "./src/lib/auth/admin-middleware";
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
