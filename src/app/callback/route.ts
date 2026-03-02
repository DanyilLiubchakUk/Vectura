import { handleAuth } from "@workos-inc/authkit-nextjs";

// Redirect the user to `/` after successful sign in by default.
// This can be customized: handleAuth({ returnPathname: "/dashboard" })
export const GET = handleAuth();
