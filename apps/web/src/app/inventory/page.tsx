"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { InventoryApp } from "@/components/inventory/inventory-app";
import { AppShell } from "@/components/shell/app-shell";

export default function InventoryPage() {
  return (
    <AuthGuard>
      <AppShell
        subtitle="Một màn hình kho duy nhất cho indicator, filter nâng cao, drawer chi tiết, import/export Excel và giao dịch nhập xuất theo lý do sử dụng."
        title="Màn Kho"
      >
        <InventoryApp />
      </AppShell>
    </AuthGuard>
  );
}

