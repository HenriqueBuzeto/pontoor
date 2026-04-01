import { NextRequest, NextResponse } from "next/server";
import { getEmployeeByRegistration } from "@/lib/repositories/employees";
import { getDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";

async function resolveTenantId() {
  const configured = process.env.KIOSK_TENANT_ID;
  if (configured?.trim()) return configured.trim();

  const db = getDb();
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .orderBy(desc(tenants.createdAt))
    .limit(2);

  if (rows.length === 1) return rows[0].id;
  return null;
}

function normalizeRegistrationCandidates(input: string) {
  const raw = input.trim();
  const upper = raw.toUpperCase();
  const candidates = new Set<string>();
  if (raw) candidates.add(raw);
  if (upper) candidates.add(upper);

  const digitsMatch = upper.match(/(\d{3,})$/);
  if (digitsMatch?.[1]) {
    const digits = digitsMatch[1];
    const last3 = digits.slice(-3);
    candidates.add(last3);
  }

  return Array.from(candidates);
}

export async function POST(req: NextRequest) {
  const tenantId = await resolveTenantId();
  if (!tenantId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Modo Totem não configurado. Configure KIOSK_TENANT_ID (ou mantenha apenas 1 tenant ativo para auto-detecção).",
      },
      { status: 500 }
    );
  }

  const json = (await req.json().catch(() => null)) as { registration?: string } | null;
  const registration = (json?.registration ?? "").trim();

  if (!registration) {
    return NextResponse.json({ ok: false, error: "Matrícula inválida." }, { status: 400 });
  }

  const candidates = normalizeRegistrationCandidates(registration);

  let emp = null as Awaited<ReturnType<typeof getEmployeeByRegistration>>;
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const found = await getEmployeeByRegistration(tenantId, c);
    if (found?.id) {
      emp = found;
      break;
    }
  }

  if (!emp?.id) {
    return NextResponse.json({ ok: false, error: "Colaborador não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    employee: { id: emp.id, name: emp.name, registration: emp.registration },
  });
}
