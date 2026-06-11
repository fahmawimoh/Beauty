using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Auth;
using Beauty.Application.DTOs.Common;
using Beauty.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [HttpGet("me")]
    [Authorize(Policy = AuthorizationPolicies.PosAccess)]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> GetMe(CancellationToken ct)
        => Ok(ApiResponse<UserProfileDto>.Ok(await _authService.GetCurrentUserAsync(ct)));

    [HttpPost("change-password")]
    [Authorize(Policy = AuthorizationPolicies.PosAccess)]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        try
        {
            await _authService.ChangePasswordAsync(request, ct);
            return Ok(ApiResponse<bool>.Ok(true, "Password changed successfully"));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<bool>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _authService.RegisterAsync(request, ct);
            return Ok(ApiResponse<LoginResponse>.Ok(result, "Registration successful"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LoginResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _authService.LoginAsync(request, ct);
            return Ok(ApiResponse<LoginResponse>.Ok(result));
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ApiResponse<LoginResponse>.Fail("Invalid email or password"));
        }
    }
}
