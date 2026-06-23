using Beauty.Application.DTOs.Appointments;
using Beauty.Application.DTOs.Common;
using Beauty.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService) => _appointmentService = appointmentService;

    [HttpGet("daily")]
    public async Task<ActionResult<ApiResponse<DailyScheduleByEmployeeDto>>> GetDailySchedule(
        [FromQuery] DateOnly date, [FromQuery] Guid? employeeId = null, [FromQuery] Guid? branchId = null, CancellationToken ct = default)
        => Ok(ApiResponse<DailyScheduleByEmployeeDto>.Ok(
            await _appointmentService.GetDailyScheduleAsync(date, employeeId, branchId, ct)));

    [HttpGet("availability")]
    public async Task<ActionResult<ApiResponse<AvailabilityCheckDto>>> CheckAvailability(
        [FromQuery] Guid employeeId, [FromQuery] DateOnly date, [FromQuery] int? durationMinutes = null, CancellationToken ct = default)
    {
        try
        {
            return Ok(ApiResponse<AvailabilityCheckDto>.Ok(
                await _appointmentService.CheckAvailabilityAsync(employeeId, date, durationMinutes, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AvailabilityCheckDto>.Fail(ex.Message));
        }
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> GetAll(
        [FromQuery] DateOnly? date = null, [FromQuery] Guid? employeeId = null, CancellationToken ct = default)
        => Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(
            await _appointmentService.GetAllAsync(date, employeeId, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> GetById(Guid id, CancellationToken ct)
    {
        var appointment = await _appointmentService.GetByIdAsync(id, ct);
        return appointment is null
            ? NotFound(ApiResponse<AppointmentDto>.Fail("Appointment not found"))
            : Ok(ApiResponse<AppointmentDto>.Ok(appointment));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Create(
        [FromBody] CreateAppointmentRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<AppointmentDto>.Ok(await _appointmentService.CreateAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Update(
        Guid id, [FromBody] UpdateAppointmentRequest request, CancellationToken ct)
    {
        try
        {
            var appointment = await _appointmentService.UpdateAsync(id, request, ct);
            return appointment is null
                ? NotFound(ApiResponse<AppointmentDto>.Fail("Appointment not found"))
                : Ok(ApiResponse<AppointmentDto>.Ok(appointment));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
        => await _appointmentService.DeleteAsync(id, ct)
            ? Ok(ApiResponse<bool>.Ok(true))
            : NotFound(ApiResponse<bool>.Fail("Appointment not found"));

    [HttpGet("waiting-list")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WaitingListEntryDto>>>> GetWaitingList(
        [FromQuery] DateOnly date, [FromQuery] Guid? employeeId = null, [FromQuery] TimeOnly? startTime = null,
        [FromQuery] Guid? branchId = null, CancellationToken ct = default)
        => Ok(ApiResponse<IReadOnlyList<WaitingListEntryDto>>.Ok(
            await _appointmentService.GetWaitingListAsync(date, employeeId, startTime, branchId, ct)));

    [HttpPost("waiting-list")]
    public async Task<ActionResult<ApiResponse<WaitingListEntryDto>>> JoinWaitingList(
        [FromBody] JoinWaitingListRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<WaitingListEntryDto>.Ok(await _appointmentService.JoinWaitingListAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<WaitingListEntryDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("waiting-list/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelWaitingListEntry(Guid id, CancellationToken ct)
        => await _appointmentService.CancelWaitingListEntryAsync(id, ct)
            ? Ok(ApiResponse<bool>.Ok(true))
            : NotFound(ApiResponse<bool>.Fail("Waiting list entry not found"));

    [HttpPost("waiting-list/{id:guid}/promote")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> PromoteWaitingListEntry(Guid id, CancellationToken ct)
    {
        try
        {
            var appointment = await _appointmentService.PromoteWaitingListEntryAsync(id, ct);
            return appointment is null
                ? NotFound(ApiResponse<AppointmentDto>.Fail("Waiting list entry not found"))
                : Ok(ApiResponse<AppointmentDto>.Ok(appointment));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NotificationLogDto>>>> GetNotifications(
        [FromQuery] Guid? appointmentId = null, CancellationToken ct = default)
        => Ok(ApiResponse<IReadOnlyList<NotificationLogDto>>.Ok(
            await _appointmentService.GetNotificationsAsync(appointmentId, ct)));
}
