using Beauty.Application.Common;
using Beauty.Application.DTOs.BookingEmployees;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public interface IBookingEmployeeService
{
    Task<IReadOnlyList<BookingEmployeeDto>> GetAllAsync(bool activeOnly = false, Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<BookingEmployeeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BookingEmployeeDto> CreateAsync(CreateBookingEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<BookingEmployeeDto?> UpdateAsync(Guid id, UpdateBookingEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BookingEmployeeDto?> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeScheduleDto>> GetScheduleAsync(Guid id, CancellationToken cancellationToken = default);
}

public class BookingEmployeeService : IBookingEmployeeService
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public BookingEmployeeService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<BookingEmployeeDto>> GetAllAsync(
        bool activeOnly = false, Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        branchId ??= _currentUser.BranchId;

        var query = _context.BookingEmployees
            .AsNoTracking()
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .Where(e => e.TenantId == tenantId);

        if (activeOnly) query = query.Where(e => e.IsActive);
        if (branchId.HasValue) query = query.Where(e => e.BranchId == null || e.BranchId == branchId);

        var employees = await query.OrderBy(e => e.Name).ToListAsync(cancellationToken);
        return employees.Select(ToDto).ToList();
    }

    public async Task<BookingEmployeeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var employee = await QueryWithSchedules()
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == RequireTenantId(), cancellationToken);
        return employee is null ? null : ToDto(employee);
    }

    public async Task<BookingEmployeeDto> CreateAsync(CreateBookingEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var phone = PhoneNumberValidator.ValidateAndNormalize(request.PhoneNumber, required: true)!;
        ValidateName(request.Name);

        var employee = new BookingEmployee
        {
            TenantId = tenantId,
            BranchId = request.BranchId ?? _currentUser.BranchId,
            Name = request.Name.Trim(),
            Phone = phone,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            DefaultSlotDurationMinutes = request.DefaultSlotDurationMinutes is > 0 and <= 480
                ? request.DefaultSlotDurationMinutes.Value : 30
        };

        ApplySchedules(employee, request.Schedules);
        EnsureDefaultSchedules(employee);

        _context.BookingEmployees.Add(employee);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", "BookingEmployee", employee.Id, employee.Name, cancellationToken);

        return ToDto(await ReloadAsync(employee.Id, cancellationToken));
    }

    public async Task<BookingEmployeeDto?> UpdateAsync(Guid id, UpdateBookingEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var employee = await _context.BookingEmployees
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == RequireTenantId(), cancellationToken);
        if (employee is null) return null;

        ValidateName(request.Name);
        var phone = PhoneNumberValidator.ValidateAndNormalize(request.PhoneNumber, required: true)!;

        employee.Name = request.Name.Trim();
        employee.Phone = phone;
        employee.IsActive = request.IsActive;
        employee.Notes = request.Notes?.Trim();
        employee.BranchId = request.BranchId ?? employee.BranchId;
        if (request.DefaultSlotDurationMinutes is > 0 and <= 480)
            employee.DefaultSlotDurationMinutes = request.DefaultSlotDurationMinutes.Value;
        employee.UpdatedAt = DateTime.UtcNow;

        if (request.Schedules is not null)
        {
            _context.EmployeeScheduleBreaks.RemoveRange(employee.Schedules.SelectMany(s => s.Breaks));
            _context.EmployeeSchedules.RemoveRange(employee.Schedules);
            employee.Schedules.Clear();
            ApplySchedules(employee, request.Schedules);
            EnsureDefaultSchedules(employee);
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", "BookingEmployee", employee.Id, employee.Name, cancellationToken);
        return ToDto(await ReloadAsync(employee.Id, cancellationToken));
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var employee = await _context.BookingEmployees
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == RequireTenantId(), cancellationToken);
        if (employee is null) return false;

        var hasFutureAppointments = await _context.Appointments.AnyAsync(a =>
            a.BookingEmployeeId == id
            && a.Status != Domain.Enums.AppointmentStatus.Cancelled
            && a.AppointmentDate >= DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);

        if (hasFutureAppointments)
            throw new InvalidOperationException("Cannot delete an employee with upcoming appointments.");

        _context.EmployeeScheduleBreaks.RemoveRange(employee.Schedules.SelectMany(s => s.Breaks));
        _context.EmployeeSchedules.RemoveRange(employee.Schedules);
        _context.BookingEmployees.Remove(employee);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", "BookingEmployee", id, employee.Name, cancellationToken);
        return true;
    }

    public async Task<BookingEmployeeDto?> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var employee = await _context.BookingEmployees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == RequireTenantId(), cancellationToken);
        if (employee is null) return null;

        employee.IsActive = isActive;
        employee.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeScheduleDto>> GetScheduleAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var employee = await GetByIdAsync(id, cancellationToken);
        return employee?.Schedules ?? [];
    }

    private void ApplySchedules(BookingEmployee employee, IReadOnlyList<EmployeeScheduleInput>? schedules)
    {
        if (schedules is null || schedules.Count == 0) return;

        foreach (var input in schedules)
        {
            if (!Enum.TryParse<DayOfWeek>(input.DayOfWeek, true, out var day))
                throw new InvalidOperationException($"Invalid day of week: {input.DayOfWeek}");

            var schedule = new EmployeeSchedule
            {
                DayOfWeek = day,
                StartTime = ParseTime(input.StartTime),
                EndTime = ParseTime(input.EndTime),
                IsWorkingDay = input.IsWorkingDay
            };

            if (input.Breaks is not null)
            {
                foreach (var b in input.Breaks)
                {
                    schedule.Breaks.Add(new EmployeeScheduleBreak
                    {
                        StartTime = ParseTime(b.StartTime),
                        EndTime = ParseTime(b.EndTime)
                    });
                }
            }

            employee.Schedules.Add(schedule);
        }
    }

    private static void EnsureDefaultSchedules(BookingEmployee employee)
    {
        if (employee.Schedules.Count > 0) return;

        foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
        {
            var isWeekday = day is >= DayOfWeek.Monday and <= DayOfWeek.Friday;
            employee.Schedules.Add(new EmployeeSchedule
            {
                DayOfWeek = day,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(17, 0),
                IsWorkingDay = isWeekday
            });
        }
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Employee name is required.");
    }

    private static TimeOnly ParseTime(string value)
    {
        if (TimeOnly.TryParse(value, out var time)) return time;
        throw new InvalidOperationException($"Invalid time format: {value}");
    }

    private IQueryable<BookingEmployee> QueryWithSchedules() =>
        _context.BookingEmployees.AsNoTracking()
            .Include(e => e.Schedules).ThenInclude(s => s.Breaks);

    private async Task<BookingEmployee> ReloadAsync(Guid id, CancellationToken ct) =>
        await _context.BookingEmployees.Include(e => e.Schedules).ThenInclude(s => s.Breaks)
            .FirstAsync(e => e.Id == id, ct);

    private Guid RequireTenantId() => _currentUser.TenantId ?? throw new UnauthorizedAccessException();

    private static BookingEmployeeDto ToDto(BookingEmployee e) =>
        new(e.Id, e.BranchId, e.Name, e.Phone, e.IsActive, e.Notes, e.DefaultSlotDurationMinutes,
            e.Schedules.OrderBy(s => s.DayOfWeek).Select(ToScheduleDto).ToList(), e.CreatedAt);

    private static EmployeeScheduleDto ToScheduleDto(EmployeeSchedule s) =>
        new(s.Id, s.DayOfWeek.ToString(), s.StartTime.ToString("HH:mm"),
            s.EndTime.ToString("HH:mm"), s.IsWorkingDay,
            s.Breaks.Select(b => new EmployeeScheduleBreakDto(b.Id, b.StartTime.ToString("HH:mm"), b.EndTime.ToString("HH:mm"))).ToList());
}
