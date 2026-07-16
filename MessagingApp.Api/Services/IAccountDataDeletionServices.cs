public interface IAccountDataDeletionServices
{
    Task<bool> DeletePrimaryAccountDataAsync(string uniqueId);
}
