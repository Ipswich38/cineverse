import { NextResponse } from "next/server";
import { getLiveCrewPositions } from "@/lib/crew-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public crew-position feed for the checkout dropdowns: the recommended flat
// rates, overridden per position by live Cineforce rates once freelancers list
// (lib/crew-rates.ts has a short in-process cache).
export async function GET() {
  const positions = await getLiveCrewPositions();
  return NextResponse.json(positions);
}
