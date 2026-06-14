using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Settings;
using Beauty.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService) => _settingsService = settingsService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<SettingsDto>>> Get(CancellationToken ct)
        => Ok(ApiResponse<SettingsDto>.Ok(await _settingsService.GetAsync(ct)));

    [HttpPut("discount-type")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<ApiResponse<SettingsDto>>> UpdateDiscountType(
        [FromBody] UpdateDiscountTypeRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<SettingsDto>.Ok(await _settingsService.UpdateDiscountTypeAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SettingsDto>.Fail(ex.Message));
        }
    }
}
