using Microsoft.Extensions.Options;

public sealed class ChatbotBotUserService : IChatbotBotUserService
{
    private readonly IOptions<ChatbotOptions> options;
    private readonly IActiveUserRepository activeUserRepository;
    private readonly ILogger<ChatbotBotUserService> logger;

    public ChatbotBotUserService(
        IOptions<ChatbotOptions> options,
        IActiveUserRepository activeUserRepository,
        ILogger<ChatbotBotUserService> logger)
    {
        this.options = options;
        this.activeUserRepository = activeUserRepository;
        this.logger = logger;
    }

    public bool IsConfiguredBotUserName(string userName)
    {
        var chatbotOptions = options.Value;
        return chatbotOptions.Enabled &&
            !string.IsNullOrWhiteSpace(userName) &&
            !string.IsNullOrWhiteSpace(chatbotOptions.BotUserName) &&
            string.Equals(
                userName.Trim(),
                chatbotOptions.BotUserName.Trim(),
                StringComparison.OrdinalIgnoreCase);
    }

    public bool IsConfiguredBotUniqueId(string uniqueId)
    {
        var chatbotOptions = options.Value;
        return chatbotOptions.Enabled &&
            !string.IsNullOrWhiteSpace(uniqueId) &&
            !string.IsNullOrWhiteSpace(chatbotOptions.BotUniqueId) &&
            string.Equals(
                uniqueId.Trim(),
                chatbotOptions.BotUniqueId.Trim(),
                StringComparison.Ordinal);
    }

    public async Task<ActiveUser?> EnsureBotUserAsync()
    {
        var chatbotOptions = options.Value;
        var botUniqueId = chatbotOptions.BotUniqueId.Trim();
        var botUserName = chatbotOptions.BotUserName.Trim();

        if (!chatbotOptions.Enabled ||
            string.IsNullOrWhiteSpace(botUniqueId) ||
            string.IsNullOrWhiteSpace(botUserName))
        {
            return null;
        }

        var existingByUniqueId =
            await activeUserRepository.GetActiveUserByUniqueId(botUniqueId);

        if (existingByUniqueId != null)
        {
            return existingByUniqueId;
        }

        var existingByUserName =
            await activeUserRepository.GetActiveUserByUserName(botUserName);

        if (existingByUserName != null)
        {
            logger.LogWarning(
                "Configured chatbot username {BotUserName} is already owned by unique ID {UniqueId}.",
                botUserName,
                existingByUserName.UniqueId);

            return null;
        }

        var botUser = new ActiveUser(
            botUserName,
            "System",
            DateTime.UtcNow,
            botUniqueId);

        var added = await activeUserRepository.AddActiveUserAsync(botUser);
        if (added)
        {
            return botUser;
        }

        return await activeUserRepository.GetActiveUserByUniqueId(botUniqueId);
    }
}
