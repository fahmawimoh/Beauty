using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class WhatsAppMessage : BaseEntity
{
    public Guid CampaignId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public WhatsAppMessageStatus Status { get; set; } = WhatsAppMessageStatus.Pending;
    public int RetryCount { get; set; }
    public string? ProviderMessageId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SentAt { get; set; }

    public WhatsAppCampaign Campaign { get; set; } = null!;
    public Customer? Customer { get; set; }
}
