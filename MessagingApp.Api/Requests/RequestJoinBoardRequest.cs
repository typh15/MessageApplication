public class RequestJoinBoardRequest
{
    public string UniqueBoardId {get; set;} = string.Empty;
    public string UniqueId { get; set; } = string.Empty;
    public string? Password{get; set;} = string.Empty;
}
