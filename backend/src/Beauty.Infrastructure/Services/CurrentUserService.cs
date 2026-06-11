using System.Security.Claims;
using Beauty.Application.Interfaces;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Beauty.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public Guid? UserId => ParseGuid(User?.FindFirst(ClaimTypes.NameIdentifier)?.Value);

    public Guid? TenantId => ParseGuid(User?.FindFirst("tenant_id")?.Value);

    public Guid? BranchId => ParseGuid(User?.FindFirst("branch_id")?.Value);

    public UserRole? Role
    {
        get
        {
            var role = User?.FindFirst(ClaimTypes.Role)?.Value;
            return role is not null && Enum.TryParse<UserRole>(role, out var parsed) ? parsed : null;
        }
    }

    private static Guid? ParseGuid(string? value)
        => Guid.TryParse(value, out var id) ? id : null;
}
