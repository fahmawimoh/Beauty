using Beauty.Domain.Enums;

namespace Beauty.Application.Common;

public static class DiscountValidation
{
    public const string DecimalOrNegativeMessage = "Decimals and negative values are not allowed.";
    public const string PercentageRangeMessage = "Discount percentage must be between 0 and 100.";
    public const string FixedExceedsSubtotalMessage = "Fixed discount cannot exceed the subtotal.";

    public static void Validate(DiscountType discountType, decimal discountValue, decimal subtotal)
    {
        if (discountValue < 0 || !IsWholeNumber(discountValue))
            throw new InvalidOperationException(DecimalOrNegativeMessage);

        if (discountType == DiscountType.Percentage)
        {
            if (discountValue > 100)
                throw new InvalidOperationException(PercentageRangeMessage);
            return;
        }

        if (subtotal > 0 && discountValue > subtotal)
            throw new InvalidOperationException(FixedExceedsSubtotalMessage);
    }

    private static bool IsWholeNumber(decimal value) => value == decimal.Truncate(value);
}
