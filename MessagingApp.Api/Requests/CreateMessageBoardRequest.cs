public class CreateMessageBoardRequest
{
    public string UniqueId { get; set; } = string.Empty;
    public string BoardName { get; set; } = string.Empty;
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string Password { get; set; } = string.Empty;
}