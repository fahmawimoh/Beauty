using Beauty.Application.Services;
using Beauty.Domain.Enums;

namespace Beauty.Application.Tests;

public class DiscountCalculationTests
{
    private readonly DiscountCalculationService _service = new(null!);

    [Fact]
    public void CalculateInvoiceDiscount_NoDiscount_ReturnsZero()
    {
        var amount = _service.CalculateInvoiceDiscount(DiscountType.Percentage, 100m, 0m);
        Assert.Equal(0m, amount);
    }

    [Fact]
    public void CalculateInvoiceDiscount_Percentage_CalculatesCorrectly()
    {
        var amount = _service.CalculateInvoiceDiscount(DiscountType.Percentage, 200m, 10m);
        Assert.Equal(20m, amount);
    }

    [Fact]
    public void CalculateInvoiceDiscount_Fixed_CalculatesCorrectly()
    {
        var amount = _service.CalculateInvoiceDiscount(DiscountType.Fixed, 200m, 30m);
        Assert.Equal(30m, amount);
    }

    [Fact]
    public void CalculateInvoiceDiscount_Fixed_CapsAtSubtotal()
    {
        var amount = _service.CalculateInvoiceDiscount(DiscountType.Fixed, 50m, 80m);
        Assert.Equal(50m, amount);
    }

    [Fact]
    public void CalculateInvoiceDiscount_Percentage100_FullSubtotal()
    {
        var amount = _service.CalculateInvoiceDiscount(DiscountType.Percentage, 150m, 100m);
        Assert.Equal(150m, amount);
    }

    [Fact]
    public void ReceiptTotal_MatchesSubtotalMinusDiscount()
    {
        const decimal subtotal = 200m;
        const decimal discountValue = 15m;
        var discountAmount = _service.CalculateInvoiceDiscount(DiscountType.Percentage, subtotal, discountValue);
        var total = subtotal - discountAmount;

        Assert.Equal(30m, discountAmount);
        Assert.Equal(170m, total);
    }
}
