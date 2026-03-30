import { getCurrentUser } from "@/lib/auth/server";
import type { UserRole } from "@/lib/db/schema/users";

const ADMIN_ROLES: readonly UserRole[] = ["admin", "super_admin"];

/** Retorna true se o usuário logado for admin, owner ou super_admin. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.role) return false;
  return ADMIN_ROLES.includes(user.role);
}

/** Retorna o usuário da sessão ou null. Útil para passar role ao client (ex.: Sidebar). */
export async function getSessionUserForLayout(): Promise<{ role: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { role: user.role };
}
