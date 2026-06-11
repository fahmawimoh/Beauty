using Beauty.Domain.Enums;

namespace Beauty.Application.DTOs.Auth;

public record RegisterRequest(
    string BusinessName,
    BusinessType BusinessType,
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? BranchName = null
);
