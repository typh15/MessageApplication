using System.Net;

public record ExpoPushSendResult(
    int MessageCount,
    bool IsSuccess,
    HttpStatusCode StatusCode,
    string ResponseBody);
