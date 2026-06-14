using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Beauty.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Beauty.Infrastructure.WhatsApp;

public class TwilioWhatsAppProvider : IWhatsAppProvider
{
    private readonly HttpClient _httpClient;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<TwilioWhatsAppProvider> _logger;

    public TwilioWhatsAppProvider(
        HttpClient httpClient,
        IOptions<WhatsAppOptions> options,
        ILogger<TwilioWhatsAppProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.Twilio.AccountSid) &&
        !string.IsNullOrWhiteSpace(_options.Twilio.AuthToken) &&
        !string.IsNullOrWhiteSpace(_options.Twilio.FromNumber);

    public async Task<WhatsAppSendResult> SendAsync(string toWhatsAppAddress, string body, CancellationToken ct = default)
    {
        if (!IsConfigured)
            return new WhatsAppSendResult(false, ErrorMessage: "Twilio WhatsApp is not configured.");

        var accountSid = _options.Twilio.AccountSid;
        var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";

        var from = _options.Twilio.FromNumber.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase)
            ? _options.Twilio.FromNumber
            : $"whatsapp:{_options.Twilio.FromNumber}";

        var payload = new Dictionary<string, string>
        {
            ["From"] = from,
            ["To"] = toWhatsAppAddress,
            ["Body"] = body
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(payload)
        };

        var credentials = Convert.ToBase64String(
            Encoding.ASCII.GetBytes($"{accountSid}:{_options.Twilio.AuthToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        try
        {
            using var response = await _httpClient.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Twilio WhatsApp send failed: {Status} {Body}", response.StatusCode, content);
                var error = TryExtractTwilioError(content) ?? $"Twilio API error ({(int)response.StatusCode})";
                return new WhatsAppSendResult(false, ErrorMessage: error);
            }

            using var doc = JsonDocument.Parse(content);
            var sid = doc.RootElement.TryGetProperty("sid", out var sidProp)
                ? sidProp.GetString()
                : null;

            return new WhatsAppSendResult(true, sid);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Twilio WhatsApp send exception");
            return new WhatsAppSendResult(false, ErrorMessage: ex.Message);
        }
    }

    private static string? TryExtractTwilioError(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("message", out var message))
                return message.GetString();
        }
        catch
        {
            // ignored
        }

        return null;
    }
}
