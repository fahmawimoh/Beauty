using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class NotificationLog : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid AppointmentId { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.InApp;
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public DateTime ScheduledFor { get; set; }
    public DateTime? SentAt { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Appointment Appointment { get; set; } = null!;
}
