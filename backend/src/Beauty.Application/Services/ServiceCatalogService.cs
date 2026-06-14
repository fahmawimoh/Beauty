using Beauty.Application.DTOs.Services;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class ServiceCatalogService : IServiceCatalogService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public ServiceCatalogService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ServiceCategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ServiceCategories
            .Where(c => c.TenantId == RequireTenantId() && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new ServiceCategoryDto(
                c.Id,
                c.Name,
                c.Description,
                c.SortOrder,
                c.IsActive,
                c.ServiceOfferingCategories.Count(soc => soc.ServiceOffering.IsActive)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ServiceCategoryDto> CreateCategoryAsync(CreateServiceCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Category name is required.");

        if (await _context.ServiceCategories.AnyAsync(c => c.TenantId == tenantId && c.IsActive && c.Name.ToLower() == name.ToLower(), cancellationToken))
            throw new InvalidOperationException("A category with this name already exists.");

        var category = new ServiceCategory
        {
            TenantId = tenantId,
            Name = name,
            Description = request.Description?.Trim(),
            SortOrder = request.SortOrder
        };

        _context.ServiceCategories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        return new ServiceCategoryDto(category.Id, category.Name, category.Description, category.SortOrder, category.IsActive, 0);
    }

    public async Task<IReadOnlyList<ServiceOfferingDto>> GetOfferingsAsync(Guid? categoryId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.ServiceOfferings
            .Include(s => s.ServiceOfferingCategories)
                .ThenInclude(soc => soc.Category)
            .Where(s => s.TenantId == RequireTenantId() && s.IsActive);

        if (categoryId.HasValue)
            query = query.Where(s => s.ServiceOfferingCategories.Any(soc => soc.CategoryId == categoryId));

        var offerings = await query.OrderBy(s => s.Name).ToListAsync(cancellationToken);
        return offerings.Select(MapOfferingToDto).ToList();
    }

    public async Task<ServiceOfferingDto?> GetOfferingByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var offering = await _context.ServiceOfferings
            .Include(s => s.ServiceOfferingCategories)
                .ThenInclude(soc => soc.Category)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == RequireTenantId() && s.IsActive, cancellationToken);

        return offering is null ? null : MapOfferingToDto(offering);
    }

    public async Task<ServiceOfferingDto> CreateOfferingAsync(CreateServiceOfferingRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        ValidateOfferingFields(request.Name, request.Price, request.DurationMinutes);
        var categoryIds = await ValidateCategoryIdsAsync(request.CategoryIds, tenantId, cancellationToken);

        var offering = new ServiceOffering
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes
        };

        foreach (var categoryId in categoryIds)
        {
            offering.ServiceOfferingCategories.Add(new ServiceOfferingCategory { CategoryId = categoryId });
        }

        _context.ServiceOfferings.Add(offering);
        await _context.SaveChangesAsync(cancellationToken);

        return await LoadOfferingDtoAsync(offering.Id, cancellationToken)
            ?? throw new InvalidOperationException("Failed to load created service.");
    }

    public async Task<ServiceCategoryDto?> UpdateCategoryAsync(Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var category = await _context.ServiceCategories
            .Include(c => c.ServiceOfferingCategories)
                .ThenInclude(soc => soc.ServiceOffering)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId && c.IsActive, cancellationToken);
        if (category is null) return null;

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Category name is required.");

        if (await _context.ServiceCategories.AnyAsync(c => c.TenantId == tenantId && c.IsActive && c.Id != id && c.Name.ToLower() == name.ToLower(), cancellationToken))
            throw new InvalidOperationException("A category with this name already exists.");

        category.Name = name;
        category.Description = request.Description?.Trim();
        category.SortOrder = request.SortOrder;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "ServiceCategory", category.Id, category.Name, cancellationToken);

        return new ServiceCategoryDto(category.Id, category.Name, category.Description, category.SortOrder, category.IsActive,
            category.ServiceOfferingCategories.Count(soc => soc.ServiceOffering.IsActive));
    }

    public async Task<ServiceOfferingDto?> UpdateOfferingAsync(Guid id, UpdateServiceOfferingRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var offering = await _context.ServiceOfferings
            .Include(s => s.ServiceOfferingCategories)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId && s.IsActive, cancellationToken);
        if (offering is null) return null;

        ValidateOfferingFields(request.Name, request.Price, request.DurationMinutes);
        var categoryIds = await ValidateCategoryIdsAsync(request.CategoryIds, tenantId, cancellationToken);

        offering.Name = request.Name.Trim();
        offering.Description = request.Description?.Trim();
        offering.Price = request.Price;
        offering.DurationMinutes = request.DurationMinutes;
        offering.UpdatedAt = DateTime.UtcNow;

        SyncOfferingCategories(offering, categoryIds);

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "ServiceOffering", offering.Id, offering.Name, cancellationToken);

        return await LoadOfferingDtoAsync(offering.Id, cancellationToken);
    }

    public async Task<bool> DeleteOfferingAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var offering = await _context.ServiceOfferings
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == RequireTenantId() && s.IsActive, cancellationToken);
        if (offering is null) return false;

        offering.IsActive = false;
        offering.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "ServiceOffering", offering.Id, offering.Name, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id, bool cascade = false, CancellationToken cancellationToken = default)
    {
        var category = await _context.ServiceCategories
            .Include(c => c.ServiceOfferingCategories)
                .ThenInclude(soc => soc.ServiceOffering)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == RequireTenantId() && c.IsActive, cancellationToken);
        if (category is null) return false;

        var linkedActiveServices = category.ServiceOfferingCategories
            .Where(soc => soc.ServiceOffering.IsActive)
            .Select(soc => soc.ServiceOffering)
            .Distinct()
            .ToList();

        if (linkedActiveServices.Count > 0 && !cascade)
            throw new InvalidOperationException($"Category contains {linkedActiveServices.Count} active service(s). Remove or reassign them first, or enable cascade delete.");

        if (linkedActiveServices.Count > 0)
            _context.ServiceOfferingCategories.RemoveRange(category.ServiceOfferingCategories);

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "ServiceCategory", category.Id, category.Name, cancellationToken);
        return true;
    }

    private static ServiceOfferingDto MapOfferingToDto(ServiceOffering offering)
    {
        var categories = offering.ServiceOfferingCategories
            .Where(soc => soc.Category.IsActive)
            .OrderBy(soc => soc.Category.SortOrder)
            .ThenBy(soc => soc.Category.Name)
            .Select(soc => new ServiceOfferingCategoryRefDto(soc.CategoryId, soc.Category.Name))
            .ToList();

        return new ServiceOfferingDto(
            offering.Id,
            categories,
            offering.Name,
            offering.Description,
            offering.Price,
            offering.DurationMinutes,
            offering.IsActive);
    }

    private async Task<ServiceOfferingDto?> LoadOfferingDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var offering = await _context.ServiceOfferings
            .Include(s => s.ServiceOfferingCategories)
                .ThenInclude(soc => soc.Category)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        return offering is null ? null : MapOfferingToDto(offering);
    }

    private static void SyncOfferingCategories(ServiceOffering offering, IReadOnlyList<Guid> categoryIds)
    {
        var desired = categoryIds.ToHashSet();
        var existing = offering.ServiceOfferingCategories.ToList();

        foreach (var link in existing.Where(l => !desired.Contains(l.CategoryId)))
            offering.ServiceOfferingCategories.Remove(link);

        var existingIds = offering.ServiceOfferingCategories.Select(l => l.CategoryId).ToHashSet();
        foreach (var categoryId in desired.Where(id => !existingIds.Contains(id)))
        {
            offering.ServiceOfferingCategories.Add(new ServiceOfferingCategory
            {
                ServiceOfferingId = offering.Id,
                CategoryId = categoryId
            });
        }
    }

    private static void ValidateOfferingFields(string name, decimal price, int durationMinutes)
    {
        if (string.IsNullOrWhiteSpace(name.Trim()))
            throw new InvalidOperationException("Service name is required.");
        if (price <= 0)
            throw new InvalidOperationException("Price must be greater than zero.");
        if (durationMinutes <= 0)
            throw new InvalidOperationException("Duration must be greater than zero.");
    }

    private async Task<IReadOnlyList<Guid>> ValidateCategoryIdsAsync(
        IReadOnlyList<Guid>? categoryIds,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var distinctIds = (categoryIds ?? []).Distinct().ToList();
        if (distinctIds.Count == 0)
            return distinctIds;

        var validCount = await _context.ServiceCategories
            .CountAsync(c => distinctIds.Contains(c.Id) && c.TenantId == tenantId && c.IsActive, cancellationToken);

        if (validCount != distinctIds.Count)
            throw new InvalidOperationException("One or more selected categories do not exist.");

        return distinctIds;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();
}
