public class AccountDataDeletionServices : IAccountDataDeletionServices
{
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IImageServices imageServices;
    private readonly IPushNotificationServices pushNotificationServices;
    private readonly ILogger<AccountDataDeletionServices> logger;

    public AccountDataDeletionServices(
        IActiveUserRepository activeUserRepository,
        IMessageBoardRepository messageBoardRepository,
        IImageServices imageServices,
        IPushNotificationServices pushNotificationServices,
        ILogger<AccountDataDeletionServices> logger)
    {
        this.activeUserRepository = activeUserRepository;
        this.messageBoardRepository = messageBoardRepository;
        this.imageServices = imageServices;
        this.pushNotificationServices = pushNotificationServices;
        this.logger = logger;
    }

    public async Task<bool> DeletePrimaryAccountDataAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        try
        {
            await imageServices.DeleteImagesForOwnerAsync(uniqueId);
            await pushNotificationServices.DeleteSubscriptionsForUserAsync(uniqueId);
        }
        catch (Exception ex)
        {
            TryLogExternalDataDeletionWarning(ex, uniqueId);
            return false;
        }

        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
        if (activeUser != null)
        {
            var boardDataDeleted = await messageBoardRepository.DeleteUserBoardDataAsync(activeUser);
            var activeUserDeleted = await activeUserRepository.RemoveActiveUserByUniqueIdAsync(uniqueId);

            if (!boardDataDeleted || !activeUserDeleted)
            {
                return false;
            }
        }

        return true;
    }

    private void TryLogExternalDataDeletionWarning(Exception exception, string uniqueId)
    {
        try
        {
            logger.LogWarning(
                exception,
                "Unable to delete external account data for user {UniqueId}. Account deletion was not completed.",
                uniqueId);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(
                $"External account data deletion logging failed for user {uniqueId}: {ex.Message}");
        }
    }
}
