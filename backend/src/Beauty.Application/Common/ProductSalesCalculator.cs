using Beauty.Application.DTOs.Reports;

namespace Beauty.Application.Common;

public readonly record struct ProductSalesLine(
    Guid? ProductId,
    string ProductName,
    string? ProductSku,
    int Quantity,
    decimal LineTotal);

public static class ProductSalesCalculator
{
    public static ProductSalesReportDto Calculate(IEnumerable<ProductSalesLine> lines, int? topLimit = null)
    {
        var grouped = lines
            .GroupBy(l => l.ProductId.HasValue ? $"id:{l.ProductId}" : $"name:{l.ProductName}")
            .Select(g =>
            {
                var first = g.First();
                return new ProductSalesRowDto(
                    first.ProductId,
                    first.ProductSku,
                    first.ProductName,
                    "Product",
                    "General",
                    g.Sum(x => x.Quantity),
                    g.Sum(x => x.LineTotal));
            })
            .OrderByDescending(r => r.TotalSalesAmount)
            .ToList();

        var grandTotal = grouped.Sum(r => r.TotalSalesAmount);
        var totalQuantity = grouped.Sum(r => r.QuantitySold);
        var products = topLimit.HasValue ? grouped.Take(topLimit.Value).ToList() : grouped;

        return new ProductSalesReportDto(products, grandTotal, totalQuantity);
    }
}
