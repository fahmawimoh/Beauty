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

        var productSales = await GetProductSalesReportAsync(tenantId, branchId, today, today.AddDays(1).AddTicks(-1), cancellationToken, topLimit: 5);

        return new DashboardSummaryDto(
            todayRevenue, todayCustomers, todayInvoiceCount, todayExpenses, todayRevenue - todayExpenses,
            await invoiceQuery.Where(i => i.CreatedAt >= weekStart).SumAsync(i => i.TotalAmount, cancellationToken),
            await invoiceQuery.Where(i => i.CreatedAt >= monthStart).SumAsync(i => i.TotalAmount, cancellationToken),
            await invoiceQuery.Where(i => i.CreatedAt >= yearStart).SumAsync(i => i.TotalAmount, cancellationToken),
            lowStockCount, last7DaysSales,
            productSales.GrandTotal, productSales.TotalQuantitySold, productSales.Products);
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

    public async Task<SalesOverviewDto> GetSalesOverviewAsync(
        string period,
        Guid? branchId = null,
        int page = 1,
        int pageSize = PaginationHelper.DefaultSalesPageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var (normalizedPage, normalizedPageSize, skip) = PaginationHelper.Normalize(page, pageSize);
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
        var yearly = await GetSummaryForPeriodAsync("yearly");

        var (tableStart, tableEnd) = PeriodRangeHelper.GetRange(normalizedPeriod);
        var tableQuery = invoiceQuery.Where(i => i.CreatedAt >= tableStart && i.CreatedAt <= tableEnd);
        var totalSalesCount = await tableQuery.CountAsync(cancellationToken);
        var totalPages = PaginationHelper.GetTotalPages(totalSalesCount, normalizedPageSize);

        var pageInvoices = await tableQuery
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(normalizedPageSize)
            .Include(i => i.Customer)
            .Include(i => i.Cashier)
            .Include(i => i.Items)
            .ToListAsync(cancellationToken);

        var sales = pageInvoices
            .Select(i => new SalesRowDto(
                i.Id,
                i.InvoiceNumber,
                i.Customer?.Name,
                i.Cashier.FullName,
                SalesTransactionFormatter.FormatItemNames(i.Items),
                SalesTransactionFormatter.FormatItemTypes(i.Items),
                i.SubTotal,
                i.DiscountAmount,
                i.TotalAmount,
                i.CreatedAt))
            .ToList();

        var current = normalizedPeriod switch
        {
            "weekly" => weekly,
            "monthly" => monthly,
            "yearly" => yearly,
            _ => daily
        };

        var productSales = await GetProductSalesReportAsync(tenantId, branchId, tableStart, tableEnd, cancellationToken);

        return new SalesOverviewDto(
            normalizedPeriod, tableStart, tableEnd, current, daily, weekly, monthly, yearly,
            sales, totalSalesCount, normalizedPage, normalizedPageSize, totalPages, productSales);
    }

    private async Task<ProductSalesReportDto> GetProductSalesReportAsync(
        Guid tenantId,
        Guid? branchId,
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken,
        int? topLimit = null)
    {
        var query = _context.InvoiceItems
            .Where(ii => ii.ItemType == InvoiceItemType.Product
                && ii.Invoice.TenantId == tenantId
                && ii.Invoice.Status == InvoiceStatus.Completed
                && ii.Invoice.CreatedAt >= start
                && ii.Invoice.CreatedAt <= end);

        if (branchId.HasValue)
            query = query.Where(ii => ii.Invoice.BranchId == branchId);

        var grouped = await query
            .GroupBy(ii => new
            {
                ii.ProductId,
                ProductName = ii.Product != null ? ii.Product.Name : ii.Name,
                ProductSku = ii.Product != null ? ii.Product.Sku : null
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.ProductName,
                g.Key.ProductSku,
                QuantitySold = g.Sum(ii => ii.Quantity),
                TotalSalesAmount = g.Sum(ii => ii.LineTotal)
            })
            .ToListAsync(cancellationToken);

        var lines = grouped.Select(g => new ProductSalesLine(
            g.ProductId, g.ProductName, g.ProductSku, g.QuantitySold, g.TotalSalesAmount));

        return ProductSalesCalculator.Calculate(lines, topLimit);
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(
        string period, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var tenantId = RequireTenantId();
        var (start, end) = PeriodRangeHelper.GetRange(normalizedPeriod);

        var invoiceQuery = BuildCompletedInvoiceQuery(tenantId, branchId);
        var daily = await GetSummaryForPeriodAsync(invoiceQuery, "daily", cancellationToken);
        var weekly = await GetSummaryForPeriodAsync(invoiceQuery, "weekly", cancellationToken);
        var monthly = await GetSummaryForPeriodAsync(invoiceQuery, "monthly", cancellationToken);
        var yearly = await GetSummaryForPeriodAsync(invoiceQuery, "yearly", cancellationToken);

        var current = normalizedPeriod switch
        {
            "weekly" => weekly,
            "monthly" => monthly,
            "yearly" => yearly,
            _ => daily
        };

        return new SalesSummaryDto(normalizedPeriod, start, end, current, daily, weekly, monthly, yearly);
    }

    public async Task<SalesTransactionsPageDto> GetSalesTransactionsPageAsync(
        string period, Guid? branchId = null, int page = 1, int pageSize = PaginationHelper.DefaultSalesPageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var (normalizedPage, normalizedPageSize, skip) = PaginationHelper.Normalize(page, pageSize);
        var tenantId = RequireTenantId();
        var (start, end) = PeriodRangeHelper.GetRange(normalizedPeriod);

        var tableQuery = BuildCompletedInvoiceQuery(tenantId, branchId)
            .Where(i => i.CreatedAt >= start && i.CreatedAt <= end);

        var totalCount = await tableQuery.CountAsync(cancellationToken);
        var totalPages = PaginationHelper.GetTotalPages(totalCount, normalizedPageSize);

        var pageInvoices = await tableQuery
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(normalizedPageSize)
            .Include(i => i.Customer)
            .Include(i => i.Cashier)
            .Include(i => i.Items)
            .ToListAsync(cancellationToken);

        var items = pageInvoices
            .Select(i => new SalesRowDto(
                i.Id, i.InvoiceNumber, i.Customer?.Name, i.Cashier.FullName,
                SalesTransactionFormatter.FormatItemNames(i.Items),
                SalesTransactionFormatter.FormatItemTypes(i.Items),
                i.SubTotal, i.DiscountAmount, i.TotalAmount, i.CreatedAt))
            .ToList();

        return new SalesTransactionsPageDto(
            items, totalCount, normalizedPage, normalizedPageSize, totalPages, start, end);
    }

    public async Task<ProductSalesPageDto> GetProductSalesPageAsync(
        string period, Guid? branchId = null, int page = 1, int pageSize = PaginationHelper.DefaultSalesPageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var (normalizedPage, normalizedPageSize, skip) = PaginationHelper.Normalize(page, pageSize);
        var tenantId = RequireTenantId();
        var (start, end) = PeriodRangeHelper.GetRange(normalizedPeriod);

        var query = BuildProductItemQuery(tenantId, branchId, start, end);
        var grandTotal = await query.SumAsync(ii => ii.LineTotal, cancellationToken);
        var totalQuantity = await query.SumAsync(ii => ii.Quantity, cancellationToken);

        var groupedQuery = query
            .GroupBy(ii => new
            {
                ii.ProductId,
                ProductName = ii.Product != null ? ii.Product.Name : ii.Name,
                ProductSku = ii.Product != null ? ii.Product.Sku : null
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.ProductName,
                g.Key.ProductSku,
                QuantitySold = g.Sum(ii => ii.Quantity),
                TotalSalesAmount = g.Sum(ii => ii.LineTotal)
            });

        var totalCount = await groupedQuery.CountAsync(cancellationToken);
        var totalPages = PaginationHelper.GetTotalPages(totalCount, normalizedPageSize);

        var rows = await groupedQuery
            .OrderByDescending(p => p.TotalSalesAmount)
            .Skip(skip)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var items = rows.Select(g => new ProductSalesRowDto(
            g.ProductId,
            g.ProductSku,
            g.ProductName,
            "Product",
            "General",
            g.QuantitySold,
            g.TotalSalesAmount)).ToList();

        return new ProductSalesPageDto(
            items, totalCount, normalizedPage, normalizedPageSize, totalPages, grandTotal, totalQuantity);
    }

    public async Task<ServiceSalesPageDto> GetServiceSalesPageAsync(
        string period, Guid? branchId = null, int page = 1, int pageSize = PaginationHelper.DefaultSalesPageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = PeriodRangeHelper.NormalizeSalesPeriod(period);
        var (normalizedPage, normalizedPageSize, skip) = PaginationHelper.Normalize(page, pageSize);
        var tenantId = RequireTenantId();
        var (start, end) = PeriodRangeHelper.GetRange(normalizedPeriod);

        var query = BuildServiceItemQuery(tenantId, branchId, start, end);
        var grandTotal = await query.SumAsync(ii => ii.LineTotal, cancellationToken);
        var totalTimesSold = await query.SumAsync(ii => ii.Quantity, cancellationToken);

        var groupedQuery = query
            .GroupBy(ii => new
            {
                ii.ServiceOfferingId,
                ServiceName = ii.ServiceOffering != null ? ii.ServiceOffering.Name : ii.Name
            })
            .Select(g => new
            {
                g.Key.ServiceOfferingId,
                g.Key.ServiceName,
                TimesSold = g.Sum(ii => ii.Quantity),
                TotalRevenue = g.Sum(ii => ii.LineTotal)
            });

        var totalCount = await groupedQuery.CountAsync(cancellationToken);
        var totalPages = PaginationHelper.GetTotalPages(totalCount, normalizedPageSize);

        var pageRows = await groupedQuery
            .OrderByDescending(x => x.TotalRevenue)
            .Skip(skip)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var serviceIds = pageRows
            .Where(r => r.ServiceOfferingId.HasValue)
            .Select(r => r.ServiceOfferingId!.Value)
            .Distinct()
            .ToList();

        var categoryLookup = await _context.ServiceOfferingCategories
            .Where(soc => serviceIds.Contains(soc.ServiceOfferingId))
            .Include(soc => soc.Category)
            .ToListAsync(cancellationToken);

        var categoriesByService = categoryLookup
            .GroupBy(soc => soc.ServiceOfferingId)
            .ToDictionary(
                g => g.Key,
                g => string.Join(", ", g.Select(x => x.Category.Name).Distinct().OrderBy(n => n)));

        var items = pageRows.Select(r => new ServiceSalesRowDto(
            r.ServiceOfferingId,
            r.ServiceName,
            "Service",
            r.ServiceOfferingId.HasValue && categoriesByService.TryGetValue(r.ServiceOfferingId.Value, out var cat)
                ? cat
                : "General",
            r.TimesSold,
            r.TotalRevenue)).ToList();

        return new ServiceSalesPageDto(
            items, totalCount, normalizedPage, normalizedPageSize, totalPages, grandTotal, totalTimesSold);
    }

    private IQueryable<Invoice> BuildCompletedInvoiceQuery(Guid tenantId, Guid? branchId)
    {
        var query = _context.Invoices
            .Where(i => i.TenantId == tenantId && i.Status == InvoiceStatus.Completed);
        if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId);
        return query;
    }

    private IQueryable<InvoiceItem> BuildProductItemQuery(Guid tenantId, Guid? branchId, DateTime start, DateTime end)
    {
        var query = _context.InvoiceItems
            .Where(ii => ii.ItemType == InvoiceItemType.Product
                && ii.Invoice.TenantId == tenantId
                && ii.Invoice.Status == InvoiceStatus.Completed
                && ii.Invoice.CreatedAt >= start
                && ii.Invoice.CreatedAt <= end);
        if (branchId.HasValue) query = query.Where(ii => ii.Invoice.BranchId == branchId);
        return query;
    }

    private IQueryable<InvoiceItem> BuildServiceItemQuery(Guid tenantId, Guid? branchId, DateTime start, DateTime end)
    {
        var query = _context.InvoiceItems
            .Where(ii => ii.ItemType == InvoiceItemType.Service
                && ii.Invoice.TenantId == tenantId
                && ii.Invoice.Status == InvoiceStatus.Completed
                && ii.Invoice.CreatedAt >= start
                && ii.Invoice.CreatedAt <= end);
        if (branchId.HasValue) query = query.Where(ii => ii.Invoice.BranchId == branchId);
        return query;
    }

    private static async Task<SalesPeriodSummaryDto> GetSummaryForPeriodAsync(
        IQueryable<Invoice> invoiceQuery, string period, CancellationToken cancellationToken)
    {
        var (start, end) = PeriodRangeHelper.GetRange(period);
        var totals = await invoiceQuery
            .Where(i => i.CreatedAt >= start && i.CreatedAt <= end)
            .Select(i => new InvoiceTotals(i.SubTotal, i.DiscountAmount, i.TotalAmount))
            .ToListAsync(cancellationToken);
        return SalesSummaryCalculator.Calculate(totals);
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static (DateTime start, DateTime end) GetPeriodRange(string period) => PeriodRangeHelper.GetRange(period);
}
