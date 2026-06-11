using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class User : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public decimal? CommissionRate { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ICollection<UserBranch> UserBranches { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];

    public string FullName => $"{FirstName} {LastName}".Trim();
}
