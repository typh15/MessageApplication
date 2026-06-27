using Microsoft.EntityFrameworkCore;

public class SqlImageRepository : IImageRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;

    public SqlImageRepository(IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public async Task<bool> AddImageAsync(ImageModel image)
    {
        if (image == null || string.IsNullOrWhiteSpace(image.ImageId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingImage = await dbContext.Images
            .AnyAsync(existing => existing.ImageId == image.ImageId);

        if (existingImage)
        {
            return false;
        }

        dbContext.Images.Add(new ImageRecord
        {
            ImageId = image.ImageId,
            OwnerUniqueId = image.OwnerUniqueId,
            ContentType = (int)image.ContentType,
            StoragePath = image.StoragePath,
            SizeBytes = image.SizeBytes,
            OriginalFileName = image.OriginalFileName,
            DateTimeOfCreation = image.DateTimeOfCreation
        });

        try
        {
            await dbContext.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public async Task<ImageModel?> GetImageAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var image = await dbContext.Images
            .AsNoTracking()
            .FirstOrDefaultAsync(existing => existing.ImageId == imageId);

        return image == null ? null : CreateImageModel(image);
    }

    public async Task<List<ImageModel>> GetImagesForOwnerAsync(string ownerUniqueId)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return new List<ImageModel>();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var images = await dbContext.Images
            .AsNoTracking()
            .Where(image => image.OwnerUniqueId == ownerUniqueId)
            .OrderBy(image => image.DateTimeOfCreation)
            .ThenBy(image => image.ImageId)
            .ToListAsync();

        return images
            .Select(CreateImageModel)
            .ToList();
    }

    public async Task<bool> DeleteImageAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var image = await dbContext.Images
            .FirstOrDefaultAsync(existing => existing.ImageId == imageId);

        if (image == null)
        {
            return false;
        }

        dbContext.Images.Remove(image);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ImageExistsAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        return await dbContext.Images
            .AnyAsync(image => image.ImageId == imageId);
    }

    private static ImageModel CreateImageModel(ImageRecord record)
    {
        return new ImageModel(
            record.ImageId,
            record.OwnerUniqueId,
            (ImageContentTypes)record.ContentType,
            record.StoragePath,
            record.SizeBytes,
            record.OriginalFileName)
        {
            DateTimeOfCreation = record.DateTimeOfCreation
        };
    }
}
