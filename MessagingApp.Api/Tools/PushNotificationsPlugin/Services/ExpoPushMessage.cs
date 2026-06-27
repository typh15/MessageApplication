using System.Text.Json.Serialization;

public class ExpoPushMessage
{
    [JsonPropertyName("to")]
    public string To { get; set; } = "";

    [JsonPropertyName("sound")]
    public string Sound { get; set; } = "default";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("body")]
    public string Body { get; set; } = "";

    [JsonPropertyName("data")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<string, object?>? Data { get; set; }

    [JsonPropertyName("channelId")]
    public string ChannelId { get; set; } = "messages";
}
