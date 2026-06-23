using Beauty.Application.Common;

namespace Beauty.Application.Tests;

public class AppointmentValidationTests
{
    [Fact]
    public void ValidateDate_RejectsPastDates()
    {
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateDate(yesterday));
    }

    [Fact]
    public void ValidateTime_RejectsOutsideBusinessHours()
    {
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateTime(new TimeOnly(7, 0)));
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateTime(new TimeOnly(20, 0)));
    }

    [Fact]
    public void ValidateDuration_RejectsInvalidValues()
    {
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateDuration(5));
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateDuration(500));
    }

    [Fact]
    public void ValidateClient_RequiresNameAndPhone()
    {
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateClient("", "0791234567"));
        Assert.Throws<InvalidOperationException>(() => AppointmentValidation.ValidateClient("John", null));
    }
}
