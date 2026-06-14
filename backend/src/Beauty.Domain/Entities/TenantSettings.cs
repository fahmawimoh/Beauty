using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class TenantSettings : BaseEntity
{
    public Guid TenantId { get; set; }
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;

    public Tenant Tenant { get; set; } = null!;
}
