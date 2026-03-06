import "server-only";
import { prisma } from "@/lib/db";

export type AuthUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * Ensures the authenticated user exists in the `users` table.
 * Call this on sign-in (e.g. auth callback) so all protected actions can rely on the FK.
 */
export async function ensureUserInDb(user: AuthUser): Promise<void> {
  const name =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : (user.firstName ?? user.lastName ?? null);

  await prisma.user.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      email: user.email ?? null,
      name,
    },
    update: {
      email: user.email ?? undefined,
      name: name ?? undefined,
    },
  });
}
