"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutGrid,
  UsersRound,
  Timer,
  ClipboardCheck,
  Wallet,
  FileBarChart,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Shield,
  ClipboardList,
  PieChart,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "ponto-sidebar-collapsed";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const baseNavGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [{ href: "/app", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/app/colaboradores", label: "Colaboradores", icon: UsersRound },
    ],
  },
  {
    title: "Ponto",
    items: [
      { href: "/app/ponto", label: "Registro de Ponto", icon: Timer },
      { href: "/app/ajustes", label: "Ajustes e Justificativas", icon: ClipboardCheck },
      { href: "/app/banco-horas", label: "Banco de Horas", icon: Wallet },
      { href: "/app/espelho", label: "Espelho de Ponto", icon: FileBarChart },
    ],
  },
  {
    title: "Relatórios",
    items: [{ href: "/app/relatorios", label: "Relatórios", icon: BarChart3 }],
  },
  {
    title: "Sistema",
    items: [
      { href: "/app/auditoria", label: "Auditoria", icon: ShieldCheck },
    ],
  },
];

const adminNavGroup: { title: string; items: NavItem[] } = {
  title: "Administrativo",
  items: [
    { href: "/app/admin", label: "Painel Admin", icon: Shield },
    { href: "/app/admin/justificativas", label: "Aprovar Justificativas", icon: ClipboardList },
    { href: "/app/admin/relatorios", label: "Relatórios Empresariais", icon: PieChart },
    { href: "/app/admin/banco-horas", label: "Banco de Horas (Empresa)", icon: Wallet },
  ],
};

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:translate-x-0.5",
        collapsed ? "justify-center px-2" : "",
        isActive
          ? "bg-gradient-to-r from-ponto-orange/20 to-transparent text-white shadow-[inset_0_0_20px_rgba(249,115,22,0.08)]"
          : "text-white/75 hover:bg-white/5 hover:text-white"
      )}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-ponto-orange shadow-[0_0_12px_rgba(249,115,22,0.6)]"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          collapsed ? "h-9 w-9" : "h-9 w-9",
          isActive
            ? "bg-ponto-orange/90 text-white shadow-lg shadow-ponto-orange/25"
            : "bg-white/5 text-white/90 group-hover:bg-white/10 group-hover:scale-105"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {isActive && (
            <ChevronRight className="h-4 w-4 shrink-0 text-ponto-orange opacity-80" />
          )}
        </>
      )}
    </Link>
  );
}

type SidebarProps = { isAdmin?: boolean };

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navGroups = isAdmin ? [...baseNavGroups, adminNavGroup] : baseNavGroups;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) setCollapsed(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setCollapsedAndStore = (value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  };

  // No mobile (drawer aberto) sempre expandido; no desktop usa estado collapsed
  const showExpanded = mobileOpen || !collapsed;
  const sidebarWidth = cn(
    "w-64",
    !mobileOpen && collapsed && "md:w-20",
    !mobileOpen && !collapsed && "md:w-64"
  );
  const spacerWidth = collapsed ? "md:w-20" : "md:w-64";

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/5 transition-[width] duration-300 ease-out",
        "bg-gradient-to-b from-[#0c0c0e] via-[#0a0a0c] to-[#08080a]",
        "shadow-[4px_0_24px_rgba(0,0,0,0.4)]",
        "fixed inset-y-0 left-0 z-40",
        "md:translate-x-0",
        sidebarWidth,
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/5 transition-[padding] duration-300",
          collapsed ? "justify-center px-0" : "justify-between px-5"
        )}
      >
        <Link
          href="/app"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 font-semibold tracking-tight",
            !showExpanded && "justify-center"
          )}
        >
          {showExpanded ? (
            <div className="relative h-14 w-56">
              <Image
                src="/logo 750x400.png"
                alt="Ponto OR"
                fill
                className="object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                priority
              />
            </div>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ponto-orange/15 text-ponto-orange shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              P
            </span>
          )}
        </Link>
        {showExpanded && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav com grupos e scrollbar fina */}
      <nav className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden p-3">
        {navGroups.map((group) => {
          const isAdminGroup = group.title === "Administrativo";
          return (
          <div
            key={group.title}
            className={cn("mb-4", collapsed && "mb-3")}
          >
            {showExpanded && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {group.title}
              </p>
            )}
            <div className={cn("space-y-0.5", isAdminGroup && "border-l-2 border-ponto-orange/40 pl-2")}>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/app" && pathname.startsWith(item.href));
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                    collapsed={!showExpanded}
                    onClick={() => setMobileOpen(false)}
                  />
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Botão recolher/expandir (só desktop) */}
      <div className="hidden shrink-0 border-t border-white/5 p-2 md:block">
        <button
          type="button"
          onClick={() => setCollapsedAndStore(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span className="text-xs font-medium">Recolher</span>
            </>
          )}
        </button>
      </div>

      <div
        className="pointer-events-none h-12 shrink-0 bg-gradient-to-t from-black/40 to-transparent"
        aria-hidden
      />
    </aside>
  );

  return (
    <>
      {/* Mobile: abrir menu */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-ponto-black/90 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-ponto-orange hover:shadow-ponto-orange/20 md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay mobile */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {sidebar}

      {/* Espacer: desktop só, largura conforme collapsed */}
      <div className={cn("hidden shrink-0 md:block", spacerWidth)} />
    </>
  );
}
