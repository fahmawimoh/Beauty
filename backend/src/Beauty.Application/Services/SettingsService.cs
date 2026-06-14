using Beauty.Application.Common;
using Beauty.Application.DTOs.Settings;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class SettingsService : ISettingsService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public SettingsService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<SettingsDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var settings = await GetOrCreateSettingsAsync(tenantId, cancellationToken);
        return new SettingsDto(DiscountTypeMapper.ToApiValue(settings.DiscountType));
    }

    public async Task<SettingsDto> UpdateDiscountTypeAsync(UpdateDiscountTypeRequest request, CancellationToken cancellationToken = default)
    {
        if (!DiscountTypeMapper.IsValidApiValue(request.DiscountType))
            throw new InvalidOperationException("Invalid discount type. Allowed values: PERCENTAGE, FIXED.");

        var discountType = DiscountTypeMapper.FromApiValue(request.DiscountType);
        var tenantId = RequireTenantId();
        var settings = await GetOrCreateSettingsAsync(tenantId, cancellationToken);

        if (settings.DiscountType == discountType)
            return new SettingsDto(DiscountTypeMapper.ToApiValue(settings.DiscountType));

        settings.DiscountType = discountType;
        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("UpdateDiscountType", "TenantSettings", settings.Id, request.DiscountType, cancellationToken);

        return new SettingsDto(DiscountTypeMapper.ToApiValue(settings.DiscountType));
    }

    private async Task<TenantSettings> GetOrCreateSettingsAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var settings = await _context.TenantSettings
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);

        if (settings is not null)
            return settings;

        settings = new TenantSettings
        {
            TenantId = tenantId,
            DiscountType = DiscountType.Percentage
        };

        _context.TenantSettings.Add(settings);
        await _context.SaveChangesAsync(cancellationToken);
        return settings;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();
}
