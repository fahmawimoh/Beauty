using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class Customer : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public int VisitCount { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime? LastVisitAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = [];
}
