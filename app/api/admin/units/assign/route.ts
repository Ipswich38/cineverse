import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { type ContractDoc } from "@/lib/contract";
import { type QuotationDoc } from "@/lib/quotation";
import { planAssignment, type AssignLine, type AssignUnit } from "@/lib/unit-assign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUESTS = "vissionlink_quote_requests";
const UNITS = "vissionlink_units";

type Row = { id: string; contract?: ContractDoc | null; quotation?: QuotationDoc | null };

// Equipment lines to fulfil come from the agreed contract; fall back to the
// quotation if a contract hasn't been built yet.
function equipmentLines(row: Row): AssignLine[] {
  const src = row.contract ?? row.quotation;
  const lines = src?.lines ?? [];
  return lines.map((l) => ({ id: l.id, description: l.description, qty: l.qty }));
}

async function load(requestId: string): Promise<{ row: Row | null; units: AssignUnit[] }> {
  const db = supabaseAdmin()!;
  const [reqRes, unitsRes] = await Promise.all([
    db.from(REQUESTS).select("id,contract,quotation").eq("id", requestId).maybeSingle(),
    db.from(UNITS).select("id,name,category,status,assigned_request_id").limit(5000),
  ]);
  return {
    row: (reqRes.data as Row) ?? null,
    units: (unitsRes.data as AssignUnit[]) ?? [],
  };
}

// GET ?requestId=… — preview the plan without writing anything.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const { row, units } = await load(requestId);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const lines = equipmentLines(row);
  if (lines.length === 0) return NextResponse.json({ error: "No equipment lines — build & save the contract first." }, { status: 400 });

  const plan = planAssignment(lines, units, requestId);
  const byId = new Map(units.map((u) => [u.id, u]));
  return NextResponse.json(decoratePlan(plan, byId));
}

// POST ?requestId=… — commit the plan: release units no longer needed, then mark
// the chosen units rented and stamped to this request.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const { row, units } = await load(requestId);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const lines = equipmentLines(row);
  if (lines.length === 0) return NextResponse.json({ error: "No equipment lines — build & save the contract first." }, { status: 400 });

  const plan = planAssignment(lines, units, requestId);
  const db = supabaseAdmin()!;
  const now = new Date().toISOString();

  if (plan.releaseUnitIds.length) {
    const { error } = await db.from(UNITS).update({ status: "available", assigned_request_id: null, updated_at: now }).in("id", plan.releaseUnitIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (plan.assignUnitIds.length) {
    const { error } = await db.from(UNITS).update({ status: "rented", assigned_request_id: requestId, updated_at: now }).in("id", plan.assignUnitIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byId = new Map(units.map((u) => [u.id, u]));
  return NextResponse.json({ ok: true, committed: true, ...decoratePlan(plan, byId) });
}

// DELETE ?requestId=… — release every unit currently assigned to this request.
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const { error, count } = await supabaseAdmin()!
    .from(UNITS)
    .update({ status: "available", assigned_request_id: null, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("assigned_request_id", requestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, released: count ?? 0 });
}

// Attach unit names to the plan so the UI can show what was picked per line.
function decoratePlan(plan: ReturnType<typeof planAssignment>, byId: Map<string, AssignUnit>) {
  return {
    ...plan,
    lines: plan.lines.map((l) => ({
      ...l,
      units: l.unitIds.map((id) => ({ id, name: byId.get(id)?.name ?? id, serial: null })),
    })),
  };
}
