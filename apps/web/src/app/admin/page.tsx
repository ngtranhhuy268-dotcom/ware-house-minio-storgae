"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminApp } from "@/components/admin/admin-app";
import { AppShell } from "@/components/shell/app-shell";

export default function AdminPage() {
  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell
        subtitle="Quản lý tài khoản, đơn vị, kho, đơn vị tính và log import cho hệ thống kho nội bộ."
        title="Quản Trị"
      >
        <AdminApp />
      </AppShell>
    </AuthGuard>
  );
}

