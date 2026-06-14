namespace Beauty.Application.DTOs.Services;

public record ServiceCategoryDto(Guid Id, string Name, string? Description, int SortOrder, bool IsActive, int ServiceCount);
public record ServiceOfferingDto(Guid Id, Guid? CategoryId, string? CategoryName, string Name, string? Description, decimal Price, int DurationMinutes, bool IsActive);

public record CreateServiceCategoryRequest(string Name, string? Description, int SortOrder = 0);
public record CreateServiceOfferingRequest(Guid? CategoryId, string Name, string? Description, decimal Price, int DurationMinutes = 30);
public record UpdateServiceCategoryRequest(string Name, string? Description, int SortOrder = 0);
public record UpdateServiceOfferingRequest(Guid? CategoryId, string Name, string? Description, decimal Price, int DurationMinutes = 30);
