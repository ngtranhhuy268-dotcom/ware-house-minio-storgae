export type RoleName = "ADMIN" | "STAFF" | "TECHNICIAN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  roleLabel: string;
  unitId: string | null;
  unitName: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
};

export type DashboardIndicators = {
  totalSku: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  recentTransactions: number;
  unitCount: number;
  warehouseCount: number;
};

export type InventoryOption = {
  id: string;
  name: string;
  code?: string;
  unitId?: string;
};

export type InventoryOptionsResponse = {
  units: InventoryOption[];
  warehouses: InventoryOption[];
  projects: InventoryOption[];
  uoms: InventoryOption[];
  items?: Array<{ id: string; name: string; defaultUomId: string }>;
  statuses: Array<{ value: string; label: string }>;
};

export type InventoryRow = {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  description: string | null;
  warehouseId: string;
  warehouseName: string;
  unitId: string;
  unitName: string;
  uomId: string;
  uomName: string;
  currentQty: number;
  openingQty: number;
  totalInQty: number;
  totalOutQty: number;
  minQty: number;
  status: string;
  statusLabel: string;
  legacyStatus: string | null;
  lastMovementAt: string | null;
  updatedAt: string;
  latestNote: string | null;
  imageUrl: string | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type InventoryDetail = {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  description: string | null;
  warehouseId: string;
  warehouseName: string;
  unitId: string;
  unitName: string;
  uomId: string;
  uomName: string;
  currentQty: number;
  openingQty: number;
  totalInQty: number;
  totalOutQty: number;
  minQty: number;
  status: string;
  statusLabel: string;
  legacyStatus: string | null;
  lastMovementAt: string | null;
  images: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    url: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    referenceCode: string | null;
    note: string | null;
    legacyImported: boolean;
    createdAt: string;
    createdBy: string;
    attachments: Array<{
      id: string;
      kind: string;
      fileName: string;
      mimeType: string;
      storageKey: string;
      url: string;
    }>;
  }>;
};

export type TransactionHistoryRow = {
  id: string;
  type: string;
  itemName: string;
  warehouseName: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceCode: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string;
  attachments: Array<{
    id: string;
    kind: string;
    fileName: string;
    url: string;
  }>;
};

export type ImportPreview = {
  jobId: string;
  inventoryCount: number;
  journalCount: number;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
  sampleInventory: Array<{
    rowNumber: number;
    itemName: string;
    uom: string;
    currentQty: number;
    images: Array<{ storageKey: string; fileName: string }>;
  }>;
  sampleJournal: Array<{
    rowNumber: number;
    itemName: string;
    photos: Array<{ storageKey: string; fileName: string }>;
    invoices: Array<{ storageKey: string; fileName: string }>;
  }>;
};

export type AdminOverview = {
  roles: Array<{ id: string; name: RoleName; label: string }>;
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    role: { id: string; name: RoleName; label: string };
    unit: { id: string; name: string } | null;
  }>;
  units: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
  }>;
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    unit: { id: string; name: string };
  }>;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    unit: { id: string; name: string };
  }>;
  uoms: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
  }>;
  importJobs: Array<{
    id: string;
    type: string;
    status: string;
    fileName: string;
    createdAt: string;
    committedAt: string | null;
    createdBy: { fullName: string };
  }>;
};
