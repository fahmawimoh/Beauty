using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class Branch : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public InventoryMode InventoryMode { get; set; } = InventoryMode.Separate;
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<UserBranch> UserBranches { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
}
