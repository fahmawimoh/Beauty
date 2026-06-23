namespace Beauty.Application.DTOs.BookingEmployees;

public record BookingEmployeeDto(
    Guid Id,
    Guid? BranchId,
    string Name,
    string PhoneNumber,
    bool IsActive,
    string? Notes,
    int DefaultSlotDurationMinutes,
    IReadOnlyList<EmployeeScheduleDto> Schedules,
    DateTime CreatedAt
);

public record EmployeeScheduleDto(
    Guid Id,
    string DayOfWeek,
    string StartTime,
    string EndTime,
    bool IsWorkingDay,
    IReadOnlyList<EmployeeScheduleBreakDto> Breaks
);

public record EmployeeScheduleBreakDto(
    Guid Id,
    string StartTime,
    string EndTime
);

public record CreateBookingEmployeeRequest(
    string Name,
    string? PhoneNumber,
    Guid? BranchId = null,
    string? Notes = null,
    int? DefaultSlotDurationMinutes = null,
    IReadOnlyList<EmployeeScheduleInput>? Schedules = null
);

public record UpdateBookingEmployeeRequest(
    string Name,
    string? PhoneNumber,
    Guid? BranchId = null,
    bool IsActive = true,
    string? Notes = null,
    int? DefaultSlotDurationMinutes = null,
    IReadOnlyList<EmployeeScheduleInput>? Schedules = null
);

public record EmployeeScheduleInput(
    string DayOfWeek,
    string StartTime,
    string EndTime,
    bool IsWorkingDay,
    IReadOnlyList<EmployeeScheduleBreakInput>? Breaks = null
);

public record EmployeeScheduleBreakInput(
    string StartTime,
    string EndTime
);
