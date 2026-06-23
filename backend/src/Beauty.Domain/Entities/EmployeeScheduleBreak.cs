using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class EmployeeScheduleBreak : BaseEntity
{
    public Guid EmployeeScheduleId { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public EmployeeSchedule EmployeeSchedule { get; set; } = null!;
}
