using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

public static class RepositoryRegistration
{
    public static IServiceCollection AddMessagingAppRepositories(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<RepositoryStorageOptions>(
            configuration.GetSection(RepositoryStorageOptions.SectionName));

        services.AddSingleton<IMessageBoardRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.MessageBoards,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new MessageBoardRepository();
            }

            if (string.Equals(
                options.MessageBoards,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlMessageBoardRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported message board repository storage '{options.MessageBoards}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        services.AddSingleton<IActiveUserRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.ActiveUsers,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new ActiveUserRepository();
            }

            if (string.Equals(
                options.ActiveUsers,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlActiveUserRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported active user repository storage '{options.ActiveUsers}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        services.AddSingleton<IPushNotificationRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.PushNotifications,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new PushNotificationRepository();
            }

            if (string.Equals(
                options.PushNotifications,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlPushNotificationRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported push notification repository storage '{options.PushNotifications}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        services.AddSingleton<IImageRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.Images,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new ImageRepository();
            }

            if (string.Equals(
                options.Images,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlImageRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported image repository storage '{options.Images}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        services.AddSingleton<IUserAccountRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.UserAccounts,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new UserAccountRepository();
            }

            if (string.Equals(
                options.UserAccounts,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlUserAccountRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported user account repository storage '{options.UserAccounts}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        services.AddSingleton<IConversationSummaryRepository>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RepositoryStorageOptions>>()
                .Value;

            if (string.Equals(
                options.ConversationSummaries,
                RepositoryStorageProviders.Memory,
                StringComparison.OrdinalIgnoreCase))
            {
                return new ConversationSummaryRepository();
            }

            if (string.Equals(
                options.ConversationSummaries,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase))
            {
                var dbContextFactory =
                    serviceProvider.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

                return new SqlConversationSummaryRepository(dbContextFactory);
            }

            throw new InvalidOperationException(
                $"Unsupported conversation summary repository storage '{options.ConversationSummaries}'. " +
                $"Use '{RepositoryStorageProviders.Memory}' or '{RepositoryStorageProviders.Sqlite}'.");
        });

        return services;
    }
}
