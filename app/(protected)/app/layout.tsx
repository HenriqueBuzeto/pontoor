import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getSessionUserForLayout } from "@/lib/auth/is-admin";
import { redirect } from "next/navigation";

const ADMIN_ROLES = ["admin", "super_admin"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUserForLayout();
  if (!sessionUser) redirect("/login");
  const isAdminUser = sessionUser ? ADMIN_ROLES.includes(sessionUser.role) : false;

  return (
    <div className="flex h-screen overflow-hidden bg-ponto-surface">
      <Sidebar isAdmin={isAdminUser} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 pt-14 md:pt-6">{children}</main>
      </div>
    </div>
  );
}
