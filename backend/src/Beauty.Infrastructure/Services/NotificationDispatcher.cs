using Beauty.Application.Interfaces;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Beauty.Infrastructure.Services;

public class NotificationDispatcher : INotificationDispatcher
{
    private readonly IAppDbContext _context;
    private readonly IEnumerable<INotificationChannelSender> _senders;
    private readonly ILogger<NotificationDispatcher> _logger;

    public NotificationDispatcher(
        IAppDbContext context,
        IEnumerable<INotificationChannelSender> senders,
        ILogger<NotificationDispatcher> logger)
    {
        _context = context;
        _senders = senders;
        _logger = logger;
    }

    public async Task DispatchPendingAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var pending = await _context.NotificationLogs
            .Include(n => n.Appointment)
            .Where(n => n.Status == NotificationStatus.Pending && n.ScheduledFor <= now)
            .OrderBy(n => n.ScheduledFor)
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var notification in pending)
        {
            if (notification.Appointment.Status is AppointmentStatus.Cancelled)
            {
                notification.Status = NotificationStatus.Skipped;
                notification.ErrorMessage = "Appointment was cancelled.";
                notification.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            var sender = _senders.FirstOrDefault(s =>
                string.Equals(s.Channel, notification.Channel.ToString(), StringComparison.OrdinalIgnoreCase));

            if (sender is null)
            {
                notification.Status = NotificationStatus.Failed;
                notification.ErrorMessage = $"No sender registered for channel {notification.Channel}.";
                notification.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            var message = new NotificationMessage(
                notification.Id,
                notification.TenantId,
                notification.AppointmentId,
                notification.Channel.ToString(),
                notification.Subject,
                notification.Body,
                notification.Appointment.ClientEmail,
                notification.Appointment.ClientPhone);

            try
            {
                await sender.SendAsync(message, cancellationToken);
                notification.Status = NotificationStatus.Sent;
                notification.SentAt = DateTime.UtcNow;
                notification.ErrorMessage = null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification {NotificationId}", notification.Id);
                notification.Status = NotificationStatus.Failed;
                notification.ErrorMessage = ex.Message;
            }

            notification.UpdatedAt = DateTime.UtcNow;
        }

        if (pending.Count > 0)
            await _context.SaveChangesAsync(cancellationToken);
    }
}
