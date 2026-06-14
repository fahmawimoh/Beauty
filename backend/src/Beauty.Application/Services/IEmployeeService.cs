using Beauty.Application.DTOs.Employees;

namespace Beauty.Application.Services;

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<EmployeeDto?> UpdateAsync(Guid id, UpdateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangeUserPasswordRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeePerformanceDto>> GetPerformanceAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default);
}
