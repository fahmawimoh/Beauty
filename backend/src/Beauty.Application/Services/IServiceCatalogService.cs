using Beauty.Application.DTOs.Services;

namespace Beauty.Application.Services;

public interface IServiceCatalogService
{
    Task<IReadOnlyList<ServiceCategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default);
    Task<ServiceCategoryDto> CreateCategoryAsync(CreateServiceCategoryRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ServiceOfferingDto>> GetOfferingsAsync(Guid? categoryId = null, CancellationToken cancellationToken = default);
    Task<ServiceOfferingDto> CreateOfferingAsync(CreateServiceOfferingRequest request, CancellationToken cancellationToken = default);
    Task<ServiceCategoryDto?> UpdateCategoryAsync(Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken = default);
    Task<ServiceOfferingDto?> UpdateOfferingAsync(Guid id, UpdateServiceOfferingRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteOfferingAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> DeleteCategoryAsync(Guid id, bool cascade = false, CancellationToken cancellationToken = default);
}
