using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Infrastructure.Persistence;

namespace Beauty.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AuditService(AppDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task LogAsync(string action, string entityType, Guid? entityId = null, string? details = null, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.TenantId.HasValue) return;

        _context.AuditLogs.Add(new AuditLog
        {
            TenantId = _currentUser.TenantId.Value,
            UserId = _currentUser.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details
        });

        await _context.SaveChangesAsync(cancellationToken);
    }
}
