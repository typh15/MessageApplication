public interface IExpoPushNotificationClient
{
    Task<ExpoPushSendResult> SendAsync(IReadOnlyCollection<ExpoPushMessage> messages);
}
