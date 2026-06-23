using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class BookingEmployee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public int DefaultSlotDurationMinutes { get; set; } = 30;

    public Tenant Tenant { get; set; } = null!;
    public Branch? Branch { get; set; }
    public ICollection<EmployeeSchedule> Schedules { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
