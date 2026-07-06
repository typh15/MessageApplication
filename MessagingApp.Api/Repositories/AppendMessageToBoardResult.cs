public enum AppendMessageToBoardFailureReason
{
    None,
    BoardNotFound,
    PersistenceFailed
}

public sealed class AppendMessageToBoardResult
{
    private AppendMessageToBoardResult(
        ChatMessage? message,
        AppendMessageToBoardFailureReason failureReason,
        string? failureMessage)
    {
        Message = message;
        FailureReason = failureReason;
        FailureMessage = failureMessage;
    }

    public ChatMessage? Message { get; }
    public AppendMessageToBoardFailureReason FailureReason { get; }
    public string? FailureMessage { get; }
    public bool Succeeded => Message != null;

    public static AppendMessageToBoardResult Success(ChatMessage message)
    {
        return new AppendMessageToBoardResult(
            message,
            AppendMessageToBoardFailureReason.None,
            null);
    }

    public static AppendMessageToBoardResult Failure(
        AppendMessageToBoardFailureReason failureReason,
        string failureMessage)
    {
        return new AppendMessageToBoardResult(
            null,
            failureReason,
            failureMessage);
    }
}
