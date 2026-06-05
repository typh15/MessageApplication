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

        string uniqueIdToUse = request.UniqueId ?? "";

        bool isUserActive =
            !string.IsNullOrWhiteSpace(uniqueIdToUse)
            && await activeUserRepository.IsUserActiveAsync(uniqueIdToUse);

        ActiveUser activeUser;

        if (isUserActive)
        {
            activeUser = new ActiveUser(
                request.FromUserName,
                userAddress,
                DateTime.UtcNow,
                uniqueIdToUse
            );

            await activeUserRepository.UpdateActiveUserAsync(activeUser);
        }
        else
        {
            bool doesUserNameExist =
                await activeUserRepository.DoesUserExistAsync(request.FromUserName);

            if (doesUserNameExist)
            {
                return null;
            }

            uniqueIdToUse = Guid.NewGuid().ToString();

            activeUser = new ActiveUser(
                request.FromUserName,
                userAddress,
                DateTime.UtcNow,
                uniqueIdToUse
            );

            await activeUserRepository.AddActiveUserAsync(activeUser);
        }

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
            board,
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

        return new SendMessageResponse(uniqueIdToUse, chatMessage);
    }

    public async Task<bool> DeleteMessageAsync(int boardId, int messageId)
    {
        return await messageBoardRepository.DeleteMessageAsync(boardId, messageId);
    }
}