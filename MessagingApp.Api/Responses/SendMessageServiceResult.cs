public enum SendMessageFailureReason
{
    None,
    BoardNotFound,
    MissingUniqueId,
    InactiveUser,
    ActiveUserNotFound,
    NotBoardMember,
    MissingImageId,
    ImageNotFound,
    ImageOwnerMismatch,
    InvalidClientRequestId,
    PersistenceFailed
}

public sealed class SendMessageServiceResult
{
    private SendMessageServiceResult(
        SendMessageResponse? response,
        SendMessageFailureReason failureReason,
        string? failureMessage)
    {
        Response = response;
        FailureReason = failureReason;
        FailureMessage = failureMessage;
    }

    public SendMessageResponse? Response { get; }
    public SendMessageFailureReason FailureReason { get; }
    public string? FailureMessage { get; }
    public bool Succeeded => Response != null;

    public static SendMessageServiceResult Success(SendMessageResponse response)
    {
        return new SendMessageServiceResult(
            response,
            SendMessageFailureReason.None,
            null);
    }

    public static SendMessageServiceResult Failure(
        SendMessageFailureReason failureReason,
        string failureMessage)
    {
        return new SendMessageServiceResult(null, failureReason, failureMessage);
    }
}
