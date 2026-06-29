public class MessageBoardDataResponse
{
    public int BoardId { get; set; } 
    public string BoardName { get; set; }
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string? UniqueBoardId { get; set; }
    public bool IsFavorite { get; set; }

    public MessageBoardDataResponse(
        int boardId,
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string? uniqueBoardId = "",
        bool isFavorite = false)
    {
        BoardId = boardId;
        BoardName = boardName;
        VisibleToPublic = visibleToPublic;
        PasswordProtected = passwordProtected;
        UniqueBoardId = uniqueBoardId;
        IsFavorite = isFavorite;
    }
}
