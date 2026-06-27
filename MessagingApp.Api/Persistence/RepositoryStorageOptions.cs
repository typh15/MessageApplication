public sealed class RepositoryStorageOptions
{
    public const string SectionName = "RepositoryStorage";

    public string ActiveUsers { get; set; } = RepositoryStorageProviders.Sqlite;
    public string MessageBoards { get; set; } = RepositoryStorageProviders.Sqlite;
    public string UserAccounts { get; set; } = RepositoryStorageProviders.Sqlite;
    public string Images { get; set; } = RepositoryStorageProviders.Sqlite;
    public string PushNotifications { get; set; } = RepositoryStorageProviders.Sqlite;

    public bool UsesSqliteRepositories()
    {
        return string.Equals(
            ActiveUsers,
            RepositoryStorageProviders.Sqlite,
            StringComparison.OrdinalIgnoreCase) ||
            string.Equals(
                MessageBoards,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase) ||
            string.Equals(
            UserAccounts,
            RepositoryStorageProviders.Sqlite,
            StringComparison.OrdinalIgnoreCase) ||
            string.Equals(
                Images,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase) ||
            string.Equals(
                PushNotifications,
                RepositoryStorageProviders.Sqlite,
                StringComparison.OrdinalIgnoreCase);
    }
}

public static class RepositoryStorageProviders
{
    public const string Memory = "Memory";
    public const string Sqlite = "Sqlite";
}
