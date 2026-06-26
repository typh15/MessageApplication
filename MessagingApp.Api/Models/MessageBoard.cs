public class MessageBoard
{
    public int BoardId { get; set; } 
    public string BoardName { get; set; }
    public ActiveUser[] ActiveUsers { get; set; }
    public ChatMessage[] ChatMessages { get; set; }
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string PasswordHash { get; set; }
    public int MostRecentMessageHash { get; set; }
    public ActiveUser[] UserRequests {get; set;}
    public string? UniqueBoardId { get; set; }
    public ActiveUser[] UserInvites { get; set; }


    public MessageBoard(int boardId, string boardName, ActiveUser[] activeUsers,  ChatMessage[] chatMessages, bool visibleToPublic, bool passwordProtected, string passwordHash, ActiveUser[] userRequests, ActiveUser[] userInvites, string? uniqueBoardId = "")
    {
        BoardId = boardId;
        BoardName = boardName;
        ActiveUsers = activeUsers;
        ChatMessages = chatMessages;
        VisibleToPublic = visibleToPublic;
        PasswordProtected = passwordProtected;
        PasswordHash = passwordHash;
        MostRecentMessageHash = 0;
        UserRequests = userRequests;
        UniqueBoardId = uniqueBoardId;
        UserInvites = userInvites;
    }
}
