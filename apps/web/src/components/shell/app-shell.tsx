"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, LogOut, Settings, Warehouse } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import type { RoleName } from "@/lib/types";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: RoleName[];
}> = [
  { href: "/inventory", label: "Kho", icon: Warehouse },
  { href: "/admin", label: "Admin", icon: Settings, roles: ["ADMIN"] },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const availableNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(session?.user.role ?? "TECHNICIAN"),
  );

  return (
    <div className="app-shell gap-4">
      <header className="panel flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10 text-primary rounded-xl border border-primary/20">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-lg font-bold tracking-tight text-foreground">
                Warehouse Hub
              </p>
              <p className="text-[10px] font-mono tracking-widest text-muted uppercase">SYS_REV: 3.1 // DB_CONNECTED: TRUE</p>
            </div>
          </div>

          <button
            className="button button-ghost hidden md:inline-flex"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            type="button"
          >
            <LogOut className="h-4 w-4 text-primary" />
            Đăng xuất
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="label">[ WORKSPACE ]</p>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-xs normal-case leading-relaxed text-muted">{subtitle}</p>
          </div>

          <div className="border border-line bg-[#fcfcfb] px-4 py-3 text-[10px] uppercase tracking-widest font-mono rounded-xl">
            <p className="font-bold text-foreground">OPR: {session?.user.fullName}</p>
            <p className="mt-1 text-primary">
              ROLE: {session?.user.roleLabel}
              {session?.user.unitName ? ` // UNIT: ${session.user.unitName}` : ""}
            </p>
          </div>
        </div>

        <nav className="hidden flex-wrap gap-2 md:flex border-t border-line pt-4">
          {availableNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`button ${active ? "button-primary" : "button-ghost"}`}
                href={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {actions ? <div className="flex flex-wrap gap-3 border-t border-line pt-4">{actions}</div> : null}
      </header>

      <main className="grid gap-4">{children}</main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_auto] gap-2">
          {availableNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`button w-full ${active ? "button-primary" : "button-ghost"}`}
                href={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <button
            className="button button-ghost w-full"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            type="button"
          >
            <LogOut className="h-4 w-4 text-primary" />
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
}
