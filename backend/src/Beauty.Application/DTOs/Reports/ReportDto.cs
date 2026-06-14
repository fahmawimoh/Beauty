namespace Beauty.Application.DTOs.Reports;

public record DashboardSummaryDto(
    decimal TodayRevenue,
    int TodayCustomers,
    int TodayInvoices,
    decimal TodayExpenses,
    decimal TodayProfit,
    decimal TodayDiscounts,
    decimal WeekRevenue,
    decimal MonthRevenue,
    decimal YearRevenue,
    int LowStockCount,
    IReadOnlyList<DailySalesDto> Last7DaysSales
);

public record DailySalesDto(DateTime Date, decimal Revenue, int InvoiceCount, int CustomerCount);

public record PeriodReportDto(
    string Period,
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    decimal TotalDiscounts,
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
