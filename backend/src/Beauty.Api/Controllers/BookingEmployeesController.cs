using System.Text.Json;
using Beauty.Api.Authorization;
using Beauty.Application.DTOs.BookingEmployees;
using Beauty.Application.DTOs.Common;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/booking-employees")]
[Authorize]
public class BookingEmployeesController : ControllerBase
{
    private readonly IBookingEmployeeService _service;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ILogger<BookingEmployeesController> _logger;

    public BookingEmployeesController(
        IBookingEmployeeService service,
        IOptions<JsonOptions> jsonOptions,
        ILogger<BookingEmployeesController> logger)
    {
        _service = service;
        _jsonOptions = jsonOptions.Value.JsonSerializerOptions;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BookingEmployeeDto>>>> GetAll(
        [FromQuery] bool activeOnly = false, [FromQuery] Guid? branchId = null, CancellationToken ct = default)
        => Ok(ApiResponse<IReadOnlyList<BookingEmployeeDto>>.Ok(await _service.GetAllAsync(activeOnly, branchId, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BookingEmployeeDto>>> GetById(Guid id, CancellationToken ct)
    {
        var employee = await _service.GetByIdAsync(id, ct);
        return employee is null
            ? NotFound(ApiResponse<BookingEmployeeDto>.Fail("Employee not found"))
            : Ok(ApiResponse<BookingEmployeeDto>.Ok(employee));
    }

    [HttpGet("{id:guid}/schedule")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeScheduleDto>>>> GetSchedule(Guid id, CancellationToken ct)
    {
        var schedule = await _service.GetScheduleAsync(id, ct);
        if (schedule.Count == 0 && await _service.GetByIdAsync(id, ct) is null)
            return NotFound(ApiResponse<IReadOnlyList<EmployeeScheduleDto>>.Fail("Employee not found"));
        return Ok(ApiResponse<IReadOnlyList<EmployeeScheduleDto>>.Ok(schedule));
    }

    [HttpPost]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BookingEmployeeDto>>> Create(
        [FromBody] JsonElement body, CancellationToken ct)
    {
        _logger.LogInformation("Create booking employee payload: {Payload}", body.GetRawText());

        var request = BookingEmployeeRequestJson.ParseCreate(body, _jsonOptions);
        _logger.LogInformation(
            "Create booking employee parsed: Name={Name}, PhoneNumber={PhoneNumber}, BranchId={BranchId}, ScheduleCount={ScheduleCount}",
            request.Name,
            request.PhoneNumber ?? "<null>",
            request.BranchId,
            request.Schedules?.Count ?? 0);

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail("Employee name is required."));

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail("Phone number is required."));

        try
        {
            return Ok(ApiResponse<BookingEmployeeDto>.Ok(await _service.CreateAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BookingEmployeeDto>>> Update(
        Guid id, [FromBody] JsonElement body, CancellationToken ct)
    {
        _logger.LogInformation(
            "Update booking employee {EmployeeId} {Method} {Path} payload: {Payload}",
            id,
            Request.Method,
            Request.Path,
            body.GetRawText());

        var request = BookingEmployeeRequestJson.ParseUpdate(body, _jsonOptions);
        _logger.LogInformation(
            "Update booking employee {EmployeeId} parsed: Name={Name}, PhoneNumber={PhoneNumber}, BranchId={BranchId}, IsActive={IsActive}, ScheduleCount={ScheduleCount}",
            id,
            request.Name,
            request.PhoneNumber ?? "<null>",
            request.BranchId,
            request.IsActive,
            request.Schedules?.Count ?? 0);

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail("Employee name is required."));

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail("Phone number is required."));

        try
        {
            var employee = await _service.UpdateAsync(id, request, ct);
            return employee is null
                ? NotFound(ApiResponse<BookingEmployeeDto>.Fail("Employee not found"))
                : Ok(ApiResponse<BookingEmployeeDto>.Ok(employee));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Validation failed updating booking employee {EmployeeId}", id);
            return BadRequest(ApiResponse<BookingEmployeeDto>.Fail(ex.Message));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error updating booking employee {EmployeeId}", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<BookingEmployeeDto>.Fail("Failed to save employee changes. Please refresh and try again."));
        }
    }

    [HttpDelete("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            return await _service.DeleteAsync(id, ct)
                ? Ok(ApiResponse<bool>.Ok(true))
                : NotFound(ApiResponse<bool>.Fail("Employee not found"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpPatch("{id:guid}/activate")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BookingEmployeeDto>>> Activate(Guid id, CancellationToken ct)
    {
        var employee = await _service.SetActiveAsync(id, true, ct);
        return employee is null
            ? NotFound(ApiResponse<BookingEmployeeDto>.Fail("Employee not found"))
            : Ok(ApiResponse<BookingEmployeeDto>.Ok(employee));
    }

    [HttpPatch("{id:guid}/deactivate")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BookingEmployeeDto>>> Deactivate(Guid id, CancellationToken ct)
    {
        var employee = await _service.SetActiveAsync(id, false, ct);
        return employee is null
            ? NotFound(ApiResponse<BookingEmployeeDto>.Fail("Employee not found"))
            : Ok(ApiResponse<BookingEmployeeDto>.Ok(employee));
    }
}

