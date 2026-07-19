export const REPORT_PERIODS = ["daily", "weekly", "monthly", "yearly", "custom"] as const;
export const REPORT_PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Other"] as const;
export const REPORT_STATUSES = ["Completed", "Draft", "Cancelled", "Refunded"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];
export type ReportPaymentMethod = (typeof REPORT_PAYMENT_METHODS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface CategorySales {
  category: string;
  revenue: number;
  count: number;
}

export interface EmployeeSales {
  employeeId: string;
  employeeName: string;
  revenue: number;
  invoiceCount: number;
}

export interface ProductSoldRow {
  productId?: string | null;
  productSku?: string | null;
  productName: string;
  productType: string;
  productCategory: string;
  quantitySold: number;
  totalSalesAmount: number;
}

export interface ServiceSoldRow {
  serviceOfferingId?: string | null;
  serviceName: string;
  serviceType: string;
  serviceCategory: string;
  timesSold: number;
  totalRevenue: number;
}

export interface PaymentMethodSummary {
  paymentMethod: string;
  invoiceCount: number;
  totalAmount: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  invoiceCount: number;
  customerCount: number;
}

export interface PeriodReport {
  period: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  totalDiscounts: number;
  totalTaxes: number;
  invoiceCount: number;
  customerCount: number;
  appointmentCount: number;
  productsSoldCount: number;
  servicesSoldCount: number;
  averageInvoiceValue: number;
  salesByCategory: CategorySales[];
  salesByEmployee: EmployeeSales[];
  productsSold: ProductSoldRow[];
  servicesSold: ServiceSoldRow[];
  paymentMethodSummary: PaymentMethodSummary[];
  revenueTrend: RevenueTrendPoint[];
}

export interface ReportFilters {
  period: ReportPeriod;
  from: string;
  to: string;
  branchId: string;
  employeeId: string;
  customerId: string;
  serviceId: string;
  productId: string;
  paymentMethod: string;
  status: string;
  search: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  period: "monthly",
  from: "",
  to: "",
  branchId: "",
  employeeId: "",
  customerId: "",
  serviceId: "",
  productId: "",
  paymentMethod: "",
  status: "Completed",
  search: "",
};

/** Local YYYY-MM-DD for the first and last day of the current month. */
export function getCurrentMonthDateRange(now = new Date()): { from: string; to: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export function buildReportQuery(filters: ReportFilters, fallbackBranchId?: string): string {
  const period = filters.period === "custom" ? "custom" : filters.period;
  const params = new URLSearchParams();

  const branchId = filters.branchId || fallbackBranchId || "";
  if (branchId) params.set("branchId", branchId);
  if (filters.period === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters.status) params.set("status", filters.status);

  const qs = params.toString();
  return `/reports/period/${period}${qs ? `?${qs}` : ""}`;
}

export function filterReportRows<T>(
  rows: T[],
  search: string,
  fields: (keyof T)[]
): T[] {
  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) =>
    fields.some((field) => String(row[field] ?? "").toLowerCase().includes(term))
  );
}

export function sortByNumber<T>(rows: T[], getValue: (row: T) => number, direction: "asc" | "desc" = "desc"): T[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    return direction === "asc" ? diff : -diff;
  });
  return sorted;
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): { items: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), totalPages };
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildReportCsv(report: PeriodReport, locale = "en"): string {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Summary,Period,${escapeCsv(report.period)}`);
  lines.push(`Summary,Start Date,${escapeCsv(report.startDate)}`);
  lines.push(`Summary,End Date,${escapeCsv(report.endDate)}`);
  lines.push(`Summary,Total Sales,${report.totalSales}`);
  lines.push(`Summary,Total Revenue,${report.totalRevenue}`);
  lines.push(`Summary,Total Profit,${report.totalProfit}`);
  lines.push(`Summary,Total Expenses,${report.totalExpenses}`);
  lines.push(`Summary,Total Discounts,${report.totalDiscounts}`);
  lines.push(`Summary,Total Taxes,${report.totalTaxes}`);
  lines.push(`Summary,Customers,${report.customerCount}`);
  lines.push(`Summary,Appointments,${report.appointmentCount}`);
  lines.push(`Summary,Invoices,${report.invoiceCount}`);
  lines.push(`Summary,Products Sold,${report.productsSoldCount}`);
  lines.push(`Summary,Services Sold,${report.servicesSoldCount}`);
  lines.push(`Summary,Avg Invoice,${report.averageInvoiceValue}`);
  lines.push("");
  lines.push("Category,Revenue,Count");
  for (const row of report.salesByCategory) {
    lines.push(`${escapeCsv(row.category)},${row.revenue},${row.count}`);
  }
  lines.push("");
  lines.push("Employee,Revenue,Invoices");
  for (const row of report.salesByEmployee) {
    lines.push(`${escapeCsv(row.employeeName)},${row.revenue},${row.invoiceCount}`);
  }
  lines.push("");
  lines.push("Product,Qty,Amount");
  for (const row of report.productsSold) {
    lines.push(`${escapeCsv(row.productName)},${row.quantitySold},${row.totalSalesAmount}`);
  }
  lines.push("");
  lines.push("Service,Times,Revenue");
  for (const row of report.servicesSold) {
    lines.push(`${escapeCsv(row.serviceName)},${row.timesSold},${row.totalRevenue}`);
  }
  lines.push("");
  lines.push("Payment Method,Invoices,Amount");
  for (const row of report.paymentMethodSummary) {
    lines.push(`${escapeCsv(row.paymentMethod)},${row.invoiceCount},${row.totalAmount}`);
  }
  void locale;
  return lines.join("\n");
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportReportCsv(report: PeriodReport) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(`report-${report.period}-${stamp}.csv`, buildReportCsv(report), "text/csv;charset=utf-8");
}

export function exportReportExcel(report: PeriodReport) {
  const stamp = new Date().toISOString().slice(0, 10);
  // Excel opens UTF-8 CSV reliably with BOM
  const csv = `\uFEFF${buildReportCsv(report)}`;
  downloadBlob(`report-${report.period}-${stamp}.xls`, csv, "application/vnd.ms-excel;charset=utf-8");
}

/** Keep PDF text WinAnsi-safe so Helvetica can render it. */
function pdfSafeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function pdfMoney(amount: number, formatMoney: (n: number) => string): string {
  const formatted = pdfSafeText(formatMoney(amount));
  return formatted || amount.toFixed(2);
}

export async function exportReportPdf(
  report: PeriodReport,
  title: string,
  formatMoney: (n: number) => string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (text: string, size: number, style: "normal" | "bold" = "normal") => {
    const safe = pdfSafeText(text) || "-";
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe, maxWidth) as string[];
    ensureSpace(lines.length * (size * 0.45) + 2);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 2;
  };

  const writeKeyValue = (label: string, value: string) => {
    ensureSpace(7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(pdfSafeText(label) || label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafeText(value) || value, pageWidth - margin, y, { align: "right" });
    y += 6;
  };

  const writeTable = (headers: string[], rows: string[][]) => {
    const colCount = headers.length;
    const colWidth = maxWidth / colCount;
    const rowHeight = 7;

    const drawHeader = () => {
      ensureSpace(rowHeight + 2);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, maxWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      headers.forEach((header, i) => {
        doc.text(pdfSafeText(header) || header, margin + i * colWidth + 1, y);
      });
      y += rowHeight;
    };

    drawHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (rows.length === 0) {
      ensureSpace(rowHeight);
      doc.text("No data", margin + 1, y);
      y += rowHeight;
      return;
    }

    for (const row of rows) {
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      row.forEach((cell, i) => {
        const text = pdfSafeText(cell) || cell;
        if (i === 0) doc.text(text, margin + i * colWidth + 1, y);
        else doc.text(text, margin + (i + 1) * colWidth - 1, y, { align: "right" });
      });
      y += rowHeight;
    }
    y += 3;
  };

  writeText(title || "Reports", 16, "bold");
  writeText(
    `${report.period} | ${new Date(report.startDate).toLocaleDateString("en-GB")} - ${new Date(report.endDate).toLocaleDateString("en-GB")}`,
    10
  );
  y += 2;

  writeText("Summary", 12, "bold");
  const summary: [string, string][] = [
    ["Total Sales", pdfMoney(report.totalSales, formatMoney)],
    ["Total Revenue", pdfMoney(report.totalRevenue, formatMoney)],
    ["Total Profit", pdfMoney(report.totalProfit, formatMoney)],
    ["Total Expenses", pdfMoney(report.totalExpenses, formatMoney)],
    ["Total Discounts", pdfMoney(report.totalDiscounts, formatMoney)],
    ["Total Taxes", pdfMoney(report.totalTaxes, formatMoney)],
    ["Customers", String(report.customerCount)],
    ["Appointments", String(report.appointmentCount)],
    ["Invoices", String(report.invoiceCount)],
    ["Products Sold", String(report.productsSoldCount)],
    ["Services Sold", String(report.servicesSoldCount)],
    ["Avg Invoice", pdfMoney(report.averageInvoiceValue, formatMoney)],
  ];
  for (const [label, value] of summary) writeKeyValue(label, value);
  y += 3;

  writeText("Sales by Category", 12, "bold");
  writeTable(
    ["Category", "Revenue", "Count"],
    report.salesByCategory.map((r) => [r.category, pdfMoney(r.revenue, formatMoney), String(r.count)])
  );

  writeText("Employee Performance", 12, "bold");
  writeTable(
    ["Employee", "Revenue", "Invoices"],
    report.salesByEmployee.map((r) => [r.employeeName, pdfMoney(r.revenue, formatMoney), String(r.invoiceCount)])
  );

  writeText("Products Sold", 12, "bold");
  writeTable(
    ["Product", "Qty", "Amount"],
    report.productsSold.map((r) => [r.productName, String(r.quantitySold), pdfMoney(r.totalSalesAmount, formatMoney)])
  );

  writeText("Services Sold", 12, "bold");
  writeTable(
    ["Service", "Times", "Revenue"],
    report.servicesSold.map((r) => [r.serviceName, String(r.timesSold), pdfMoney(r.totalRevenue, formatMoney)])
  );

  writeText("Payment Methods", 12, "bold");
  writeTable(
    ["Method", "Invoices", "Amount"],
    report.paymentMethodSummary.map((r) => [
      r.paymentMethod,
      String(r.invoiceCount),
      pdfMoney(r.totalAmount, formatMoney),
    ])
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `report-${report.period}-${stamp}.pdf`;
  // Prefer blob download for consistent browser behavior (avoids blocked print popups).
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
