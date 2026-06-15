namespace Beauty.Application.DTOs.Reports;

public record DashboardSummaryDto(
    decimal TodayRevenue,
    int TodayCustomers,
    int TodayInvoices,
    decimal TodayExpenses,
    decimal TodayProfit,
    decimal WeekRevenue,
    decimal MonthRevenue,
    decimal YearRevenue,
    int LowStockCount,
    IReadOnlyList<DailySalesDto> Last7DaysSales,
    decimal ProductSalesGrandTotal,
    int ProductQuantitySold,
    IReadOnlyList<ProductSalesRowDto> TopProductSales
);

public record DailySalesDto(DateTime Date, decimal Revenue, int InvoiceCount, int CustomerCount);

public record PeriodReportDto(
    string Period,
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    int InvoiceCount,
    int CustomerCount,
    decimal AverageInvoiceValue,
    IReadOnlyList<CategorySalesDto> SalesByCategory,
    IReadOnlyList<EmployeeSalesDto> SalesByEmployee
);

public record CategorySalesDto(string Category, decimal Revenue, int Count);
public record EmployeeSalesDto(Guid EmployeeId, string EmployeeName, decimal Revenue, int InvoiceCount);

public record ExpenseDto(Guid Id, Guid BranchId, string Category, string Description, decimal Amount, DateTime ExpenseDate);
public record CreateExpenseRequest(Guid BranchId, string Category, string Description, decimal Amount, DateTime ExpenseDate);

public record SalesPeriodSummaryDto(
    decimal TotalSales,
    decimal TotalDiscounts,
    decimal NetRevenue,
    int InvoiceCount
);

public record SalesRowDto(
    Guid Id,
    string InvoiceNumber,
    string? CustomerName,
    string CashierName,
    string ItemName,
    string ItemType,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TotalAmount,
    DateTime CreatedAt
);

public record ProductSalesRowDto(
    Guid? ProductId,
    string ProductName,
    string ProductType,
    string ProductCategory,
    int QuantitySold,
    decimal TotalSalesAmount
);

public record ProductSalesReportDto(
    IReadOnlyList<ProductSalesRowDto> Products,
    decimal GrandTotal,
    int TotalQuantitySold
);

public record ServiceSalesRowDto(
    Guid? ServiceOfferingId,
    string ServiceName,
    string ServiceType,
    string ServiceCategory,
    int TimesSold,
    decimal TotalRevenue
);

public record ServiceSalesReportDto(
    IReadOnlyList<ServiceSalesRowDto> Services,
    decimal GrandTotal,
    int TotalTimesSold
);

public record ProductSalesPageDto(
    IReadOnlyList<ProductSalesRowDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages,
    decimal GrandTotal,
    int TotalQuantitySold
);

public record ServiceSalesPageDto(
    IReadOnlyList<ServiceSalesRowDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages,
    decimal GrandTotal,
    int TotalTimesSold
);

public record SalesTransactionsPageDto(
    IReadOnlyList<SalesRowDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages,
    DateTime StartDate,
    DateTime EndDate
);

public record SalesSummaryDto(
    string Period,
    DateTime StartDate,
    DateTime EndDate,
    SalesPeriodSummaryDto Current,
    SalesPeriodSummaryDto Daily,
    SalesPeriodSummaryDto Weekly,
    SalesPeriodSummaryDto Monthly,
    SalesPeriodSummaryDto Yearly
);

public record SalesOverviewDto(
    string Period,
    DateTime StartDate,
    DateTime EndDate,
    SalesPeriodSummaryDto Current,
    SalesPeriodSummaryDto Daily,
    SalesPeriodSummaryDto Weekly,
    SalesPeriodSummaryDto Monthly,
    SalesPeriodSummaryDto Yearly,
    IReadOnlyList<SalesRowDto> Sales,
    int TotalSalesCount,
    int Page,
    int PageSize,
    int TotalPages,
    ProductSalesReportDto ProductSales
);
