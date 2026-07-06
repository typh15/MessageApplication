public interface IPublicProfileServices
{
    Task<List<AccountDataUserNamesResponse>> GetAllPublicProfiles();
    Task<AccountDataUserNamesResponse?> GetPublicProfile(string userName);
}
