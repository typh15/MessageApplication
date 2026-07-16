public interface IImageServices
{
    long MaxImageSizeBytes { get; }

    Task<ImageModel?> SaveImageAsync(
        string ownerUniqueId,
        Stream imageData,
        string fileName,
        string contentType,
        long sizeBytes);

    Task<ImageModel?> GetImageAsync(string imageId);
    Task<ImageDownloadResponse?> GetImageFileAsync(string imageId);
    Task<List<ImageModel>> GetImagesForOwnerAsync(string ownerUniqueId);
    Task<bool> DeleteImageAsync(string imageId, string ownerUniqueId);
    Task<int> DeleteImagesForOwnerAsync(string ownerUniqueId);
    Task ClearStoredImagesAsync();
    bool IsSupportedContentType(string contentType);
    string GetHttpContentType(ImageContentTypes contentType);
}
