using Beauty.Application.Common;

namespace Beauty.Application.Tests;

public class ProductValidationTests
{
    [Fact]
    public void ValidateFields_ValidInput_DoesNotThrow()
    {
        var ex = Record.Exception(() =>
            ProductValidation.ValidateFields("SKU-001", "Shampoo", 25m, 10m, 50, 5));

        Assert.Null(ex);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateFields_EmptySku_Throws(string sku)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields(sku, "Shampoo", 25m, 10m, 50, 5));

        Assert.Equal(ProductValidation.SkuRequiredMessage, ex.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateFields_EmptyName_Throws(string name)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields("SKU-001", name, 25m, 10m, 50, 5));

        Assert.Equal(ProductValidation.NameRequiredMessage, ex.Message);
    }

    [Fact]
    public void ValidateFields_NegativePrice_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields("SKU-001", "Shampoo", -1m, 10m, 50, 5));

        Assert.Equal(ProductValidation.PriceNegativeMessage, ex.Message);
    }

    [Fact]
    public void ValidateFields_NegativeCostPrice_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields("SKU-001", "Shampoo", 25m, -1m, 50, 5));

        Assert.Equal(ProductValidation.CostPriceNegativeMessage, ex.Message);
    }

    [Fact]
    public void ValidateFields_NegativeStock_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields("SKU-001", "Shampoo", 25m, 10m, -1, 5));

        Assert.Equal(ProductValidation.StockNegativeMessage, ex.Message);
    }

    [Fact]
    public void ValidateFields_NegativeLowStockThreshold_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductValidation.ValidateFields("SKU-001", "Shampoo", 25m, 10m, 50, -1));

        Assert.Equal(ProductValidation.LowStockThresholdNegativeMessage, ex.Message);
    }

    [Fact]
    public void ValidateFields_ZeroPrice_Allowed()
    {
        var ex = Record.Exception(() =>
            ProductValidation.ValidateFields("SKU-001", "Free Sample", 0m, 0m, 10, 0));

        Assert.Null(ex);
    }
}
