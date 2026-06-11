namespace Beauty.Application.DTOs.Services;

public record ServiceCategoryDto(Guid Id, string Name, string? Description, int SortOrder, bool IsActive);
public record ServiceOfferingDto(Guid Id, Guid? CategoryId, string? CategoryName, string Name, string? Description, decimal Price, int DurationMinutes, bool IsActive);

public record CreateServiceCategoryRequest(string Name, string? Description, int SortOrder = 0);
public record CreateServiceOfferingRequest(Guid? CategoryId, string Name, string? Description, decimal Price, int DurationMinutes = 30);
