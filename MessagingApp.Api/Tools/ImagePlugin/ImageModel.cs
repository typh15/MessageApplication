public class ImageModel
{
    public string ImageId { get; set; }
    public string OwnerUniqueId { get; set; }
    public ImageContentTypes ContentType { get; set; }
    public string StoragePath { get; set; }
    public long SizeBytes { get; set; }
    public string OriginalFileName { get; set; }
    public DateTime DateTimeOfCreation { get; set; }

    public ImageModel(
        string imageId,
        string ownerUniqueId,
        ImageContentTypes contentType,
        string storagePath,
        long sizeBytes,
        string originalFileName)
    {
        ImageId = imageId;
        OwnerUniqueId = ownerUniqueId;
        ContentType = contentType;
        StoragePath = storagePath;
        SizeBytes = sizeBytes;
        OriginalFileName = originalFileName;
        DateTimeOfCreation = DateTime.UtcNow;
    }
}
