namespace Beauty.Application.Common;

public static class PeriodRangeHelper
{
  public static readonly IReadOnlySet<string> SalesPeriods = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
  {
    "daily", "weekly", "monthly", "yearly", "custom"
  };

  public static string NormalizeSalesPeriod(string period)
    => SalesPeriods.Contains(period) ? period.ToLowerInvariant() : "daily";

  public static (DateTime start, DateTime end) GetRange(string period, DateTime? from = null, DateTime? to = null)
  {
    var normalized = NormalizeSalesPeriod(period);
    if (normalized == "custom" || (from.HasValue && to.HasValue))
    {
      var start = (from ?? DateTime.UtcNow.Date).Date;
      if (start.Kind == DateTimeKind.Unspecified)
        start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
      var endDate = (to ?? DateTime.UtcNow.Date).Date;
      if (endDate.Kind == DateTimeKind.Unspecified)
        endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
      var end = endDate.AddDays(1).AddTicks(-1);
      if (end < start) (start, end) = (endDate, start.AddDays(1).AddTicks(-1));
      return (start, end);
    }

    var today = DateTime.UtcNow.Date;
    return normalized switch
    {
      "daily" => (today, today.AddDays(1).AddTicks(-1)),
      "weekly" => (today.AddDays(-(int)today.DayOfWeek), today.AddDays(1).AddTicks(-1)),
      "monthly" => (new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc), today.AddDays(1).AddTicks(-1)),
      "yearly" => (new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), today.AddDays(1).AddTicks(-1)),
      _ => (today, today.AddDays(1).AddTicks(-1))
    };
  }
}
