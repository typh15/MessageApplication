public sealed class ActiveUserRecord
{
    public string UniqueId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string NormalizedUserName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTime LastActiveTime { get; set; }

    public List<MessageBoardMemberRecord> BoardMemberships { get; set; } = [];
    public List<MessageBoardFavoriteRecord> FavoriteBoards { get; set; } = [];
    public List<MessageBoardJoinRequestRecord> BoardJoinRequests { get; set; } = [];
    public List<MessageBoardInviteRecord> BoardInvites { get; set; } = [];
}

public sealed class UserAccountRecord
{
    public string UniqueId { get; set; } = string.Empty;
    public string AuthId { get; set; } = string.Empty;
    public string NormalizedAuthId { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? AvatarImageId { get; set; }
    public string? PublicBlurb { get; set; }
}

public sealed class MessageBoardRecord
{
    public int BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
    public string NormalizedBoardName { get; set; } = string.Empty;
    public bool VisibleToPublic { get; set; }
    public bool PasswordProtected { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public int MostRecentMessageHash { get; set; }
    public string? UniqueBoardId { get; set; }

    public List<MessageBoardMemberRecord> Members { get; set; } = [];
    public List<MessageBoardFavoriteRecord> Favorites { get; set; } = [];
    public List<MessageBoardJoinRequestRecord> JoinRequests { get; set; } = [];
    public List<MessageBoardInviteRecord> Invites { get; set; } = [];
    public List<ChatMessageRecord> Messages { get; set; } = [];
}

public sealed class MessageBoardMemberRecord
{
    public int BoardId { get; set; }
    public string UserUniqueId { get; set; } = string.Empty;
    public DateTime AddedAtUtc { get; set; }

    public MessageBoardRecord? Board { get; set; }
    public ActiveUserRecord? User { get; set; }
}

public sealed class MessageBoardFavoriteRecord
{
    public int BoardId { get; set; }
    public string UserUniqueId { get; set; } = string.Empty;
    public DateTime FavoritedAtUtc { get; set; }

    public MessageBoardRecord? Board { get; set; }
    public ActiveUserRecord? User { get; set; }
}

public sealed class MessageBoardJoinRequestRecord
{
    public int BoardId { get; set; }
    public string UserUniqueId { get; set; } = string.Empty;
    public DateTime RequestedAtUtc { get; set; }

    public MessageBoardRecord? Board { get; set; }
    public ActiveUserRecord? User { get; set; }
}

public sealed class MessageBoardInviteRecord
{
    public int BoardId { get; set; }
    public string UserUniqueId { get; set; } = string.Empty;
    public DateTime InvitedAtUtc { get; set; }

    public MessageBoardRecord? Board { get; set; }
    public ActiveUserRecord? User { get; set; }
}

public sealed class ChatMessageRecord
{
    public int BoardId { get; set; }
    public int MessageId { get; set; }
    public string FromUserName { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = string.Empty;
    public DateTime ClientTimestamp { get; set; }
    public DateTime ServerTimestamp { get; set; }
    public string Content { get; set; } = string.Empty;
    public string GlobalId { get; set; } = string.Empty;
    public int Hash { get; set; }
    public int MessageType { get; set; }
    public string? ImageId { get; set; }

    public MessageBoardRecord? Board { get; set; }
}

public sealed class ConversationSummaryRecord
{
    public string ConversationId { get; set; } = string.Empty;
    public string SummaryText { get; set; } = string.Empty;
    public int SummaryThroughMessageId { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class ImageRecord
{
    public string ImageId { get; set; } = string.Empty;
    public string OwnerUniqueId { get; set; } = string.Empty;
    public int ContentType { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public DateTime DateTimeOfCreation { get; set; }
}

public sealed class PushNotificationSubscriptionRecord
{
    public string UniqueId { get; set; } = string.Empty;
    public string ExpoPushToken { get; set; } = string.Empty;
    public string? DeviceId { get; set; }
    public string? Platform { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
