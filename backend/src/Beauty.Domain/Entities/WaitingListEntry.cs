using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class WaitingListEntry : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? CustomerId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientPhone { get; set; } = string.Empty;
    public string? ClientEmail { get; set; }
    public Guid? ServiceOfferingId { get; set; }
    public string? ServiceType { get; set; }
    public DateOnly PreferredDate { get; set; }
    public TimeOnly PreferredStartTime { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public string? Notes { get; set; }
    public WaitingListStatus Status { get; set; } = WaitingListStatus.Waiting;
    public int Priority { get; set; }
    public Guid? PromotedAppointmentId { get; set; }
    public Guid? BookingEmployeeId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Branch? Branch { get; set; }
    public Customer? Customer { get; set; }
    public ServiceOffering? ServiceOffering { get; set; }
    public Appointment? PromotedAppointment { get; set; }
    public BookingEmployee? BookingEmployee { get; set; }
}
