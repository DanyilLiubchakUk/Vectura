import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware();

export const config = {
    matcher: [
        "/",
        "/login",
        "/callback",
        "/api/auth/:path*",
        "/dashboard/:path*",
        "/agents/:path*",
        "/api/agents/:path*",
    ],
};
