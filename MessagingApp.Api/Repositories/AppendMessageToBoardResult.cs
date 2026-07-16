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
        string? failureMessage,
        bool wasCreated)
    {
        Message = message;
        FailureReason = failureReason;
        FailureMessage = failureMessage;
        WasCreated = wasCreated;
    }

    public ChatMessage? Message { get; }
    public AppendMessageToBoardFailureReason FailureReason { get; }
    public string? FailureMessage { get; }
    public bool Succeeded => Message != null;
    public bool WasCreated { get; }

    public static AppendMessageToBoardResult Success(
        ChatMessage message,
        bool wasCreated = true)
    {
        return new AppendMessageToBoardResult(
            message,
            AppendMessageToBoardFailureReason.None,
            null,
            wasCreated);
    }

    public static AppendMessageToBoardResult Failure(
        AppendMessageToBoardFailureReason failureReason,
        string failureMessage)
    {
        return new AppendMessageToBoardResult(
            null,
            failureReason,
            failureMessage,
            false);
    }
}
