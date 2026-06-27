using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

public static class SqlDataStoreRegistration
{
    private const string ConnectionStringName = "MessagingAppData";
    private const string SqliteProviderName = "Sqlite";
    private static readonly string[] RequiredTableNames =
    [
        "ActiveUsers",
        "UserAccounts",
        "MessageBoards",
        "MessageBoardMembers",
        "MessageBoardJoinRequests",
        "MessageBoardInvites",
        "ChatMessages",
        "Images",
        "PushNotificationSubscriptions"
    ];

    public static IServiceCollection AddSqlDataStore(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.Configure<SqlDataStoreOptions>(
            configuration.GetSection(SqlDataStoreOptions.SectionName));

        var options =
            configuration.GetSection(SqlDataStoreOptions.SectionName)
                .Get<SqlDataStoreOptions>() ?? new SqlDataStoreOptions();

        if (!string.Equals(options.Provider, SqliteProviderName, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Unsupported persistence provider '{options.Provider}'. The API currently supports '{SqliteProviderName}'.");
        }

        services.AddDbContextFactory<MessagingAppDbContext>(dbOptions =>
        {
            dbOptions.UseSqlite(CreateSqliteConnectionString(configuration, environment));
        });

        return services;
    }

    public static async Task InitializeSqlDataStoreAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<SqlDataStoreOptions>>().Value;
        var repositoryStorageOptions =
            scope.ServiceProvider.GetRequiredService<IOptions<RepositoryStorageOptions>>().Value;

        if (!options.InitializeDatabaseOnStartup)
        {
            return;
        }

        try
        {
            await InitializeSqliteDataStoreAsync(scope.ServiceProvider);
        }
        catch (Exception ex)
            when (!options.FailStartupOnInitializationError &&
                !repositoryStorageOptions.UsesSqliteRepositories())
        {
            Console.Error.WriteLine(
                "SQL data store initialization failed, but startup is continuing because " +
                $"{SqlDataStoreOptions.SectionName}:{nameof(SqlDataStoreOptions.FailStartupOnInitializationError)} is false. " +
                ex.Message);
        }
    }

    private static async Task InitializeSqliteDataStoreAsync(IServiceProvider services)
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var environment = services.GetRequiredService<IWebHostEnvironment>();
        var connectionString = CreateSqliteConnectionString(configuration, environment);
        var dbContextFactory = services.GetRequiredService<IDbContextFactory<MessagingAppDbContext>>();

        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        await ExecuteSqliteNonQueryAsync(connection, "PRAGMA journal_mode=DELETE;");

        var existingTableNames = await GetSqliteTableNamesAsync(connection);
        var missingTableNames = RequiredTableNames
            .Where(tableName => !existingTableNames.Contains(tableName))
            .ToList();

        if (missingTableNames.Count == 0)
        {
            return;
        }

        if (existingTableNames.Count > 0)
        {
            throw new InvalidOperationException(
                "The configured SQL database has a partial MessagingApp schema. " +
                $"Missing tables: {string.Join(", ", missingTableNames)}. " +
                "Point the connection string at a fresh database file, or remove the partial local database before retrying.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var createScript = dbContext.Database.GenerateCreateScript();
        await ExecuteSqliteScriptAsync(connection, createScript);
    }

    private static string CreateSqliteConnectionString(
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is required for SQL persistence.");
        }

        var builder = new SqliteConnectionStringBuilder(connectionString);
        builder.Pooling = false;

        if (!string.Equals(builder.DataSource, ":memory:", StringComparison.OrdinalIgnoreCase) &&
            !Path.IsPathFullyQualified(builder.DataSource))
        {
            var absoluteDataSource = Path.GetFullPath(
                Path.Combine(environment.ContentRootPath, builder.DataSource));

            var directory = Path.GetDirectoryName(absoluteDataSource);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            builder.DataSource = absoluteDataSource;
        }

        return builder.ToString();
    }

    private static async Task ExecuteSqliteNonQueryAsync(
        SqliteConnection connection,
        string commandText)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = commandText;
        await command.ExecuteNonQueryAsync();
    }

    private static async Task ExecuteSqliteScriptAsync(
        SqliteConnection connection,
        string script)
    {
        var statements = script
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(statement => !string.IsNullOrWhiteSpace(statement));

        foreach (var statement in statements)
        {
            try
            {
                await ExecuteSqliteNonQueryAsync(connection, statement);
            }
            catch (SqliteException ex)
            {
                throw new InvalidOperationException(
                    $"Unable to initialize the SQL schema while executing: {statement}",
                    ex);
            }
        }
    }

    private static async Task<HashSet<string>> GetSqliteTableNamesAsync(
        SqliteConnection connection)
    {
        var tableNames = new HashSet<string>(StringComparer.Ordinal);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';";

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            tableNames.Add(reader.GetString(0));
        }

        return tableNames;
    }
}
