import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
    const { user } = await withAuth();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
        {
            userId: user.id,
            email: user.email,
        },
        { status: 200 }
    );
}
