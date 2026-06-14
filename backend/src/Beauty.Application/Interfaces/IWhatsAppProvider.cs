namespace Beauty.Application.Interfaces;

public record WhatsAppSendResult(bool Success, string? ProviderMessageId = null, string? ErrorMessage = null);

public interface IWhatsAppProvider
{
    Task<WhatsAppSendResult> SendAsync(string toWhatsAppAddress, string body, CancellationToken ct = default);
    bool IsConfigured { get; }
}
