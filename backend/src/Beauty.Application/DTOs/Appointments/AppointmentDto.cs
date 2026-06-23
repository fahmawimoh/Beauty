namespace Beauty.Application.DTOs.Appointments;

public record AppointmentDto(
    Guid Id,
    Guid? BranchId,
    string? BranchName,
    Guid? CustomerId,
    string ClientName,
    string ClientPhone,
    string? ClientEmail,
    Guid? ServiceOfferingId,
    string? ServiceName,
    string? ServiceType,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    int DurationMinutes,
    string? Notes,
    string Status,
    Guid? BookingEmployeeId,
    string? EmployeeName,
    DateTime CreatedAt
);

public record CreateAppointmentRequest(
    Guid BookingEmployeeId,
    Guid? BranchId,
    Guid? CustomerId,
    string ClientName,
    string? ClientPhone,
    string? ClientEmail,
    Guid? ServiceOfferingId,
    string? ServiceType,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    int? DurationMinutes,
    string? Notes
);

public record UpdateAppointmentRequest(
    Guid BookingEmployeeId,
    Guid? BranchId,
    Guid? CustomerId,
    string ClientName,
    string? ClientPhone,
    string? ClientEmail,
    Guid? ServiceOfferingId,
    string? ServiceType,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    int? DurationMinutes,
    string? Notes,
    string? Status
);

public record EmployeeDayScheduleDto(
    Guid EmployeeId,
    string EmployeeName,
    bool IsActive,
    IReadOnlyList<AppointmentDto> Appointments,
    IReadOnlyList<AvailableSlotDto> AvailableSlots
);

public record DailyScheduleByEmployeeDto(
    DateOnly Date,
    Guid? BranchId,
    IReadOnlyList<EmployeeDayScheduleDto> Employees
);

public record AvailableSlotDto(
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool IsAvailable
);

public record AvailabilityCheckDto(
    Guid EmployeeId,
    string EmployeeName,
    DateOnly Date,
    int SlotDurationMinutes,
    IReadOnlyList<AvailableSlotDto> Slots
);

public record WaitingListEntryDto(
    Guid Id,
    Guid? BranchId,
    Guid? BookingEmployeeId,
    string? EmployeeName,
    string ClientName,
    string ClientPhone,
    string? ClientEmail,
    Guid? ServiceOfferingId,
    string? ServiceName,
    string? ServiceType,
    DateOnly PreferredDate,
    TimeOnly PreferredStartTime,
    int DurationMinutes,
    string? Notes,
    string Status,
    int Priority,
    DateTime CreatedAt
);

public record JoinWaitingListRequest(
    Guid BookingEmployeeId,
    Guid? BranchId,
    Guid? CustomerId,
    string ClientName,
    string? ClientPhone,
    string? ClientEmail,
    Guid? ServiceOfferingId,
    string? ServiceType,
    DateOnly PreferredDate,
    TimeOnly PreferredStartTime,
    int? DurationMinutes,
    string? Notes
);

public record NotificationLogDto(
    Guid Id,
    Guid AppointmentId,
    string Channel,
    string Status,
    DateTime ScheduledFor,
    DateTime? SentAt,
    string Subject,
    string Body,
    string? ErrorMessage
);
