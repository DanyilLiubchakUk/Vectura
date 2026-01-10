import { NextResponse } from "next/server";

export function createErrorResponse(
    error: string | Error,
    status: number = 500
): NextResponse {
    const message = error instanceof Error ? error.message : error;
    return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse<T>(
    data: T,
    status: number = 200
): NextResponse {
    return NextResponse.json({ data }, { status });
}

export function createBadRequestResponse(error: string): NextResponse {
    return NextResponse.json({ error }, { status: 400 });
}
