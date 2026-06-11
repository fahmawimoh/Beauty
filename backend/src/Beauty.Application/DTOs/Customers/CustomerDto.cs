namespace Beauty.Application.DTOs.Customers;

public record CustomerDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Email,
    string? Notes,
    int VisitCount,
    decimal TotalSpent,
    DateTime? LastVisitAt
);

public record CreateCustomerRequest(string Name, string? Phone, string? Email, string? Notes);
public record UpdateCustomerRequest(string Name, string? Phone, string? Email, string? Notes);
