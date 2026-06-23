using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? CustomerId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientPhone { get; set; } = string.Empty;
    public string? ClientEmail { get; set; }
    public Guid? ServiceOfferingId { get; set; }
    public string? ServiceType { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public string? Notes { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public Guid? AssignedUserId { get; set; }
    public Guid? BookingEmployeeId { get; set; }
    public TimeOnly? EndTime { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Branch? Branch { get; set; }
    public Customer? Customer { get; set; }
    public ServiceOffering? ServiceOffering { get; set; }
    public User? AssignedUser { get; set; }
    public BookingEmployee? BookingEmployee { get; set; }
    public ICollection<NotificationLog> Notifications { get; set; } = [];
}
