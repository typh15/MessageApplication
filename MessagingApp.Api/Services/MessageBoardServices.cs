public class MessageBoardServices : IMessageBoardServices
{
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;

    public MessageBoardServices(
        IMessageBoardRepository messageBoardRepository,
        IActiveUserRepository activeUserRepository)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
    }

    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId)
    {
        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);

        var visibleBoards = new List<MessageBoardDataResponse>();

        foreach (var board in boards)
        {
            board.IsFavorite = activeUser?.FavoriteMessageBoardIds.Contains(board.BoardId) == true;

            if (board.VisibleToPublic)
            {
                visibleBoards.Add(board);
                continue;
            }

            if (activeUser == null)
            {
                continue;
            }

            var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(
                board.BoardId,
                activeUser);

            if (userIsInBoard)
            {
                visibleBoards.Add(board);
            }
        }

        return visibleBoards;
    }

    public async Task<MessageBoardDataResponse?> GetMessageBoardByIdAsync(
        int boardId,
        string uniqueId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        if (board == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);
        if (!isUserActive)
        {
            return null;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);
        if (activeUser == null)
        {
            return null;
        }

        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            return null;
        }

        var boardData = await messageBoardRepository.GetMessageBoardDataByIdAsync(boardId);
        if (boardData != null)
        {
            boardData.IsFavorite = activeUser.FavoriteMessageBoardIds.Contains(boardId);
        }

        return boardData;
    }

    public async Task<MessageBoardDataResponse?> CreateMessageBoardAsync(
        string uniqueId,
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string password)
    {
        var boards = await messageBoardRepository.GetMessageBoardsAsync();

        var publicBoardNameExists = boards.Any(board =>
            board.VisibleToPublic &&
            string.Equals(board.BoardName, boardName, StringComparison.OrdinalIgnoreCase));

        if (visibleToPublic && publicBoardNameExists)
        {
            return null;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);
        if (activeUser == null)
        {
            return null;
        }

        return await messageBoardRepository.CreateMessageBoardAsync(
            activeUser,
            boardName,
            visibleToPublic,
            passwordProtected,
            password);
    }

    public async Task<List<string>> GetPublicBoardNames()
    {
        var boards = await messageBoardRepository.GetMessageBoardsAsync();

        return boards
            .Where(board => board.VisibleToPublic)
            .Select(board => board.BoardName)
            .ToList();
    }

    public async Task<bool> AddFavoriteBoardAsync(int boardId, string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
        if (!userIsInBoard)
        {
            return false;
        }

        return await activeUserRepository.AddFavoriteBoardAsync(uniqueId, boardId);
    }

    public async Task<bool> RemoveFavoriteBoardAsync(int boardId, string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        return await activeUserRepository.RemoveFavoriteBoardAsync(uniqueId, boardId);
    }
}
