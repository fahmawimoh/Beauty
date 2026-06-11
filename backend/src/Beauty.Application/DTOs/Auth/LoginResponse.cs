namespace Beauty.Application.DTOs.Auth;

public record LoginResponse(
    string Token,
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    Guid TenantId,
    string TenantName,
    Guid? BranchId,
    string? BranchName,
    IReadOnlyList<BranchOption> Branches
);

public record BranchOption(Guid Id, string Name, bool IsDefault);
