namespace Beauty.Application.Interfaces;

public interface INotificationDispatcher
{
    Task DispatchPendingAsync(CancellationToken cancellationToken = default);
}
