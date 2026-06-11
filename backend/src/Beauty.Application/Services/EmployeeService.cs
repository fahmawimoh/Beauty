using Beauty.Application.DTOs.Employees;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public EmployeeService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<EmployeeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _context.Users
            .Include(u => u.UserBranches)
            .Where(u => u.TenantId == RequireTenantId())
            .OrderBy(u => u.FirstName)
            .ToListAsync(cancellationToken);

        return users.Select(ToDto).ToList();
    }

    public async Task<EmployeeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.Include(u => u.UserBranches)
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == RequireTenantId(), cancellationToken);
        return user is null ? null : ToDto(user);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (await _context.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant(), cancellationToken))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            TenantId = tenantId,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            CommissionRate = request.CommissionRate
        };

        foreach (var branchId in request.BranchIds)
        {
            user.UserBranches.Add(new UserBranch { BranchId = branchId, IsDefault = branchId == request.BranchIds[0] });
        }

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Employee", user.Id, user.FullName, cancellationToken);

        return ToDto(user);
    }

    public async Task<EmployeeDto?> UpdateAsync(Guid id, UpdateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.Include(u => u.UserBranches)
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == RequireTenantId(), cancellationToken);
        if (user is null) return null;

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        user.CommissionRate = request.CommissionRate;
        user.UpdatedAt = DateTime.UtcNow;

        _context.UserBranches.RemoveRange(user.UserBranches);
        foreach (var (branchId, i) in request.BranchIds.Select((b, i) => (b, i)))
        {
            user.UserBranches.Add(new UserBranch { BranchId = branchId, IsDefault = i == 0 });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(user);
    }

    public async Task<IReadOnlyList<EmployeePerformanceDto>> GetPerformanceAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.InvoiceItems
            .Include(ii => ii.Invoice).Include(ii => ii.Employee)
            .Where(ii => ii.Invoice.TenantId == tenantId && ii.EmployeeId != null);

        if (branchId.HasValue)
            query = query.Where(ii => ii.Invoice.BranchId == branchId);
        if (from.HasValue)
            query = query.Where(ii => ii.Invoice.CreatedAt >= from);
        if (to.HasValue)
            query = query.Where(ii => ii.Invoice.CreatedAt <= to);

        return await query
            .GroupBy(ii => new { ii.EmployeeId, ii.Employee!.FirstName, ii.Employee.LastName })
            .Select(g => new EmployeePerformanceDto(
                g.Key.EmployeeId!.Value,
                g.Key.FirstName + " " + g.Key.LastName,
                g.Select(ii => ii.InvoiceId).Distinct().Count(),
                g.Sum(ii => ii.LineTotal),
                g.Average(ii => ii.LineTotal)))
            .OrderByDescending(e => e.TotalSales)
            .ToListAsync(cancellationToken);
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static EmployeeDto ToDto(User u) => new(
        u.Id, u.Email, u.FirstName, u.LastName, u.FullName, u.Role, u.IsActive,
        u.CommissionRate, u.UserBranches.Select(ub => ub.BranchId).ToList());
}
