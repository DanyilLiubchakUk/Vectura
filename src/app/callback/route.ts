import { handleAuth } from "@workos-inc/authkit-nextjs";
import { ensureUserInDb } from "@/lib/user-sync";

// Redirect the user to `/` after successful sign in by default.
// This can be customized: handleAuth({ returnPathname: "/dashboard" })
// Upsert user on every sign-in
export const GET = handleAuth({
  onSuccess: async ({ user }) => {
    if (user) {
      await ensureUserInDb({
        id: user.id,
        email: user.email ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
      });
    }
  },
});
