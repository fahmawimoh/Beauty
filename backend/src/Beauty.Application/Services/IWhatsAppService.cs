using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.WhatsApp;

namespace Beauty.Application.Services;

public interface IWhatsAppService
{
    IReadOnlyList<WhatsAppTemplateDto> GetTemplates();
    Task<RecipientPreviewDto> PreviewRecipientsAsync(RecipientPreviewRequest request, CancellationToken ct = default);
    Task<WhatsAppCampaignDto> SendSingleAsync(SendWhatsAppMessageRequest request, CancellationToken ct = default);
    Task<WhatsAppCampaignDto> BroadcastAsync(BroadcastWhatsAppRequest request, CancellationToken ct = default);
    Task<PagedResult<WhatsAppCampaignDto>> GetCampaignsAsync(int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<WhatsAppCampaignDetailDto?> GetCampaignByIdAsync(Guid id, CancellationToken ct = default);
}
