public interface IPushNotificationServices
{
    Task<PushNotificationSubscription?> UpsertSubscriptionAsync(
        UpsertPushNotificationSubscriptionRequest request);

    Task<bool> DeleteSubscriptionAsync(string uniqueId, string expoPushToken);
    Task<bool> DeleteSubscriptionsForUserAsync(string uniqueId);
    Task<PushNotificationSendResult> SendAsync(PushNotificationSendRequest request);
}
