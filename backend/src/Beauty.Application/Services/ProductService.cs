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
        var product = new Product
        {
            TenantId = RequireTenantId(),
            BranchId = request.BranchId,
            Sku = request.Sku,
            Name = request.Name,
            Description = request.Description,
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
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == RequireTenantId(), cancellationToken);
        if (product is null) return null;

        product.Sku = request.Sku;
        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.CostPrice = request.CostPrice;
        product.LowStockThreshold = request.LowStockThreshold;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(product);
    }

    public async Task<bool> AdjustStockAsync(Guid id, AdjustStockRequest request, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == RequireTenantId(), cancellationToken);
        if (product is null) return false;

        product.StockQuantity += request.QuantityChange;
        product.UpdatedAt = DateTime.UtcNow;

        var branchId = product.BranchId ?? _currentUser.BranchId ?? Guid.Empty;
        if (branchId != Guid.Empty)
        {
            _context.InventoryLogs.Add(new InventoryLog
            {
                TenantId = product.TenantId,
                BranchId = branchId,
                ProductId = product.Id,
                ChangeType = InventoryChangeType.Adjustment,
                QuantityChange = request.QuantityChange,
                QuantityAfter = product.StockQuantity,
                Reference = request.Reference,
                CreatedByUserId = _currentUser.UserId
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static ProductDto ToDto(Product p) =>
        new(p.Id, p.BranchId, p.Sku, p.Name, p.Description, p.Price, p.CostPrice,
            p.StockQuantity, p.LowStockThreshold, p.IsActive, p.StockQuantity <= p.LowStockThreshold);
}
