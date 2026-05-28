class InMemoryRepository : IChatMessageRepository
{
    private readonly List<ChatMessage> chatMessages =
    [
    ];

    public Task<List<ChatMessage>> GetChatMessagesAsync()
    {
        return Task.FromResult(chatMessages.ToList());
    }

    public Task<ChatMessage?> GetChatMessageByIdAsync(int id)
    {
        var chatMessage = chatMessages.FirstOrDefault(a => a.Id == id);
        return Task.FromResult(chatMessage);
    }

    public Task AddChatMessageAsync(ChatMessage chatMessage)
    {
        var id = chatMessages.Count > 0 ? chatMessages.Max(a => a.Id) + 1 : 1;
        var NewChatMessage = new ChatMessage(
            id,
            chatMessage.FromUserName,
            chatMessage.ToUserName,
            chatMessage.Timestamp,
            chatMessage.Content
        );
        chatMessages.Add(NewChatMessage);
        return Task.CompletedTask;
    }

    public Task<bool> UpdateChatMessageAsync(ChatMessage chatMessage)
    {
        var existing = chatMessages.FirstOrDefault(a => a.Id == chatMessage.Id);
        if (existing != null)
        {
            existing.FromUserName = chatMessage.FromUserName;
            existing.ToUserName = chatMessage.ToUserName;
            existing.Timestamp = chatMessage.Timestamp;
            existing.Content = chatMessage.Content;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteChatMessageAsync(int id)
    {
        var chatMessage = chatMessages.FirstOrDefault(a => a.Id == id);
        if (chatMessage != null)
        {
            chatMessages.Remove(chatMessage);
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }
}