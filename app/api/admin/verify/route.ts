import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";

export const runtime = "nodejs";

// Validates an admin code (sent as a Bearer token) on the server, so the real
// secret is never shipped in the client bundle. The admin page calls this on
// unlock, then reuses the same code as the Bearer for the other admin routes.
export async function POST(req: NextRequest) {
  return checkAdminAuth(req)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Invalid code." }, { status: 401 });
}
