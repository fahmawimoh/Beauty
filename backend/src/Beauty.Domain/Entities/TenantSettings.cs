using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class TenantSettings : BaseEntity
{
    public Guid TenantId { get; set; }
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public int MaxAppointmentsPerSlot { get; set; } = 1;
    public bool AutoPromoteWaitingList { get; set; } = true;
    public int AppointmentReminderHoursBefore { get; set; } = 24;

    public Tenant Tenant { get; set; } = null!;
}
