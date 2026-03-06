import { withAuth } from "@workos-inc/authkit-nextjs";
import type { User } from "@workos-inc/node";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type RequireAuthOptions = {
  /**
   * - page: redirects to WorkOS sign-in when unauthenticated
   * - api: does NOT redirect; throws UnauthorizedError instead
   */
  mode?: "page" | "api";
};

/**
 * Server-only auth helper for protected pages and API routes.
 * Prefer this over calling `withAuth()` directly.
 */
export async function requireAuth(options: RequireAuthOptions = {}): Promise<User> {
  const mode = options.mode ?? "page";

  const { user } =
    mode === "page"
      ? await withAuth({ ensureSignedIn: true })
      : await withAuth();

  if (!user) {
    if (mode === "page") {
      throw new Error("requireAuth: unexpected null user after ensureSignedIn");
    }
    throw new UnauthorizedError();
  }
  return user;
}
