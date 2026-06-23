using Beauty.Application.Common;
using Beauty.Application.DTOs.Appointments;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class AppointmentService : IAppointmentService
{
    private const int SlotIntervalMinutes = 30;

    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public AppointmentService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<DailyScheduleByEmployeeDto> GetDailyScheduleAsync(
        DateOnly date, Guid? employeeId = null, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        branchId = ResolveBranchId(branchId);

        var employeesQuery = _context.BookingEmployees
            .AsNoTracking()
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .Where(e => e.TenantId == tenantId && e.IsActive);

        if (branchId.HasValue)
            employeesQuery = employeesQuery.Where(e => e.BranchId == null || e.BranchId == branchId);
        if (employeeId.HasValue)
            employeesQuery = employeesQuery.Where(e => e.Id == employeeId);

        var employees = await employeesQuery.OrderBy(e => e.Name).ToListAsync(cancellationToken);

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.BookingEmployee)
            .Include(a => a.ServiceOffering)
            .Where(a => a.TenantId == tenantId
                && a.AppointmentDate == date
                && a.Status != AppointmentStatus.Cancelled
                && a.BookingEmployeeId != null
                && (branchId == null || a.BranchId == branchId)
                && (!employeeId.HasValue || a.BookingEmployeeId == employeeId))
            .OrderBy(a => a.StartTime)
            .ToListAsync(cancellationToken);

        var employeeSchedules = employees.Select(emp =>
        {
            var empAppointments = appointments.Where(a => a.BookingEmployeeId == emp.Id).ToList();
            var slots = BuildAvailableSlots(emp, date, empAppointments, emp.DefaultSlotDurationMinutes);
            return new EmployeeDayScheduleDto(
                emp.Id,
                emp.Name,
                emp.IsActive,
                empAppointments.Select(a => ToDto(a)).ToList(),
                slots);
        }).ToList();

        return new DailyScheduleByEmployeeDto(date, branchId, employeeSchedules);
    }

    public async Task<AvailabilityCheckDto> CheckAvailabilityAsync(
        Guid employeeId, DateOnly date, int? durationMinutes = null, CancellationToken cancellationToken = default)
    {
        var employee = await GetActiveEmployeeAsync(employeeId, cancellationToken);
        var duration = durationMinutes ?? employee.DefaultSlotDurationMinutes;

        var appointments = await GetEmployeeAppointmentsAsync(employeeId, date, cancellationToken);
        var slots = BuildAvailableSlots(employee, date, appointments, duration);

        return new AvailabilityCheckDto(employee.Id, employee.Name, date, duration, slots);
    }

    public async Task<AppointmentDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var appointment = await QueryAppointments()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == RequireTenantId(), cancellationToken);
        return appointment is null ? null : ToDto(appointment);
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetAllAsync(
        DateOnly? date = null, Guid? employeeId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = QueryAppointments().Where(a => a.TenantId == tenantId);

        if (date.HasValue) query = query.Where(a => a.AppointmentDate == date);
        if (employeeId.HasValue) query = query.Where(a => a.BookingEmployeeId == employeeId);

        var items = await query.OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var employee = await GetActiveEmployeeAsync(request.BookingEmployeeId, cancellationToken);
        var branchId = ResolveBranchId(request.BranchId);
        var duration = request.DurationMinutes ?? employee.DefaultSlotDurationMinutes;

        ValidateRequest(request.AppointmentDate, request.StartTime, duration, request.ClientName, request.ClientPhone);
        await EnsureEmployeeAvailableAsync(employee, request.AppointmentDate, request.StartTime, duration, null, cancellationToken);

        var phone = PhoneNumberValidator.ValidateAndNormalize(request.ClientPhone, required: true)!;
        var endTime = EmployeeSlotGenerator.ComputeEndTime(request.StartTime, duration);

        var appointment = new Appointment
        {
            TenantId = tenantId,
            BranchId = branchId,
            BookingEmployeeId = employee.Id,
            CustomerId = request.CustomerId,
            ClientName = request.ClientName.Trim(),
            ClientPhone = phone,
            ClientEmail = request.ClientEmail?.Trim(),
            ServiceOfferingId = request.ServiceOfferingId,
            ServiceType = request.ServiceType?.Trim(),
            AppointmentDate = request.AppointmentDate,
            StartTime = request.StartTime,
            EndTime = endTime,
            DurationMinutes = duration,
            Notes = request.Notes?.Trim(),
            Status = AppointmentStatus.Scheduled
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "Appointment", appointment.Id, appointment.ClientName, cancellationToken);
        await ScheduleReminderAsync(appointment, employee, tenantId, cancellationToken);

        return ToDto(await ReloadAppointmentAsync(appointment.Id, cancellationToken));
    }

    public async Task<AppointmentDto?> UpdateAsync(Guid id, UpdateAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, cancellationToken);
        if (appointment is null) return null;

        var employee = await GetActiveEmployeeAsync(request.BookingEmployeeId, cancellationToken);
        var duration = request.DurationMinutes ?? appointment.DurationMinutes;

        ValidateRequest(request.AppointmentDate, request.StartTime, duration, request.ClientName, request.ClientPhone);

        var changed = appointment.BookingEmployeeId != employee.Id
            || appointment.AppointmentDate != request.AppointmentDate
            || appointment.StartTime != request.StartTime
            || appointment.DurationMinutes != duration;

        if (changed)
            await EnsureEmployeeAvailableAsync(employee, request.AppointmentDate, request.StartTime, duration, id, cancellationToken);

        appointment.BranchId = ResolveBranchId(request.BranchId ?? appointment.BranchId);
        appointment.BookingEmployeeId = employee.Id;
        appointment.CustomerId = request.CustomerId;
        appointment.ClientName = request.ClientName.Trim();
        appointment.ClientPhone = PhoneNumberValidator.ValidateAndNormalize(request.ClientPhone, required: true)!;
        appointment.ClientEmail = request.ClientEmail?.Trim();
        appointment.ServiceOfferingId = request.ServiceOfferingId;
        appointment.ServiceType = request.ServiceType?.Trim();
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.StartTime = request.StartTime;
        appointment.DurationMinutes = duration;
        appointment.EndTime = EmployeeSlotGenerator.ComputeEndTime(request.StartTime, duration);
        appointment.Notes = request.Notes?.Trim();
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<AppointmentStatus>(request.Status, true, out var status))
            appointment.Status = status;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(await ReloadAppointmentAsync(appointment.Id, cancellationToken));
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == RequireTenantId(), cancellationToken);
        if (appointment is null) return false;

        var employeeId = appointment.BookingEmployeeId;
        var date = appointment.AppointmentDate;
        var startTime = appointment.StartTime;
        var branchId = appointment.BranchId;

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "Appointment", id, appointment.ClientName, cancellationToken);

        if (employeeId.HasValue)
            await TryAutoPromoteAsync(RequireTenantId(), employeeId.Value, branchId, date, startTime, cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<WaitingListEntryDto>> GetWaitingListAsync(
        DateOnly date, Guid? employeeId = null, TimeOnly? startTime = null, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        branchId = ResolveBranchId(branchId);

        var query = _context.WaitingListEntries
            .AsNoTracking()
            .Include(w => w.ServiceOffering)
            .Include(w => w.BookingEmployee)
            .Where(w => w.TenantId == tenantId
                && w.PreferredDate == date
                && w.Status == WaitingListStatus.Waiting
                && (branchId == null || w.BranchId == branchId));

        if (employeeId.HasValue) query = query.Where(w => w.BookingEmployeeId == employeeId);
        if (startTime.HasValue) query = query.Where(w => w.PreferredStartTime == startTime.Value);

        var entries = await query.OrderBy(w => w.Priority).ThenBy(w => w.CreatedAt).ToListAsync(cancellationToken);
        return entries.Select(ToWaitingDto).ToList();
    }

    public async Task<WaitingListEntryDto> JoinWaitingListAsync(JoinWaitingListRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var employee = await GetActiveEmployeeAsync(request.BookingEmployeeId, cancellationToken);
        var branchId = ResolveBranchId(request.BranchId);
        var duration = request.DurationMinutes ?? employee.DefaultSlotDurationMinutes;

        ValidateRequest(request.PreferredDate, request.PreferredStartTime, duration, request.ClientName, request.ClientPhone);

        var appointments = await GetEmployeeAppointmentsAsync(employee.Id, request.PreferredDate, cancellationToken);
        var slots = BuildAvailableSlots(employee, request.PreferredDate, appointments, duration);
        if (slots.Any(s => s.StartTime == request.PreferredStartTime && s.IsAvailable))
            throw new InvalidOperationException("This time slot is still available. Please book an appointment instead.");

        var phone = PhoneNumberValidator.ValidateAndNormalize(request.ClientPhone, required: true)!;
        var existing = await _context.WaitingListEntries.AnyAsync(w =>
            w.TenantId == tenantId && w.Status == WaitingListStatus.Waiting
            && w.BookingEmployeeId == employee.Id && w.ClientPhone == phone
            && w.PreferredDate == request.PreferredDate && w.PreferredStartTime == request.PreferredStartTime, cancellationToken);

        if (existing)
            throw new InvalidOperationException("This client is already on the waiting list for this employee and time slot.");

        var nextPriority = await _context.WaitingListEntries
            .Where(w => w.TenantId == tenantId && w.BookingEmployeeId == employee.Id
                && w.PreferredDate == request.PreferredDate && w.PreferredStartTime == request.PreferredStartTime
                && w.Status == WaitingListStatus.Waiting)
            .MaxAsync(w => (int?)w.Priority, cancellationToken) ?? 0;

        var entry = new WaitingListEntry
        {
            TenantId = tenantId,
            BranchId = branchId,
            BookingEmployeeId = employee.Id,
            CustomerId = request.CustomerId,
            ClientName = request.ClientName.Trim(),
            ClientPhone = phone,
            ClientEmail = request.ClientEmail?.Trim(),
            ServiceOfferingId = request.ServiceOfferingId,
            ServiceType = request.ServiceType?.Trim(),
            PreferredDate = request.PreferredDate,
            PreferredStartTime = request.PreferredStartTime,
            DurationMinutes = duration,
            Notes = request.Notes?.Trim(),
            Priority = nextPriority + 1,
            Status = WaitingListStatus.Waiting
        };

        _context.WaitingListEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
        return ToWaitingDto(entry);
    }

    public async Task<bool> CancelWaitingListEntryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entry = await _context.WaitingListEntries
            .FirstOrDefaultAsync(w => w.Id == id && w.TenantId == RequireTenantId(), cancellationToken);
        if (entry is null || entry.Status != WaitingListStatus.Waiting) return false;

        entry.Status = WaitingListStatus.Cancelled;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<AppointmentDto?> PromoteWaitingListEntryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entry = await _context.WaitingListEntries
            .FirstOrDefaultAsync(w => w.Id == id && w.TenantId == RequireTenantId() && w.Status == WaitingListStatus.Waiting, cancellationToken);
        if (entry is null || entry.BookingEmployeeId is null) return null;

        var employee = await GetActiveEmployeeAsync(entry.BookingEmployeeId.Value, cancellationToken);
        await EnsureEmployeeAvailableAsync(employee, entry.PreferredDate, entry.PreferredStartTime, entry.DurationMinutes, null, cancellationToken);

        var appointment = new Appointment
        {
            TenantId = entry.TenantId,
            BranchId = entry.BranchId,
            BookingEmployeeId = employee.Id,
            CustomerId = entry.CustomerId,
            ClientName = entry.ClientName,
            ClientPhone = entry.ClientPhone,
            ClientEmail = entry.ClientEmail,
            ServiceOfferingId = entry.ServiceOfferingId,
            ServiceType = entry.ServiceType,
            AppointmentDate = entry.PreferredDate,
            StartTime = entry.PreferredStartTime,
            EndTime = EmployeeSlotGenerator.ComputeEndTime(entry.PreferredStartTime, entry.DurationMinutes),
            DurationMinutes = entry.DurationMinutes,
            Notes = entry.Notes,
            Status = AppointmentStatus.Scheduled
        };

        _context.Appointments.Add(appointment);
        entry.Status = WaitingListStatus.Promoted;
        entry.PromotedAppointmentId = appointment.Id;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await ScheduleReminderAsync(appointment, employee, entry.TenantId, cancellationToken);
        return ToDto(await ReloadAppointmentAsync(appointment.Id, cancellationToken));
    }

    public async Task<IReadOnlyList<NotificationLogDto>> GetNotificationsAsync(
        Guid? appointmentId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.NotificationLogs.AsNoTracking()
            .Where(n => n.TenantId == RequireTenantId());
        if (appointmentId.HasValue) query = query.Where(n => n.AppointmentId == appointmentId.Value);

        var logs = await query.OrderByDescending(n => n.ScheduledFor).Take(100).ToListAsync(cancellationToken);
        return logs.Select(ToNotificationDto).ToList();
    }

    private List<AvailableSlotDto> BuildAvailableSlots(
        BookingEmployee employee, DateOnly date, IReadOnlyList<Appointment> appointments, int duration)
    {
        var dayOfWeek = date.DayOfWeek;
        var schedule = employee.Schedules.FirstOrDefault(s => s.DayOfWeek == dayOfWeek);
        var slotStarts = EmployeeSlotGenerator.GenerateSlotStarts(schedule, duration, SlotIntervalMinutes);

        return slotStarts.Select(start =>
        {
            var end = EmployeeSlotGenerator.ComputeEndTime(start, duration);
            var isBooked = appointments.Any(a => EmployeeSlotGenerator.OverlapsAppointment(start, duration, a));
            return new AvailableSlotDto(start, end, !isBooked);
        }).ToList();
    }

    private async Task EnsureEmployeeAvailableAsync(
        BookingEmployee employee, DateOnly date, TimeOnly startTime, int duration, Guid? excludeId, CancellationToken ct)
    {
        if (!employee.IsActive)
            throw new InvalidOperationException("Selected employee is not active.");

        var daySchedule = employee.Schedules.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
        if (daySchedule is null || !daySchedule.IsWorkingDay)
            throw new InvalidOperationException("Employee is not scheduled to work on this day.");

        var endTime = EmployeeSlotGenerator.ComputeEndTime(startTime, duration);
        if (startTime < daySchedule.StartTime || endTime > daySchedule.EndTime)
            throw new InvalidOperationException("Appointment time is outside employee working hours.");

        if (EmployeeSlotGenerator.OverlapsAnyBreak(startTime, endTime, daySchedule.Breaks))
            throw new InvalidOperationException("Appointment overlaps with an employee break time.");

        var appointments = await GetEmployeeAppointmentsAsync(employee.Id, date, ct, excludeId);
        if (appointments.Any(a => EmployeeSlotGenerator.OverlapsAppointment(startTime, duration, a)))
            throw new InvalidOperationException("This employee already has an appointment at the selected time.");
    }

    private async Task TryAutoPromoteAsync(
        Guid tenantId, Guid employeeId, Guid? branchId, DateOnly date, TimeOnly startTime, CancellationToken ct)
    {
        var settings = await _context.TenantSettings.FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);
        if (settings is { AutoPromoteWaitingList: false }) return;

        var entry = await _context.WaitingListEntries
            .Where(w => w.TenantId == tenantId && w.BookingEmployeeId == employeeId
                && w.PreferredDate == date && w.PreferredStartTime == startTime
                && w.Status == WaitingListStatus.Waiting)
            .OrderBy(w => w.Priority).ThenBy(w => w.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (entry is null) return;
        try { await PromoteWaitingListEntryAsync(entry.Id, ct); }
        catch (InvalidOperationException) { }
    }

    private async Task<BookingEmployee> GetActiveEmployeeAsync(Guid id, CancellationToken ct)
    {
        var employee = await _context.BookingEmployees
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == RequireTenantId(), ct)
            ?? throw new InvalidOperationException("Employee not found.");

        if (!employee.IsActive)
            throw new InvalidOperationException("Selected employee is not active.");

        return employee;
    }

    private async Task<List<Appointment>> GetEmployeeAppointmentsAsync(
        Guid employeeId, DateOnly date, CancellationToken ct, Guid? excludeId = null)
    {
        var query = _context.Appointments.Where(a =>
            a.BookingEmployeeId == employeeId
            && a.AppointmentDate == date
            && a.Status != AppointmentStatus.Cancelled);

        if (excludeId.HasValue) query = query.Where(a => a.Id != excludeId.Value);
        return await query.ToListAsync(ct);
    }

    private async Task ScheduleReminderAsync(Appointment appointment, BookingEmployee employee, Guid tenantId, CancellationToken ct)
    {
        var settings = await _context.TenantSettings.FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);
        var hoursBefore = settings?.AppointmentReminderHoursBefore ?? 24;
        var appointmentStart = AppointmentValidation.ToUtcDateTime(appointment.AppointmentDate, appointment.StartTime);
        var scheduledFor = appointmentStart.AddHours(-hoursBefore);
        if (scheduledFor <= DateTime.UtcNow) scheduledFor = DateTime.UtcNow;

        var subject = "Appointment Reminder";
        var body = $"Reminder: You have an appointment with {employee.Name} on {appointment.AppointmentDate:yyyy-MM-dd} " +
                   $"at {appointment.StartTime:HH:mm}. Client: {appointment.ClientName}, Phone: {appointment.ClientPhone}." +
                   (appointment.Notes is not null ? $" Notes: {appointment.Notes}" : "");

        if (await _context.NotificationLogs.AnyAsync(n =>
            n.AppointmentId == appointment.Id && n.Subject == subject && n.Status != NotificationStatus.Failed, ct))
            return;

        _context.NotificationLogs.Add(new NotificationLog
        {
            TenantId = tenantId,
            AppointmentId = appointment.Id,
            Channel = NotificationChannel.InApp,
            Status = NotificationStatus.Pending,
            ScheduledFor = scheduledFor,
            Subject = subject,
            Body = body
        });
        await _context.SaveChangesAsync(ct);
    }

    private IQueryable<Appointment> QueryAppointments() =>
        _context.Appointments.AsNoTracking()
            .Include(a => a.Branch)
            .Include(a => a.ServiceOffering)
            .Include(a => a.BookingEmployee);

    private async Task<Appointment> ReloadAppointmentAsync(Guid id, CancellationToken ct) =>
        await QueryAppointments().FirstAsync(a => a.Id == id, ct);

    private static void ValidateRequest(DateOnly date, TimeOnly time, int duration, string clientName, string? clientPhone)
    {
        AppointmentValidation.ValidateDate(date);
        AppointmentValidation.ValidateDuration(duration);
        AppointmentValidation.ValidateClient(clientName, clientPhone);
    }

    private Guid? ResolveBranchId(Guid? branchId) => branchId ?? _currentUser.BranchId;
    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static AppointmentDto ToDto(Appointment a) =>
        new(a.Id, a.BranchId, a.Branch?.Name, a.CustomerId, a.ClientName, a.ClientPhone, a.ClientEmail,
            a.ServiceOfferingId, a.ServiceOffering?.Name, a.ServiceType, a.AppointmentDate, a.StartTime, a.EndTime,
            a.DurationMinutes, a.Notes, a.Status.ToString(), a.BookingEmployeeId, a.BookingEmployee?.Name, a.CreatedAt);

    private static WaitingListEntryDto ToWaitingDto(WaitingListEntry w) =>
        new(w.Id, w.BranchId, w.BookingEmployeeId, w.BookingEmployee?.Name, w.ClientName, w.ClientPhone,
            w.ClientEmail, w.ServiceOfferingId, w.ServiceOffering?.Name, w.ServiceType, w.PreferredDate,
            w.PreferredStartTime, w.DurationMinutes, w.Notes, w.Status.ToString(), w.Priority, w.CreatedAt);

    private static NotificationLogDto ToNotificationDto(NotificationLog n) =>
        new(n.Id, n.AppointmentId, n.Channel.ToString(), n.Status.ToString(),
            n.ScheduledFor, n.SentAt, n.Subject, n.Body, n.ErrorMessage);
}
