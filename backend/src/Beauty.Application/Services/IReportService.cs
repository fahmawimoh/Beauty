using Beauty.Application.Common;
using Beauty.Application.DTOs.Reports;

namespace Beauty.Application.Services;

public interface IReportService
{
    Task<DashboardSummaryDto> GetDashboardAsync(Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<PeriodReportDto> GetPeriodReportAsync(string period, Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<SalesOverviewDto> GetSalesOverviewAsync(
        string period,
        Guid? branchId = null,
        int page = 1,
        int pageSize = PaginationHelper.DefaultSalesPageSize,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExpenseDto>> GetExpensesAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default);
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest request, CancellationToken cancellationToken = default);
}
