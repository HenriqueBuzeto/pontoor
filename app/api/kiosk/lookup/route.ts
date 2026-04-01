import { NextRequest, NextResponse } from "next/server";
import { getEmployeeByRegistration } from "@/lib/repositories/employees";

export const runtime = "nodejs";

function getKioskTokenFromRequest(req: NextRequest) {
  return req.headers.get("x-kiosk-token") ?? "";
}

function requireTenantId() {
  const tenantId = process.env.KIOSK_TENANT_ID;
  if (!tenantId) {
    return null;
  }
  return tenantId;
}

function requireKioskToken(raw: string) {
  const expected = process.env.KIOSK_TOKEN;
  if (!expected) {
    return null;
  }
  if (!raw || raw !== expected) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const token = getKioskTokenFromRequest(req);
  const tokenOk = requireKioskToken(token);
  if (tokenOk === null) {
    return NextResponse.json({ ok: false, error: "Modo Totem não configurado." }, { status: 500 });
  }
  if (!tokenOk) {
    return NextResponse.json({ ok: false, error: "Totem não autorizado." }, { status: 401 });
  }

  const tenantId = requireTenantId();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Modo Totem não configurado." }, { status: 500 });
  }

  const json = await req.json().catch(() => null) as { registration?: string } | null;
  const registration = (json?.registration ?? "").trim();

  if (!registration) {
    return NextResponse.json({ ok: false, error: "Matrícula inválida." }, { status: 400 });
  }

  const emp = await getEmployeeByRegistration(tenantId, registration);
  if (!emp?.id) {
    return NextResponse.json({ ok: false, error: "Colaborador não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    employee: { id: emp.id, name: emp.name, registration: emp.registration },
  });
}
