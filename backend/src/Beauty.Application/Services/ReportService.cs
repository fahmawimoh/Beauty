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

    public async Task<PeriodReportDto> GetPeriodReportAsync(PeriodReportQuery query, CancellationToken cancellationToken = default)
    {
        var period = string.IsNullOrWhiteSpace(query.Period) ? "monthly" : query.Period;
        if (query.From.HasValue && query.To.HasValue)
            period = "custom";

        var (start, end) = PeriodRangeHelper.GetRange(period, query.From, query.To);
        var tenantId = RequireTenantId();
        var status = query.Status ?? InvoiceStatus.Completed;

        var invoiceQuery = _context.Invoices
            .Include(i => i.Items)
            .Where(i => i.TenantId == tenantId
                && i.Status == status
                && i.CreatedAt >= start
                && i.CreatedAt <= end);

        if (query.BranchId.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.BranchId == query.BranchId);
        if (query.CustomerId.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.CustomerId == query.CustomerId);
        if (query.PaymentMethod.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.PaymentMethod == query.PaymentMethod);
        if (query.EmployeeId.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.Items.Any(ii => ii.EmployeeId == query.EmployeeId));
        if (query.ServiceId.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.Items.Any(ii => ii.ServiceOfferingId == query.ServiceId));
        if (query.ProductId.HasValue)
            invoiceQuery = invoiceQuery.Where(i => i.Items.Any(ii => ii.ProductId == query.ProductId));

        var invoices = await invoiceQuery.AsNoTracking().ToListAsync(cancellationToken);

        var totalSales = invoices.Sum(i => i.SubTotal);
        var totalDiscounts = invoices.Sum(i => i.DiscountAmount);
        var totalTaxes = invoices.Sum(i => i.TaxAmount);
        var totalRevenue = invoices.Sum(i => i.TotalAmount);

        var expenseQuery = _context.Expenses
            .Where(e => e.TenantId == tenantId && e.ExpenseDate >= start && e.ExpenseDate <= end);
        if (query.BranchId.HasValue)
            expenseQuery = expenseQuery.Where(e => e.BranchId == query.BranchId);
        var totalExpenses = await expenseQuery.SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

        var lineItems = invoices.SelectMany(i => i.Items).AsEnumerable();
        if (query.EmployeeId.HasValue)
            lineItems = lineItems.Where(ii => ii.EmployeeId == query.EmployeeId);
        if (query.ServiceId.HasValue)
            lineItems = lineItems.Where(ii => ii.ServiceOfferingId == query.ServiceId);
        if (query.ProductId.HasValue)
            lineItems = lineItems.Where(ii => ii.ProductId == query.ProductId);
        var filteredItems = lineItems.ToList();

        var salesByCategory = filteredItems
            .GroupBy(ii => ii.ItemType.ToString())
            .Select(g => new CategorySalesDto(g.Key, g.Sum(ii => ii.LineTotal), g.Count()))
            .OrderByDescending(c => c.Revenue)
            .ToList();

        var salesByEmployee = filteredItems
            .Where(ii => ii.EmployeeId != null)
            .GroupBy(ii => ii.EmployeeId!.Value)
            .Select(g =>
            {
                var employeeName = invoices
                    .SelectMany(i => i.Items)
                    .FirstOrDefault(ii => ii.EmployeeId == g.Key)?.Employee?.FullName
                    ?? "Unknown";
                return new EmployeeSalesDto(
                    g.Key,
                    employeeName,
                    g.Sum(ii => ii.LineTotal),
                    g.Select(ii => ii.InvoiceId).Distinct().Count());
            })
            .OrderByDescending(e => e.Revenue)
            .ToList();

        // Resolve employee names when Include didn't load them (AsNoTracking + Include Items only)
        if (salesByEmployee.Count > 0 && salesByEmployee.Any(e => e.EmployeeName == "Unknown"))
        {
            var employeeIds = salesByEmployee.Select(e => e.EmployeeId).ToList();
            var names = await _context.Users
                .Where(u => employeeIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            salesByEmployee = salesByEmployee
                .Select(e => names.TryGetValue(e.EmployeeId, out var name)
                    ? e with { EmployeeName = name }
                    : e)
                .ToList();
        }

        var productsSold = filteredItems
            .Where(ii => ii.ItemType == InvoiceItemType.Product)
            .GroupBy(ii => new
            {
                ii.ProductId,
                ProductName = !string.IsNullOrWhiteSpace(ii.Name) ? ii.Name : "Product",
            })
            .Select(g => new ProductSalesRowDto(
                g.Key.ProductId,
                null,
                g.Key.ProductName,
                "Product",
                "General",
                g.Sum(ii => ii.Quantity),
                g.Sum(ii => ii.LineTotal)))
            .OrderByDescending(p => p.TotalSalesAmount)
            .Take(50)
            .ToList();

        var servicesSold = filteredItems
            .Where(ii => ii.ItemType == InvoiceItemType.Service)
            .GroupBy(ii => new
            {
                ii.ServiceOfferingId,
                ServiceName = !string.IsNullOrWhiteSpace(ii.Name) ? ii.Name : "Service",
            })
            .Select(g => new ServiceSalesRowDto(
                g.Key.ServiceOfferingId,
                g.Key.ServiceName,
                "Service",
                "General",
                g.Sum(ii => ii.Quantity),
                g.Sum(ii => ii.LineTotal)))
            .OrderByDescending(s => s.TotalRevenue)
            .Take(50)
            .ToList();

        var productsSoldCount = filteredItems
            .Where(ii => ii.ItemType == InvoiceItemType.Product)
            .Sum(ii => ii.Quantity);
        var servicesSoldCount = filteredItems
            .Where(ii => ii.ItemType == InvoiceItemType.Service)
            .Sum(ii => ii.Quantity);

        var paymentMethodSummary = invoices
            .GroupBy(i => i.PaymentMethod.ToString())
            .Select(g => new PaymentMethodSummaryDto(g.Key, g.Count(), g.Sum(i => i.TotalAmount)))
            .OrderByDescending(p => p.TotalAmount)
            .ToList();

        var revenueTrend = invoices
            .GroupBy(i => i.CreatedAt.Date)
            .Select(g => new DailySalesDto(
                g.Key,
                g.Sum(i => i.TotalAmount),
                g.Count(),
                g.Where(i => i.CustomerId != null).Select(i => i.CustomerId).Distinct().Count()))
            .OrderBy(d => d.Date)
            .ToList();

        var appointmentQuery = _context.Appointments
            .Where(a => a.TenantId == tenantId
                && a.Status != AppointmentStatus.Cancelled
                && a.AppointmentDate >= DateOnly.FromDateTime(start)
                && a.AppointmentDate <= DateOnly.FromDateTime(end));
        if (query.BranchId.HasValue)
            appointmentQuery = appointmentQuery.Where(a => a.BranchId == query.BranchId);
        if (query.CustomerId.HasValue)
            appointmentQuery = appointmentQuery.Where(a => a.CustomerId == query.CustomerId);
        if (query.ServiceId.HasValue)
            appointmentQuery = appointmentQuery.Where(a => a.ServiceOfferingId == query.ServiceId);
        if (query.EmployeeId.HasValue)
            appointmentQuery = appointmentQuery.Where(a => a.AssignedUserId == query.EmployeeId);
        var appointmentCount = await appointmentQuery.CountAsync(cancellationToken);

        return new PeriodReportDto(
            PeriodRangeHelper.NormalizeSalesPeriod(period),
            start,
            end,
            totalSales,
            totalRevenue,
            totalRevenue - totalExpenses,
            totalExpenses,
            totalDiscounts,
            totalTaxes,
            invoices.Count,
            invoices.Where(i => i.CustomerId != null).Select(i => i.CustomerId).Distinct().Count(),
            appointmentCount,
            productsSoldCount,
            servicesSoldCount,
            invoices.Count > 0 ? totalRevenue / invoices.Count : 0,
            salesByCategory,
            salesByEmployee,
            productsSold,
            servicesSold,
            paymentMethodSummary,
            revenueTrend);
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
