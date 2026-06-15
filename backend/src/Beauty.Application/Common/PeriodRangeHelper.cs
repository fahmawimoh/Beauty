namespace Beauty.Application.Common;

public static class PeriodRangeHelper
{
  public static readonly IReadOnlySet<string> SalesPeriods = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
  {
    "daily", "weekly", "monthly"
  };

  public static string NormalizeSalesPeriod(string period)
    => SalesPeriods.Contains(period) ? period.ToLowerInvariant() : "daily";

  public static (DateTime start, DateTime end) GetRange(string period)
  {
    var today = DateTime.UtcNow.Date;
    return period.ToLowerInvariant() switch
    {
      "daily" => (today, today.AddDays(1).AddTicks(-1)),
      "weekly" => (today.AddDays(-(int)today.DayOfWeek), today.AddDays(1).AddTicks(-1)),
      "monthly" => (new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc), today.AddDays(1).AddTicks(-1)),
      "yearly" => (new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), today.AddDays(1).AddTicks(-1)),
      _ => (today, today.AddDays(1).AddTicks(-1))
    };
  }
}
