using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Invoices;
using Beauty.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService) => _invoiceService = invoiceService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<InvoiceDto>>>> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(ApiResponse<PagedResult<InvoiceDto>>.Ok(await _invoiceService.GetAllAsync(branchId, from, to, page, pageSize, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetById(Guid id, CancellationToken ct)
    {
        var invoice = await _invoiceService.GetByIdAsync(id, ct);
        return invoice is null ? NotFound(ApiResponse<InvoiceDto>.Fail("Invoice not found")) : Ok(ApiResponse<InvoiceDto>.Ok(invoice));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Create([FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<InvoiceDto>.Ok(await _invoiceService.CreateAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<InvoiceDto>.Fail(ex.Message));
        }
    }

    [HttpGet("{id:guid}/receipt")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> GetReceipt(Guid id, CancellationToken ct)
    {
        var receipt = await _invoiceService.GetReceiptAsync(id, ct);
        return receipt is null ? NotFound(ApiResponse<ReceiptDto>.Fail("Invoice not found")) : Ok(ApiResponse<ReceiptDto>.Ok(receipt));
    }
}
