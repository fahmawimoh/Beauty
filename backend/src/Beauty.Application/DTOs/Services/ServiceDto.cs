namespace Beauty.Application.DTOs.Services;

public record ServiceCategoryDto(Guid Id, string Name, string? Description, int SortOrder, bool IsActive, int ServiceCount);
public record ServiceOfferingCategoryRefDto(Guid Id, string Name);
public record ServiceOfferingDto(Guid Id, IReadOnlyList<ServiceOfferingCategoryRefDto> Categories, string Name, string? Description, decimal Price, int DurationMinutes, bool IsActive);

public record CreateServiceCategoryRequest(string Name, string? Description, int SortOrder = 0);
public record CreateServiceOfferingRequest(IReadOnlyList<Guid> CategoryIds, string Name, string? Description, decimal Price, int DurationMinutes = 30);
public record UpdateServiceCategoryRequest(string Name, string? Description, int SortOrder = 0);
public record UpdateServiceOfferingRequest(IReadOnlyList<Guid> CategoryIds, string Name, string? Description, decimal Price, int DurationMinutes = 30);
