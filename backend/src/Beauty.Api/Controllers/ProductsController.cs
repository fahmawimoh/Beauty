using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Products;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService) => _productService = productService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductDto>>>> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, CancellationToken ct = default)
        => Ok(ApiResponse<PagedResult<ProductDto>>.Ok(await _productService.GetAllAsync(branchId, page, pageSize, search, ct)));

    [HttpGet("low-stock")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductDto>>>> GetLowStock([FromQuery] Guid? branchId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ProductDto>>.Ok(await _productService.GetLowStockAsync(branchId, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id, CancellationToken ct)
    {
        var product = await _productService.GetByIdAsync(id, ct);
        return product is null ? NotFound(ApiResponse<ProductDto>.Fail("Product not found")) : Ok(ApiResponse<ProductDto>.Ok(product));
    }

    [HttpPost]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<ProductDto>.Ok(await _productService.CreateAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ProductDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        try
        {
            var product = await _productService.UpdateAsync(id, request, ct);
            return product is null ? NotFound(ApiResponse<ProductDto>.Fail("Product not found")) : Ok(ApiResponse<ProductDto>.Ok(product));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ProductDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
        => await _productService.DeleteAsync(id, ct)
            ? Ok(ApiResponse<bool>.Ok(true))
            : NotFound(ApiResponse<bool>.Fail("Product not found"));

    [HttpPost("{id:guid}/adjust-stock")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<bool>>> AdjustStock(Guid id, [FromBody] AdjustStockRequest request, CancellationToken ct)
        => await _productService.AdjustStockAsync(id, request, ct)
            ? Ok(ApiResponse<bool>.Ok(true))
            : NotFound(ApiResponse<bool>.Fail("Product not found"));
}
