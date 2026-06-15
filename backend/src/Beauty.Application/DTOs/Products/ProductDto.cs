namespace Beauty.Application.DTOs.Products;

public record ProductDto(
    Guid Id,
    Guid? BranchId,
    string Sku,
    string Name,
    string? Description,
    decimal Price,
    decimal CostPrice,
    int StockQuantity,
    int LowStockThreshold,
    bool IsActive,
    bool IsLowStock
);

public record CreateProductRequest(
    Guid? BranchId,
    string Sku,
    string Name,
    string? Description,
    decimal Price,
    decimal CostPrice,
    int StockQuantity,
    int LowStockThreshold = 5
);

public record UpdateProductRequest(
    string Sku,
    string Name,
    string? Description,
    decimal Price,
    decimal CostPrice,
    int StockQuantity,
    int LowStockThreshold,
    bool IsActive
);

public record AdjustStockRequest(int QuantityChange, string? Reference);
