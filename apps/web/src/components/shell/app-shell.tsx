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
      <header className="panel border-t-[5px] border-t-primary flex flex-col gap-4 bg-white border-x border-b border-line p-6 rounded-2xl shadow-md transition-all duration-300">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 text-primary rounded-xl border border-primary/20">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <p className="font-sans text-base font-bold tracking-tight text-foreground">
                Warehouse Hub
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hệ thống hoạt động</span>
              </div>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-lg text-muted hover:text-foreground hover:bg-[#fbfbf9] border border-line hidden md:inline-flex"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            type="button"
          >
            <LogOut className="h-3.5 w-3.5 text-primary" />
            Đăng xuất
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-primary/10 text-primary rounded-md">
              Không gian làm việc
            </span>
            <h1 className="font-sans text-xl font-bold tracking-tight text-foreground mt-2">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3 border border-line bg-[#fcfcfb] px-4 py-3 rounded-xl shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shadow-xs">
              {session?.user.fullName?.charAt(0) ?? "U"}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">{session?.user.fullName}</p>
              <p className="mt-0.5 text-[10px] text-muted font-medium">
                {session?.user.roleLabel}
                {session?.user.unitName ? ` • ${session.user.unitName}` : ""}
              </p>
            </div>
          </div>
        </div>

        <nav className="hidden flex-wrap gap-2 md:flex border-t border-line pt-4">
          {availableNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-lg ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20 border border-primary"
                    : "bg-white text-muted hover:text-foreground hover:bg-[#fbfbf9] border border-line"
                }`}
                href={item.href}
              >
                <Icon className="h-3.5 w-3.5" />
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
