import { withApiAuth } from "@/lib/api-helpers";
import { NextResponse } from "next/server";

export async function GET() {
    return withApiAuth(async (user) => {
        return NextResponse.json(
            {
                userId: user.id,
                email: user.email,
            },
            { status: 200 }
        );
    });
}
