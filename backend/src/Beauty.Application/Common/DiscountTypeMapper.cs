using Beauty.Domain.Enums;

namespace Beauty.Application.Common;

public static class DiscountTypeMapper
{
    public const string Percentage = "PERCENTAGE";
    public const string Fixed = "FIXED";

    public static string ToApiValue(DiscountType type) => type switch
    {
        DiscountType.Fixed => Fixed,
        _ => Percentage
    };

    public static DiscountType FromApiValue(string value) => value?.ToUpperInvariant() switch
    {
        Fixed => DiscountType.Fixed,
        Percentage => DiscountType.Percentage,
        _ => throw new InvalidOperationException($"Invalid discount type: {value}")
    };

    public static bool IsValidApiValue(string value)
        => value?.ToUpperInvariant() is Percentage or Fixed;
}
