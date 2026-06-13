public class ImageDataResponse
{
    public string ImageId { get; set; }
    public string OwnerUniqueId { get; set; }
    public string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public string OriginalFileName { get; set; }
    public DateTime DateTimeOfCreation { get; set; }

    public ImageDataResponse(
        string imageId,
        string ownerUniqueId,
        string contentType,
        long sizeBytes,
        string originalFileName,
        DateTime dateTimeOfCreation)
    {
        ImageId = imageId;
        OwnerUniqueId = ownerUniqueId;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        OriginalFileName = originalFileName;
        DateTimeOfCreation = dateTimeOfCreation;
    }
}
