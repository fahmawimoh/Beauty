namespace Beauty.Application.DTOs.WhatsApp;

public record WhatsAppTemplateDto(
    string Key,
    string NameEn,
    string NameAr,
    string BodyEn,
    string BodyAr,
    string TemplateType);

public record WhatsAppRecipientDto(
    Guid CustomerId,
    string Name,
    string Phone);

public record RecipientPreviewRequest(
    string? Target = null,
    IReadOnlyList<Guid>? CustomerIds = null,
    Guid? BranchId = null,
    Guid? ServiceOfferingId = null,
    Guid? ServiceCategoryId = null);

public record RecipientPreviewDto(
    int TotalCount,
    IReadOnlyList<WhatsAppRecipientDto> Sample);

public record SendWhatsAppMessageRequest(
    Guid CustomerId,
    string Body,
    string? TemplateType = null);

public record BroadcastWhatsAppRequest(
    string Body,
    string? Name = null,
    string? TemplateType = null,
    string? Target = null,
    IReadOnlyList<Guid>? CustomerIds = null,
    Guid? BranchId = null,
    Guid? ServiceOfferingId = null,
    Guid? ServiceCategoryId = null);

public record WhatsAppMessageDto(
    Guid Id,
    Guid? CustomerId,
    string CustomerName,
    string Phone,
    string Status,
    string? ErrorMessage,
    DateTime? SentAt,
    DateTime CreatedAt);

public record WhatsAppCampaignDto(
    Guid Id,
    string Name,
    string Body,
    string TemplateType,
    string Status,
    int TotalRecipients,
    int SentCount,
    int FailedCount,
    int PendingCount,
    string? FilterSummary,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record WhatsAppCampaignDetailDto(
    Guid Id,
    string Name,
    string Body,
    string TemplateType,
    string Status,
    int TotalRecipients,
    int SentCount,
    int FailedCount,
    int PendingCount,
    string? FilterSummary,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<WhatsAppMessageDto> Messages);
