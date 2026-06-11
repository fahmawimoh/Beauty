using Beauty.Application.DTOs.Services;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class ServiceCatalogService : IServiceCatalogService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ServiceCatalogService(IAppDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<ServiceCategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ServiceCategories
            .Where(c => c.TenantId == RequireTenantId() && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new ServiceCategoryDto(c.Id, c.Name, c.Description, c.SortOrder, c.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ServiceCategoryDto> CreateCategoryAsync(CreateServiceCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = new ServiceCategory
        {
            TenantId = RequireTenantId(),
            Name = request.Name,
            Description = request.Description,
            SortOrder = request.SortOrder
        };

        _context.ServiceCategories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        return new ServiceCategoryDto(category.Id, category.Name, category.Description, category.SortOrder, category.IsActive);
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

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();
}
