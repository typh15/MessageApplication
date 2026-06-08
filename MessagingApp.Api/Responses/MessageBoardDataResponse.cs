public class MessageBoardDataResponse
{
    public int BoardId { get; set; } 
    public string BoardName { get; set; }
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }

    public MessageBoardDataResponse(int boardId, string boardName, bool visibleToPublic, bool passwordProtected)
    {
        BoardId = boardId;
        BoardName = boardName;
        VisibleToPublic = visibleToPublic;
        PasswordProtected = passwordProtected;
    }
}
