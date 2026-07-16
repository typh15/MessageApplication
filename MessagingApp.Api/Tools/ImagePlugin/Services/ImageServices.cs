public class ImageServices : IImageServices
{
    private const long DefaultMaxImageSizeBytes = 5 * 1024 * 1024;

    private readonly IImageRepository imageRepository;
    private readonly ILogger<ImageServices> logger;
    private readonly string imageStorageRoot;

    public long MaxImageSizeBytes
    {
        get { return DefaultMaxImageSizeBytes; }
    }

    public ImageServices(
        IImageRepository imageRepository,
        IWebHostEnvironment environment,
        ILogger<ImageServices> logger)
    {
        this.imageRepository = imageRepository;
        this.logger = logger;
        imageStorageRoot = Path.Combine(environment.ContentRootPath, "App_Data", "images");

        Directory.CreateDirectory(imageStorageRoot);
    }

    public async Task<ImageModel?> SaveImageAsync(
        string ownerUniqueId,
        Stream imageData,
        string fileName,
        string contentType,
        long sizeBytes)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return null;
        }

        if (imageData == null || !imageData.CanRead)
        {
            return null;
        }

        if (sizeBytes <= 0 || sizeBytes > MaxImageSizeBytes)
        {
            return null;
        }

        if (!IsSupportedContentType(contentType))
        {
            return null;
        }

        var imageContentType = GetImageContentType(contentType);
        var fileExtension = GetFileExtension(imageContentType);
        var imageId = Guid.NewGuid().ToString("N");
        var safeFileName = Path.GetFileName(fileName);
        var storagePath = Path.Combine(imageStorageRoot, $"{imageId}{fileExtension}");

        using (var fileStream = new FileStream(storagePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await imageData.CopyToAsync(fileStream);
        }

        var storedSizeBytes = new FileInfo(storagePath).Length;
        if (storedSizeBytes <= 0 || storedSizeBytes > MaxImageSizeBytes)
        {
            File.Delete(storagePath);
            return null;
        }

        var image = new ImageModel(
            imageId,
            ownerUniqueId,
            imageContentType,
            storagePath,
            storedSizeBytes,
            safeFileName);

        var imageWasAdded = await imageRepository.AddImageAsync(image);
        if (!imageWasAdded)
        {
            File.Delete(storagePath);
            return null;
        }

        return image;
    }

    public Task<ImageModel?> GetImageAsync(string imageId)
    {
        return imageRepository.GetImageAsync(imageId);
    }

    public async Task<ImageDownloadResponse?> GetImageFileAsync(string imageId)
    {
        var image = await imageRepository.GetImageAsync(imageId);
        if (image == null || !File.Exists(image.StoragePath))
        {
            return null;
        }

        var stream = new FileStream(image.StoragePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return new ImageDownloadResponse(image, stream, GetHttpContentType(image.ContentType));
    }

    public Task<List<ImageModel>> GetImagesForOwnerAsync(string ownerUniqueId)
    {
        return imageRepository.GetImagesForOwnerAsync(ownerUniqueId);
    }

    public async Task<bool> DeleteImageAsync(string imageId, string ownerUniqueId)
    {
        var image = await imageRepository.GetImageAsync(imageId);
        if (image == null || image.OwnerUniqueId != ownerUniqueId)
        {
            return false;
        }

        TryDeleteStoredImageFile(image);

        return await imageRepository.DeleteImageAsync(imageId);
    }

    public async Task<int> DeleteImagesForOwnerAsync(string ownerUniqueId)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return 0;
        }

        var images = await imageRepository.GetImagesForOwnerAsync(ownerUniqueId);
        var deletedCount = 0;

        foreach (var image in images)
        {
            TryDeleteStoredImageFile(image);

            if (await imageRepository.DeleteImageAsync(image.ImageId))
            {
                deletedCount++;
            }
        }

        return deletedCount;
    }

    public Task ClearStoredImagesAsync()
    {
        if (Directory.Exists(imageStorageRoot))
        {
            Directory.Delete(imageStorageRoot, true);
        }

        Directory.CreateDirectory(imageStorageRoot);
        return Task.CompletedTask;
    }

    public bool IsSupportedContentType(string contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return false;
        }

        var normalizedContentType = contentType.Trim().ToLowerInvariant();

        return normalizedContentType == "image/jpeg" ||
               normalizedContentType == "image/jpg" ||
               normalizedContentType == "image/png" ||
               normalizedContentType == "image/webp";
    }

    public string GetHttpContentType(ImageContentTypes contentType)
    {
        if (contentType == ImageContentTypes.Jpeg)
        {
            return "image/jpeg";
        }

        if (contentType == ImageContentTypes.Png)
        {
            return "image/png";
        }

        if (contentType == ImageContentTypes.Webp)
        {
            return "image/webp";
        }

        return "application/octet-stream";
    }

    private static ImageContentTypes GetImageContentType(string contentType)
    {
        var normalizedContentType = contentType.Trim().ToLowerInvariant();

        if (normalizedContentType == "image/png")
        {
            return ImageContentTypes.Png;
        }

        if (normalizedContentType == "image/webp")
        {
            return ImageContentTypes.Webp;
        }

        return ImageContentTypes.Jpeg;
    }

    private static string GetFileExtension(ImageContentTypes contentType)
    {
        if (contentType == ImageContentTypes.Png)
        {
            return ".png";
        }

        if (contentType == ImageContentTypes.Webp)
        {
            return ".webp";
        }

        return ".jpg";
    }

    private void TryDeleteStoredImageFile(ImageModel image)
    {
        try
        {
            if (File.Exists(image.StoragePath))
            {
                File.Delete(image.StoragePath);
            }
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException)
        {
            TryLogImageFileDeleteWarning(ex, image);
        }
    }

    private void TryLogImageFileDeleteWarning(Exception exception, ImageModel image)
    {
        try
        {
            logger.LogWarning(
                exception,
                "Unable to delete stored image file {ImageId} at {StoragePath}. The image metadata will still be removed.",
                image.ImageId,
                image.StoragePath);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(
                $"Image file deletion logging failed for {image.ImageId}: {ex.Message}");
        }
    }
}
