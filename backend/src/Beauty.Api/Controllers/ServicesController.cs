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
        => Ok(ApiResponse<ServiceCategoryDto>.Ok(await _serviceCatalog.CreateCategoryAsync(request, ct)));

    [HttpGet("offerings")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceOfferingDto>>>> GetOfferings([FromQuery] Guid? categoryId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ServiceOfferingDto>>.Ok(await _serviceCatalog.GetOfferingsAsync(categoryId, ct)));

    [HttpPost("offerings")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ServiceOfferingDto>>> CreateOffering([FromBody] CreateServiceOfferingRequest request, CancellationToken ct)
        => Ok(ApiResponse<ServiceOfferingDto>.Ok(await _serviceCatalog.CreateOfferingAsync(request, ct)));
}
