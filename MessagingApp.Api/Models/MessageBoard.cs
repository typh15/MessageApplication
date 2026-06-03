public class MessageBoard
{
    public int BoardId { get; set; } 
    public string BoardName { get; set; }
    public ActiveUser[] ActiveUsers { get; set; }
    public ChatMessage[] ChatMessages { get; set; }
    public bool VisableToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string Password { get; set; }

    public MessageBoard(int boardId, string boardName, ActiveUser[] activeUsers,  ChatMessage[] chatMessages, bool visableToPublic, bool passwordProtected, string password)
    {
        BoardId = boardId;
        BoardName = boardName;
        ActiveUsers = activeUsers;
        ChatMessages = chatMessages;
        VisableToPublic = visableToPublic;
        PasswordProtected = passwordProtected;
        Password = password;
    }
}