public class MessageBoard
{
    public int BoardId { get; set; } 
    public string BoardName { get; set; }
    public ActiveUser[] ActiveUsers { get; set; }
    public ChatMessage[] ChatMessages { get; set; }
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string Password { get; set; }
    public int MostRecentMessageHash { get; set; }

    public MessageBoard(int boardId, string boardName, ActiveUser[] activeUsers,  ChatMessage[] chatMessages, bool visibleToPublic, bool passwordProtected, string password)
    {
        BoardId = boardId;
        BoardName = boardName;
        ActiveUsers = activeUsers;
        ChatMessages = chatMessages;
        VisibleToPublic = visibleToPublic;
        PasswordProtected = passwordProtected;
        Password = password;
        MostRecentMessageHash = 0;
    }
}