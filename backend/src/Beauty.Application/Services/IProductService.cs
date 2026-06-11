using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Products;

namespace Beauty.Application.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(Guid? branchId = null, int page = 1, int pageSize = 20, string? search = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductDto>> GetLowStockAsync(Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default);
    Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken = default);
    Task<bool> AdjustStockAsync(Guid id, AdjustStockRequest request, CancellationToken cancellationToken = default);
}
