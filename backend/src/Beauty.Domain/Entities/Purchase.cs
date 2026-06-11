using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class Purchase : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid SupplierId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public Guid? CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
