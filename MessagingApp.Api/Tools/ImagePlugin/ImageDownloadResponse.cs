public class ImageDownloadResponse
{
    public ImageModel Metadata { get; set; }
    public Stream Content { get; set; }
    public string HttpContentType { get; set; }

    public ImageDownloadResponse(ImageModel metadata, Stream content, string httpContentType)
    {
        Metadata = metadata;
        Content = content;
        HttpContentType = httpContentType;
    }
}
