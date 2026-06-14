using Beauty.Application.Common;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.WhatsApp;
using Beauty.Application.Interfaces;
using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class WhatsAppService : IWhatsAppService
{
    private const int PreviewSampleSize = 10;
    private const int MaxBulkRecipients = 5000;

    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    private static readonly IReadOnlyList<WhatsAppTemplateDto> Templates =
    [
        new("promotion", "Promotion", "عرض ترويجي",
            "Hello {name}! 🎉 Special offer at {business}: {offer}. Valid until {date}. Book now!",
            "مرحباً {name}! 🎉 عرض خاص في {business}: {offer}. ساري حتى {date}. احجز الآن!",
            "Promotion"),
        new("reminder", "Appointment Reminder", "تذكير بالموعد",
            "Hi {name}, this is a reminder for your appointment at {business} on {date} at {time}. See you soon!",
            "مرحباً {name}، هذا تذكير بموعدك في {business} يوم {date} الساعة {time}. نراك قريباً!",
            "Reminder"),
        new("announcement", "Announcement", "إعلان",
            "Dear {name}, {business} would like to inform you: {message}",
            "عزيزي/عزيزتي {name}، {business} تود إبلاغك: {message}",
            "Announcement"),
    ];

    public WhatsAppService(IAppDbContext context, ICurrentUserService currentUser, IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public IReadOnlyList<WhatsAppTemplateDto> GetTemplates() => Templates;

    public async Task<RecipientPreviewDto> PreviewRecipientsAsync(RecipientPreviewRequest request, CancellationToken ct = default)
    {
        var recipients = await ResolveRecipientsAsync(request, ct);
        return new RecipientPreviewDto(
            recipients.Count,
            recipients.Take(PreviewSampleSize).ToList());
    }

    public async Task<WhatsAppCampaignDto> SendSingleAsync(SendWhatsAppMessageRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            throw new InvalidOperationException("Message body is required.");

        var broadcast = new BroadcastWhatsAppRequest(
            request.Body.Trim(),
            Name: "Single message",
            TemplateType: request.TemplateType,
            Target: "selected",
            CustomerIds: [request.CustomerId]);

        return await BroadcastAsync(broadcast, ct);
    }

    public async Task<WhatsAppCampaignDto> BroadcastAsync(BroadcastWhatsAppRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            throw new InvalidOperationException("Message body is required.");

        if (request.Body.Length > 4096)
            throw new InvalidOperationException("Message body must not exceed 4096 characters.");

        var tenantId = RequireTenantId();
        var userId = RequireUserId();

        var previewRequest = new RecipientPreviewRequest(
            request.Target,
            request.CustomerIds,
            request.BranchId,
            request.ServiceOfferingId,
            request.ServiceCategoryId);

        var recipients = await ResolveRecipientsAsync(previewRequest, ct);
        if (recipients.Count == 0)
            throw new InvalidOperationException("No recipients with valid phone numbers found for the selected criteria.");

        if (recipients.Count > MaxBulkRecipients)
            throw new InvalidOperationException($"Cannot send to more than {MaxBulkRecipients} recipients at once.");

        var templateType = ParseTemplateType(request.TemplateType);
        var filterSummary = BuildFilterSummary(request, recipients.Count);

        var campaign = new WhatsAppCampaign
        {
            TenantId = tenantId,
            CreatedByUserId = userId,
            Name = string.IsNullOrWhiteSpace(request.Name)
                ? $"Broadcast {DateTime.UtcNow:yyyy-MM-dd HH:mm}"
                : request.Name.Trim(),
            Body = request.Body.Trim(),
            TemplateType = templateType,
            Status = WhatsAppCampaignStatus.Queued,
            TotalRecipients = recipients.Count,
            PendingCount = recipients.Count,
            FilterSummary = filterSummary
        };

        foreach (var recipient in recipients)
        {
            campaign.Messages.Add(new WhatsAppMessage
            {
                TenantId = tenantId,
                CustomerId = recipient.CustomerId,
                CustomerName = recipient.Name,
                Phone = recipient.Phone,
                Body = request.Body.Trim(),
                Status = WhatsAppMessageStatus.Pending
            });
        }

        _context.WhatsAppCampaigns.Add(campaign);
        await _context.SaveChangesAsync(ct);
        await _auditService.LogAsync("Broadcast", "WhatsAppCampaign", campaign.Id, campaign.Name, ct);

        return await MapCampaignDtoAsync(campaign.Id, ct)
            ?? throw new InvalidOperationException("Failed to create campaign.");
    }

    public async Task<PagedResult<WhatsAppCampaignDto>> GetCampaignsAsync(int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.WhatsAppCampaigns
            .Where(c => c.TenantId == tenantId)
            .OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new WhatsAppCampaignDto(
                c.Id,
                c.Name,
                c.Body,
                c.TemplateType.ToString(),
                c.Status.ToString(),
                c.TotalRecipients,
                c.SentCount,
                c.FailedCount,
                c.PendingCount,
                c.FilterSummary,
                c.CreatedByUser.FullName,
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<WhatsAppCampaignDto>(items, total, page, pageSize);
    }

    public async Task<WhatsAppCampaignDetailDto?> GetCampaignByIdAsync(Guid id, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        var campaign = await _context.WhatsAppCampaigns
            .Include(c => c.CreatedByUser)
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId, ct);

        if (campaign is null) return null;

        return new WhatsAppCampaignDetailDto(
            campaign.Id,
            campaign.Name,
            campaign.Body,
            campaign.TemplateType.ToString(),
            campaign.Status.ToString(),
            campaign.TotalRecipients,
            campaign.SentCount,
            campaign.FailedCount,
            campaign.PendingCount,
            campaign.FilterSummary,
            campaign.CreatedByUser.FullName,
            campaign.CreatedAt,
            campaign.UpdatedAt,
            campaign.Messages
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new WhatsAppMessageDto(
                    m.Id,
                    m.CustomerId,
                    m.CustomerName,
                    m.Phone,
                    m.Status.ToString(),
                    m.ErrorMessage,
                    m.SentAt,
                    m.CreatedAt))
                .ToList());
    }

    private async Task<List<WhatsAppRecipientDto>> ResolveRecipientsAsync(RecipientPreviewRequest request, CancellationToken ct)
    {
        var tenantId = RequireTenantId();
        var target = (request.Target ?? "all").Trim().ToLowerInvariant();

        IQueryable<Customer> query = _context.Customers
            .Where(c => c.TenantId == tenantId && c.Phone != null && c.Phone != "");

        switch (target)
        {
            case "selected":
                if (request.CustomerIds is null || request.CustomerIds.Count == 0)
                    throw new InvalidOperationException("At least one customer must be selected.");
                query = query.Where(c => request.CustomerIds.Contains(c.Id));
                break;

            case "branch":
                if (request.BranchId is null)
                    throw new InvalidOperationException("Branch filter requires a branch ID.");
                query = query.Where(c => c.Invoices.Any(i => i.BranchId == request.BranchId));
                break;

            case "service":
                if (request.ServiceOfferingId is null)
                    throw new InvalidOperationException("Service filter requires a service ID.");
                query = query.Where(c => c.Invoices.Any(i =>
                    i.Items.Any(item => item.ServiceOfferingId == request.ServiceOfferingId)));
                break;

            case "category":
                if (request.ServiceCategoryId is null)
                    throw new InvalidOperationException("Category filter requires a category ID.");
                query = query.Where(c => c.Invoices.Any(i =>
                    i.Items.Any(item =>
                        item.ServiceOffering != null &&
                        item.ServiceOffering.CategoryId == request.ServiceCategoryId)));
                break;

            case "all":
                break;

            default:
                throw new InvalidOperationException($"Unknown target '{request.Target}'.");
        }

        var customers = await query
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Phone })
            .ToListAsync(ct);

        var recipients = new List<WhatsAppRecipientDto>();
        var seenPhones = new HashSet<string>();

        foreach (var customer in customers)
        {
            if (!WhatsAppPhoneFormatter.IsValidForWhatsApp(customer.Phone))
                continue;

            var normalized = PhoneNumberValidator.ValidateAndNormalize(customer.Phone);
            if (!seenPhones.Add(normalized))
                continue;

            recipients.Add(new WhatsAppRecipientDto(customer.Id, customer.Name, normalized));
        }

        return recipients;
    }

    private static WhatsAppTemplateType ParseTemplateType(string? templateType)
    {
        if (string.IsNullOrWhiteSpace(templateType))
            return WhatsAppTemplateType.Custom;

        return Enum.TryParse<WhatsAppTemplateType>(templateType, ignoreCase: true, out var parsed)
            ? parsed
            : WhatsAppTemplateType.Custom;
    }

    private static string BuildFilterSummary(BroadcastWhatsAppRequest request, int count)
    {
        var target = (request.Target ?? "all").ToLowerInvariant();
        return target switch
        {
            "selected" => $"Selected customers ({count})",
            "branch" => $"Branch filter ({count})",
            "service" => $"Service filter ({count})",
            "category" => $"Category filter ({count})",
            _ => $"All customers ({count})"
        };
    }

    private async Task<WhatsAppCampaignDto?> MapCampaignDtoAsync(Guid campaignId, CancellationToken ct)
    {
        var tenantId = RequireTenantId();
        return await _context.WhatsAppCampaigns
            .Where(c => c.Id == campaignId && c.TenantId == tenantId)
            .Select(c => new WhatsAppCampaignDto(
                c.Id,
                c.Name,
                c.Body,
                c.TemplateType.ToString(),
                c.Status.ToString(),
                c.TotalRecipients,
                c.SentCount,
                c.FailedCount,
                c.PendingCount,
                c.FilterSummary,
                c.CreatedByUser.FullName,
                c.CreatedAt,
                c.UpdatedAt))
            .FirstOrDefaultAsync(ct);
    }

    private Guid RequireTenantId()
    {
        var tenantId = _currentUser.TenantId;
        if (tenantId is null)
            throw new UnauthorizedAccessException("Tenant context is required.");
        return tenantId.Value;
    }

    private Guid RequireUserId()
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            throw new UnauthorizedAccessException("User context is required.");
        return userId.Value;
    }
}
