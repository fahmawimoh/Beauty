using Beauty.Application.Common;
using Beauty.Application.DTOs.Reports;

namespace Beauty.Application.Tests;

public class SalesSummaryCalculatorTests
{
    [Fact]
    public void Calculate_EmptyInvoices_ReturnsZeros()
    {
        var result = SalesSummaryCalculator.Calculate(Array.Empty<InvoiceTotals>());

        Assert.Equal(0m, result.TotalSales);
        Assert.Equal(0m, result.TotalDiscounts);
        Assert.Equal(0m, result.NetRevenue);
        Assert.Equal(0, result.InvoiceCount);
    }

    [Fact]
    public void Calculate_SingleInvoice_SumsCorrectly()
    {
        var invoices = new[] { new InvoiceTotals(200m, 20m, 180m) };

        var result = SalesSummaryCalculator.Calculate(invoices);

        Assert.Equal(200m, result.TotalSales);
        Assert.Equal(20m, result.TotalDiscounts);
        Assert.Equal(180m, result.NetRevenue);
        Assert.Equal(1, result.InvoiceCount);
    }

    [Fact]
    public void Calculate_MultipleInvoices_AggregatesTotals()
    {
        var invoices = new[]
        {
            new InvoiceTotals(100m, 10m, 90m),
            new InvoiceTotals(250m, 50m, 200m),
            new InvoiceTotals(75m, 0m, 75m),
        };

        var result = SalesSummaryCalculator.Calculate(invoices);

        Assert.Equal(425m, result.TotalSales);
        Assert.Equal(60m, result.TotalDiscounts);
        Assert.Equal(365m, result.NetRevenue);
        Assert.Equal(3, result.InvoiceCount);
    }

    [Fact]
    public void Calculate_DiscountAccuracy_MatchesInvoiceTotals()
    {
        const decimal subtotal = 200m;
        const decimal discount = 30m;
        const decimal total = 170m;

        var result = SalesSummaryCalculator.Calculate([new InvoiceTotals(subtotal, discount, total)]);

        Assert.Equal(subtotal, result.TotalSales);
        Assert.Equal(discount, result.TotalDiscounts);
        Assert.Equal(total, result.NetRevenue);
        Assert.Equal(subtotal - discount, result.NetRevenue);
    }
}

public class PeriodRangeHelperTests
{
    [Theory]
    [InlineData("daily")]
    [InlineData("weekly")]
    [InlineData("monthly")]
    [InlineData("yearly")]
    [InlineData("custom")]
    public void NormalizeSalesPeriod_ValidPeriod_ReturnsLowercase(string period)
    {
        Assert.Equal(period, PeriodRangeHelper.NormalizeSalesPeriod(period));
        Assert.Equal(period, PeriodRangeHelper.NormalizeSalesPeriod(period.ToUpperInvariant()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    public void NormalizeSalesPeriod_InvalidPeriod_DefaultsToDaily(string period)
    {
        Assert.Equal("daily", PeriodRangeHelper.NormalizeSalesPeriod(period));
    }

    [Fact]
    public void GetRange_Daily_StartsAtTodayUtc()
    {
        var today = DateTime.UtcNow.Date;
        var (start, end) = PeriodRangeHelper.GetRange("daily");

        Assert.Equal(today, start);
        Assert.Equal(today.AddDays(1).AddTicks(-1), end);
    }

    [Fact]
    public void GetRange_Weekly_StartsAtWeekStart()
    {
        var today = DateTime.UtcNow.Date;
        var (start, end) = PeriodRangeHelper.GetRange("weekly");

        Assert.Equal(today.AddDays(-(int)today.DayOfWeek), start);
        Assert.True(end >= start);
    }

    [Fact]
    public void GetRange_Monthly_StartsAtFirstOfMonth()
    {
        var today = DateTime.UtcNow.Date;
        var (start, end) = PeriodRangeHelper.GetRange("monthly");

        Assert.Equal(new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc), start);
        Assert.True(end >= start);
    }

    [Fact]
    public void GetRange_Custom_UsesInclusiveEndOfDay()
    {
        var from = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = new DateTime(2026, 7, 10, 0, 0, 0, DateTimeKind.Utc);

        var (start, end) = PeriodRangeHelper.GetRange("custom", from, to);

        Assert.Equal(from, start);
        Assert.Equal(to.AddDays(1).AddTicks(-1), end);
    }
}
