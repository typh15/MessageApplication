public class ImageRepository : IImageRepository
{
    private readonly List<ImageModel> images = new List<ImageModel>();

    public Task<bool> AddImageAsync(ImageModel image)
    {
        if (image == null || string.IsNullOrWhiteSpace(image.ImageId))
        {
            return Task.FromResult(false);
        }

        var existingImage = images.FirstOrDefault(i => i.ImageId == image.ImageId);
        if (existingImage == null)
        {
            images.Add(image);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public Task<ImageModel?> GetImageAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return Task.FromResult<ImageModel?>(null);
        }

        var image = images.FirstOrDefault(i => i.ImageId == imageId);
        return Task.FromResult(image);
    }

    public Task<List<ImageModel>> GetImagesForOwnerAsync(string ownerUniqueId)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return Task.FromResult(new List<ImageModel>());
        }

        var ownerImages = images
            .Where(image => image.OwnerUniqueId == ownerUniqueId)
            .ToList();

        return Task.FromResult(ownerImages);
    }

    public Task<bool> DeleteImageAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return Task.FromResult(false);
        }

        var image = images.FirstOrDefault(i => i.ImageId == imageId);
        if (image != null)
        {
            images.Remove(image);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public Task<bool> ImageExistsAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return Task.FromResult(false);
        }

        var image = images.FirstOrDefault(i => i.ImageId == imageId);
        return Task.FromResult(image != null);
    }
}
