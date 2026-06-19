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
    <article className="panel-strong border border-line bg-surface p-4 rounded-2xl shadow-xs">
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
              <p className="truncate font-sans font-bold text-foreground text-sm tracking-tight">{row.itemName}</p>
              <p className="mt-1 text-[10px] text-muted font-mono">
                SKU: {row.sku} // ĐVT: {row.uomName}
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
              <p className="mt-1 text-lg font-black text-foreground leading-none font-mono">{formatNumber(row.currentQty)}</p>
            </div>
            <div className="border border-line bg-[#fcfcfb] px-3 py-2 rounded-lg">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-85">KHO CHỨA</p>
              <p className="mt-1 font-bold text-foreground truncate">{row.warehouseName}</p>
              <p className="text-[9px] text-muted mt-0.5">{row.unitName}</p>
            </div>
          </div>

          <div className="mt-3 border border-line bg-[#fcfcfb] px-3 py-2 text-xs text-muted rounded-lg">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1c7ed6]">
              Ghi chú gần nhất
            </p>
            <p className="mt-1 normal-case leading-normal">{row.latestNote ?? "Chưa ghi nhận cập nhật."}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted border-t border-line/40 pt-2 font-mono">
            <span>
              ĐẦU: {formatNumber(row.openingQty)} // NHẬP: {formatNumber(row.totalInQty)} // XUẤT: {formatNumber(row.totalOutQty)}
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
        <div className="border border-line bg-[#fcfcfb] px-4 py-3 text-xs font-mono text-primary rounded-xl">
          {`SYSTEM LOG // ${statusMessage}`}
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

      <section className="panel-strong p-4 sm:p-5">
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

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                <button className="button button-primary w-full" onClick={exportExcel} type="button">
                  <Download className="h-4 w-4" />
                  Xuất báo cáo Excel
                </button>
              ) : null}
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-4 border border-line bg-[#fcfcfb] p-4 md:grid-cols-2 xl:grid-cols-4 rounded-xl">
              <FilterSelect
                label="Kho"
                onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value, page: 1 }))}
                options={optionsQuery.data?.warehouses ?? []}
                value={filters.warehouseId}
              />
              <FilterSelect
                label="Đơn vị"
                onChange={(value) => setFilters((current) => ({ ...current, unitId: value, page: 1 }))}
                options={optionsQuery.data?.units ?? []}
                value={filters.unitId}
              />
              <FilterSelect
                label="Trạng thái"
                onChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
                options={
                  optionsQuery.data?.statuses.map((item) => ({ id: item.value, name: item.label })) ?? []
                }
                value={filters.status}
              />
              <FilterSelect
                label="Đơn vị tính"
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

              <div className="flex items-end">
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
                            <p className="text-[10px] text-muted mt-0.5 font-mono">
                              SKU: {row.sku} // ĐVT: {row.uomName}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-foreground">{row.warehouseName}</p>
                        <p className="text-[10px] text-muted mt-0.5">{row.unitName}</p>
                      </td>
                      <td className="px-4 py-4 font-mono">
                        <p className="text-sm font-black text-foreground">{formatNumber(row.currentQty)}</p>
                        <p className="text-[9px] text-muted mt-0.5">
                          ĐẦU: {formatNumber(row.openingQty)} // NHẬP: {formatNumber(row.totalInQty)} // XUẤT: {formatNumber(row.totalOutQty)}
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
          <p className="text-xs text-muted uppercase tracking-wider">
            Tổng số dòng: <strong className="text-foreground">{pagination?.total ?? 0}</strong> // Trang: <strong className="text-foreground">{pagination?.page ?? 1}/{pagination?.totalPages ?? 1}</strong>
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

      {canWrite ? (
        <section className="panel-strong p-4 sm:p-5 border border-line bg-surface font-sans rounded-2xl shadow-xs">
          <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
            <Clock3 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
              [ HOẠT ĐỘNG / GIAO DỊCH GẦN ĐÂY HỆ THỐNG ]
            </h2>
          </div>

          {recentTransactionsQuery.isLoading ? (
            <LoadingInline text="Đang tải giao dịch gần đây..." />
          ) : recentTransactions.length > 0 ? (
            <div className="grid gap-3">
              {recentTransactions.map((transaction) => (
                <article key={transaction.id} className="border border-line bg-[#fcfcfb] p-4 rounded-xl font-mono">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className={`font-bold text-sm uppercase ${
                        transaction.type === "IN" 
                          ? "text-success" 
                          : transaction.type === "OUT"
                            ? "text-primary"
                            : "text-warning"
                      }`}>
                        {getTransactionTypeLabel(transaction.type)} // VẬT TƯ: {transaction.itemName}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">KHO: {transaction.warehouseName}</p>
                      <p className="mt-2 text-[10px] text-muted">
                        Thủ kho: {transaction.createdBy} // Thời gian: {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>

                    <div className="border border-line bg-surface px-4 py-2.5 text-xs text-muted uppercase tracking-wider min-w-[180px] rounded-lg">
                      <p>SỐ LƯỢNG: <strong className="text-foreground">{formatNumber(transaction.quantity)}</strong></p>
                      <p className="mt-1">TỒN SAU: <strong className="text-foreground">{formatNumber(transaction.quantityAfter)}</strong></p>
                    </div>
                  </div>

                  <div className="mt-3 border border-line bg-surface p-3 text-xs text-muted rounded-lg">
                    <p className="font-bold text-foreground">{" >>> "} {getTransactionNoteLabel(transaction.type)}</p>
                    <p className="mt-1 normal-case leading-relaxed">{transaction.note ?? "Không có ghi chú"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-line bg-[#fbfbf9] px-4 py-8 text-center text-xs text-muted uppercase rounded-xl">
              Chưa ghi nhận giao dịch nào.
            </div>
          )}
        </section>
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
