"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { headers } from "next/headers";

function getDefaultSignOutRedirect(): string {
    const uri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    if (uri) {
        try {
            return new URL(uri).origin;
        } catch {
            // fall through
        }
    }
    return "http://localhost:3000";
}

function getSignOutReturnToFromHeaders(hdrs: Headers): string {
    const xUrl = hdrs.get("x-url");
    if (xUrl) {
        try {
            return new URL(xUrl).origin;
        } catch {
            // fall through to host-based detection
        }
    }

    const host = hdrs.get("host");
    if (host) {
        const proto = hdrs.get("x-forwarded-proto") ?? "https";
        return `${proto}://${host}`;
    }

    return getDefaultSignOutRedirect();
}

export async function signOutAction(_formData: FormData) {
    const hdrs = await headers();
    const returnTo = getSignOutReturnToFromHeaders(hdrs as Headers);
    await signOut({ returnTo });
}
