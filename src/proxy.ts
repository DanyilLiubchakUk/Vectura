import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Run middleware on all routes so useAuth/withAuth work everywhere
export default authkitMiddleware({
    middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: [
            "/",
            "/about",
            "/backtest",
            "/ranges",
            "/how-backtest-works",
            "/development-journey",
            "/login",
            "/callback",
            "/api/auth/:path*",
            "/api/backtest/:path*",
            "/api/ranges/:path*",
        ],
    },
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
