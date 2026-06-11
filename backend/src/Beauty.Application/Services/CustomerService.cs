using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Customers;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class CustomerService : ICustomerService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public CustomerService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<PagedResult<CustomerDto>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.Customers.Where(c => c.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.LastVisitAt ?? c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => ToDto(c))
            .ToListAsync(cancellationToken);

        return new PagedResult<CustomerDto>(items, total, page, pageSize);
    }

    public async Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == RequireTenantId(), cancellationToken);
        return customer is null ? null : ToDto(customer);
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var customer = new Customer
        {
            TenantId = RequireTenantId(),
            Name = request.Name,
            Phone = request.Phone,
            Email = request.Email,
            Notes = request.Notes
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Customer", customer.Id, customer.Name, cancellationToken);

        return ToDto(customer);
    }

    public async Task<CustomerDto?> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == RequireTenantId(), cancellationToken);
        if (customer is null) return null;

        customer.Name = request.Name;
        customer.Phone = request.Phone;
        customer.Email = request.Email;
        customer.Notes = request.Notes;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(customer);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == RequireTenantId(), cancellationToken);
        if (customer is null) return false;

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static CustomerDto ToDto(Customer c) =>
        new(c.Id, c.Name, c.Phone, c.Email, c.Notes, c.VisitCount, c.TotalSpent, c.LastVisitAt);
}
