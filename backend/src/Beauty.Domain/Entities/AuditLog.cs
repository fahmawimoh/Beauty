using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public User? User { get; set; }
}
