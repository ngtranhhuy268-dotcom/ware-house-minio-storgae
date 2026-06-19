"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  return (
    <main className="app-shell justify-center min-h-screen py-12">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[24px] border border-line bg-surface shadow-2xl md:grid-cols-[0.85fr_1.15fr]">
        
        {/* Left Branding Panel: Premium Dark with Coral Radial Glow */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden bg-slate-950 p-10 text-white md:p-12">
          {/* Ambient light glow */}
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/5 blur-[80px]" />

          <div className="relative z-10 text-center space-y-3">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl bg-gradient-to-br from-white via-slate-200 to-primary bg-clip-text text-transparent uppercase font-[family-name:var(--font-display)]">
              Warehouse Hub
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
              Internal Storage System
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-10 md:p-12 bg-white flex flex-col justify-center">
          <div className="mx-auto w-full max-w-sm space-y-6">
            
            {/* Header Text */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-display)]">
                Đăng nhập hệ thống
              </h2>
              <p className="text-xs text-muted">
                Nhập thông tin tài khoản của bạn để truy cập kho
              </p>
            </div>

            {/* Error Message Box */}
            {error ? (
              <div className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 animate-fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Đăng nhập thất bại
                </div>
                <p className="text-xs text-red-600/90 pl-4">{error}</p>
              </div>
            ) : null}

            {/* Form */}
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!email || !password) {
                  setError("Vui lòng điền đầy đủ email và mật khẩu.");
                  return;
                }
                setSubmitting(true);
                setError("");

                try {
                  await login(email, password);
                  router.replace("/inventory");
                } catch {
                  setError("Sai tài khoản hoặc mật khẩu. Vui lòng kiểm tra lại.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="space-y-1">
                <span className="label text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pl-11 h-11 w-full text-sm"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="label text-[10px] font-bold uppercase tracking-wider text-slate-500">Mật khẩu</span>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pl-11 pr-11 h-11 w-full text-sm"
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={checkCapsLock}
                    onKeyUp={checkCapsLock}
                    placeholder="Nhập mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Caps Lock Caution Warning */}
              {capsLockActive ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 animate-pulse">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  <strong>Lưu ý:</strong> Caps Lock đang được bật!
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                className="button button-primary w-full h-11 flex items-center justify-center font-bold tracking-wider mt-2 transition-all cursor-pointer rounded-lg text-xs"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Đăng nhập
              </button>
            </form>
          </div>
        </div>

      </section>
    </main>
  );
}
