using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class InventoryLog : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid ProductId { get; set; }
    public InventoryChangeType ChangeType { get; set; }
    public int QuantityChange { get; set; }
    public int QuantityAfter { get; set; }
    public string? Reference { get; set; }
    public Guid? CreatedByUserId { get; set; }

    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
