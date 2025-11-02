import { NextResponse } from "next/server";
import { getAccountForExample } from "@/utils/alpaca/example";

export async function GET() {
    const alpacaResult = await getAccountForExample();
    if (alpacaResult.data === null) {
        return NextResponse.json(
            {
                success: false,
                error: alpacaResult.error,
                account: alpacaResult.data,
            },
            { status: 500 }
        );
    }
    return NextResponse.json({ success: true, account: alpacaResult.data });
}
