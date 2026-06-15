export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BranchOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  branchId?: string;
  branchName?: string;
  branches: BranchOption[];
}

export interface DashboardSummary {
  todayRevenue: number;
  todayCustomers: number;
  todayInvoices: number;
  todayExpenses: number;
  todayProfit: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  lowStockCount: number;
  last7DaysSales: { date: string; revenue: number; invoiceCount: number; customerCount: number }[];
  productSalesGrandTotal: number;
  productQuantitySold: number;
  topProductSales: ProductSalesRow[];
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  visitCount: number;
  totalSpent: number;
  lastVisitAt?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  serviceCount: number;
}

export interface ServiceOfferingCategoryRef {
  id: string;
  name: string;
}

export interface ServiceOffering {
  id: string;
  categories: ServiceOfferingCategoryRef[];
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  branchId?: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLowStock: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  inventoryMode: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  isActive: boolean;
  commissionRate?: number;
  branchIds: string[];
}

export interface CartItem {
  id: string;
  itemType: "Service" | "Product";
  serviceOfferingId?: string;
  productId?: string;
  employeeId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountValue: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  branchName: string;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  subTotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  itemType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountValue: number;
  discountAmount: number;
  lineTotal: number;
  employeeName?: string;
}

export interface Receipt {
  invoiceNumber: string;
  businessName: string;
  branchName: string;
  customerName?: string;
  cashierName: string;
  date: string;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subTotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface WhatsAppTemplate {
  key: string;
  nameEn: string;
  nameAr: string;
  bodyEn: string;
  bodyAr: string;
  templateType: string;
}

export interface WhatsAppRecipient {
  customerId: string;
  name: string;
  phone: string;
}

export interface RecipientPreview {
  totalCount: number;
  sample: WhatsAppRecipient[];
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  body: string;
  templateType: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  filterSummary?: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WhatsAppMessageLog {
  id: string;
  customerId?: string;
  customerName: string;
  phone: string;
  status: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface WhatsAppCampaignDetail extends WhatsAppCampaign {
  messages: WhatsAppMessageLog[];
}
