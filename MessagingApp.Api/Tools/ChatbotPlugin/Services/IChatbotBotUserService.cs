public interface IChatbotBotUserService
{
    bool IsConfiguredBotUserName(string userName);
    bool IsConfiguredBotUniqueId(string uniqueId);
    Task<ActiveUser?> EnsureBotUserAsync();
}
