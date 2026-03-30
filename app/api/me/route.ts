import { getCurrentUser } from "@/lib/auth/server";
import { internalEmailToUsername } from "@/lib/auth/constants";
import { getDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let tenantName = "—";
  if (sessionUser.tenantId) {
    const db = getDb();
    const [t] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, sessionUser.tenantId))
      .limit(1);
    if (t) tenantName = t.name;
  }

  const username = internalEmailToUsername(sessionUser.email);

  return NextResponse.json({
    name: sessionUser.name,
    username,
    tenantName,
    role: sessionUser.role,
    tenantId: sessionUser.tenantId,
    employeeId: sessionUser.employeeId,
  });
}
