"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { LucideIcon } from "lucide-react";
import { Boxes, FileSpreadsheet, LoaderCircle, ShieldCheck, Users, Warehouse } from "lucide-react";
import { type ReactNode, useState } from "react";
import { api } from "@/lib/api-client";
import type { AdminOverview, ImportPreview } from "@/lib/types";
import { FileField } from "../inventory/inventory-shared";

type AdminTab = "users" | "units" | "warehouses" | "uoms" | "imports";

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  role: "ADMIN" | "STAFF" | "TECHNICIAN";
  unitId: string;
};

type BasicEntityForm = {
  code: string;
  name: string;
  description: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }

  return message ?? fallback;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="panel-strong flex items-center gap-4 p-4 sm:p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#082554,#0f3d8c)] text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="label">{label}</p>
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </div>
    </article>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`button whitespace-nowrap ${active ? "button-primary" : "button-ghost"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="label">{title}</p>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function AdminApp() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [statusMessage, setStatusMessage] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWarehouseId, setImportWarehouseId] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({
    fullName: "",
    email: "",
    password: "",
    role: "STAFF",
    unitId: "",
  });
  const [unitForm, setUnitForm] = useState<BasicEntityForm>({
    code: "",
    name: "",
    description: "",
  });
  const [warehouseForm, setWarehouseForm] = useState<BasicEntityForm & { unitId: string }>({
    code: "",
    name: "",
    description: "",
    unitId: "",
  });
  const [uomForm, setUomForm] = useState<BasicEntityForm>({
    code: "",
    name: "",
    description: "",
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await api.get<AdminOverview>("/admin/overview");
      return response.data;
    },
  });

  async function refreshOverview(message: string) {
    setStatusMessage(message);
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/users", {
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
        unitId: userForm.unitId || undefined,
      });
    },
    onSuccess: async () => {
      setUserForm({
        fullName: "",
        email: "",
        password: "",
        role: "STAFF",
        unitId: "",
      });
      await refreshOverview("Đã tạo tài khoản mới.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể tạo tài khoản."));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      await api.patch(`/admin/users/${id}`, { isActive });
    },
    onSuccess: async () => {
      await refreshOverview("Đã cập nhật trạng thái tài khoản.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể cập nhật tài khoản."));
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/units", {
        code: unitForm.code.trim(),
        name: unitForm.name.trim(),
        description: unitForm.description.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setUnitForm({ code: "", name: "", description: "" });
      await refreshOverview("Đã tạo đơn vị mới.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể tạo đơn vị."));
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      await api.patch(`/admin/units/${id}`, { isActive });
    },
    onSuccess: async () => {
      await refreshOverview("Đã cập nhật đơn vị.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể cập nhật đơn vị."));
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/warehouses", {
        code: warehouseForm.code.trim(),
        name: warehouseForm.name.trim(),
        unitId: warehouseForm.unitId,
        description: warehouseForm.description.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setWarehouseForm({
        code: "",
        name: "",
        description: "",
        unitId: "",
      });
      await refreshOverview("Đã tạo kho mới.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể tạo kho."));
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      await api.patch(`/admin/warehouses/${id}`, { isActive });
    },
    onSuccess: async () => {
      await refreshOverview("Đã cập nhật kho.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể cập nhật kho."));
    },
  });

  const createUomMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/uoms", {
        code: uomForm.code.trim(),
        name: uomForm.name.trim(),
        description: uomForm.description.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setUomForm({ code: "", name: "", description: "" });
      await refreshOverview("Đã tạo đơn vị tính mới.");
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, "Không thể tạo đơn vị tính."));
    },
  });

  const directImportMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) {
        throw new Error("missing-file");
      }
      if (!importWarehouseId) {
        throw new Error("missing-warehouse");
      }

      const formData = new FormData();
      formData.append("file", importFile);
      formData.set("warehouseId", importWarehouseId);
      formData.set("overwriteExisting", "true");
      formData.set("type", "LEGACY_BOOTSTRAP");

      const response = await api.post<ImportPreview>("/imports/excel/direct", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      setPreview(data);
      setStatusMessage("Đã đồng bộ dữ liệu Excel vào kho thành công.");
      await refreshOverview("Đã đồng bộ dữ liệu vào kho.");
    },
    onError: (error) => {
      setStatusMessage(
        getErrorMessage(error, "Nhập dữ liệu thất bại. Vui lòng kiểm tra định dạng hoặc kết nối."),
      );
    },
  });

  const data = overviewQuery.data;
  const roleOptions = data?.roles ?? [];
  const unitOptions = data?.units ?? [];

  return (
    <div className="grid gap-4">
      {statusMessage ? (
        <div className="rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          helper="Tổng tài khoản đang có trong hệ thống"
          icon={Users}
          label="Người dùng"
          value={String(data?.users.length ?? 0)}
        />
        <SummaryCard
          helper="Số đơn vị để phân quyền và tổ chức kho"
          icon={ShieldCheck}
          label="Đơn vị"
          value={String(data?.units.length ?? 0)}
        />
        <SummaryCard
          helper="Tổng kho đang được cấu hình"
          icon={Warehouse}
          label="Kho"
          value={String(data?.warehouses.length ?? 0)}
        />
        <SummaryCard
          helper="Phiên import Excel gần đây"
          icon={Boxes}
          label="Import"
          value={String(data?.importJobs.length ?? 0)}
        />
      </section>

      <section className="panel-strong p-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
            Tài khoản
          </TabButton>
          <TabButton active={activeTab === "units"} onClick={() => setActiveTab("units")}>
            Đơn vị
          </TabButton>
          <TabButton active={activeTab === "warehouses"} onClick={() => setActiveTab("warehouses")}>
            Kho
          </TabButton>
          <TabButton active={activeTab === "uoms"} onClick={() => setActiveTab("uoms")}>
            Đơn vị tính
          </TabButton>
          <TabButton active={activeTab === "imports"} onClick={() => setActiveTab("imports")}>
            Nhật ký import
          </TabButton>
        </div>
      </section>

      {overviewQuery.isLoading ? (
        <section className="panel-strong p-5">
          <div className="flex items-center gap-3 text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu quản trị...
          </div>
        </section>
      ) : null}

      {activeTab === "users" && data ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="panel-strong p-4 sm:p-5">
            <SectionTitle
              description="Admin tạo tài khoản nội bộ cho nhân viên kho và thợ. Không có đăng ký công khai."
              title="Tạo tài khoản"
            />
            <div className="mt-4 grid gap-4">
              <label>
                <span className="label">Họ tên</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  value={userForm.fullName}
                />
              </label>
              <label>
                <span className="label">Email</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  type="email"
                  value={userForm.email}
                />
              </label>
              <label>
                <span className="label">Mật khẩu</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  type="password"
                  value={userForm.password}
                />
              </label>
              <label>
                <span className="label">Vai trò</span>
                <select
                  className="field"
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      role: event.target.value as UserFormState["role"],
                    }))
                  }
                  value={userForm.role}
                >
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Đơn vị</span>
                <select
                  className="field"
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, unitId: event.target.value }))
                  }
                  value={userForm.unitId}
                >
                  <option value="">Không gắn đơn vị</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-primary w-full"
                disabled={createUserMutation.isPending}
                onClick={() => createUserMutation.mutate()}
                type="button"
              >
                {createUserMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Tạo tài khoản
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {data.users.map((user) => (
              <article key={user.id} className="panel-strong p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{user.fullName}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="status-pill bg-blue-100 text-blue-700">{user.role.label}</span>
                      <span className="status-pill bg-slate-100 text-slate-600">
                        {user.unit?.name ?? "Chưa gắn đơn vị"}
                      </span>
                      <span
                        className={`status-pill ${
                          user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.isActive ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`button w-full sm:w-auto ${user.isActive ? "button-danger" : "button-success"}`}
                    disabled={updateUserMutation.isPending}
                    onClick={() =>
                      updateUserMutation.mutate({ id: user.id, isActive: !user.isActive })
                    }
                    type="button"
                  >
                    {user.isActive ? "Tạm dừng" : "Kích hoạt"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "units" && data ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="panel-strong p-4 sm:p-5">
            <SectionTitle
              description="Đơn vị dùng để gom nhóm người dùng và kho theo tổ chức nội bộ."
              title="Tạo đơn vị"
            />
            <div className="mt-4 grid gap-4">
              <label>
                <span className="label">Code</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, code: event.target.value }))
                  }
                  value={unitForm.code}
                />
              </label>
              <label>
                <span className="label">Tên đơn vị</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={unitForm.name}
                />
              </label>
              <label>
                <span className="label">Mô tả</span>
                <textarea
                  className="field min-h-28"
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, description: event.target.value }))
                  }
                  value={unitForm.description}
                />
              </label>
              <button
                className="button button-primary w-full"
                disabled={createUnitMutation.isPending}
                onClick={() => createUnitMutation.mutate()}
                type="button"
              >
                {createUnitMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Tạo đơn vị
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {data.units.map((unit) => (
              <article key={unit.id} className="panel-strong p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{unit.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{unit.code}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {unit.description ?? "Không có mô tả."}
                    </p>
                  </div>

                  <button
                    className={`button w-full sm:w-auto ${unit.isActive ? "button-danger" : "button-success"}`}
                    disabled={updateUnitMutation.isPending}
                    onClick={() =>
                      updateUnitMutation.mutate({ id: unit.id, isActive: !unit.isActive })
                    }
                    type="button"
                  >
                    {unit.isActive ? "Tạm dừng" : "Kích hoạt"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "warehouses" && data ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="panel-strong p-4 sm:p-5">
            <SectionTitle
              description="Tạo kho theo từng đơn vị để nhập xuất và quản lý tồn kho độc lập."
              title="Tạo kho"
            />
            <div className="mt-4 grid gap-4">
              <label>
                <span className="label">Code</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setWarehouseForm((current) => ({ ...current, code: event.target.value }))
                  }
                  value={warehouseForm.code}
                />
              </label>
              <label>
                <span className="label">Tên kho</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setWarehouseForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={warehouseForm.name}
                />
              </label>
              <label>
                <span className="label">Đơn vị</span>
                <select
                  className="field"
                  onChange={(event) =>
                    setWarehouseForm((current) => ({ ...current, unitId: event.target.value }))
                  }
                  value={warehouseForm.unitId}
                >
                  <option value="">Chọn đơn vị</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Mô tả</span>
                <textarea
                  className="field min-h-28"
                  onChange={(event) =>
                    setWarehouseForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={warehouseForm.description}
                />
              </label>
              <button
                className="button button-primary w-full"
                disabled={createWarehouseMutation.isPending}
                onClick={() => createWarehouseMutation.mutate()}
                type="button"
              >
                {createWarehouseMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Tạo kho
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {data.warehouses.map((warehouse) => (
              <article key={warehouse.id} className="panel-strong p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{warehouse.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{warehouse.code}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="status-pill bg-blue-100 text-blue-700">
                        {warehouse.unit.name}
                      </span>
                      <span
                        className={`status-pill ${
                          warehouse.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {warehouse.isActive ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {warehouse.description ?? "Không có mô tả."}
                    </p>
                  </div>

                  <button
                    className={`button w-full sm:w-auto ${warehouse.isActive ? "button-danger" : "button-success"}`}
                    disabled={updateWarehouseMutation.isPending}
                    onClick={() =>
                      updateWarehouseMutation.mutate({
                        id: warehouse.id,
                        isActive: !warehouse.isActive,
                      })
                    }
                    type="button"
                  >
                    {warehouse.isActive ? "Tạm dừng" : "Kích hoạt"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "uoms" && data ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="panel-strong p-4 sm:p-5">
            <SectionTitle
              description="Đơn vị tính dùng khi tạo vật tư mới hoặc import dữ liệu từ Excel."
              title="Tạo đơn vị tính"
            />
            <div className="mt-4 grid gap-4">
              <label>
                <span className="label">Code</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUomForm((current) => ({ ...current, code: event.target.value }))
                  }
                  value={uomForm.code}
                />
              </label>
              <label>
                <span className="label">Tên đơn vị tính</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setUomForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={uomForm.name}
                />
              </label>
              <label>
                <span className="label">Mô tả</span>
                <textarea
                  className="field min-h-28"
                  onChange={(event) =>
                    setUomForm((current) => ({ ...current, description: event.target.value }))
                  }
                  value={uomForm.description}
                />
              </label>
              <button
                className="button button-primary w-full"
                disabled={createUomMutation.isPending}
                onClick={() => createUomMutation.mutate()}
                type="button"
              >
                {createUomMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Tạo đơn vị tính
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {data.uoms.map((uom) => (
              <article key={uom.id} className="panel-strong p-4 sm:p-5">
                <p className="font-semibold text-slate-900">{uom.name}</p>
                <p className="mt-1 text-sm text-slate-500">{uom.code}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {uom.description ?? "Không có mô tả."}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "imports" && data ? (
        <div className="grid gap-4">
          <div className="grid gap-4 border border-dashed border-line bg-[#fcfcfb] p-4 xl:grid-cols-[1.2fr_0.8fr] rounded-xl font-sans">
            <div className="grid gap-3">
              <div>
                <p className="label">[ TIỆN ÍCH / ĐỒNG BỘ DỮ LIỆU EXCEL ]</p>
                <p className="text-xs leading-relaxed text-muted">
                  Chọn file Excel nguồn từ máy tính và chọn kho đích, sau đó click "Nhập dữ liệu vào kho" để bắt đầu đồng bộ.
                </p>
              </div>

              <FileField
                label="Tập tin Excel nguồn"
                onChange={(files) => {
                  const nextFile = files[0] ?? null;
                  setImportFile(nextFile);
                  setPreview(null);
                }}
              />

              <div className="border border-line bg-surface px-4 py-3 text-xs text-muted rounded-lg">
                <p className="font-bold text-foreground">
                  {importFile ? `Tập tin: ${importFile.name}` : "Chưa chọn file Excel"}
                </p>
                <p className="mt-1 text-muted normal-case">
                  {preview
                    ? "Đã đồng bộ dữ liệu vào kho thành công."
                    : "Vui lòng chọn file và kho đích để tiến hành nhập dữ liệu trực tiếp."}
                </p>
              </div>

              <select
                className="field cursor-pointer text-sm font-sans"
                onChange={(event) => setImportWarehouseId(event.target.value)}
                value={importWarehouseId}
              >
                <option value="">-- CHỌN KHO ĐÍCH ĐỒNG BỘ --</option>
                {(data.warehouses ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>

              <div className="grid gap-2">
                <button
                  className="button button-primary w-full"
                  disabled={!importFile || !importWarehouseId || directImportMutation.isPending}
                  onClick={() => directImportMutation.mutate()}
                  type="button"
                >
                  {directImportMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-white" />
                  )}
                  Nhập dữ liệu vào kho
                </button>
              </div>

              <button
                className="button button-ghost w-full"
                onClick={() => {
                  setImportFile(null);
                  setImportWarehouseId("");
                  setPreview(null);
                }}
                type="button"
              >
                Làm lại
              </button>
            </div>

            <div className="grid gap-2 border border-line bg-surface p-4 text-xs text-muted font-sans rounded-xl">
              <p className="font-bold text-foreground">Kết quả nhập dữ liệu</p>
              <div className="grid gap-1 border-t border-line pt-2 mt-1 font-mono">
                <p>Mã hàng hóa: <strong className="text-foreground">{preview?.inventoryCount ?? 0}</strong></p>
                <p>Số giao dịch: <strong className="text-foreground">{preview?.journalCount ?? 0}</strong></p>
                <p>Số dòng lỗi: <strong className={preview?.errors?.length ? "text-primary font-bold" : "text-muted"}>{preview?.errorCount ?? 0}</strong></p>
                <p>Cảnh báo: <strong className={preview?.warnings?.length ? "text-warning font-bold" : "text-muted"}>{preview?.warningCount ?? 0}</strong></p>
              </div>

              {preview?.errors.length ? (
                <div className="border border-primary/20 bg-primary/5 px-3 py-2.5 text-[10px] text-primary mt-2 rounded-lg">
                  <p className="font-bold">Lỗi phát hiện:</p>
                  {preview.errors.slice(0, 4).map((error) => (
                    <p key={error} className="mt-0.5">{`* ${error}`}</p>
                  ))}
                </div>
              ) : null}

              {preview?.warnings.length ? (
                <div className="border border-warning/20 bg-warning/5 px-3 py-2.5 text-[10px] text-warning mt-2 rounded-lg">
                  <p className="font-bold">Cảnh báo:</p>
                  {preview.warnings.slice(0, 4).map((warning) => (
                    <p key={warning} className="mt-0.5">{`* ${warning}`}</p>
                  ))}
                </div>
              ) : null}

              {!preview ? (
                <div className="border border-line bg-[#fbfbf9] px-3 py-2 text-[10px] text-muted mt-2 rounded-lg text-center">
                  Sẵn sàng nhập file
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <p className="label">[ NHẬT KÝ PHIÊN ĐỒNG BỘ HỆ THỐNG ]</p>
            <p className="text-sm leading-6 text-slate-600">Lịch sử các phiên tải lên và đồng bộ dữ liệu kho từ Excel.</p>
          </div>

          <div className="grid gap-3">
            {data.importJobs.length > 0 ? (
              data.importJobs.map((job) => (
                <article key={job.id} className="panel-strong p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{job.fileName}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="status-pill bg-blue-100 text-blue-700">{job.type}</span>
                        <span className="status-pill bg-slate-100 text-slate-600">{job.status}</span>
                      </div>
                    </div>

                    <div className="text-sm leading-6 text-slate-600">
                      <p>Người tạo: {job.createdBy.fullName}</p>
                      <p>Thời gian: {new Date(job.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="panel-strong px-4 py-10 text-center text-sm text-slate-500">
                Chưa có phiên import nào.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
