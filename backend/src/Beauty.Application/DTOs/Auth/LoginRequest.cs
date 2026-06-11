namespace Beauty.Application.DTOs.Auth;

public record LoginRequest(string Email, string Password, Guid? BranchId = null);
