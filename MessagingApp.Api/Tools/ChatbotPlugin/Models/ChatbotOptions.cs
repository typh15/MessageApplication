public sealed class ChatbotOptions
{
    public const string SectionName = "Chatbot";

    public bool Enabled { get; set; } = false;
    public string BaseUrl { get; set; } = "http://127.0.0.1:8000";
    public string BotUniqueId { get; set; } = "chatbot-system-user";
    public string BotUserName { get; set; } = "Chatbot";
    public string PublicImageBaseUrl { get; set; } = string.Empty;
    public int RecentMessageCount { get; set; } = 10;
    public int SummarizeEveryMessageCount { get; set; } = 20;
    public int SummaryMaxWords { get; set; } = 300;
    public int RequestTimeoutSeconds { get; set; } = 60;
}
