"use server";

import { signOut } from "@workos-inc/authkit-nextjs";

const DEFAULT_SIGNOUT_REDIRECT = "http://localhost:3000/";

function getSignOutReturnTo(): string {
    const url = process.env.NEXT_PUBLIC_WORKOS_SIGNOUT_REDIRECT_URI;
    if (!url?.trim()) return DEFAULT_SIGNOUT_REDIRECT;
    try {
        const parsed = new URL(url);
        return parsed.origin;
    } catch {
        return DEFAULT_SIGNOUT_REDIRECT;
    }
}

export async function signOutAction(_formData: FormData) {
    await signOut({ returnTo: getSignOutReturnTo() });
}
