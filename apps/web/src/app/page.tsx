import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Boxes, FileSpreadsheet } from "lucide-react";

export default function Home() {
  return (
    <main className="app-shell justify-center py-12">
      <section className="panel mx-auto grid max-w-5xl gap-10 overflow-hidden md:grid-cols-[1.1fr_0.9fr] p-8 md:p-12">
        
        {/* Left Side: Information and Navigation */}
        <div className="flex flex-col justify-between gap-10">
          <div className="space-y-6">
            <span className="inline-flex w-fit border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary rounded-full">
              Hệ thống kho nội bộ
            </span>
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-foreground md:text-5xl leading-tight uppercase">
                Warehouse Hub
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                Hệ thống kiểm soát tồn kho vật tư, quản lý giao dịch nhập xuất và đối chiếu dữ liệu Excel danh mục hàng hóa nội bộ. Giao diện tối ưu, dễ vận hành cho cả thủ kho và kỹ thuật viên.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link className="button button-primary h-12 px-6 flex items-center justify-center gap-2 rounded-xl text-xs font-bold" href="/inventory">
              Vào giao diện kho
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="button h-12 px-6 flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-white text-slate-700 border-line hover:bg-slate-50" href="/login">
              Đăng nhập hệ thống
            </Link>
          </div>
        </div>

        {/* Right Side: Key Features Showcase */}
        <div className="flex flex-col justify-center gap-4">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Các tính năng chính</h3>
            
            <div className="space-y-3">
              {/* Feature 1 */}
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-[#fcfcfb] p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Quản lý tồn kho thực tế</h4>
                  <p className="text-xs text-muted mt-0.5">Kiểm tra nhanh số lượng vật tư, đơn vị tính và hình ảnh chi tiết.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-[#fcfcfb] p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Giao dịch Nhập & Xuất</h4>
                  <p className="text-xs text-muted mt-0.5">Ghi nhận tức thời lịch sử xuất kho cho thợ và nhập kho từ nhà cung cấp.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-[#fcfcfb] p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Nhập liệu Excel thông minh</h4>
                  <p className="text-xs text-muted mt-0.5">Hỗ trợ import danh mục vật tư số lượng lớn từ Excel tiện lợi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
