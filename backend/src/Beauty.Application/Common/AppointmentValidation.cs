using Beauty.Application.Common;

namespace Beauty.Application.Common;

public static class AppointmentValidation
{
    public const int MinDurationMinutes = 15;
    public const int MaxDurationMinutes = 480;
    public const int DefaultSlotIntervalMinutes = 30;
    public static readonly TimeOnly BusinessDayStart = new(8, 0);
    public static readonly TimeOnly BusinessDayEnd = new(20, 0);

    public static void ValidateDate(DateOnly date)
    {
        if (date < DateOnly.FromDateTime(DateTime.UtcNow.Date))
            throw new InvalidOperationException("Appointment date cannot be in the past.");
    }

    public static void ValidateTime(TimeOnly time)
    {
        if (time < BusinessDayStart || time >= BusinessDayEnd)
            throw new InvalidOperationException($"Appointment time must be between {BusinessDayStart:HH:mm} and {BusinessDayEnd:HH:mm}.");
    }

    public static void ValidateDuration(int durationMinutes)
    {
        if (durationMinutes < MinDurationMinutes || durationMinutes > MaxDurationMinutes)
            throw new InvalidOperationException($"Duration must be between {MinDurationMinutes} and {MaxDurationMinutes} minutes.");
    }

    public static void ValidateClient(string clientName, string? clientPhone)
    {
        if (string.IsNullOrWhiteSpace(clientName))
            throw new InvalidOperationException("Client name is required.");

        PhoneNumberValidator.ValidateAndNormalize(clientPhone, required: true);
    }

    public static DateTime ToUtcDateTime(DateOnly date, TimeOnly time) =>
        DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Utc);
}
