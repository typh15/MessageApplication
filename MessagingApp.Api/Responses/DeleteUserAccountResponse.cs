public sealed class DeleteUserAccountResponse
{
    public DeleteUserAccountResponse(bool accountDeleted, bool primaryDataDeleted)
    {
        AccountDeleted = accountDeleted;
        PrimaryDataDeleted = primaryDataDeleted;
    }

    public bool AccountDeleted { get; }
    public bool PrimaryDataDeleted { get; }
}
