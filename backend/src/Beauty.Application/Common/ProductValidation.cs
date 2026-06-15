namespace Beauty.Application.Common;

public static class ProductValidation
{
    public const string SkuRequiredMessage = "SKU is required.";
    public const string NameRequiredMessage = "Product name is required.";
    public const string PriceNegativeMessage = "Price cannot be negative.";
    public const string CostPriceNegativeMessage = "Cost price cannot be negative.";
    public const string StockNegativeMessage = "Stock quantity cannot be negative.";
    public const string LowStockThresholdNegativeMessage = "Low stock threshold cannot be negative.";
    public const string DuplicateSkuMessage = "A product with this SKU already exists.";

    public static void ValidateFields(string sku, string name, decimal price, decimal costPrice, int stockQuantity, int lowStockThreshold)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new InvalidOperationException(SkuRequiredMessage);

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(NameRequiredMessage);

        if (price < 0)
            throw new InvalidOperationException(PriceNegativeMessage);

        if (costPrice < 0)
            throw new InvalidOperationException(CostPriceNegativeMessage);

        if (stockQuantity < 0)
            throw new InvalidOperationException(StockNegativeMessage);

        if (lowStockThreshold < 0)
            throw new InvalidOperationException(LowStockThresholdNegativeMessage);
    }
}
