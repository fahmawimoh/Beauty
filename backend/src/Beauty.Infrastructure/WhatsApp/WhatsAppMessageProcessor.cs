using Beauty.Application.Common;
using Beauty.Application.Interfaces;
using Beauty.Domain.Enums;
using Beauty.Infrastructure.Persistence;
using Beauty.Infrastructure.WhatsApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Beauty.Infrastructure.WhatsApp;

public class WhatsAppMessageProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppMessageProcessor> _logger;
    private readonly WhatsAppOptions _options;
    private readonly SemaphoreSlim _rateLimiter = new(1, 1);
    private DateTime _windowStart = DateTime.UtcNow;
    private int _messagesInWindow;

    public WhatsAppMessageProcessor(
        IServiceScopeFactory scopeFactory,
        IOptions<WhatsAppOptions> options,
        ILogger<WhatsAppMessageProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("WhatsApp message processor started (provider: {Provider})", _options.Provider);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMessagesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "WhatsApp processor iteration failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
        }
    }

    private async Task ProcessPendingMessagesAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var provider = scope.ServiceProvider.GetRequiredService<IWhatsAppProvider>();

        var campaignIds = await db.WhatsAppCampaigns
            .Where(c => c.Status == WhatsAppCampaignStatus.Queued ||
                        c.Status == WhatsAppCampaignStatus.Processing)
            .OrderBy(c => c.CreatedAt)
            .Select(c => c.Id)
            .Take(5)
            .ToListAsync(ct);

        foreach (var campaignId in campaignIds)
        {
            var campaign = await db.WhatsAppCampaigns
                .FirstOrDefaultAsync(c => c.Id == campaignId, ct);

            if (campaign is null) continue;

            if (campaign.Status == WhatsAppCampaignStatus.Queued)
            {
                campaign.Status = WhatsAppCampaignStatus.Processing;
                campaign.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }

            var pendingMessages = await db.WhatsAppMessages
                .Where(m => m.CampaignId == campaignId &&
                            (m.Status == WhatsAppMessageStatus.Pending ||
                             (m.Status == WhatsAppMessageStatus.Failed && m.RetryCount < _options.MaxRetries)))
                .OrderBy(m => m.CreatedAt)
                .Take(_options.BatchSize)
                .ToListAsync(ct);

            if (pendingMessages.Count == 0)
            {
                await FinalizeCampaignAsync(db, campaign, ct);
                continue;
            }

            foreach (var message in pendingMessages)
            {
                await WaitForRateLimitAsync(ct);

                var address = WhatsAppPhoneFormatter.ToWhatsAppAddress(message.Phone, _options.DefaultCountryCode);
                if (address is null)
                {
                    message.Status = WhatsAppMessageStatus.Failed;
                    message.ErrorMessage = "Invalid phone number format.";
                    message.UpdatedAt = DateTime.UtcNow;
                    continue;
                }

                if (message.Status == WhatsAppMessageStatus.Failed)
                    message.RetryCount++;

                var result = await provider.SendAsync(address, message.Body, ct);
                message.UpdatedAt = DateTime.UtcNow;

                if (result.Success)
                {
                    message.Status = WhatsAppMessageStatus.Sent;
                    message.ProviderMessageId = result.ProviderMessageId;
                    message.ErrorMessage = null;
                    message.SentAt = DateTime.UtcNow;
                }
                else
                {
                    message.Status = WhatsAppMessageStatus.Failed;
                    message.ErrorMessage = result.ErrorMessage ?? "Send failed.";
                }
            }

            await db.SaveChangesAsync(ct);
            await RefreshCampaignCountsAsync(db, campaign, _options.MaxRetries, ct);
            await FinalizeCampaignAsync(db, campaign, ct);
        }
    }

    private async Task WaitForRateLimitAsync(CancellationToken ct)
    {
        await _rateLimiter.WaitAsync(ct);
        try
        {
            var now = DateTime.UtcNow;
            if ((now - _windowStart).TotalMinutes >= 1)
            {
                _windowStart = now;
                _messagesInWindow = 0;
            }

            if (_messagesInWindow >= _options.RateLimitPerMinute)
            {
                var delay = _windowStart.AddMinutes(1) - now;
                if (delay > TimeSpan.Zero)
                    await Task.Delay(delay, ct);

                _windowStart = DateTime.UtcNow;
                _messagesInWindow = 0;
            }

            _messagesInWindow++;
        }
        finally
        {
            _rateLimiter.Release();
        }
    }

    private static async Task RefreshCampaignCountsAsync(
        AppDbContext db,
        Domain.Entities.WhatsAppCampaign campaign,
        int maxRetries,
        CancellationToken ct)
    {
        campaign.SentCount = await db.WhatsAppMessages
            .CountAsync(m => m.CampaignId == campaign.Id && m.Status == WhatsAppMessageStatus.Sent, ct);
        campaign.FailedCount = await db.WhatsAppMessages
            .CountAsync(m => m.CampaignId == campaign.Id &&
                             m.Status == WhatsAppMessageStatus.Failed &&
                             m.RetryCount >= maxRetries, ct);
        campaign.PendingCount = await db.WhatsAppMessages
            .CountAsync(m => m.CampaignId == campaign.Id &&
                             (m.Status == WhatsAppMessageStatus.Pending ||
                              (m.Status == WhatsAppMessageStatus.Failed && m.RetryCount < maxRetries)), ct);
        campaign.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task FinalizeCampaignAsync(AppDbContext db, Domain.Entities.WhatsAppCampaign campaign, CancellationToken ct)
    {
        var hasPending = await db.WhatsAppMessages.AnyAsync(m =>
            m.CampaignId == campaign.Id &&
            (m.Status == WhatsAppMessageStatus.Pending ||
             (m.Status == WhatsAppMessageStatus.Failed && m.RetryCount < _options.MaxRetries)), ct);

        if (hasPending) return;

        campaign.SentCount = await db.WhatsAppMessages
            .CountAsync(m => m.CampaignId == campaign.Id && m.Status == WhatsAppMessageStatus.Sent, ct);
        campaign.FailedCount = await db.WhatsAppMessages
            .CountAsync(m => m.CampaignId == campaign.Id && m.Status == WhatsAppMessageStatus.Failed, ct);
        campaign.PendingCount = 0;
        campaign.Status = campaign.FailedCount == campaign.TotalRecipients
            ? WhatsAppCampaignStatus.Failed
            : WhatsAppCampaignStatus.Completed;
        campaign.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
