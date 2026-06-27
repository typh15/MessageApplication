public class PushNotificationSubscription
{
    public string UniqueId { get; set; }
    public string ExpoPushToken { get; set; }
    public string? DeviceId { get; set; }
    public string? Platform { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public PushNotificationSubscription(
        string uniqueId,
        string expoPushToken,
        string? deviceId,
        string? platform,
        DateTime updatedAtUtc)
    {
        UniqueId = uniqueId;
        ExpoPushToken = expoPushToken;
        DeviceId = deviceId;
        Platform = platform;
        UpdatedAtUtc = updatedAtUtc;
    }
}
