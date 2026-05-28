public interface IChatMessageRepository
{
    Task<List<ChatMessage>> GetChatMessagesAsync();
    Task<ChatMessage?> GetChatMessageByIdAsync(int id);
    Task AddChatMessageAsync(ChatMessage chatMessage);
    Task<bool> UpdateChatMessageAsync(ChatMessage chatMessage);
    Task<bool> DeleteChatMessageAsync(int id);
    int GetNextId();
}