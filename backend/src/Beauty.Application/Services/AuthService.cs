using Beauty.Application.Common;
using Beauty.Application.DTOs.Auth;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class AuthService : IAuthService
{
    private readonly IAppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IAuditService _auditService;
    private readonly ICurrentUserService _currentUser;

    public AuthService(IAppDbContext context, ITokenService tokenService, IAuditService auditService, ICurrentUserService currentUser)
    {
        _context = context;
        _tokenService = tokenService;
        _auditService = auditService;
        _currentUser = currentUser;
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var slug = GenerateSlug(request.BusinessName);
        if (await _context.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
            throw new InvalidOperationException("Email already registered.");

        var tenant = new Tenant
        {
            Name = request.BusinessName,
            Slug = slug,
            BusinessType = request.BusinessType
        };

        var branch = new Branch
        {
            Tenant = tenant,
            Name = request.BranchName ?? "Main Branch",
            IsActive = true
        };

        var user = new User
        {
            Tenant = tenant,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = UserRole.Admin,
            IsActive = true
        };

        _context.Tenants.Add(tenant);
        _context.Branches.Add(branch);
        _context.Users.Add(user);
        _context.UserBranches.Add(new UserBranch { User = user, Branch = branch, IsDefault = true });

        await SeedDefaultCatalogAsync(tenant, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return BuildLoginResponse(user, tenant, branch, [branch]);
    }

    public async Task<UserProfileDto> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);
        var branches = user.UserBranches.Select(ub => ub.Branch).Where(b => b.IsActive).ToList();
        var defaultBranch = branches.FirstOrDefault(b =>
            user.UserBranches.Any(ub => ub.BranchId == b.Id && ub.IsDefault)) ?? branches.FirstOrDefault();

        return ToProfile(user, user.Tenant, defaultBranch, branches);
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        PasswordValidator.Validate(request.NewPassword);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("ChangePassword", "User", user.Id, cancellationToken: cancellationToken);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Tenant)
            .Include(u => u.UserBranches).ThenInclude(ub => ub.Branch)
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant() && u.IsActive, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        var branches = user.UserBranches.Select(ub => ub.Branch).Where(b => b.IsActive).ToList();
        var branch = request.BranchId.HasValue
            ? branches.FirstOrDefault(b => b.Id == request.BranchId) ?? branches.FirstOrDefault()
            : branches.FirstOrDefault(b => user.UserBranches.Any(ub => ub.BranchId == b.Id && ub.IsDefault)) ?? branches.FirstOrDefault();

        await _auditService.LogAsync("Login", "User", user.Id, cancellationToken: cancellationToken);

        return BuildLoginResponse(user, user.Tenant, branch, branches);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId;
        if (userId.HasValue)
            await _auditService.LogAsync("Logout", "User", userId.Value, cancellationToken: cancellationToken);
    }

    private LoginResponse BuildLoginResponse(User user, Tenant tenant, Branch? branch, IReadOnlyList<Branch> branches)
    {
        var branchId = branch?.Id;
        var token = _tokenService.GenerateToken(user, branchId);
        var branchOptions = branches.Select(b => new BranchOption(
            b.Id, b.Name, user.UserBranches.Any(ub => ub.BranchId == b.Id && ub.IsDefault))).ToList();

        return new LoginResponse(
            token, user.Id, user.Email, user.FullName, user.Role.ToString(),
            tenant.Id, tenant.Name, branchId, branch?.Name, branchOptions);
    }

    private async Task<User> GetCurrentUserEntityAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("Not authenticated.");

        return await _context.Users
            .Include(u => u.Tenant)
            .Include(u => u.UserBranches).ThenInclude(ub => ub.Branch)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");
    }

    private static UserProfileDto ToProfile(User user, Tenant tenant, Branch? branch, IReadOnlyList<Branch> branches)
    {
        var branchOptions = branches.Select(b => new BranchOption(
            b.Id, b.Name, user.UserBranches.Any(ub => ub.BranchId == b.Id && ub.IsDefault))).ToList();

        return new UserProfileDto(
            user.Id, user.Email, user.FirstName, user.LastName, user.FullName, user.Role, user.IsActive,
            tenant.Id, tenant.Name, branch?.Id, branch?.Name, branchOptions);
    }

    private static string GenerateSlug(string name)
        => string.Join("-", name.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            + "-" + Guid.NewGuid().ToString()[..8];

    private async Task SeedDefaultCatalogAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        var categories = new[] { "Hair", "Nails", "Skin Care", "Spa" };
        foreach (var (name, i) in categories.Select((n, i) => (n, i)))
        {
            _context.ServiceCategories.Add(new ServiceCategory
            {
                Tenant = tenant,
                Name = name,
                SortOrder = i,
                IsActive = true
            });
        }
        await Task.CompletedTask;
    }
}
