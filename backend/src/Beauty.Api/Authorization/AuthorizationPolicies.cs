using Beauty.Domain.Enums;

namespace Beauty.Api.Authorization;

public static class AuthorizationPolicies
{
    public const string AdminOnly = "AdminOnly";
    public const string ManagerOrAdmin = "ManagerOrAdmin";
    public const string PosAccess = "PosAccess";

    public static void AddBeautyPolicies(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .AddPolicy(AdminOnly, policy =>
                policy.RequireRole(UserRole.Admin.ToString()))
            .AddPolicy(ManagerOrAdmin, policy =>
                policy.RequireRole(UserRole.Admin.ToString(), UserRole.Manager.ToString()))
            .AddPolicy(PosAccess, policy =>
                policy.RequireRole(
                    UserRole.Admin.ToString(),
                    UserRole.Manager.ToString(),
                    UserRole.Cashier.ToString()));
    }
}
