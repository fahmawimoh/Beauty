using System.Text.RegularExpressions;

namespace Beauty.Application.Common;

public static partial class PhoneNumberValidator
{
    private const int MinDigits = 7;
    private const int MaxDigits = 15;

    public static string? Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;

        var digits = NonDigitRegex().Replace(phone, "");
        return string.IsNullOrEmpty(digits) ? null : digits;
    }

    public static bool TryValidate(string? phone, bool required, out string? normalized, out string? error)
    {
        normalized = Normalize(phone);
        error = null;

        if (normalized is null)
        {
            if (required)
            {
                error = "Phone number is required.";
                return false;
            }
            return true;
        }

        if (!DigitsOnlyRegex().IsMatch(normalized))
        {
            error = "Phone number must contain digits only (0-9).";
            return false;
        }

        if (normalized.Length < MinDigits)
        {
            error = $"Phone number must be at least {MinDigits} digits.";
            return false;
        }

        if (normalized.Length > MaxDigits)
        {
            error = $"Phone number must not exceed {MaxDigits} digits.";
            return false;
        }

        return true;
    }

    public static string ValidateAndNormalize(string? phone, bool required = true)
    {
        if (!TryValidate(phone, required, out var normalized, out var error))
            throw new InvalidOperationException(error);

        return normalized!;
    }

    [GeneratedRegex(@"\D")]
    private static partial Regex NonDigitRegex();

    [GeneratedRegex(@"^\d+$")]
    private static partial Regex DigitsOnlyRegex();
}
