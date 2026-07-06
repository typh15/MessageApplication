using System.Text.Json.Serialization;

public sealed class ChatbotChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("conversation_id")]
    public string ConversationId { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public ChatbotConversationSummary? Summary { get; set; }

    [JsonPropertyName("history")]
    public List<ChatbotConversationMessage> History { get; set; } = [];

    [JsonPropertyName("image_urls")]
    public List<string> ImageUrls { get; set; } = [];
}

public sealed class ChatbotChatResponse
{
    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("usage")]
    public ChatbotTokenUsage? Usage { get; set; }

    [JsonPropertyName("conversation_id")]
    public string? ConversationId { get; set; }
}

public sealed class ChatbotSummaryRequest
{
    [JsonPropertyName("conversation_id")]
    public string ConversationId { get; set; } = string.Empty;

    [JsonPropertyName("existing_summary")]
    public ChatbotConversationSummary? ExistingSummary { get; set; }

    [JsonPropertyName("messages")]
    public List<ChatbotConversationMessage> Messages { get; set; } = [];

    [JsonPropertyName("max_words")]
    public int MaxWords { get; set; }
}

public sealed class ChatbotSummaryResponse
{
    [JsonPropertyName("summary")]
    public ChatbotConversationSummary? Summary { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("usage")]
    public ChatbotTokenUsage? Usage { get; set; }
}

public sealed class ChatbotConversationSummary
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("through_message_id")]
    public int ThroughMessageId { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTimeOffset? UpdatedAt { get; set; }
}

public sealed class ChatbotConversationMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("message_id")]
    public int MessageId { get; set; }
}

public sealed class ChatbotTokenUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; set; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; set; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }
}
