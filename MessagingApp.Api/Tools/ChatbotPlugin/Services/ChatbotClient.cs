using System.Net.Http.Json;
using System.Text.Json;

public sealed class ChatbotClient : IChatbotClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient httpClient;
    private readonly ILogger<ChatbotClient> logger;

    public ChatbotClient(HttpClient httpClient, ILogger<ChatbotClient> logger)
    {
        this.httpClient = httpClient;
        this.logger = logger;
    }

    public Task<ChatbotChatResponse?> SendChatAsync(
        ChatbotChatRequest request,
        CancellationToken cancellationToken = default)
    {
        return PostAsync<ChatbotChatRequest, ChatbotChatResponse>(
            "chat",
            request,
            cancellationToken);
    }

    public Task<ChatbotSummaryResponse?> SummarizeAsync(
        ChatbotSummaryRequest request,
        CancellationToken cancellationToken = default)
    {
        return PostAsync<ChatbotSummaryRequest, ChatbotSummaryResponse>(
            "chat/summarize",
            request,
            cancellationToken);
    }

    private async Task<TResponse?> PostAsync<TRequest, TResponse>(
        string path,
        TRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await httpClient.PostAsJsonAsync(
                path,
                request,
                JsonOptions,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Chatbot API POST {Path} returned {StatusCode}: {ResponseBody}",
                    path,
                    (int)response.StatusCode,
                    responseBody);

                return default;
            }

            return await response.Content.ReadFromJsonAsync<TResponse>(
                JsonOptions,
                cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Chatbot API POST {Path} timed out.", path);
            return default;
        }
        catch (Exception ex)
            when (ex is HttpRequestException ||
                  ex is InvalidOperationException ||
                  ex is NotSupportedException ||
                  ex is JsonException)
        {
            logger.LogWarning(ex, "Chatbot API POST {Path} failed.", path);
            return default;
        }
    }
}
