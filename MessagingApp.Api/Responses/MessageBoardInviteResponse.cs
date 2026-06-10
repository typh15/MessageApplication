public class MessageBoardInviteResponse
{
    public int BoardId { get; set; }
    public string BoardName { get; set; }
    public string? UniqueBoardId { get; set; }

    public MessageBoardInviteResponse(int boardId, string boardName, string? uniqueBoardId)
    {
        BoardId = boardId;
        BoardName = boardName;
        UniqueBoardId = uniqueBoardId;
    }
}