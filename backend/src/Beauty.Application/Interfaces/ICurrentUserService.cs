using Beauty.Domain.Enums;

namespace Beauty.Application.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? TenantId { get; }
    Guid? BranchId { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
}
