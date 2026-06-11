using Beauty.Application.DTOs.Branches;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class BranchService : IBranchService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public BranchService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<BranchDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        return await _context.Branches
            .Where(b => b.TenantId == tenantId)
            .OrderBy(b => b.Name)
            .Select(b => ToDto(b))
            .ToListAsync(cancellationToken);
    }

    public async Task<BranchDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var branch = await _context.Branches
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == RequireTenantId(), cancellationToken);
        return branch is null ? null : ToDto(branch);
    }

    public async Task<BranchDto> CreateAsync(CreateBranchRequest request, CancellationToken cancellationToken = default)
    {
        var branch = new Branch
        {
            TenantId = RequireTenantId(),
            Name = request.Name,
            Address = request.Address,
            Phone = request.Phone,
            Email = request.Email,
            InventoryMode = request.InventoryMode
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Branch", branch.Id, branch.Name, cancellationToken);

        return ToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(Guid id, UpdateBranchRequest request, CancellationToken cancellationToken = default)
    {
        var branch = await _context.Branches
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == RequireTenantId(), cancellationToken);
        if (branch is null) return null;

        branch.Name = request.Name;
        branch.Address = request.Address;
        branch.Phone = request.Phone;
        branch.Email = request.Email;
        branch.InventoryMode = request.InventoryMode;
        branch.IsActive = request.IsActive;
        branch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "Branch", branch.Id, cancellationToken: cancellationToken);

        return ToDto(branch);
    }

    private Guid RequireTenantId()
        => _currentUser.TenantId ?? throw new UnauthorizedAccessException("Tenant not found.");

    private static BranchDto ToDto(Branch b) => new(b.Id, b.Name, b.Address, b.Phone, b.Email, b.InventoryMode, b.IsActive);
}
