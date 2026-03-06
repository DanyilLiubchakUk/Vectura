import { requireAuth, UnauthorizedError } from "@/lib/require-auth";
import { NextResponse } from "next/server";
import type { User } from "@workos-inc/node";

export async function withApiAuth(
  handler: (user: User) => Promise<Response>
): Promise<Response> {
  try {
    const user = await requireAuth({ mode: "api" });
    return await handler(user);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

export async function readJsonBodyOr400(
  request: Request
): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
