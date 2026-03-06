import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";

/**
 * Build a WorkOS sign-in URL that will return the user to the
 * current pathname after authentication.
 */
export async function getSmartSignInUrl(request: NextRequest): Promise<string> {
  const headerUrl = request.headers.get("x-url");
  const fallbackUrl = request.nextUrl.toString();

  const rawUrl = headerUrl ?? fallbackUrl;
  let pathname = "/";

  try {
    const parsed = new URL(rawUrl);
    pathname = parsed.pathname || "/";
  } catch {
    pathname = request.nextUrl.pathname || "/";
  }

  // `returnPathname` is supported by AuthKit but not yet in the published types.
  return getSignInUrl({ returnPathname: pathname } as any);
}
