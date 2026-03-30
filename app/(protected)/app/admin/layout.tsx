import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/is-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();
  if (!ok) redirect("/app");
  return <>{children}</>;
}
