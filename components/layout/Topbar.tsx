"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, User } from "lucide-react";

type Me = {
  name: string;
  username: string;
  tenantName: string;
  role: string;
};

export function Topbar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) setMe(null);
          router.push("/login");
          router.refresh();
          return null;
        }
        if (!res.ok) return null;
        return (await res.json().catch(() => null)) as Me | null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-ponto-border-soft bg-white/80 px-4 pl-14 backdrop-blur-sm md:px-6 md:pl-6">
      <div className="flex items-center gap-4 text-sm text-ponto-muted">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{me?.tenantName ?? "—"}</span>
        </div>
        <div className="h-4 w-px bg-ponto-border" />
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-ponto-black font-medium">
            {me ? `Olá, ${me.name} (${me.username})` : "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
