using Beauty.Application.DTOs.Reports;
using Beauty.Application.Interfaces;
using Beauty.Application.Common;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class ReportService : IReportService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ReportService(IAppDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<DashboardSummaryDto> GetDashboardAsync(Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearStart = new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var invoiceQuery = _context.Invoices
            .Where(i => i.TenantId == tenantId && i.Status == InvoiceStatus.Completed);
        if (branchId.HasValue) invoiceQuery = invoiceQuery.Where(i => i.BranchId == branchId);

        var expenseQuery = _context.Expenses.Where(e => e.TenantId == tenantId);
        if (branchId.HasValue) expenseQuery = expenseQuery.Where(e => e.BranchId == branchId);

        var todayInvoices = invoiceQuery.Where(i => i.CreatedAt >= today);
        var todayRevenue = await todayInvoices.SumAsync(i => i.TotalAmount, cancellationToken);
        var todayInvoiceCount = await todayInvoices.CountAsync(cancellationToken);
        var todayCustomers = await todayInvoices.Where(i => i.CustomerId != null)
            .Select(i => i.CustomerId).Distinct().CountAsync(cancellationToken);
        var todayExpenses = await expenseQuery.Where(e => e.ExpenseDate >= today)
            .SumAsync(e => e.Amount, cancellationToken);

        var last7Days = Enumerable.Range(0, 7).Select(i => today.AddDays(-i)).Reverse().ToList();
        var salesData = await invoiceQuery
            .Where(i => i.CreatedAt >= today.AddDays(-6))
            .GroupBy(i => i.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Revenue = g.Sum(i => i.TotalAmount), Count = g.Count(), Customers = g.Where(i => i.CustomerId != null).Select(i => i.CustomerId).Distinct().Count() })
            .ToListAsync(cancellationToken);

        var last7DaysSales = last7Days.Select(d =>
        {
            var data = salesData.FirstOrDefault(s => s.Date == d);
            return new DailySalesDto(d, data?.Revenue ?? 0, data?.Count ?? 0, data?.Customers ?? 0);
        }).ToList();

        var lowStockCount = await _context.Products
            .CountAsync(p => p.TenantId == tenantId && p.IsActive && p.StockQuantity <= p.LowStockThreshold
                && (!branchId.HasValue || p.BranchId == null || p.BranchId == branchId), cancellationToken);

        return new DashboardSummaryDto(
            todayRevenue, todayCustomers, todayInvoiceCount, todayExpenses, todayRevenue - todayExpenses,
            await invoiceQuery.Where(i => i.CreatedAt >= weekStart).SumAsync(i => i.TotalAmount, cancellationToken),
            await invoiceQuery.Where(i => i.CreatedAt >= monthStart).SumAsync(i => i.TotalAmount, cancellationToken),
            await invoiceQuery.Where(i => i.CreatedAt >= yearStart).SumAsync(i => i.TotalAmount, cancellationToken),
            lowStockCount, last7DaysSales);
    }

    public async Task<PeriodReportDto> GetPeriodReportAsync(string period, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var (start, end) = GetPeriodRange(period);
        var tenantId = RequireTenantId();

        var invoiceQuery = _context.Invoices
            .Include(i => i.Items)
            .Where(i => i.TenantId == tenantId && i.Status == InvoiceStatus.Completed
                && i.CreatedAt >= start && i.CreatedAt <= end);
        if (branchId.HasValue) invoiceQuery = invoiceQuery.Where(i => i.BranchId == branchId);

        var invoices = await invoiceQuery.ToListAsync(cancellationToken);
        var totalRevenue = invoices.Sum(i => i.TotalAmount);

        var expenseQuery = _context.Expenses
            .Where(e => e.TenantId == tenantId && e.ExpenseDate >= start && e.ExpenseDate <= end);
        if (branchId.HasValue) expenseQuery = expenseQuery.Where(e => e.BranchId == branchId);
        var totalExpenses = await expenseQuery.SumAsync(e => e.Amount, cancellationToken);

        var salesByCategory = invoices
            .SelectMany(i => i.Items)
            .GroupBy(ii => ii.ItemType.ToString())
            .Select(g => new CategorySalesDto(g.Key, g.Sum(ii => ii.LineTotal), g.Count()))
            .ToList();

        var salesByEmployee = await _context.InvoiceItems
            .Include(ii => ii.Employee).Include(ii => ii.Invoice)
            .Where(ii => ii.Invoice.TenantId == tenantId && ii.EmployeeId != null
                && ii.Invoice.CreatedAt >= start && ii.Invoice.CreatedAt <= end
                && ii.Invoice.Status == InvoiceStatus.Completed)
            .GroupBy(ii => new { ii.EmployeeId, ii.Employee!.FullName })
            .Select(g => new EmployeeSalesDto(g.Key.EmployeeId!.Value, g.Key.FullName, g.Sum(ii => ii.LineTotal), g.Select(ii => ii.InvoiceId).Distinct().Count()))
            .ToListAsync(cancellationToken);

        return new PeriodReportDto(
            period, start, end, totalRevenue, totalExpenses, totalRevenue - totalExpenses,
            invoices.Count, invoices.Where(i => i.CustomerId != null).Select(i => i.CustomerId).Distinct().Count(),
            invoices.Count > 0 ? totalRevenue / invoices.Count : 0,
            salesByCategory, salesByEmployee);
    }

    public async Task<IReadOnlyList<ExpenseDto>> GetExpensesAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Expenses.Where(e => e.TenantId == RequireTenantId());
        if (branchId.HasValue) query = query.Where(e => e.BranchId == branchId);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= from);
        if (to.HasValue) query = query.Where(e => e.ExpenseDate <= to);

        return await query.OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenseDto(e.Id, e.BranchId, e.Category, e.Description, e.Amount, e.ExpenseDate))
            .ToListAsync(cancellationToken);
    }

    public async Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest request, CancellationToken cancellationToken = default)
    {
        var expense = new Expense
        {
            TenantId = RequireTenantId(),
            BranchId = request.BranchId,
            Category = request.Category,
            Description = request.Description,
            Amount = request.Amount,
            ExpenseDate = request.ExpenseDate,
            CreatedByUserId = _currentUser.UserId
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync(cancellationToken);

        return new ExpenseDto(expense.Id, expense.BranchId, expense.Category, expense.Description, expense.Amount, expense.ExpenseDate);
    }

    public async Task<SalesOverviewDto> GetSalesOverviewAsync(string period, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        const int maxRows = 500;
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var tenantId = RequireTenantId();

        var invoiceQuery = _context.Invoices
            .Where(i => i.TenantId == tenantId && i.Status == InvoiceStatus.Completed);
        if (branchId.HasValue) invoiceQuery = invoiceQuery.Where(i => i.BranchId == branchId);

        async Task<SalesPeriodSummaryDto> GetSummaryForPeriodAsync(string p)
        {
            var (start, end) = PeriodRangeHelper.GetRange(p);
            var totals = await invoiceQuery
                .Where(i => i.CreatedAt >= start && i.CreatedAt <= end)
                .Select(i => new InvoiceTotals(i.SubTotal, i.DiscountAmount, i.TotalAmount))
                .ToListAsync(cancellationToken);
            return SalesSummaryCalculator.Calculate(totals);
        }

        var daily = await GetSummaryForPeriodAsync("daily");
        var weekly = await GetSummaryForPeriodAsync("weekly");
        var monthly = await GetSummaryForPeriodAsync("monthly");

        var (tableStart, tableEnd) = PeriodRangeHelper.GetRange(normalizedPeriod);
        var tableQuery = invoiceQuery.Where(i => i.CreatedAt >= tableStart && i.CreatedAt <= tableEnd);
        var totalSalesCount = await tableQuery.CountAsync(cancellationToken);

        var sales = await tableQuery
            .OrderByDescending(i => i.CreatedAt)
            .Take(maxRows)
            .Select(i => new SalesRowDto(
                i.Id,
                i.InvoiceNumber,
                i.Customer != null ? i.Customer.Name : null,
                i.Cashier.FullName,
                i.SubTotal,
                i.DiscountAmount,
                i.TotalAmount,
                i.CreatedAt))
            .ToListAsync(cancellationToken);

        var current = normalizedPeriod switch
        {
            "weekly" => weekly,
            "monthly" => monthly,
            _ => daily
        };

        return new SalesOverviewDto(
            normalizedPeriod, tableStart, tableEnd, current, daily, weekly, monthly, sales, totalSalesCount);
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static (DateTime start, DateTime end) GetPeriodRange(string period) => PeriodRangeHelper.GetRange(period);
}
