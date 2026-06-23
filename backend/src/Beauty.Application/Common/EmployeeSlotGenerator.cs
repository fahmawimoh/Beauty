using Beauty.Domain.Entities;

namespace Beauty.Application.Common;

public static class EmployeeSlotGenerator
{
    public static IReadOnlyList<TimeOnly> GenerateSlotStarts(
        EmployeeSchedule? schedule,
        int slotDurationMinutes,
        int intervalMinutes)
    {
        if (schedule is null || !schedule.IsWorkingDay || schedule.EndTime <= schedule.StartTime)
            return [];

        var slots = new List<TimeOnly>();
        var cursor = schedule.StartTime;

        while (cursor.AddMinutes(slotDurationMinutes) <= schedule.EndTime)
        {
            var slotEnd = cursor.AddMinutes(slotDurationMinutes);
            if (!OverlapsAnyBreak(cursor, slotEnd, schedule.Breaks))
                slots.Add(cursor);

            cursor = cursor.AddMinutes(intervalMinutes);
        }

        return slots;
    }

    public static bool OverlapsAnyBreak(TimeOnly slotStart, TimeOnly slotEnd, IEnumerable<EmployeeScheduleBreak> breaks) =>
        breaks.Any(b => slotStart < b.EndTime && b.StartTime < slotEnd);

    public static bool OverlapsAppointment(TimeOnly slotStart, int slotDurationMinutes, Appointment appointment)
    {
        var slotEnd = slotStart.AddMinutes(slotDurationMinutes);
        var apptEnd = appointment.EndTime ?? appointment.StartTime.AddMinutes(appointment.DurationMinutes);
        return slotStart < apptEnd && appointment.StartTime < slotEnd;
    }

    public static TimeOnly ComputeEndTime(TimeOnly startTime, int durationMinutes) =>
        startTime.AddMinutes(durationMinutes);
}
