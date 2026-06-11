using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Customers;

namespace Beauty.Application.Services;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null, CancellationToken cancellationToken = default);
    Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<CustomerDto?> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
