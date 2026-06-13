using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ImagesController : ControllerBase
{
    private readonly IImageServices imageServices;

    public ImagesController(IImageServices imageServices)
    {
        this.imageServices = imageServices;
    }

    [HttpPost("/images")]
    public async Task<IActionResult> UploadImageAsync(
        [FromForm] string ownerUniqueId,
        [FromForm] IFormFile image)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return BadRequest("Owner unique ID is required.");
        }

        if (image == null || image.Length <= 0)
        {
            return BadRequest("Image file is required.");
        }

        if (image.Length > imageServices.MaxImageSizeBytes)
        {
            return BadRequest($"Image must be {imageServices.MaxImageSizeBytes} bytes or smaller.");
        }

        if (!imageServices.IsSupportedContentType(image.ContentType))
        {
            return BadRequest("Only JPEG, PNG, and WebP images are supported.");
        }

        ImageModel? savedImage;
        using (var imageStream = image.OpenReadStream())
        {
            savedImage = await imageServices.SaveImageAsync(
                ownerUniqueId,
                imageStream,
                image.FileName,
                image.ContentType,
                image.Length);
        }

        if (savedImage == null)
        {
            return BadRequest("Unable to save image.");
        }

        return Ok(CreateImageDataResponse(savedImage));
    }

    [HttpGet("/images/{imageId}")]
    public async Task<IActionResult> GetImageFileAsync(string imageId)
    {
        var imageDownload = await imageServices.GetImageFileAsync(imageId);

        if (imageDownload == null)
        {
            return NotFound("Image was not found.");
        }

        return File(imageDownload.Content, imageDownload.HttpContentType);
    }

    [HttpGet("/images/{imageId}/metadata")]
    public async Task<IActionResult> GetImageMetadataAsync(string imageId)
    {
        var image = await imageServices.GetImageAsync(imageId);

        if (image == null)
        {
            return NotFound("Image was not found.");
        }

        return Ok(CreateImageDataResponse(image));
    }

    [HttpGet("/images/owners/{ownerUniqueId}")]
    public async Task<IActionResult> GetImagesForOwnerAsync(string ownerUniqueId)
    {
        var images = await imageServices.GetImagesForOwnerAsync(ownerUniqueId);
        var responses = images
            .Select(image => CreateImageDataResponse(image))
            .ToList();

        return Ok(responses);
    }

    [HttpDelete("/images/{imageId}")]
    public async Task<IActionResult> DeleteImageAsync(string imageId, string ownerUniqueId)
    {
        if (string.IsNullOrWhiteSpace(ownerUniqueId))
        {
            return BadRequest("Owner unique ID is required.");
        }

        var deleted = await imageServices.DeleteImageAsync(imageId, ownerUniqueId);

        if (!deleted)
        {
            return NotFound("Image was not found for that owner.");
        }

        return Ok();
    }

    private ImageDataResponse CreateImageDataResponse(ImageModel image)
    {
        return new ImageDataResponse(
            image.ImageId,
            image.OwnerUniqueId,
            imageServices.GetHttpContentType(image.ContentType),
            image.SizeBytes,
            image.OriginalFileName,
            image.DateTimeOfCreation);
    }
}
