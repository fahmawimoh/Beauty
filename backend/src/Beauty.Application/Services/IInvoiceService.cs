using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Invoices;

namespace Beauty.Application.Services;

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetAllAsync(Guid? branchId = null, DateTime? from = null, DateTime? to = null, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default);
    Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ReceiptDto?> GetReceiptAsync(Guid id, CancellationToken cancellationToken = default);
}
