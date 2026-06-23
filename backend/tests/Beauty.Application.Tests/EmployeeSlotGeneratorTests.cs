using Beauty.Application.Common;
using Beauty.Domain.Entities;

namespace Beauty.Application.Tests;

public class EmployeeSlotGeneratorTests
{
    [Fact]
    public void GenerateSlotStarts_ProducesThirtyMinuteIntervals()
    {
        var schedule = new EmployeeSchedule
        {
            DayOfWeek = DayOfWeek.Monday,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(10, 0),
            IsWorkingDay = true
        };

        var slots = EmployeeSlotGenerator.GenerateSlotStarts(schedule, 30, 30);

        Assert.Equal(2, slots.Count);
        Assert.Equal(new TimeOnly(9, 0), slots[0]);
        Assert.Equal(new TimeOnly(9, 30), slots[1]);
    }

    [Fact]
    public void GenerateSlotStarts_SkipsBreakTimes()
    {
        var schedule = new EmployeeSchedule
        {
            DayOfWeek = DayOfWeek.Monday,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(11, 0),
            IsWorkingDay = true,
            Breaks =
            [
                new EmployeeScheduleBreak { StartTime = new TimeOnly(9, 30), EndTime = new TimeOnly(10, 0) }
            ]
        };

        var slots = EmployeeSlotGenerator.GenerateSlotStarts(schedule, 30, 30);

        Assert.DoesNotContain(new TimeOnly(9, 30), slots);
        Assert.Contains(new TimeOnly(10, 0), slots);
    }

    [Fact]
    public void OverlapsAppointment_DetectsPartialOverlap()
    {
        var appointment = new Appointment
        {
            StartTime = new TimeOnly(9, 0),
            DurationMinutes = 60,
            EndTime = new TimeOnly(10, 0)
        };

        Assert.True(EmployeeSlotGenerator.OverlapsAppointment(new TimeOnly(9, 30), 30, appointment));
        Assert.False(EmployeeSlotGenerator.OverlapsAppointment(new TimeOnly(10, 0), 30, appointment));
    }
}
