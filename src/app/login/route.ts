import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

async function redirectToSignIn() {
    const signInUrl = await getSignInUrl();
    return redirect(signInUrl);
}

export const GET = redirectToSignIn;
export const POST = redirectToSignIn;
