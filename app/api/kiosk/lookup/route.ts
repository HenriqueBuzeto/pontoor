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
  const expected = process.env.KIOSK_TOKEN?.trim();
  if (!expected) {
    return true;
  }
  if (!raw || raw !== expected) {
    return false;
  }
  return true;
}

function isKioskTokenEnabled() {
  return !!process.env.KIOSK_TOKEN?.trim();
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
  const token = getKioskTokenFromRequest(req);
  const tokenOk = requireKioskToken(token);
  if (!tokenOk) {
    const msg = isKioskTokenEnabled()
      ? "Totem não autorizado. Verifique o KIOSK_TOKEN na Vercel (ou remova para acesso aberto)."
      : "Totem não autorizado.";
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }

  const tenantId = requireTenantId();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Modo Totem não configurado." }, { status: 500 });
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
