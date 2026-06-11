namespace Beauty.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(string action, string entityType, Guid? entityId = null, string? details = null, CancellationToken cancellationToken = default);
}
