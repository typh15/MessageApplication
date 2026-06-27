public record PushNotificationSendResult(
    int RequestedRecipientCount,
    int SubscriptionCount,
    int SentCount,
    bool AcceptedByPushService,
    string? ErrorMessage = null);
