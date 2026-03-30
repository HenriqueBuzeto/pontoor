import { getCurrentUser } from "@/lib/auth/server";

/** Retorna o tenantId do usuário logado ou null se não autenticado/sem vínculo. */
export async function getCurrentTenantId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.tenantId ?? null;
}
