public sealed class SqlDataStoreOptions
{
    public const string SectionName = "Persistence";

    public string Provider { get; set; } = "Sqlite";
    public bool InitializeDatabaseOnStartup { get; set; } = true;
    public bool FailStartupOnInitializationError { get; set; } = false;
}
