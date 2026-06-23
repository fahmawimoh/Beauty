using Beauty.Application.DTOs.Appointments;

namespace Beauty.Application.Services;

public interface IAppointmentService
{
    Task<DailyScheduleByEmployeeDto> GetDailyScheduleAsync(DateOnly date, Guid? employeeId = null, Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<AvailabilityCheckDto> CheckAvailabilityAsync(Guid employeeId, DateOnly date, int? durationMinutes = null, CancellationToken cancellationToken = default);
    Task<AppointmentDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppointmentDto>> GetAllAsync(DateOnly? date = null, Guid? employeeId = null, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentDto?> UpdateAsync(Guid id, UpdateAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WaitingListEntryDto>> GetWaitingListAsync(DateOnly date, Guid? employeeId = null, TimeOnly? startTime = null, Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<WaitingListEntryDto> JoinWaitingListAsync(JoinWaitingListRequest request, CancellationToken cancellationToken = default);
    Task<bool> CancelWaitingListEntryAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AppointmentDto?> PromoteWaitingListEntryAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationLogDto>> GetNotificationsAsync(Guid? appointmentId = null, CancellationToken cancellationToken = default);
}
