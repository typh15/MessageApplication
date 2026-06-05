public class ChatService : IChatService
{
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;

    public ChatService(
        IMessageBoardRepository messageBoardRepository,
        IActiveUserRepository activeUserRepository)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
    }

    public async Task<List<MessageBoard>> GetMessageBoardsAsync()
    {
        return await messageBoardRepository.GetMessageBoardsAsync();
    }

    public async Task<MessageBoard?> GetMessageBoardByIdAsync(int boardId)
    {
        return await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
    }

    public async Task<MessageBoard?> CreateMessageBoardAsync(
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string password)
    {
        return await messageBoardRepository.CreateMessageBoardAsync(
            boardName,
            visibleToPublic,
            passwordProtected,
            password
        );
    }

    public async Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return new List<ChatMessage>();
        }

        return board.ChatMessages.ToList();
    }

    public async Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress)
    {
        bool doesUserNameExist = await activeUserRepository.DoesUserExistAsync(userName);
        
        if (doesUserNameExist)
        {
            return null;
        }

        string uniqueId = Guid.NewGuid().ToString();
        
        var activeUser = new ActiveUser(
            userName,
            userAddress,
            DateTime.UtcNow,
            uniqueId
        );

        await activeUserRepository.AddActiveUserAsync(activeUser);

        return new CreateActiveUserResponse(userName, uniqueId);
    }

    public async Task<SendMessageResponse?> SendMessageToBoardAsync(
        int boardId,
        CreateChatMessageRequest request,
        string userAddress)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return null;
        }

        string uniqueId = request.UniqueId ?? "";

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return null;
        }

        var activeUsers = await activeUserRepository.GetActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return null;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        bool userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            await messageBoardRepository.AddUserToBoardAsync(boardId, activeUser);
        }

        int messageId = messageBoardRepository.GetNextMessageId(boardId);

        var chatMessage = new ChatMessage(
            messageId,
            request.FromUserName,
            boardId,
            request.LocalTimestamp,
            DateTime.UtcNow,
            request.Content
        );

        chatMessage.AssignGlobalId();

        bool messageWasAdded =
            await messageBoardRepository.AddMessageToBoardAsync(boardId, chatMessage);

        if (!messageWasAdded)
        {
            return null;
        }

        return new SendMessageResponse(uniqueId, chatMessage);
    }

    public async Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        bool userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
        if (!userIsAlreadyInBoard)
        {
            await messageBoardRepository.AddUserToBoardAsync(boardId, activeUser);
        }

        return true;
    }

    public async Task<bool> DeleteMessageAsync(int boardId, int messageId)
    {
        return await messageBoardRepository.DeleteMessageAsync(boardId, messageId);
    }
}