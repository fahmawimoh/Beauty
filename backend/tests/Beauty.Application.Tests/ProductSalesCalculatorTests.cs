using Beauty.Application.Common;
using Beauty.Application.DTOs.Reports;

namespace Beauty.Application.Tests;

public class ProductSalesCalculatorTests
{
    [Fact]
    public void Calculate_EmptyLines_ReturnsZeros()
    {
        var result = ProductSalesCalculator.Calculate(Array.Empty<ProductSalesLine>());

        Assert.Empty(result.Products);
        Assert.Equal(0m, result.GrandTotal);
        Assert.Equal(0, result.TotalQuantitySold);
    }

    [Fact]
    public void Calculate_MultipleProducts_AggregatesPerProduct()
    {
        var lines = new[]
        {
            new ProductSalesLine(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Shampoo", "SKU-01", 2, 40m),
            new ProductSalesLine(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Shampoo", "SKU-01", 3, 60m),
            new ProductSalesLine(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Conditioner", "SKU-02", 1, 25m),
        };

        var result = ProductSalesCalculator.Calculate(lines);

        Assert.Equal(2, result.Products.Count);
        Assert.Equal(125m, result.GrandTotal);
        Assert.Equal(6, result.TotalQuantitySold);

        var shampoo = result.Products.First(p => p.ProductName == "Shampoo");
        Assert.Equal(5, shampoo.QuantitySold);
        Assert.Equal(100m, shampoo.TotalSalesAmount);
        Assert.Equal("Product", shampoo.ProductType);
        Assert.Equal("SKU-01", shampoo.ProductCategory);
    }

    [Fact]
    public void Calculate_TopLimit_ReturnsSubsetWithFullTotals()
    {
        var lines = new[]
        {
            new ProductSalesLine(Guid.NewGuid(), "A", "SKU-A", 1, 100m),
            new ProductSalesLine(Guid.NewGuid(), "B", "SKU-B", 1, 50m),
            new ProductSalesLine(Guid.NewGuid(), "C", "SKU-C", 1, 25m),
        };

        var result = ProductSalesCalculator.Calculate(lines, topLimit: 2);

        Assert.Equal(2, result.Products.Count);
        Assert.Equal(175m, result.GrandTotal);
        Assert.Equal(3, result.TotalQuantitySold);
    }

    [Fact]
    public void Calculate_ProductsWithoutId_GroupsByName()
    {
        var lines = new[]
        {
            new ProductSalesLine(null, "Walk-in Item", "General", 1, 10m),
            new ProductSalesLine(null, "Walk-in Item", "General", 2, 20m),
        };

        var result = ProductSalesCalculator.Calculate(lines);

        Assert.Single(result.Products);
        Assert.Equal(3, result.Products[0].QuantitySold);
        Assert.Equal(30m, result.Products[0].TotalSalesAmount);
    }

    [Fact]
    public void Calculate_GrandTotalMatchesSumOfProducts()
    {
        var lines = new[]
        {
            new ProductSalesLine(Guid.NewGuid(), "P1", "S1", 4, 80m),
            new ProductSalesLine(Guid.NewGuid(), "P2", "S2", 2, 40m),
        };

        var result = ProductSalesCalculator.Calculate(lines);

        Assert.Equal(result.Products.Sum(p => p.TotalSalesAmount), result.GrandTotal);
        Assert.Equal(result.Products.Sum(p => p.QuantitySold), result.TotalQuantitySold);
    }
}
