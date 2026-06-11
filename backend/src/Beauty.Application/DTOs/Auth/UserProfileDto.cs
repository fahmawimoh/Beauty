using Beauty.Domain.Enums;

namespace Beauty.Application.DTOs.Auth;

public record UserProfileDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    UserRole Role,
    bool IsActive,
    Guid TenantId,
    string TenantName,
    Guid? BranchId,
    string? BranchName,
    IReadOnlyList<BranchOption> Branches
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
