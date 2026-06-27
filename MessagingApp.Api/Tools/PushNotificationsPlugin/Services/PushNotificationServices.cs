public class PushNotificationServices : IPushNotificationServices
{
    private const int ExpoPushMessageChunkSize = 100;
    private readonly IPushNotificationRepository pushNotificationRepository;
    private readonly IExpoPushNotificationClient expoPushNotificationClient;

    public PushNotificationServices(
        IPushNotificationRepository pushNotificationRepository,
        IExpoPushNotificationClient expoPushNotificationClient)
    {
        this.pushNotificationRepository = pushNotificationRepository;
        this.expoPushNotificationClient = expoPushNotificationClient;
    }

    public async Task<PushNotificationSubscription?> UpsertSubscriptionAsync(
        UpsertPushNotificationSubscriptionRequest request)
    {
        var uniqueId = request.UniqueId?.Trim();
        var expoPushToken = request.ExpoPushToken?.Trim();

        if (
            string.IsNullOrWhiteSpace(uniqueId) ||
            string.IsNullOrWhiteSpace(expoPushToken) ||
            !IsExpoPushToken(expoPushToken))
        {
            return null;
        }

        return await pushNotificationRepository.UpsertSubscriptionAsync(
            uniqueId,
            expoPushToken,
            request.DeviceId?.Trim(),
            request.Platform?.Trim());
    }

    public async Task<bool> DeleteSubscriptionAsync(string uniqueId, string expoPushToken)
    {
        if (string.IsNullOrWhiteSpace(uniqueId) || string.IsNullOrWhiteSpace(expoPushToken))
        {
            return false;
        }

        return await pushNotificationRepository.DeleteSubscriptionAsync(uniqueId, expoPushToken);
    }

    public async Task<PushNotificationSendResult> SendAsync(PushNotificationSendRequest request)
    {
        var recipientUniqueIds = request.RecipientUniqueIds
            .Where(uniqueId => !string.IsNullOrWhiteSpace(uniqueId))
            .Where(uniqueId => request.SenderUniqueId == null || uniqueId != request.SenderUniqueId)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (recipientUniqueIds.Count == 0)
        {
            return new PushNotificationSendResult(0, 0, 0, true);
        }

        var subscriptions =
            await pushNotificationRepository.GetSubscriptionsForUsersAsync(recipientUniqueIds);

        if (subscriptions.Count == 0)
        {
            return new PushNotificationSendResult(recipientUniqueIds.Count, 0, 0, true);
        }

        var expoMessages = subscriptions
            .Select(subscription => new ExpoPushMessage
            {
                To = subscription.ExpoPushToken,
                Title = request.Title,
                Body = request.Body,
                Data = request.Data,
            })
            .ToList();

        try
        {
            var sentCount = 0;
            var acceptedByPushService = true;
            var errors = new List<string>();

            foreach (var messageChunk in expoMessages.Chunk(ExpoPushMessageChunkSize))
            {
                var sendResult = await expoPushNotificationClient.SendAsync(messageChunk);

                if (sendResult.IsSuccess)
                {
                    sentCount += sendResult.MessageCount;
                }
                else
                {
                    acceptedByPushService = false;
                    errors.Add($"{(int)sendResult.StatusCode}: {sendResult.ResponseBody}");
                }
            }

            return new PushNotificationSendResult(
                recipientUniqueIds.Count,
                subscriptions.Count,
                sentCount,
                acceptedByPushService,
                errors.Count > 0 ? string.Join(Environment.NewLine, errors) : null);
        }
        catch (Exception ex)
        {
            return new PushNotificationSendResult(
                recipientUniqueIds.Count,
                subscriptions.Count,
                0,
                false,
                ex.Message);
        }
    }

    private static bool IsExpoPushToken(string expoPushToken)
    {
        return expoPushToken.StartsWith("ExpoPushToken[", StringComparison.Ordinal) ||
            expoPushToken.StartsWith("ExponentPushToken[", StringComparison.Ordinal);
    }
}
