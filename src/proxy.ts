import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Run on all routes so withAuth() works everywhere (e.g. AuthKit provider
export default authkitMiddleware();

// Match every path except static assets so session is available for withAuth().
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
