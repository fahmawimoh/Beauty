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
                c.ServiceOfferings.Count(s => s.IsActive)))
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
            .Include(s => s.Category)
            .Where(s => s.TenantId == RequireTenantId() && s.IsActive);

        if (categoryId.HasValue)
            query = query.Where(s => s.CategoryId == categoryId);

        return await query
            .OrderBy(s => s.Name)
            .Select(s => new ServiceOfferingDto(s.Id, s.CategoryId, s.Category != null ? s.Category.Name : null,
                s.Name, s.Description, s.Price, s.DurationMinutes, s.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ServiceOfferingDto> CreateOfferingAsync(CreateServiceOfferingRequest request, CancellationToken cancellationToken = default)
    {
        var offering = new ServiceOffering
        {
            TenantId = RequireTenantId(),
            CategoryId = request.CategoryId,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            DurationMinutes = request.DurationMinutes
        };

        _context.ServiceOfferings.Add(offering);
        await _context.SaveChangesAsync(cancellationToken);

        string? categoryName = null;
        if (request.CategoryId.HasValue)
        {
            categoryName = await _context.ServiceCategories
                .Where(c => c.Id == request.CategoryId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new ServiceOfferingDto(offering.Id, offering.CategoryId, categoryName,
            offering.Name, offering.Description, offering.Price, offering.DurationMinutes, offering.IsActive);
    }

    public async Task<ServiceCategoryDto?> UpdateCategoryAsync(Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var category = await _context.ServiceCategories
            .Include(c => c.ServiceOfferings)
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
            category.ServiceOfferings.Count(s => s.IsActive));
    }

    public async Task<ServiceOfferingDto?> UpdateOfferingAsync(Guid id, UpdateServiceOfferingRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var offering = await _context.ServiceOfferings
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId && s.IsActive, cancellationToken);
        if (offering is null) return null;

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Service name is required.");
        if (request.Price <= 0)
            throw new InvalidOperationException("Price must be greater than zero.");
        if (request.DurationMinutes <= 0)
            throw new InvalidOperationException("Duration must be greater than zero.");

        if (request.CategoryId.HasValue &&
            !await _context.ServiceCategories.AnyAsync(c => c.Id == request.CategoryId && c.TenantId == tenantId && c.IsActive, cancellationToken))
            throw new InvalidOperationException("Selected category does not exist.");

        offering.Name = name;
        offering.Description = request.Description?.Trim();
        offering.Price = request.Price;
        offering.DurationMinutes = request.DurationMinutes;
        offering.CategoryId = request.CategoryId;
        offering.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "ServiceOffering", offering.Id, offering.Name, cancellationToken);

        string? categoryName = null;
        if (offering.CategoryId.HasValue)
        {
            categoryName = await _context.ServiceCategories
                .Where(c => c.Id == offering.CategoryId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new ServiceOfferingDto(offering.Id, offering.CategoryId, categoryName,
            offering.Name, offering.Description, offering.Price, offering.DurationMinutes, offering.IsActive);
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
            .Include(c => c.ServiceOfferings)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == RequireTenantId() && c.IsActive, cancellationToken);
        if (category is null) return false;

        var activeServices = category.ServiceOfferings.Where(s => s.IsActive).ToList();
        if (activeServices.Count > 0 && !cascade)
            throw new InvalidOperationException($"Category contains {activeServices.Count} active service(s). Remove or reassign them first, or enable cascade delete.");

        if (activeServices.Count > 0)
        {
            foreach (var service in activeServices)
            {
                service.IsActive = false;
                service.UpdatedAt = DateTime.UtcNow;
                await _auditService.LogAsync("Delete", "ServiceOffering", service.Id, service.Name, cancellationToken);
            }
        }

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "ServiceCategory", category.Id, category.Name, cancellationToken);
        return true;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();
}
