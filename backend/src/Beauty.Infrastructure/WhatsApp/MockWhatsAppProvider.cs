using Beauty.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Beauty.Infrastructure.WhatsApp;

public class MockWhatsAppProvider : IWhatsAppProvider
{
    private readonly ILogger<MockWhatsAppProvider> _logger;

    public MockWhatsAppProvider(ILogger<MockWhatsAppProvider> logger) => _logger = logger;

    public bool IsConfigured => true;

    public Task<WhatsAppSendResult> SendAsync(string toWhatsAppAddress, string body, CancellationToken ct = default)
    {
        var messageId = $"mock_{Guid.NewGuid():N}";
        _logger.LogInformation(
            "[Mock WhatsApp] To={To} BodyLength={Length} MessageId={MessageId}",
            toWhatsAppAddress,
            body.Length,
            messageId);

        return Task.FromResult(new WhatsAppSendResult(true, messageId));
    }
}
