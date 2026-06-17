"use client";

import { LoaderCircle, X } from "lucide-react";
import { FileField, FilterSelect } from "./inventory-shared";

export type TransactionMode = "IN" | "OUT" | "ADJUSTMENT";

export type TransactionDraft = {
  mode: TransactionMode;
  warehouseId: string;
  itemId: string;
  itemName: string;
  uomId: string;
  quantity: string;
  targetQuantity: string;
  minQty: string;
  referenceCode: string;
  note: string;
  itemImages: File[];
  invoices: File[];
  evidence: File[];
};

function getModalTitle(mode: TransactionMode) {
  switch (mode) {
    case "IN":
      return "Nhập kho";
    case "OUT":
      return "Xuất kho";
    case "ADJUSTMENT":
    default:
      return "Điều chỉnh kho";
  }
}

export function TransactionModal({
  draft,
  busy,
  options,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: TransactionDraft;
  busy: boolean;
  options: {
    warehouses: Array<{ id: string; name: string }>;
    uoms: Array<{ id: string; name: string }>;
  };
  onChange: (nextDraft: TransactionDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const noteLabel = draft.mode === "OUT" ? "Lý do xuất kho" : "Ghi chú";
  const notePlaceholder =
    draft.mode === "OUT"
      ? "Ví dụ: cấp cho tổ điện sửa máy, thay vật tư bảo trì..."
      : "Nhập thông tin ghi chú...";

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs">
      <button
        aria-label="Đóng giao dịch"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />

      <div className="absolute inset-x-0 bottom-0 top-8 flex justify-center p-3 sm:top-6 sm:p-4">
        <div className="panel-strong relative flex h-full w-full max-w-3xl flex-col overflow-hidden border border-line bg-surface rounded-2xl shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5 bg-[#fcfcfb]">
            <div>
              <p className="label">[ GIAO DỊCH KHO ]</p>
              <h3 className="font-sans text-xl font-bold tracking-tight text-foreground">
                {getModalTitle(draft.mode)}
              </h3>
            </div>

            <button className="button button-ghost shrink-0" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FilterSelect
                label="Kho"
                onChange={(value) => onChange({ ...draft, warehouseId: value })}
                options={options.warehouses}
                value={draft.warehouseId}
              />

              {draft.itemId ? (
                <label className="block">
                  <span className="label">Tên vật tư</span>
                  <input className="field bg-[#fbfbf9] text-muted cursor-not-allowed font-sans text-sm" readOnly value={draft.itemName} />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="label">Tên vật tư</span>
                    <input
                      className="field font-sans"
                      onChange={(event) => onChange({ ...draft, itemName: event.target.value })}
                      placeholder="Nhập tên vật tư..."
                      value={draft.itemName}
                    />
                  </label>
                  <FilterSelect
                    label="Đơn vị tính"
                    onChange={(value) => onChange({ ...draft, uomId: value })}
                    options={options.uoms}
                    value={draft.uomId}
                  />
                </>
              )}

              {draft.mode === "ADJUSTMENT" ? (
                <label className="block">
                  <span className="label">Số lượng đích</span>
                  <input
                    className="field font-mono"
                    onChange={(event) => onChange({ ...draft, targetQuantity: event.target.value })}
                    placeholder="Nhập số lượng..."
                    type="number"
                    value={draft.targetQuantity}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="label">Số lượng</span>
                  <input
                    className="field font-mono"
                    onChange={(event) => onChange({ ...draft, quantity: event.target.value })}
                    placeholder="Nhập số lượng..."
                    type="number"
                    value={draft.quantity}
                  />
                </label>
              )}

              <label className="block">
                <span className="label">Tồn tối thiểu</span>
                <input
                  className="field font-mono"
                  onChange={(event) => onChange({ ...draft, minQty: event.target.value })}
                  placeholder="Ví dụ: 5"
                  type="number"
                  value={draft.minQty}
                />
              </label>

              <label className="md:col-span-2 block">
                <span className="label">{noteLabel}</span>
                <textarea
                  className="field min-h-24 font-sans text-sm"
                  onChange={(event) => onChange({ ...draft, note: event.target.value })}
                  placeholder={notePlaceholder}
                  value={draft.note}
                />
              </label>

              <label className="block">
                <span className="label">Mã tham chiếu</span>
                <input
                  className="field font-mono"
                  onChange={(event) => onChange({ ...draft, referenceCode: event.target.value })}
                  placeholder="Phiếu, hóa đơn, mã nội bộ..."
                  value={draft.referenceCode}
                />
              </label>

              <div className="border border-line bg-[#fcfcfb] p-4 text-xs text-muted font-sans rounded-xl">
                <p className="font-bold text-foreground">Gợi ý kiểm soát</p>
                <p className="mt-1 normal-case leading-relaxed">
                  Với phiếu xuất, nên nhập rõ lý do hoặc bộ phận sử dụng để tra cứu lại dễ hơn.
                </p>
              </div>

              <FileField
                label="Ảnh vật tư"
                onChange={(files) => onChange({ ...draft, itemImages: files })}
              />
              <FileField
                label="Hóa đơn"
                onChange={(files) => onChange({ ...draft, invoices: files })}
              />
              <FileField
                label="Chứng từ khác"
                onChange={(files) => onChange({ ...draft, evidence: files })}
              />
            </div>
          </div>

          <div className="border-t border-line bg-[#fcfcfb] px-4 py-4 sm:px-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="button button-ghost w-full sm:w-auto" onClick={onClose} type="button">
                Hủy
              </button>
              <button
                className={
                  draft.mode === "IN"
                    ? "button button-success w-full sm:w-auto"
                    : draft.mode === "OUT"
                      ? "button button-danger w-full sm:w-auto"
                      : "button button-primary w-full sm:w-auto"
                }
                disabled={busy}
                onClick={onSubmit}
                type="button"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {draft.mode === "IN" ? "Xác nhận nhập kho" : draft.mode === "OUT" ? "Xác nhận xuất kho" : "Xác nhận điều chỉnh"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
