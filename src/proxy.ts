import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Use default AuthKit middleware configuration.
// Protection is scoped purely by the Next.js `matcher` below.
export default authkitMiddleware();

// Run middleware only on the protected routes.
// All other routes are bypassed and stay fully public.
// Update this list to also cover the agent API routes, when those are developed
export const config = {
    matcher: ["/agent/:path*", "/dashboard/:path*"],
};
