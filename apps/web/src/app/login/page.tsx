"use client";

import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@warehouse.local");
  const [password, setPassword] = useState("Admin@123456");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="app-shell justify-center">
      <section className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-[0.92fr_1.08fr]">
        <div className="panel overflow-hidden bg-[linear-gradient(160deg,#082554,#0f3d8c)] p-6 text-white sm:p-8 md:p-10">
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                Warehouse Hub
              </span>
              <div className="space-y-3">
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">
                  Quản lý kho nội bộ trên một giao diện gọn, dễ dùng.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-blue-100/90">
                  Đăng nhập để xem tồn kho, nhập xuất vật tư, import/export Excel và quản trị
                  người dùng trong cùng một app.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-[24px] bg-white/10 p-4">
                Admin tạo tài khoản cho nhân viên kho và thợ. V1 không mở đăng ký công khai.
              </div>
              <div className="rounded-[24px] bg-white/10 p-4">
                Màn kho được tối ưu mobile-first, thao tác nhập, xuất và chỉnh kho ngay trên một
                màn hình chính.
              </div>
            </div>
          </div>
        </div>

        <div className="panel-strong p-6 sm:p-8 md:p-10">
          <div className="mx-auto flex max-w-xl flex-col gap-6">
            <div>
              <p className="label">Đăng nhập</p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
                Chào mừng trở lại
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Dùng tài khoản được Admin cấp để truy cập hệ thống kho nội bộ.
              </p>
            </div>

            <form
              className="grid gap-5"
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitting(true);
                setError("");

                try {
                  await login(email, password);
                  router.replace("/inventory");
                } catch {
                  setError("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <label>
                <span className="label">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pl-11"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@warehouse.local"
                    type="email"
                    value={email}
                  />
                </div>
              </label>

              <label>
                <span className="label">Mật khẩu</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pl-11"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    type="password"
                    value={password}
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button className="button button-primary h-12" disabled={submitting} type="submit">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Đăng nhập
              </button>
            </form>

            <div className="rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Tài khoản local mặc định: <strong>admin@warehouse.local</strong> /{" "}
              <strong>Admin@123456</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
