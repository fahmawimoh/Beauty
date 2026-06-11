using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Invoices;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class InvoiceService : IInvoiceService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public InvoiceService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<PagedResult<InvoiceDto>> GetAllAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.Invoices
            .Include(i => i.Branch)
            .Include(i => i.Customer)
            .Include(i => i.Cashier)
            .Include(i => i.Items).ThenInclude(ii => ii.Employee)
            .Where(i => i.TenantId == tenantId);

        if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId);
        if (from.HasValue) query = query.Where(i => i.CreatedAt >= from);
        if (to.HasValue) query = query.Where(i => i.CreatedAt <= to);

        var total = await query.CountAsync(cancellationToken);
        var invoices = await query.OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResult<InvoiceDto>(invoices.Select(ToDto).ToList(), total, page, pageSize);
    }

    public async Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Branch).Include(i => i.Customer).Include(i => i.Cashier)
            .Include(i => i.Items).ThenInclude(ii => ii.Employee)
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == RequireTenantId(), cancellationToken);

        return invoice is null ? null : ToDto(invoice);
    }

    public async Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException();

        var branch = await _context.Branches
            .FirstOrDefaultAsync(b => b.Id == request.BranchId && b.TenantId == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        var items = request.Items ?? [];
        if (items.Count == 0)
            throw new InvalidOperationException("Invoice must have at least one item.");

        var invoiceNumber = await GenerateInvoiceNumberAsync(tenantId, cancellationToken);
        var invoiceItems = new List<InvoiceItem>();
        decimal subTotal = 0;

        foreach (var item in items)
        {
            var lineTotal = (item.UnitPrice * item.Quantity) - item.DiscountAmount;
            subTotal += lineTotal;

            invoiceItems.Add(new InvoiceItem
            {
                ItemType = item.ItemType,
                ServiceOfferingId = item.ServiceOfferingId,
                ProductId = item.ProductId,
                EmployeeId = item.EmployeeId,
                Name = item.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                LineTotal = lineTotal
            });

            if (item.ItemType == InvoiceItemType.Product && item.ProductId.HasValue)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.TenantId == tenantId, cancellationToken);
                if (product is not null)
                {
                    product.StockQuantity -= item.Quantity;
                    _context.InventoryLogs.Add(new InventoryLog
                    {
                        TenantId = tenantId,
                        BranchId = request.BranchId,
                        ProductId = product.Id,
                        ChangeType = InventoryChangeType.Sale,
                        QuantityChange = -item.Quantity,
                        QuantityAfter = product.StockQuantity,
                        Reference = invoiceNumber,
                        CreatedByUserId = userId
                    });
                }
            }
        }

        var totalAmount = subTotal - request.DiscountAmount + request.TaxAmount;

        var invoice = new Invoice
        {
            TenantId = tenantId,
            BranchId = request.BranchId,
            InvoiceNumber = invoiceNumber,
            CustomerId = request.CustomerId,
            CashierId = userId,
            SubTotal = subTotal,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            TotalAmount = totalAmount,
            Status = InvoiceStatus.Completed,
            Notes = request.Notes,
            PaidAt = DateTime.UtcNow,
            Items = invoiceItems
        };

        if (request.CustomerId.HasValue)
        {
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId && c.TenantId == tenantId, cancellationToken);
            if (customer is not null)
            {
                customer.VisitCount++;
                customer.TotalSpent += totalAmount;
                customer.LastVisitAt = DateTime.UtcNow;
            }
        }

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Invoice", invoice.Id, invoice.InvoiceNumber, cancellationToken);

        return (await GetByIdAsync(invoice.Id, cancellationToken))!;
    }

    public async Task<ReceiptDto?> GetReceiptAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Branch).ThenInclude(b => b.Tenant)
            .Include(i => i.Customer).Include(i => i.Cashier).Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == RequireTenantId(), cancellationToken);

        if (invoice is null) return null;

        return new ReceiptDto(
            invoice.InvoiceNumber,
            invoice.Branch.Tenant.Name,
            invoice.Branch.Name,
            invoice.Customer?.Name,
            invoice.Cashier.FullName,
            invoice.PaidAt ?? invoice.CreatedAt,
            invoice.Items.Select(i => new ReceiptItemDto(i.Name, i.Quantity, i.UnitPrice, i.LineTotal)).ToList(),
            invoice.SubTotal,
            invoice.DiscountAmount,
            invoice.TaxAmount,
            invoice.TotalAmount);
    }

    private async Task<string> GenerateInvoiceNumberAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await _context.Invoices
            .CountAsync(i => i.TenantId == tenantId && i.CreatedAt.Date == DateTime.UtcNow.Date, cancellationToken);
        return $"INV-{today}-{(count + 1):D4}";
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.InvoiceNumber, i.BranchId, i.Branch.Name, i.CustomerId, i.Customer?.Name,
        i.CashierId, i.Cashier.FullName, i.SubTotal, i.DiscountAmount, i.TaxAmount, i.TotalAmount,
        i.Status, i.CreatedAt, i.PaidAt,
        i.Items.Select(ii => new InvoiceItemDto(ii.Id, ii.ItemType, ii.ServiceOfferingId, ii.ProductId,
            ii.EmployeeId, ii.Employee?.FullName, ii.Name, ii.Quantity, ii.UnitPrice, ii.DiscountAmount, ii.LineTotal)).ToList());
}
