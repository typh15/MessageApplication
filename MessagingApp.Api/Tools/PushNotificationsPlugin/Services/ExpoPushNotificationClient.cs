using System.Net;
using System.Text;
using System.Text.Json;

public class ExpoPushNotificationClient : IExpoPushNotificationClient
{
    private const string ExpoPushApiUrl = "https://exp.host/--/api/v2/push/send";
    private readonly HttpClient httpClient;

    public ExpoPushNotificationClient(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<ExpoPushSendResult> SendAsync(IReadOnlyCollection<ExpoPushMessage> messages)
    {
        if (messages.Count == 0)
        {
            return new ExpoPushSendResult(
                0,
                true,
                HttpStatusCode.OK,
                string.Empty);
        }

        var json = JsonSerializer.Serialize(messages);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await httpClient.PostAsync(ExpoPushApiUrl, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        return new ExpoPushSendResult(
            messages.Count,
            response.IsSuccessStatusCode,
            response.StatusCode,
            responseBody);
    }
}
