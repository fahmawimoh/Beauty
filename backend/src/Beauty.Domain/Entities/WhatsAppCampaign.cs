using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class WhatsAppCampaign : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public WhatsAppTemplateType TemplateType { get; set; } = WhatsAppTemplateType.Custom;
    public WhatsAppCampaignStatus Status { get; set; } = WhatsAppCampaignStatus.Queued;
    public int TotalRecipients { get; set; }
    public int SentCount { get; set; }
    public int FailedCount { get; set; }
    public int PendingCount { get; set; }
    public string? FilterSummary { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<WhatsAppMessage> Messages { get; set; } = [];
}
