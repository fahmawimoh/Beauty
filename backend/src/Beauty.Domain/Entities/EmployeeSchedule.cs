using Beauty.Domain.Common;

namespace Beauty.Domain.Entities;

public class EmployeeSchedule : BaseEntity
{
    public Guid BookingEmployeeId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsWorkingDay { get; set; } = true;

    public BookingEmployee BookingEmployee { get; set; } = null!;
    public ICollection<EmployeeScheduleBreak> Breaks { get; set; } = [];
}
