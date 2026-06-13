public interface IImageRepository
{
    Task<bool> AddImageAsync(ImageModel image);
    Task<ImageModel?> GetImageAsync(string imageId);
    Task<List<ImageModel>> GetImagesForOwnerAsync(string ownerUniqueId);
    Task<bool> DeleteImageAsync(string imageId);
    Task<bool> ImageExistsAsync(string imageId);
}
