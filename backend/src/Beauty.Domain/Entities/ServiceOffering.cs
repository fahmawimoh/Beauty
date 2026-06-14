using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class ServiceOffering : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<ServiceOfferingCategory> ServiceOfferingCategories { get; set; } = [];
}
