using Microsoft.AspNetCore.Mvc;

[ApiController]
public class PushNotificationsController : ControllerBase
{
    private readonly IPushNotificationServices pushNotificationServices;

    public PushNotificationsController(IPushNotificationServices pushNotificationServices)
    {
        this.pushNotificationServices = pushNotificationServices;
    }

    [HttpPost("/push-notifications/subscriptions")]
    public async Task<IActionResult> UpsertSubscriptionAsync(
        [FromBody] UpsertPushNotificationSubscriptionRequest request)
    {
        if (request == null)
        {
            return BadRequest("Push notification subscription data is required.");
        }

        var subscription = await pushNotificationServices.UpsertSubscriptionAsync(request);

        if (subscription == null)
        {
            return BadRequest("Unable to save push notification subscription.");
        }

        return Ok(CreateSubscriptionResponse(subscription));
    }

    [HttpDelete("/push-notifications/subscriptions")]
    public async Task<IActionResult> DeleteSubscriptionAsync(
        string uniqueId,
        string expoPushToken)
    {
        var deleted = await pushNotificationServices.DeleteSubscriptionAsync(
            uniqueId,
            expoPushToken);

        if (!deleted)
        {
            return NotFound("Push notification subscription was not found.");
        }

        return Ok();
    }

    private static PushNotificationSubscriptionResponse CreateSubscriptionResponse(
        PushNotificationSubscription subscription)
    {
        return new PushNotificationSubscriptionResponse(
            subscription.UniqueId,
            subscription.ExpoPushToken,
            subscription.DeviceId,
            subscription.Platform,
            subscription.UpdatedAtUtc);
    }
}
