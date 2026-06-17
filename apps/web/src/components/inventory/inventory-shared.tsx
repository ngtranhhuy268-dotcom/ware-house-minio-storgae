"use client";

import { LoaderCircle } from "lucide-react";

export function IndicatorCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  // Map legacy tones to soft mechanical light borders and backgrounds
  let colorClasses = "border-line text-foreground bg-surface";
  let labelDecorator = "Tổng quan";
  
  if (tone.includes("emerald")) {
    colorClasses = "border-[#c3fae8] bg-[#e6fcf5] text-[#0ca678]";
    labelDecorator = "Đủ hàng";
  } else if (tone.includes("amber")) {
    colorClasses = "border-[#ffe066] bg-[#fff9db] text-[#f08c00]";
    labelDecorator = "Sắp hết";
  } else if (tone.includes("orange")) {
    colorClasses = "border-[#ffc9c9] bg-[#fff5f5] text-[#c92a2a]";
    labelDecorator = "Hết hàng";
  } else if (tone.includes("slate-950")) {
    colorClasses = "border-line text-foreground bg-[#ffffff]";
    labelDecorator = "Vật tư";
  } else if (tone.includes("#0f3d8c") || tone.includes("col-span-2")) {
    colorClasses = "border-[#a5d8ff] bg-[#e7f5ff] text-[#1c7ed6]";
    labelDecorator = "Hoạt động";
  }
  
  const isColSpan2 = tone.includes("col-span-2");
  const outerClasses = `panel-strong border ${colorClasses} ${isColSpan2 ? "col-span-2 lg:col-span-1" : ""} rounded-2xl p-4 sm:p-5 transition-all`;

  return (
    <div className={outerClasses}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 font-mono">
        {labelDecorator} // {label}
      </p>
      <p className="mt-3 font-mono text-3xl font-black sm:mt-4 sm:text-4xl tracking-tight leading-none">
        {value}
      </p>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="field font-sans cursor-pointer text-sm" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FileField({
  label,
  onChange,
}: {
  label: string;
  onChange: (files: File[]) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative border border-line bg-surface hover:border-primary transition-all rounded-lg">
        <input
          className="w-full opacity-0 absolute inset-0 cursor-pointer h-11"
          multiple
          onChange={(event) => onChange(Array.from(event.target.files ?? []))}
          type="file"
        />
        <div className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-muted select-none">
          <span>CHỌN TẬP TIN...</span>
          <span className="border border-line px-2.5 py-0.5 bg-[#fbfbf9] text-foreground rounded font-sans">DUYỆT</span>
        </div>
      </div>
    </label>
  );
}

export function LoadingInline({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-sans text-[#f08c00]">
      <LoaderCircle className="h-4 w-4 animate-spin text-[#f08c00]" />
      <span>Đang xử lý: {text}</span>
    </div>
  );
}

export function getTransactionTypeLabel(type: string) {
  switch (type) {
    case "IN":
      return "Nhập kho";
    case "OUT":
      return "Xuất kho";
    case "ADJUSTMENT":
      return "Điều chỉnh";
    default:
      return type;
  }
}

export function getAttachmentKindLabel(kind: string) {
  switch (kind) {
    case "PHOTO":
      return "Ảnh";
    case "INVOICE":
      return "Hóa đơn";
    case "EVIDENCE":
      return "Chứng từ";
    default:
      return kind;
  }
}

export function getTransactionNoteLabel(type: string) {
  return type === "OUT" ? "Lý do xuất kho" : "Ghi chú";
}
