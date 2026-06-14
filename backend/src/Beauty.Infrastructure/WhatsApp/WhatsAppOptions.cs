namespace Beauty.Infrastructure.WhatsApp;

public class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    public string Provider { get; set; } = "Mock";
    public string DefaultCountryCode { get; set; } = "962";
    public int RateLimitPerMinute { get; set; } = 30;
    public int MaxRetries { get; set; } = 3;
    public int BatchSize { get; set; } = 10;
    public int PollIntervalSeconds { get; set; } = 5;
    public TwilioWhatsAppOptions Twilio { get; set; } = new();
}

public class TwilioWhatsAppOptions
{
    public string AccountSid { get; set; } = string.Empty;
    public string AuthToken { get; set; } = string.Empty;
    public string FromNumber { get; set; } = string.Empty;
}
