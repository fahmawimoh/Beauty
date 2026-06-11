using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Employees;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

/// <summary>
/// User management — create and manage Admin, Manager, and Cashier accounts.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public UsersController(IEmployeeService employeeService) => _employeeService = employeeService;

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDto>>>> GetAll(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<EmployeeDto>>.Ok(await _employeeService.GetAllAsync(ct)));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(Guid id, CancellationToken ct)
    {
        var user = await _employeeService.GetByIdAsync(id, ct);
        return user is null
            ? NotFound(ApiResponse<EmployeeDto>.Fail("User not found"))
            : Ok(ApiResponse<EmployeeDto>.Ok(user));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create([FromBody] CreateEmployeeRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<EmployeeDto>.Ok(await _employeeService.CreateAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<EmployeeDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(Guid id, [FromBody] UpdateEmployeeRequest request, CancellationToken ct)
    {
        var user = await _employeeService.UpdateAsync(id, request, ct);
        return user is null
            ? NotFound(ApiResponse<EmployeeDto>.Fail("User not found"))
            : Ok(ApiResponse<EmployeeDto>.Ok(user));
    }

    [HttpGet("roles")]
    [AllowAnonymous]
    public ActionResult<ApiResponse<object>> GetRoles()
        => Ok(ApiResponse<object>.Ok(new[]
        {
            new { value = UserRole.Admin, label = "Admin", description = "Full system access" },
            new { value = UserRole.Manager, label = "Manager", description = "Reports and management access" },
            new { value = UserRole.Cashier, label = "Cashier", description = "POS access only" }
        }));
}
