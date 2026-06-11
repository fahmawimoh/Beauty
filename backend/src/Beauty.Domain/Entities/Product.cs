using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class Product : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal CostPrice { get; set; }
    public int StockQuantity { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public Branch? Branch { get; set; }
    public ICollection<InventoryLog> InventoryLogs { get; set; } = [];
}
