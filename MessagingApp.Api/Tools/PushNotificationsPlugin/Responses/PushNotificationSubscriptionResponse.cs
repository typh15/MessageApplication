public record PushNotificationSubscriptionResponse(
    string UniqueId,
    string ExpoPushToken,
    string? DeviceId,
    string? Platform,
    DateTime UpdatedAtUtc);
