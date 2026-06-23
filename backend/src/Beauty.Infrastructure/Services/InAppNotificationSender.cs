using Beauty.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Beauty.Infrastructure.Services;

/// <summary>
/// Default in-app notification sender. Logs notifications for audit and future UI display.
/// Replace or extend with Email/Sms/Push senders implementing INotificationChannelSender.
/// </summary>
public class InAppNotificationSender : INotificationChannelSender
{
    private readonly ILogger<InAppNotificationSender> _logger;

    public InAppNotificationSender(ILogger<InAppNotificationSender> logger) => _logger = logger;

    public string Channel => "InApp";

    public Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "InApp notification sent for appointment {AppointmentId}: {Subject} — {Body}",
            message.AppointmentId, message.Subject, message.Body);
        return Task.CompletedTask;
    }
}
