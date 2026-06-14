using System.Text.RegularExpressions;

namespace Beauty.Application.Common;

public static partial class WhatsAppPhoneFormatter
{
    /// <summary>
    /// Converts stored digits-only phone to E.164 format for WhatsApp (e.g. +962791234567).
    /// </summary>
    public static string? ToE164(string? digitsOnlyPhone, string defaultCountryCode = "962")
    {
        var digits = PhoneNumberValidator.Normalize(digitsOnlyPhone);
        if (digits is null) return null;

        if (digits.StartsWith('0') && digits.Length > 1)
            digits = defaultCountryCode + digits[1..];

        if (!digits.StartsWith(defaultCountryCode) && digits.Length <= 10)
            digits = defaultCountryCode + digits;

        return $"+{digits}";
    }

    /// <summary>
    /// Formats for Twilio WhatsApp API: whatsapp:+962791234567
    /// </summary>
    public static string? ToWhatsAppAddress(string? digitsOnlyPhone, string defaultCountryCode = "962")
    {
        var e164 = ToE164(digitsOnlyPhone, defaultCountryCode);
        return e164 is null ? null : $"whatsapp:{e164}";
    }

    public static bool IsValidForWhatsApp(string? digitsOnlyPhone)
        => PhoneNumberValidator.TryValidate(digitsOnlyPhone, required: true, out _, out _);

    [GeneratedRegex(@"^\+\d{8,15}$")]
    private static partial Regex E164Regex();
}
