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
  let accentColor = "border-t-slate-500 text-slate-800";
  let badgeText = "Tổng quan";
  let badgeBg = "bg-slate-100 text-slate-600";
  
  if (tone.includes("emerald")) {
    accentColor = "border-t-emerald-500 text-emerald-700";
    badgeText = "Đủ hàng";
    badgeBg = "bg-emerald-500/10 text-emerald-700";
  } else if (tone.includes("amber")) {
    accentColor = "border-t-amber-500 text-amber-700";
    badgeText = "Sắp hết";
    badgeBg = "bg-amber-500/10 text-amber-700";
  } else if (tone.includes("orange")) {
    accentColor = "border-t-red-500 text-red-700";
    badgeText = "Hết hàng";
    badgeBg = "bg-red-500/10 text-red-700";
  } else if (tone.includes("slate-950")) {
    accentColor = "border-t-slate-700 text-slate-900";
    badgeText = "Tổng SKU";
    badgeBg = "bg-slate-900/10 text-slate-700";
  } else if (tone.includes("#0f3d8c") || tone.includes("col-span-2")) {
    accentColor = "border-t-blue-500 text-blue-700";
    badgeText = "Hoạt động";
    badgeBg = "bg-blue-500/10 text-blue-700";
  }
  
  const isColSpan2 = tone.includes("col-span-2");
  
  return (
    <div className={`bg-white border-t-[4px] ${accentColor} border-x border-b border-line p-5 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${isColSpan2 ? "col-span-2 lg:col-span-1" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</span>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>
          {badgeText}
        </span>
      </div>
      <p className="mt-4 font-sans text-3xl font-extrabold tracking-tight leading-none text-slate-900">
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
