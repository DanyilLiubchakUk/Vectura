"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { headers } from "next/headers";

const DEFAULT_SIGNOUT_REDIRECT = "http://localhost:3000/";

function getSignOutReturnToFromHeaders(hdrs: Headers): string {
    const xUrl = hdrs.get("x-url");
    if (xUrl) {
        try {
            const origin = new URL(xUrl).origin;
            return `${origin}/`;
        } catch {
            // fall through to host-based detection
        }
    }

    const host = hdrs.get("host");
    if (host) {
        const proto = hdrs.get("x-forwarded-proto") ?? "https";
        return `${proto}://${host}/`;
    }

    return DEFAULT_SIGNOUT_REDIRECT;
}

export async function signOutAction(_formData: FormData) {
    const hdrs = await headers();
    const returnTo = getSignOutReturnToFromHeaders(hdrs as Headers);
    await signOut({ returnTo });
}
