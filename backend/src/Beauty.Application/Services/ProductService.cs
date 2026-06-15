using Beauty.Application.Common;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Products;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class ProductService : IProductService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public ProductService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<PagedResult<ProductDto>> GetAllAsync(Guid? branchId = null, int page = 1, int pageSize = 20, string? search = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.Products.Where(p => p.TenantId == tenantId && p.IsActive);

        if (branchId.HasValue)
            query = query.Where(p => p.BranchId == null || p.BranchId == branchId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(term) || p.Sku.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(p => p.Name).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => ToDto(p)).ToListAsync(cancellationToken);

        return new PagedResult<ProductDto>(items, total, page, pageSize);
    }

    public async Task<IReadOnlyList<ProductDto>> GetLowStockAsync(Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .Where(p => p.TenantId == RequireTenantId() && p.IsActive && p.StockQuantity <= p.LowStockThreshold);

        if (branchId.HasValue)
            query = query.Where(p => p.BranchId == null || p.BranchId == branchId);

        return await query.Select(p => ToDto(p)).ToListAsync(cancellationToken);
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == RequireTenantId(), cancellationToken);
        return product is null ? null : ToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var sku = request.Sku.Trim();
        var name = request.Name.Trim();

        ProductValidation.ValidateFields(sku, name, request.Price, request.CostPrice, request.StockQuantity, request.LowStockThreshold);
        await EnsureSkuUniqueAsync(tenantId, request.BranchId, sku, null, cancellationToken);

        var product = new Product
        {
            TenantId = tenantId,
            BranchId = request.BranchId,
            Sku = sku,
            Name = name,
            Description = request.Description?.Trim(),
            Price = request.Price,
            CostPrice = request.CostPrice,
            StockQuantity = request.StockQuantity,
            LowStockThreshold = request.LowStockThreshold
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Product", product.Id, product.Name, cancellationToken);

        return ToDto(product);
    }

    public async Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, cancellationToken);
        if (product is null) return null;

        var sku = request.Sku.Trim();
        var name = request.Name.Trim();

        ProductValidation.ValidateFields(sku, name, request.Price, request.CostPrice, request.StockQuantity, request.LowStockThreshold);
        await EnsureSkuUniqueAsync(tenantId, product.BranchId, sku, id, cancellationToken);

        var previousStock = product.StockQuantity;
        product.Sku = sku;
        product.Name = name;
        product.Description = request.Description?.Trim();
        product.Price = request.Price;
        product.CostPrice = request.CostPrice;
        product.StockQuantity = request.StockQuantity;
        product.LowStockThreshold = request.LowStockThreshold;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        var stockChange = request.StockQuantity - previousStock;
        if (stockChange != 0)
            await LogStockChangeAsync(product, stockChange, "Manual update", cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "Product", product.Id, product.Name, cancellationToken);

        return ToDto(product);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == RequireTenantId() && p.IsActive, cancellationToken);
        if (product is null) return false;

        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "Product", product.Id, product.Name, cancellationToken);

        return true;
    }

    public async Task<bool> AdjustStockAsync(Guid id, AdjustStockRequest request, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == RequireTenantId(), cancellationToken);
        if (product is null) return false;

        product.StockQuantity += request.QuantityChange;
        product.UpdatedAt = DateTime.UtcNow;

        await LogStockChangeAsync(product, request.QuantityChange, request.Reference, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsureSkuUniqueAsync(Guid tenantId, Guid? branchId, string sku, Guid? excludeId, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .Where(p => p.TenantId == tenantId && p.IsActive && p.Sku.ToLower() == sku.ToLower());

        if (branchId.HasValue)
            query = query.Where(p => p.BranchId == branchId);
        else
            query = query.Where(p => p.BranchId == null);

        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId);

        if (await query.AnyAsync(cancellationToken))
            throw new InvalidOperationException(ProductValidation.DuplicateSkuMessage);
    }

    private async Task LogStockChangeAsync(Product product, int quantityChange, string? reference, CancellationToken cancellationToken)
    {
        var branchId = product.BranchId ?? _currentUser.BranchId ?? Guid.Empty;
        if (branchId == Guid.Empty) return;

        _context.InventoryLogs.Add(new InventoryLog
        {
            TenantId = product.TenantId,
            BranchId = branchId,
            ProductId = product.Id,
            ChangeType = InventoryChangeType.Adjustment,
            QuantityChange = quantityChange,
            QuantityAfter = product.StockQuantity,
            Reference = reference,
            CreatedByUserId = _currentUser.UserId
        });

        await Task.CompletedTask;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static ProductDto ToDto(Product p) =>
        new(p.Id, p.BranchId, p.Sku, p.Name, p.Description, p.Price, p.CostPrice,
            p.StockQuantity, p.LowStockThreshold, p.IsActive, p.StockQuantity <= p.LowStockThreshold);
}
