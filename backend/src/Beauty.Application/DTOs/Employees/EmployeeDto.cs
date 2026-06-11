using Beauty.Domain.Enums;

namespace Beauty.Application.DTOs.Employees;

public record EmployeeDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    UserRole Role,
    bool IsActive,
    decimal? CommissionRate,
    IReadOnlyList<Guid> BranchIds
);

public record CreateEmployeeRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    UserRole Role,
    decimal? CommissionRate,
    IReadOnlyList<Guid> BranchIds
);

public record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    UserRole Role,
    bool IsActive,
    decimal? CommissionRate,
    IReadOnlyList<Guid> BranchIds
);

public record EmployeePerformanceDto(
    Guid EmployeeId,
    string EmployeeName,
    int InvoiceCount,
    decimal TotalSales,
    decimal AverageSale
);
