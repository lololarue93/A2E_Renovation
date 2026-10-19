export { adminMiddleware as middleware } from "./lib/auth/admin-middleware";
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
