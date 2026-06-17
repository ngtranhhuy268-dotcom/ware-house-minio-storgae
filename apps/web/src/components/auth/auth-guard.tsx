"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { RoleName } from "@/lib/types";

export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: RoleName[];
}) {
  const router = useRouter();
  const { ready, session } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (roles && !roles.includes(session.user.role)) {
      router.replace("/inventory");
    }
  }, [ready, roles, router, session]);

  if (!ready || !session) {
    return (
      <div className="app-shell items-center justify-center">
        <div className="panel w-full max-w-md p-8 text-center">
          <p className="label">Warehouse Hub</p>
          <p className="text-lg font-semibold text-slate-900">Đang tải dữ liệu phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(session.user.role)) {
    return (
      <div className="app-shell items-center justify-center">
        <div className="panel w-full max-w-lg p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">Bạn không có quyền vào màn này.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

