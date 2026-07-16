using Microsoft.EntityFrameworkCore;

public sealed class MessagingAppDbContext : DbContext
{
    public MessagingAppDbContext(DbContextOptions<MessagingAppDbContext> options)
        : base(options)
    {
    }

    public DbSet<ActiveUserRecord> ActiveUsers => Set<ActiveUserRecord>();
    public DbSet<UserAccountRecord> UserAccounts => Set<UserAccountRecord>();
    public DbSet<MessageBoardRecord> MessageBoards => Set<MessageBoardRecord>();
    public DbSet<MessageBoardMemberRecord> MessageBoardMembers => Set<MessageBoardMemberRecord>();
    public DbSet<MessageBoardFavoriteRecord> MessageBoardFavorites => Set<MessageBoardFavoriteRecord>();
    public DbSet<MessageBoardJoinRequestRecord> MessageBoardJoinRequests => Set<MessageBoardJoinRequestRecord>();
    public DbSet<MessageBoardInviteRecord> MessageBoardInvites => Set<MessageBoardInviteRecord>();
    public DbSet<ChatMessageRecord> ChatMessages => Set<ChatMessageRecord>();
    public DbSet<ConversationSummaryRecord> ConversationSummaries => Set<ConversationSummaryRecord>();
    public DbSet<ImageRecord> Images => Set<ImageRecord>();
    public DbSet<PushNotificationSubscriptionRecord> PushNotificationSubscriptions =>
        Set<PushNotificationSubscriptionRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureActiveUsers(modelBuilder);
        ConfigureUserAccounts(modelBuilder);
        ConfigureMessageBoards(modelBuilder);
        ConfigureMessageBoardMembers(modelBuilder);
        ConfigureMessageBoardFavorites(modelBuilder);
        ConfigureMessageBoardJoinRequests(modelBuilder);
        ConfigureMessageBoardInvites(modelBuilder);
        ConfigureChatMessages(modelBuilder);
        ConfigureConversationSummaries(modelBuilder);
        ConfigureImages(modelBuilder);
        ConfigurePushNotificationSubscriptions(modelBuilder);
    }

    private static void ConfigureActiveUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ActiveUserRecord>(entity =>
        {
            entity.ToTable("ActiveUsers");
            entity.HasKey(user => user.UniqueId);

            entity.Property(user => user.UniqueId).HasMaxLength(64);
            entity.Property(user => user.UserName).HasMaxLength(128).IsRequired();
            entity.Property(user => user.NormalizedUserName).HasMaxLength(128).IsRequired();
            entity.Property(user => user.Address).HasMaxLength(256).IsRequired();
            entity.Property(user => user.LastActiveTime).IsRequired();

            entity.HasIndex(user => user.NormalizedUserName).IsUnique();
        });
    }

    private static void ConfigureUserAccounts(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccountRecord>(entity =>
        {
            entity.ToTable("UserAccounts");
            entity.HasKey(account => account.UniqueId);

            entity.Property(account => account.UniqueId).HasMaxLength(64);
            entity.Property(account => account.AuthId).HasMaxLength(128).IsRequired();
            entity.Property(account => account.NormalizedAuthId).HasMaxLength(128).IsRequired();
            entity.Property(account => account.PasswordHash).IsRequired();
            entity.Property(account => account.DisplayName).HasMaxLength(128);
            entity.Property(account => account.AvatarImageId).HasMaxLength(64);
            entity.Property(account => account.PublicBlurb).HasMaxLength(2000);

            entity.HasIndex(account => account.NormalizedAuthId).IsUnique();
        });
    }

    private static void ConfigureMessageBoards(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MessageBoardRecord>(entity =>
        {
            entity.ToTable("MessageBoards");
            entity.HasKey(board => board.BoardId);

            entity.Property(board => board.BoardId).ValueGeneratedOnAdd();
            entity.Property(board => board.BoardName).HasMaxLength(200).IsRequired();
            entity.Property(board => board.NormalizedBoardName).HasMaxLength(200).IsRequired();
            entity.Property(board => board.PasswordHash).IsRequired();
            entity.Property(board => board.UniqueBoardId).HasMaxLength(32);

            entity.HasIndex(board => board.NormalizedBoardName);
            entity.HasIndex(board => board.UniqueBoardId).IsUnique();
        });
    }

    private static void ConfigureMessageBoardMembers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MessageBoardMemberRecord>(entity =>
        {
            entity.ToTable("MessageBoardMembers");
            entity.HasKey(member => new { member.BoardId, member.UserUniqueId });

            entity.Property(member => member.UserUniqueId).HasMaxLength(64);
            entity.Property(member => member.AddedAtUtc).IsRequired();

            entity.HasOne(member => member.Board)
                .WithMany(board => board.Members)
                .HasForeignKey(member => member.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(member => member.User)
                .WithMany(user => user.BoardMemberships)
                .HasForeignKey(member => member.UserUniqueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureMessageBoardFavorites(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MessageBoardFavoriteRecord>(entity =>
        {
            entity.ToTable("MessageBoardFavorites");
            entity.HasKey(favorite => new { favorite.BoardId, favorite.UserUniqueId });

            entity.Property(favorite => favorite.UserUniqueId).HasMaxLength(64);
            entity.Property(favorite => favorite.FavoritedAtUtc).IsRequired();

            entity.HasOne(favorite => favorite.Board)
                .WithMany(board => board.Favorites)
                .HasForeignKey(favorite => favorite.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(favorite => favorite.User)
                .WithMany(user => user.FavoriteBoards)
                .HasForeignKey(favorite => favorite.UserUniqueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureMessageBoardJoinRequests(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MessageBoardJoinRequestRecord>(entity =>
        {
            entity.ToTable("MessageBoardJoinRequests");
            entity.HasKey(request => new { request.BoardId, request.UserUniqueId });

            entity.Property(request => request.UserUniqueId).HasMaxLength(64);
            entity.Property(request => request.RequestedAtUtc).IsRequired();

            entity.HasOne(request => request.Board)
                .WithMany(board => board.JoinRequests)
                .HasForeignKey(request => request.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(request => request.User)
                .WithMany(user => user.BoardJoinRequests)
                .HasForeignKey(request => request.UserUniqueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureMessageBoardInvites(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MessageBoardInviteRecord>(entity =>
        {
            entity.ToTable("MessageBoardInvites");
            entity.HasKey(invite => new { invite.BoardId, invite.UserUniqueId });

            entity.Property(invite => invite.UserUniqueId).HasMaxLength(64);
            entity.Property(invite => invite.InvitedAtUtc).IsRequired();

            entity.HasOne(invite => invite.Board)
                .WithMany(board => board.Invites)
                .HasForeignKey(invite => invite.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(invite => invite.User)
                .WithMany(user => user.BoardInvites)
                .HasForeignKey(invite => invite.UserUniqueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureChatMessages(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ChatMessageRecord>(entity =>
        {
            entity.ToTable("ChatMessages");
            entity.HasKey(message => new { message.BoardId, message.MessageId });

            entity.Property(message => message.FromUserName).HasMaxLength(128).IsRequired();
            entity.Property(message => message.FromDisplayName).HasMaxLength(128).IsRequired();
            entity.Property(message => message.Content).HasMaxLength(4000).IsRequired();
            entity.Property(message => message.GlobalId).HasMaxLength(128).IsRequired();
            entity.Property(message => message.ImageId).HasMaxLength(64);
            entity.Property(message => message.ClientRequestId).HasMaxLength(64);

            entity.HasIndex(message => message.GlobalId).IsUnique();
            entity.HasIndex(message => new
                {
                    message.BoardId,
                    message.FromUserName,
                    message.ClientRequestId
                })
                .IsUnique()
                .HasFilter("\"ClientRequestId\" IS NOT NULL");

            entity.HasOne(message => message.Board)
                .WithMany(board => board.Messages)
                .HasForeignKey(message => message.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureImages(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ImageRecord>(entity =>
        {
            entity.ToTable("Images");
            entity.HasKey(image => image.ImageId);

            entity.Property(image => image.ImageId).HasMaxLength(64);
            entity.Property(image => image.OwnerUniqueId).HasMaxLength(64).IsRequired();
            entity.Property(image => image.StoragePath).HasMaxLength(1024).IsRequired();
            entity.Property(image => image.OriginalFileName).HasMaxLength(255).IsRequired();
            entity.Property(image => image.DateTimeOfCreation).IsRequired();

            entity.HasIndex(image => image.OwnerUniqueId);
        });
    }

    private static void ConfigureConversationSummaries(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConversationSummaryRecord>(entity =>
        {
            entity.ToTable("ConversationSummaries");
            entity.HasKey(summary => summary.ConversationId);

            entity.Property(summary => summary.ConversationId).HasMaxLength(128);
            entity.Property(summary => summary.SummaryText).IsRequired();
            entity.Property(summary => summary.SummaryThroughMessageId).IsRequired();
            entity.Property(summary => summary.UpdatedAtUtc).IsRequired();
        });
    }

    private static void ConfigurePushNotificationSubscriptions(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PushNotificationSubscriptionRecord>(entity =>
        {
            entity.ToTable("PushNotificationSubscriptions");
            entity.HasKey(subscription => new
            {
                subscription.UniqueId,
                subscription.ExpoPushToken
            });

            entity.Property(subscription => subscription.UniqueId).HasMaxLength(64);
            entity.Property(subscription => subscription.ExpoPushToken).HasMaxLength(256);
            entity.Property(subscription => subscription.DeviceId).HasMaxLength(256);
            entity.Property(subscription => subscription.Platform).HasMaxLength(64);
            entity.Property(subscription => subscription.UpdatedAtUtc).IsRequired();

            entity.HasIndex(subscription => subscription.ExpoPushToken).IsUnique();
        });
    }
}
