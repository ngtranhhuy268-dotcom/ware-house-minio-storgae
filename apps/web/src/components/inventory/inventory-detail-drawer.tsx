"use client";

import { X } from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { InventoryDetail } from "@/lib/types";
import {
  getAttachmentKindLabel,
  getTransactionNoteLabel,
  getTransactionTypeLabel,
  LoadingInline,
} from "./inventory-shared";

export function InventoryDetailDrawer({
  detail,
  isLoading,
  onClose,
}: {
  detail?: InventoryDetail;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs">
      <button
        aria-label="Đóng chi tiết"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 bottom-0 top-6 z-10 bg-surface border-l border-line sm:left-auto sm:right-0 sm:top-0 sm:w-full sm:max-w-2xl shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5 bg-[#fcfcfb]">
            <div>
              <p className="label">[ CHI TIẾT VẬT TƯ ]</p>
              <h3 className="font-sans text-xl font-bold tracking-tight text-foreground">
                {detail?.itemName ?? "Đang tải dữ liệu..."}
              </h3>
            </div>
            <button className="button button-ghost shrink-0" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {isLoading ? <LoadingInline text="Đang tải dữ liệu chi tiết..." /> : null}

            {detail ? (
              <div className="grid gap-4">
                {detail.images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.images.map((image) => (
                      <img
                        key={image.id}
                        alt={detail.itemName}
                        className="h-40 w-full object-cover sm:h-48 border border-line rounded-lg"
                        src={image.url}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-line bg-[#fbfbf9] px-4 py-8 text-center text-xs text-muted rounded-xl">
                    Chưa cập nhật ảnh cho vật tư này.
                  </div>
                )}

                <div className="grid gap-2 border border-line bg-[#fcfcfb] p-4 text-xs font-mono text-muted uppercase tracking-wider rounded-xl">
                  <div className="flex justify-between border-b border-line pb-1.5">
                    <span className="font-bold text-foreground/80">MÃ VẬT TƯ (SKU):</span>
                    <span className="text-foreground">{detail.sku}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-1.5">
                    <span className="font-bold text-foreground/80">KHO LƯU TRỮ:</span>
                    <span className="text-foreground">{detail.warehouseName}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-1.5">
                    <span className="font-bold text-foreground/80">TỒN KHO HIỆN TẠI:</span>
                    <span className="text-foreground font-black">{formatNumber(detail.currentQty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground/80">TỒN TỐI THIỂU (ALERT):</span>
                    <span className="text-foreground">{formatNumber(detail.minQty)}</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="label">[ LỊCH SỬ GIAO DỊCH VẬT TƯ ]</p>
                  {detail.transactions.length > 0 ? (
                    detail.transactions.map((transaction) => (
                      <article key={transaction.id} className="border border-line bg-[#fcfcfb] p-4 rounded-xl font-mono">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className={`font-bold text-sm ${
                                transaction.type === "IN" 
                                  ? "text-success" 
                                  : transaction.type === "OUT"
                                    ? "text-primary"
                                    : "text-warning"
                              }`}>
                                {getTransactionTypeLabel(transaction.type)} : {formatNumber(transaction.quantity)}
                              </p>
                              <p className="text-[10px] text-muted uppercase mt-1">
                                Người lập: {transaction.createdBy} // Thời gian: {formatDateTime(transaction.createdAt)}
                              </p>
                            </div>

                            <div className="border border-line bg-surface px-3 py-1.5 text-[10px] text-muted uppercase tracking-wider rounded-lg">
                              <p>ĐẦU: {formatNumber(transaction.quantityBefore)}</p>
                              <p className="mt-0.5">CUỐI: {formatNumber(transaction.quantityAfter)}</p>
                            </div>
                          </div>

                          <div className="border border-line bg-surface p-3 text-xs text-muted rounded-lg">
                            <p className="font-bold text-foreground">{" >>> "} {getTransactionNoteLabel(transaction.type)}</p>
                            <p className="mt-1 normal-case leading-relaxed">{transaction.note ?? "Không có ghi chú"}</p>
                          </div>

                          {transaction.attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {transaction.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  className="button button-ghost text-[10px] px-2 py-1 min-h-0 rounded"
                                  href={attachment.url}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {getAttachmentKindLabel(attachment.kind)}: {attachment.fileName}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="border border-dashed border-line bg-[#fbfbf9] px-4 py-8 text-center text-xs text-muted rounded-xl">
                      Chưa ghi nhận giao dịch nào cho vật tư này.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
