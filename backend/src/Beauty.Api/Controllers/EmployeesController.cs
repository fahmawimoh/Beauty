using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Employees;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService) => _employeeService = employeeService;

    [HttpGet]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDto>>>> GetAll(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<EmployeeDto>>.Ok(await _employeeService.GetAllAsync(ct)));

    [HttpGet("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(Guid id, CancellationToken ct)
    {
        var employee = await _employeeService.GetByIdAsync(id, ct);
        return employee is null ? NotFound(ApiResponse<EmployeeDto>.Fail("Employee not found")) : Ok(ApiResponse<EmployeeDto>.Ok(employee));
    }

    [HttpPost]
    [RoleAuthorize(UserRole.Admin)]
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
    [RoleAuthorize(UserRole.Admin)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(Guid id, [FromBody] UpdateEmployeeRequest request, CancellationToken ct)
    {
        var employee = await _employeeService.UpdateAsync(id, request, ct);
        return employee is null ? NotFound(ApiResponse<EmployeeDto>.Fail("Employee not found")) : Ok(ApiResponse<EmployeeDto>.Ok(employee));
    }

    [HttpGet("performance")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeePerformanceDto>>>> GetPerformance(
        [FromQuery] Guid? branchId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<EmployeePerformanceDto>>.Ok(await _employeeService.GetPerformanceAsync(branchId, from, to, ct)));
}
