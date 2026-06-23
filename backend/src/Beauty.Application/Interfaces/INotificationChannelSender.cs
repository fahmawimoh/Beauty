namespace Beauty.Application.Interfaces;

public record NotificationMessage(
    Guid NotificationId,
    Guid TenantId,
    Guid AppointmentId,
    string Channel,
    string Subject,
    string Body,
    string? RecipientEmail,
    string? RecipientPhone);

public interface INotificationChannelSender
{
    string Channel { get; }
    Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default);
}
