using Beauty.Application.Common;
using Beauty.Domain.Enums;

namespace Beauty.Application.Tests;

public class DiscountValidationTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(100)]
    public void Validate_Percentage_WithinRange_DoesNotThrow(decimal value)
    {
        var ex = Record.Exception(() => DiscountValidation.Validate(DiscountType.Percentage, value, 200m));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_Percentage_Above100_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DiscountValidation.Validate(DiscountType.Percentage, 150m, 200m));

        Assert.Equal(DiscountValidation.PercentageRangeMessage, ex.Message);
    }

    [Theory]
    [InlineData(-5)]
    [InlineData(-1)]
    public void Validate_NegativeValue_Throws(decimal value)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DiscountValidation.Validate(DiscountType.Percentage, value, 200m));

        Assert.Equal(DiscountValidation.DecimalOrNegativeMessage, ex.Message);
    }

    [Theory]
    [InlineData(10.5)]
    [InlineData(10.25)]
    public void Validate_DecimalValue_Throws(decimal value)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DiscountValidation.Validate(DiscountType.Percentage, value, 200m));

        Assert.Equal(DiscountValidation.DecimalOrNegativeMessage, ex.Message);
    }

    [Fact]
    public void Validate_Fixed_WithinSubtotal_DoesNotThrow()
    {
        var ex = Record.Exception(() => DiscountValidation.Validate(DiscountType.Fixed, 50m, 200m));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_Fixed_ExceedsSubtotal_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DiscountValidation.Validate(DiscountType.Fixed, 250m, 200m));

        Assert.Equal(DiscountValidation.FixedExceedsSubtotalMessage, ex.Message);
    }

    [Fact]
    public void Validate_NoDiscount_DoesNotThrow()
    {
        var ex = Record.Exception(() => DiscountValidation.Validate(DiscountType.Fixed, 0m, 200m));
        Assert.Null(ex);
    }
}
