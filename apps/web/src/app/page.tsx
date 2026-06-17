import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell justify-center">
      <section className="panel mx-auto grid max-w-6xl gap-10 overflow-hidden md:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <span className="inline-flex w-fit border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary rounded-full">
              [ SYSTEM_PORTAL // ONLINE ]
            </span>
            <div className="space-y-4">
              <h1 className="font-sans text-4xl font-extrabold tracking-tight text-foreground md:text-5xl leading-tight">
                Warehouse Hub // Control Deck
              </h1>
              <p className="max-w-2xl text-xs leading-relaxed text-muted normal-case">
                Hệ thống kiểm soát tồn kho vật tư, quản lý giao dịch nhập xuất, đối chiếu dữ liệu Excel danh mục hàng hóa nội bộ. Cấu hình phân quyền chặt chẽ cho Quản trị viên, Thủ kho và Kỹ thuật viên bảo trì.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link className="button button-primary" href="/login">
              Đăng nhập hệ thống
            </Link>
            <Link className="button button-ghost" href="/inventory">
              Vào giao diện kho
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel-strong bg-[#fcfcfb] border border-line p-5 rounded-2xl">
            <p className="label">[ MODULE_TELEMETRY ]</p>
            <div className="grid gap-2 text-xs font-mono text-muted">
              <div className="border border-line bg-surface p-3 flex justify-between rounded-lg">
                <span>DASHBOARD_INDICATORS</span>
                <span className="text-success font-bold">[ OK ]</span>
              </div>
              <div className="border border-line bg-surface p-3 flex justify-between rounded-lg">
                <span>SERVER_SIDE_QUERY_FILTER</span>
                <span className="text-success font-bold">[ ACTIVE ]</span>
              </div>
              <div className="border border-line bg-surface p-3 flex justify-between rounded-lg">
                <span>DATA_HISTORIAN_DRAWER</span>
                <span className="text-success font-bold">[ LOADED ]</span>
              </div>
              <div className="border border-line bg-surface p-3 flex justify-between rounded-lg">
                <span>EXCEL_PARSER_IMAGE_EMBED</span>
                <span className="text-success font-bold">[ READY ]</span>
              </div>
            </div>
          </div>
          
          <div className="panel-strong bg-[#fcfcfb] border border-line p-5 rounded-2xl">
            <p className="label">[ ACTIVE_HAZARD_LEVELS ]</p>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="border border-line bg-surface px-3 py-1.5 text-foreground rounded-full">
                SUBSTRATE: DEEP_LIGHT
              </span>
              <span className="border border-[#c3fae8] bg-[#e6fcf5] px-3 py-1.5 text-[#0ca678] rounded-full">
                INBOUND: ACTIVE
              </span>
              <span className="border border-primary/25 bg-primary/5 px-3 py-1.5 text-primary rounded-full">
                OUTBOUND: STAGE
              </span>
              <span className="border border-[#ffe066] bg-[#fff9db] px-3 py-1.5 text-[#f08c00] rounded-full">
                ADJUSTMENT: VERIFY
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
