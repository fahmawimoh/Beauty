using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class ServiceCategory : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<ServiceOfferingCategory> ServiceOfferingCategories { get; set; } = [];
}
