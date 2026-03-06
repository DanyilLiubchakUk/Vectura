import { getSmartSignInUrl } from "@/lib/auth/utils";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const signInUrl = await getSmartSignInUrl(request);
    return redirect(signInUrl);
}

export const POST = GET;
