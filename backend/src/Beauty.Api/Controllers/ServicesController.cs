using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Services;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServicesController : ControllerBase
{
    private readonly IServiceCatalogService _serviceCatalog;

    public ServicesController(IServiceCatalogService serviceCatalog) => _serviceCatalog = serviceCatalog;

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceCategoryDto>>>> GetCategories(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ServiceCategoryDto>>.Ok(await _serviceCatalog.GetCategoriesAsync(ct)));

    [HttpPost("categories")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ServiceCategoryDto>>> CreateCategory([FromBody] CreateServiceCategoryRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<ServiceCategoryDto>.Ok(await _serviceCatalog.CreateCategoryAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ServiceCategoryDto>.Fail(ex.Message));
        }
    }

    [HttpPut("categories/{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ServiceCategoryDto>>> UpdateCategory(Guid id, [FromBody] UpdateServiceCategoryRequest request, CancellationToken ct)
    {
        try
        {
            var category = await _serviceCatalog.UpdateCategoryAsync(id, request, ct);
            return category is null
                ? NotFound(ApiResponse<ServiceCategoryDto>.Fail("Category not found"))
                : Ok(ApiResponse<ServiceCategoryDto>.Ok(category, "Category updated successfully"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ServiceCategoryDto>.Fail(ex.Message));
        }
    }

    [HttpGet("offerings")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceOfferingDto>>>> GetOfferings([FromQuery] Guid? categoryId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ServiceOfferingDto>>.Ok(await _serviceCatalog.GetOfferingsAsync(categoryId, ct)));

    [HttpGet("offerings/{id:guid}")]
    public async Task<ActionResult<ApiResponse<ServiceOfferingDto>>> GetOffering(Guid id, CancellationToken ct)
    {
        var offering = await _serviceCatalog.GetOfferingByIdAsync(id, ct);
        return offering is null
            ? NotFound(ApiResponse<ServiceOfferingDto>.Fail("Service not found"))
            : Ok(ApiResponse<ServiceOfferingDto>.Ok(offering));
    }

    [HttpPost("offerings")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ServiceOfferingDto>>> CreateOffering([FromBody] CreateServiceOfferingRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<ServiceOfferingDto>.Ok(await _serviceCatalog.CreateOfferingAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ServiceOfferingDto>.Fail(ex.Message));
        }
    }

    [HttpPut("offerings/{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ServiceOfferingDto>>> UpdateOffering(Guid id, [FromBody] UpdateServiceOfferingRequest request, CancellationToken ct)
    {
        try
        {
            var offering = await _serviceCatalog.UpdateOfferingAsync(id, request, ct);
            return offering is null
                ? NotFound(ApiResponse<ServiceOfferingDto>.Fail("Service not found"))
                : Ok(ApiResponse<ServiceOfferingDto>.Ok(offering, "Service updated successfully"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ServiceOfferingDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("offerings/{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteOffering(Guid id, CancellationToken ct)
        => await _serviceCatalog.DeleteOfferingAsync(id, ct)
            ? Ok(ApiResponse<bool>.Ok(true, "Service deleted successfully"))
            : NotFound(ApiResponse<bool>.Fail("Service not found"));

    [HttpDelete("categories/{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCategory(Guid id, [FromQuery] bool cascade = false, CancellationToken ct = default)
    {
        try
        {
            return await _serviceCatalog.DeleteCategoryAsync(id, cascade, ct)
                ? Ok(ApiResponse<bool>.Ok(true, "Category deleted successfully"))
                : NotFound(ApiResponse<bool>.Fail("Category not found"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }
}
