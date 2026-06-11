using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class Expense : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
