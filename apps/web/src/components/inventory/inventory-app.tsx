"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  ArrowDownUp,
  Clock3,
  Download,
  LoaderCircle,
  PackagePlus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { downloadBlob, formatDateTime, formatNumber } from "@/lib/format";
import type {
  DashboardIndicators,
  ImportPreview,
  InventoryDetail,
  InventoryOptionsResponse,
  InventoryRow,
  PaginatedResponse,
  TransactionHistoryRow,
} from "@/lib/types";
import { InventoryDetailDrawer } from "./inventory-detail-drawer";
import {
  FilterSelect,
  getTransactionNoteLabel,
  getTransactionTypeLabel,
  IndicatorCard,
  LoadingInline,
} from "./inventory-shared";
import {
  TransactionDraft,
  TransactionModal,
  TransactionMode,
} from "./transaction-modal";

type FilterState = {
  search: string;
  warehouseId: string;
  unitId: string;
  status: string;
  uomId: string;
  hasAttachments: string;
  updatedFrom: string;
  updatedTo: string;
  sortBy: "updatedAt" | "qty" | "name";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
};

const defaultDraft: TransactionDraft = {
  mode: "IN",
  warehouseId: "",
  itemId: "",
  itemName: "",
  uomId: "",
  quantity: "",
  targetQuantity: "",
  minQty: "",
  referenceCode: "",
  note: "",
  itemImages: [],
  invoices: [],
  evidence: [],
};

function buildQueryParams(filters: FilterState, deferredSearch: string) {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    search: deferredSearch || undefined,
    warehouseId: filters.warehouseId || undefined,
    unitId: filters.unitId || undefined,
    status: filters.status || undefined,
    uomId: filters.uomId || undefined,
    hasAttachments: filters.hasAttachments === "" ? undefined : filters.hasAttachments,
    updatedFrom: filters.updatedFrom || undefined,
    updatedTo: filters.updatedTo || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }

  return message ?? fallback;
}

function TransactionHistoryModal({
  onClose,
  transactions,
  isLoading,
}: {
  onClose: () => void;
  transactions: TransactionHistoryRow[];
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] bg-white border border-line rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary animate-pulse" />
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">
              Lịch sử giao dịch & hoạt động
            </h2>
          </div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-bold"
            onClick={onClose}
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <LoadingInline text="Đang tải lịch sử giao dịch..." />
          ) : transactions.length > 0 ? (
            <div className="grid gap-3">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="border border-line bg-[#fcfcfb] p-4 rounded-xl font-sans hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`status-pill px-2.5 py-0.5 text-[9px] font-bold border rounded-full uppercase tracking-wider ${
                            transaction.type === "IN"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : transaction.type === "OUT"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        <p className="font-bold text-sm text-slate-800 truncate">
                          {transaction.itemName}
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        Kho lưu trữ: <span className="font-semibold text-slate-700">{transaction.warehouseName}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Người thực hiện: <span className="font-semibold text-slate-700">{transaction.createdBy}</span> • Thời gian: {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 border border-line bg-white px-4 py-2 text-xs text-muted min-w-[160px] rounded-lg">
                      <div className="flex justify-between">
                        <span>Số lượng:</span>
                        <strong className="text-slate-800">{formatNumber(transaction.quantity)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 mt-1">
                        <span>Tồn sau:</span>
                        <strong className="text-slate-800">{formatNumber(transaction.quantityAfter)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border border-line bg-white p-3 text-xs text-muted rounded-lg">
                    <p className="font-bold text-slate-700 mb-1">
                      {getTransactionNoteLabel(transaction.type)}
                    </p>
                    <p className="text-slate-600 leading-relaxed normal-case">{transaction.note ?? "Không có ghi chú"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-line bg-[#fbfbf9] px-4 py-12 text-center text-xs text-muted uppercase rounded-xl">
              Chưa ghi nhận giao dịch nào.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-line px-6 py-4 bg-slate-50">
          <button
            className="button button-ghost"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryCard({
  row,
  canWrite,
  onOpen,
  onDraft,
}: {
  row: InventoryRow;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDraft: (mode: TransactionMode, row: InventoryRow) => void;
}) {
  return (
    <article className="border border-line bg-white p-4 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start gap-3">
        <button className="shrink-0" onClick={() => onOpen(row.id)} type="button">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden border border-line bg-[#fbfbf9] rounded-xl">
            {row.imageUrl ? (
              <img alt={row.itemName} className="h-full w-full object-cover" src={row.imageUrl} />
            ) : (
              <span className="px-2 text-center text-[10px] font-bold text-muted tracking-wide uppercase">
                Không ảnh
              </span>
            )}
          </div>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button className="min-w-0 text-left" onClick={() => onOpen(row.id)} type="button">
              <p className="truncate font-sans font-bold text-slate-800 text-sm tracking-tight">{row.itemName}</p>
              <p className="mt-1 text-[10px] text-muted">
                SKU: <span className="font-semibold text-slate-700">{row.sku}</span> • ĐVT: <span className="font-semibold text-slate-700">{row.uomName}</span>
              </p>
            </button>

            <span
              className={`status-pill ${
                row.status === "IN_STOCK"
                  ? "border-[#c3fae8] bg-[#e6fcf5] text-[#0ca678]"
                  : row.status === "LOW_STOCK"
                    ? "border-[#ffe066] bg-[#fff9db] text-[#f08c00]"
                    : "border-[#ffc9c9] bg-[#fff5f5] text-[#c92a2a]"
              }`}
            >
              {row.statusLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted">
            <div className="border border-line bg-[#fcfcfb] px-3 py-2 rounded-lg">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-85">TỒN HIỆN TẠI</p>
              <p className="mt-1 text-lg font-black text-slate-800 leading-none">{formatNumber(row.currentQty)}</p>
            </div>
            <div className="border border-line bg-[#fcfcfb] px-3 py-2 rounded-lg">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-85">KHO CHỨA</p>
              <p className="mt-1 font-bold text-slate-800 truncate leading-tight">{row.warehouseName}</p>
              <p className="text-[9px] text-muted mt-0.5">{row.unitName}</p>
            </div>
          </div>

          <div className="mt-3 border border-line bg-[#fcfcfb] px-3 py-2 text-xs text-muted rounded-lg">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1c7ed6]">
              Ghi chú gần nhất
            </p>
            <p className="mt-1 normal-case leading-normal text-slate-600">{row.latestNote ?? "Chưa ghi nhận cập nhật."}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted border-t border-line/40 pt-2 font-medium">
            <span>
              Đầu: {formatNumber(row.openingQty)} • Nhập: {formatNumber(row.totalInQty)} • Xuất: {formatNumber(row.totalOutQty)}
            </span>
            <span>{formatDateTime(row.updatedAt)}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="button button-ghost w-full py-1 text-xs" onClick={() => onOpen(row.id)} type="button">
              Chi tiết
            </button>
            {canWrite ? (
              <button className="button button-success w-full py-1 text-xs" onClick={() => onDraft("IN", row)} type="button">
                Nhập kho
              </button>
            ) : (
              <div />
            )}
            {canWrite ? (
              <>
                <button className="button button-danger w-full py-1 text-xs" onClick={() => onDraft("OUT", row)} type="button">
                  Xuất kho
                </button>
                <button className="button button-primary w-full py-1 text-xs" onClick={() => onDraft("ADJUSTMENT", row)} type="button">
                  Điều chỉnh
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function InventoryApp() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canWrite = session?.user.role === "ADMIN" || session?.user.role === "STAFF";
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    warehouseId: "",
    unitId: "",
    status: "",
    uomId: "",
    hasAttachments: "",
    updatedFrom: "",
    updatedTo: "",
    sortBy: "updatedAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 25,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);
  const queryParams = useMemo(
    () => buildQueryParams(filters, deferredSearch),
    [deferredSearch, filters],
  );

  const optionsQuery = useQuery({
    queryKey: ["inventory-options"],
    queryFn: async () => {
      const response = await api.get<InventoryOptionsResponse>("/inventory/options");
      return response.data;
    },
  });

  const activeFiltersList = useMemo(() => {
    const list: Array<{ key: keyof FilterState; label: string; displayValue: string }> = [];
    
    if (filters.warehouseId && optionsQuery.data?.warehouses) {
      const wh = optionsQuery.data.warehouses.find(w => w.id === filters.warehouseId);
      if (wh) list.push({ key: "warehouseId", label: "Kho", displayValue: wh.name });
    }
    if (filters.unitId && optionsQuery.data?.units) {
      const u = optionsQuery.data.units.find(item => item.id === filters.unitId);
      if (u) list.push({ key: "unitId", label: "Đơn vị", displayValue: u.name });
    }
    if (filters.status && optionsQuery.data?.statuses) {
      const st = optionsQuery.data.statuses.find(item => item.value === filters.status);
      if (st) list.push({ key: "status", label: "Trạng thái", displayValue: st.label });
    }
    if (filters.uomId && optionsQuery.data?.uoms) {
      const uom = optionsQuery.data.uoms.find(item => item.id === filters.uomId);
      if (uom) list.push({ key: "uomId", label: "ĐVT", displayValue: uom.name });
    }
    if (filters.hasAttachments !== "") {
      list.push({
        key: "hasAttachments",
        label: "Đính kèm",
        displayValue: filters.hasAttachments === "true" ? "Có tệp" : "Không tệp",
      });
    }
    if (filters.updatedFrom) {
      list.push({ key: "updatedFrom", label: "Từ ngày", displayValue: filters.updatedFrom });
    }
    if (filters.updatedTo) {
      list.push({ key: "updatedTo", label: "Đến ngày", displayValue: filters.updatedTo });
    }
    
    return list;
  }, [filters, optionsQuery.data]);

  const clearFilter = (key: keyof FilterState) => {
    setFilters((current) => {
      const next = { ...current, page: 1 };
      if (key === "hasAttachments") {
        next.hasAttachments = "";
      } else if (key === "sortBy") {
        next.sortBy = "updatedAt";
      } else if (key === "sortOrder") {
        next.sortOrder = "desc";
      } else {
        (next as any)[key] = "";
      }
      return next;
    });
  };

  const indicatorsQuery = useQuery({
    queryKey: ["dashboard-indicators"],
    queryFn: async () => {
      const response = await api.get<DashboardIndicators>("/dashboard/indicators");
      return response.data;
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", queryParams],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<InventoryRow>>("/inventory", {
        params: queryParams,
      });
      return response.data;
    },
  });

  const recentTransactionsQuery = useQuery({
    queryKey: [
      "transactions",
      {
        search: deferredSearch || undefined,
        warehouseId: filters.warehouseId || undefined,
      },
    ],
    enabled: canWrite,
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<TransactionHistoryRow>>("/transactions", {
        params: {
          page: 1,
          pageSize: 8,
          search: deferredSearch || undefined,
          warehouseId: filters.warehouseId || undefined,
        },
      });
      return response.data;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["inventory-detail", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await api.get<InventoryDetail>(`/inventory/${selectedId}`);
      return response.data;
    },
  });

  const transactionMutation = useMutation({
    mutationFn: async (payload: TransactionDraft) => {
      const formData = new FormData();
      formData.set("warehouseId", payload.warehouseId);

      if (payload.referenceCode.trim()) {
        formData.set("referenceCode", payload.referenceCode.trim());
      }

      if (payload.note.trim()) {
        formData.set("note", payload.note.trim());
      }

      if (payload.itemId) {
        formData.set("itemId", payload.itemId);
      } else {
        formData.set("itemName", payload.itemName.trim());
        formData.set("uomId", payload.uomId);
      }

      if (payload.minQty !== "") {
        formData.set("minQty", payload.minQty);
      }

      if (payload.mode === "ADJUSTMENT") {
        formData.set("targetQuantity", payload.targetQuantity);
      } else {
        formData.set("quantity", payload.quantity);
      }

      payload.itemImages.forEach((file) => formData.append("itemImages", file));
      payload.invoices.forEach((file) => formData.append("invoices", file));
      payload.evidence.forEach((file) => formData.append("evidence", file));

      const endpoint =
        payload.mode === "IN"
          ? "/transactions/in"
          : payload.mode === "OUT"
            ? "/transactions/out"
            : "/transactions/adjust";

      await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: async (_, variables) => {
      const existingItem = optionsQuery.data?.items?.find(
        (item) => item.name.trim().toLowerCase() === variables.itemName.trim().toLowerCase()
      );
      const isNewItemCreated = !variables.itemId && !existingItem;

      if (isNewItemCreated && variables.mode === "IN") {
        setStatusMessage(`Đã tạo vật tư mới "${variables.itemName}" và ghi nhận nhập kho thành công.`);
      } else {
        setStatusMessage("Đã lưu giao dịch thành công.");
      }
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-indicators"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-options"] }),
      ]);
    },
    onError: (error) => {
      setStatusMessage(
        getErrorMessage(error, "Không thể lưu giao dịch. Vui lòng kiểm tra lại dữ liệu."),
      );
    },
  });



  function openDraft(mode: TransactionMode, row?: InventoryRow) {
    setDraft({
      ...defaultDraft,
      mode,
      warehouseId: row?.warehouseId ?? optionsQuery.data?.warehouses[0]?.id ?? "",
      itemId: row?.itemId ?? "",
      itemName: row?.itemName ?? "",
      uomId: row?.uomId ?? optionsQuery.data?.uoms[0]?.id ?? "",
      targetQuantity: row ? String(row.currentQty) : "",
      minQty: row ? String(row.minQty) : "",
      note: mode === "OUT" ? row?.latestNote ?? "" : "",
    });
  }

  async function exportExcel() {
    try {
      const response = await api.get("/exports/excel", {
        params: queryParams,
        responseType: "blob",
      });
      downloadBlob(
        response.data,
        `warehouse-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      setStatusMessage("Đã export workbook thành công.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Không thể export workbook."));
    }
  }

  const inventoryRows = inventoryQuery.data?.items ?? [];
  const recentTransactions = recentTransactionsQuery.data?.items ?? [];
  const pagination = inventoryQuery.data?.meta;

  return (
    <div className="grid gap-4">
      {statusMessage ? (
        <div className="border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary rounded-xl flex items-center justify-between gap-2 shadow-xs transition-all animate-fade-in-up">
          <span>{statusMessage}</span>
          <button
            className="text-primary/70 hover:text-primary font-bold text-sm h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
            onClick={() => setStatusMessage("")}
            type="button"
          >
            &times;
          </button>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <IndicatorCard
          label="Tổng SKU"
          tone="bg-slate-950 text-white"
          value={formatNumber(indicatorsQuery.data?.totalSku ?? 0)}
        />
        <IndicatorCard
          label="Còn hàng"
          tone="bg-emerald-600 text-white"
          value={formatNumber(indicatorsQuery.data?.inStock ?? 0)}
        />
        <IndicatorCard
          label="Sắp hết"
          tone="bg-amber-500 text-white"
          value={formatNumber(indicatorsQuery.data?.lowStock ?? 0)}
        />
        <IndicatorCard
          label="Hết hàng"
          tone="bg-orange-600 text-white"
          value={formatNumber(indicatorsQuery.data?.outOfStock ?? 0)}
        />
        <IndicatorCard
          label="Giao dịch 7 ngày"
          tone="col-span-2 bg-[#0f3d8c] text-white lg:col-span-1"
          value={formatNumber(indicatorsQuery.data?.recentTransactions ?? 0)}
        />
      </section>

      <section className="panel-strong p-4 sm:p-5 border border-line bg-surface rounded-2xl shadow-xs">
        <div className="grid gap-4">
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="field pl-11 font-sans text-sm"
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => {
                    setFilters((current) => ({ ...current, search: value, page: 1 }));
                  });
                }}
                placeholder="Tìm kiếm vật tư, SKU, kho lưu trữ..."
                value={filters.search}
              />
            </div>

            {activeFiltersList.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Đang lọc:</span>
                {activeFiltersList.map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 text-xs rounded-full font-medium"
                  >
                    <span>{item.label}: <strong className="text-slate-800 font-semibold">{item.displayValue}</strong></span>
                    <button
                      className="hover:bg-primary/20 rounded-full h-4 w-4 flex items-center justify-center font-bold text-[10px] leading-none transition-colors cursor-pointer"
                      onClick={() => clearFilter(item.key)}
                      type="button"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <button
                  className="text-[9px] font-bold text-muted hover:text-primary uppercase tracking-wider ml-1 hover:underline cursor-pointer"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      warehouseId: "",
                      unitId: "",
                      status: "",
                      uomId: "",
                      hasAttachments: "",
                      updatedFrom: "",
                      updatedTo: "",
                      page: 1,
                    }))
                  }
                  type="button"
                >
                  Xoá tất cả
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                className="button button-ghost w-full"
                onClick={() => setShowFilters((current) => !current)}
                type="button"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showFilters ? "Ẩn bộ lọc" : "Lọc nâng cao"}
              </button>

              {canWrite ? (
                <button className="button button-success w-full" onClick={() => openDraft("IN")} type="button">
                  <PackagePlus className="h-4 w-4" />
                  Nhập kho vật tư
                </button>
              ) : null}

              {canWrite ? (
                <button
                  className="button button-ghost w-full"
                  onClick={() => setShowHistoryModal(true)}
                  type="button"
                >
                  <Clock3 className="h-4 w-4 text-primary" />
                  Lịch sử hoạt động
                </button>
              ) : null}

              {canWrite ? (
                <button className="button button-primary w-full" onClick={exportExcel} type="button">
                  <Download className="h-4 w-4" />
                  Xuất báo cáo Excel
                </button>
              ) : null}
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-6 border border-line bg-[#fcfcfb] p-6 rounded-2xl shadow-xs animate-fade-in-up">
              {/* Group 1: Phân loại & Địa điểm */}
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3 border-b border-line/60 pb-1.5">
                  Phân loại & Vị trí
                </p>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <FilterSelect
                    label="Kho lưu trữ"
                    onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value, page: 1 }))}
                    options={optionsQuery.data?.warehouses ?? []}
                    value={filters.warehouseId}
                  />
                  <FilterSelect
                    label="Đơn vị sử dụng"
                    onChange={(value) => setFilters((current) => ({ ...current, unitId: value, page: 1 }))}
                    options={optionsQuery.data?.units ?? []}
                    value={filters.unitId}
                  />
                  <FilterSelect
                    label="Đơn vị tính (ĐVT)"
                    onChange={(value) => setFilters((current) => ({ ...current, uomId: value, page: 1 }))}
                    options={optionsQuery.data?.uoms ?? []}
                    value={filters.uomId}
                  />
                  <label className="block">
                    <span className="label">Tệp đính kèm</span>
                    <select
                      className="field cursor-pointer text-sm font-sans"
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          hasAttachments: event.target.value,
                          page: 1,
                        }))
                      }
                      value={filters.hasAttachments}
                    >
                      <option value="">Tất cả</option>
                      <option value="true">Có đính kèm</option>
                      <option value="false">Không đính kèm</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Group 2: Trạng thái & Thời gian */}
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3 border-b border-line/60 pb-1.5">
                  Trạng thái & Thời gian
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FilterSelect
                    label="Trạng thái hàng hoá"
                    onChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
                    options={
                      optionsQuery.data?.statuses.map((item) => ({ id: item.value, name: item.label })) ?? []
                    }
                    value={filters.status}
                  />
                  <label className="block">
                    <span className="label">Cập nhật từ ngày</span>
                    <input
                      className="field cursor-pointer text-sm font-sans"
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, updatedFrom: event.target.value, page: 1 }))
                      }
                      type="date"
                      value={filters.updatedFrom}
                    />
                  </label>
                  <label className="block">
                    <span className="label">Cập nhật đến ngày</span>
                    <input
                      className="field cursor-pointer text-sm font-sans"
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, updatedTo: event.target.value, page: 1 }))
                      }
                      type="date"
                      value={filters.updatedTo}
                    />
                  </label>
                </div>
              </div>

              {/* Group 3: Sắp xếp & Thứ tự */}
              <div className="border-t border-line/60 pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="grid gap-4 sm:grid-cols-2 flex-1 max-w-2xl">
                  <label className="block">
                    <span className="label">Sắp xếp theo</span>
                    <select
                      className="field cursor-pointer text-sm font-sans"
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          sortBy: event.target.value as FilterState["sortBy"],
                          page: 1,
                        }))
                      }
                      value={filters.sortBy}
                    >
                      <option value="updatedAt">Ngày cập nhật</option>
                      <option value="qty">Số lượng tồn kho</option>
                      <option value="name">Tên vật tư</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Thứ tự hiển thị</span>
                    <select
                      className="field cursor-pointer text-sm font-sans"
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          sortOrder: event.target.value as FilterState["sortOrder"],
                          page: 1,
                        }))
                      }
                      value={filters.sortOrder}
                    >
                      <option value="desc">Giảm dần (Mới nhất)</option>
                      <option value="asc">Tăng dần (Cũ nhất)</option>
                    </select>
                  </label>
                </div>

                <div className="sm:max-w-xs w-full">
                  <button
                    className="button button-ghost w-full"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        warehouseId: "",
                        unitId: "",
                        status: "",
                        uomId: "",
                        hasAttachments: "",
                        updatedFrom: "",
                        updatedTo: "",
                        sortBy: "updatedAt",
                        sortOrder: "desc",
                        page: 1,
                      }))
                    }
                    type="button"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </section>

      <section className="grid gap-4">
        <div className="md:hidden">
          {inventoryQuery.isLoading ? (
            <div className="panel-strong p-5">
              <LoadingInline text="Đang tải danh sách vật tư..." />
            </div>
          ) : inventoryRows.length > 0 ? (
            <div className="grid gap-3">
              {inventoryRows.map((row) => (
                <InventoryCard
                  key={row.id}
                  canWrite={canWrite}
                  onDraft={openDraft}
                  onOpen={setSelectedId}
                  row={row}
                />
              ))}
            </div>
          ) : (
            <div className="panel-strong border border-line px-4 py-12 text-center text-xs text-muted uppercase font-sans rounded-xl">
              Không tìm thấy vật tư phù hợp.
            </div>
          )}
        </div>

        <div className="panel-strong hidden overflow-hidden md:block bg-surface border border-line rounded-2xl shadow-xs">
          <div className="table-scroll border-0">
            <table className="min-w-full text-left font-sans text-xs border-collapse">
              <thead className="border-b border-line bg-[#fcfcfb] text-muted uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-4">Vật tư hàng hóa</th>
                  <th className="px-4 py-4">Kho lưu trữ</th>
                  <th className="px-4 py-4">Tồn cuối kỳ</th>
                  <th className="px-4 py-4">Trạng thái</th>
                  <th className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <ArrowDownUp className="h-3.5 w-3.5 text-primary" />
                      Cập nhật gần nhất
                    </span>
                  </th>
                  <th className="px-4 py-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {inventoryQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-10" colSpan={6}>
                      <LoadingInline text="Đang tải dữ liệu bảng tồn..." />
                    </td>
                  </tr>
                ) : inventoryRows.length > 0 ? (
                  inventoryRows.map((row) => (
                    <tr key={row.id} className="border-b border-line hover:bg-[#fbfbf9] transition-all">
                      <td className="px-4 py-4">
                        <button className="flex items-center gap-3 text-left cursor-pointer" onClick={() => setSelectedId(row.id)} type="button">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-line bg-[#fbfbf9] rounded-xl">
                            {row.imageUrl ? (
                              <img alt={row.itemName} className="h-full w-full object-cover" src={row.imageUrl} />
                            ) : (
                              <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Không ảnh</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground tracking-tight">{row.itemName}</p>
                            <p className="text-[10px] text-muted mt-0.5">
                              SKU: <span className="font-semibold text-slate-700">{row.sku}</span> • ĐVT: <span className="font-semibold text-slate-700">{row.uomName}</span>
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-foreground">{row.warehouseName}</p>
                        <p className="text-[10px] text-muted mt-0.5">{row.unitName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-extrabold text-slate-800">{formatNumber(row.currentQty)}</p>
                        <p className="text-[9px] text-muted mt-0.5 font-medium">
                          Đầu: {formatNumber(row.openingQty)} • Nhập: {formatNumber(row.totalInQty)} • Xuất: {formatNumber(row.totalOutQty)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`status-pill ${
                            row.status === "IN_STOCK"
                              ? "border-[#c3fae8] bg-[#e6fcf5] text-[#0ca678]"
                              : row.status === "LOW_STOCK"
                                ? "border-[#ffe066] bg-[#fff9db] text-[#f08c00]"
                                : "border-[#ffc9c9] bg-[#fff5f5] text-[#c92a2a]"
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted text-[10px] font-mono">
                        <p>{formatDateTime(row.updatedAt)}</p>
                        <p className="mt-0.5 text-[9px] normal-case text-muted max-w-[200px] truncate">{row.latestNote ?? "Chưa ghi nhận ghi chú."}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button className="button button-ghost px-2.5 py-1 text-[10px] min-h-0 rounded" onClick={() => setSelectedId(row.id)} type="button">
                            Chi tiết
                          </button>
                          {canWrite ? (
                            <>
                              <button className="button button-success px-2.5 py-1 text-[10px] min-h-0 rounded" onClick={() => openDraft("IN", row)} type="button">
                                Nhập
                              </button>
                              <button className="button button-danger px-2.5 py-1 text-[10px] min-h-0 rounded" onClick={() => openDraft("OUT", row)} type="button">
                                Xuất
                              </button>
                              <button className="button button-primary px-2.5 py-1 text-[10px] min-h-0 rounded" onClick={() => openDraft("ADJUSTMENT", row)} type="button">
                                Chỉnh
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-12 text-center text-xs text-muted uppercase font-sans" colSpan={6}>
                      Không tìm thấy dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-strong flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between border border-line bg-surface font-sans rounded-2xl shadow-xs">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Tổng số dòng: <strong className="text-foreground">{pagination?.total ?? 0}</strong> • Trang: <strong className="text-foreground">{pagination?.page ?? 1}/{pagination?.totalPages ?? 1}</strong>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              className="field w-full sm:max-w-28 font-mono text-xs cursor-pointer"
              onChange={(event) =>
                setFilters((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))
              }
              value={filters.pageSize}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} Dòng
                </option>
              ))}
            </select>
            <button
              className="button button-ghost w-full sm:w-auto px-3 py-1 text-xs"
              disabled={(pagination?.page ?? 1) <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
              type="button"
            >
              Trang trước
            </button>
            <button
              className="button button-primary w-full sm:w-auto px-3 py-1 text-xs"
              disabled={(pagination?.page ?? 1) >= (pagination?.totalPages ?? 1)}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              Trang sau
            </button>
          </div>
        </div>
      </section>

      {showHistoryModal ? (
        <TransactionHistoryModal
          isLoading={recentTransactionsQuery.isLoading}
          onClose={() => setShowHistoryModal(false)}
          transactions={recentTransactions}
        />
      ) : null}

      {selectedId ? (
        <InventoryDetailDrawer
          detail={detailQuery.data}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedId("")}
        />
      ) : null}

      {draft ? (
        <TransactionModal
          busy={transactionMutation.isPending}
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={() => transactionMutation.mutate(draft)}
          options={{
            warehouses: optionsQuery.data?.warehouses ?? [],
            uoms: optionsQuery.data?.uoms ?? [],
            items: optionsQuery.data?.items ?? [],
          }}
        />
      ) : null}
    </div>
  );
}
