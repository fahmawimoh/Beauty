using Beauty.Application.DTOs.Common;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Beauty.Api.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RoleAuthorizeAttribute : Attribute, IAuthorizationFilter
{
    private readonly UserRole[] _roles;

    public RoleAuthorizeAttribute(params UserRole[] roles) => _roles = roles;

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new ObjectResult(ApiResponse<object>.Fail("Unauthorized. Please log in again."))
            {
                StatusCode = StatusCodes.Status401Unauthorized
            };
            return;
        }

        var roleClaim = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (roleClaim is null || !Enum.TryParse<UserRole>(roleClaim, out var userRole))
        {
            context.Result = Forbidden("Invalid user role.");
            return;
        }

        if (_roles.Length > 0 && !_roles.Contains(userRole))
            context.Result = Forbidden("You do not have permission to access this resource.");
    }

    private static ObjectResult Forbidden(string message) =>
        new(ApiResponse<object>.Fail(message)) { StatusCode = StatusCodes.Status403Forbidden };
}
