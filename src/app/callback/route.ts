import { handleAuth } from "@workos-inc/authkit-nextjs";
import { ensureUserInDb } from "@/lib/user-sync";

// Let AuthKit redirect back to the original path captured in state
// (returnPathname) instead of forcing a fixed location here.
// Upsert user on every sign-in.
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
