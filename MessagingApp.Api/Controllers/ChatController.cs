using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ChatController : ControllerBase
{
    private readonly IChatMessageRepository repository;

    private readonly IActiveUserRepository activeUserRepository;

    public ChatController(IChatMessageRepository repository, IActiveUserRepository activeUserRepository)
    {
        this.repository = repository;
        this.activeUserRepository = activeUserRepository;
    }

    [HttpGet("/chat-messages")]
    public async Task<List<ChatMessage>> GetChatMessages()
    {
        return await repository.GetChatMessagesAsync();
    }

    [HttpGet("/chat-messages/{id}")]
    public async Task<ChatMessage?> GetChatMessageById(int id)
    {
        return await repository.GetChatMessageByIdAsync(id);
    }

    [HttpPost("/chat-messages")]
    public async Task<IActionResult> AddChatMessageAsync([FromBody] CreateChatMessageModelRequest request)
    {
        // pseuo authentication - unique id
        // Check if the user is already in the active user repository,
        // if they are, check that they have a unique id that matches the one they sent with the request, 
        // if they do, update their last active time in the active user repository.
        // Get the username and timestamp + random string to hash a unique id for the user, 
        // then cache that in an active user repository with the users IP address. Then use that to send updates to the client when they come online.
        // Send unique id back to client, client sends that with every request, 
        // use that to update the last active time for the user in the active user repository. 
        // Then have a background service that runs every minute to remove inactive users from the active user repository based on a timeout value.
        // Get the users address, cache as an active user and use that to send updates to the client when they come online.
        var fromUserAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        // bool isUserActive = await activeUserRepository.IsUserActiveAsync(request.UniqueId);
        bool isUserActive = !string.IsNullOrWhiteSpace(request.UniqueId) && 
                            await activeUserRepository.IsUserActiveAsync(request.UniqueId);
        if (isUserActive)
        {
            // Create chat message
            var id = repository.GetNextId();
            var chatMessageRequest = new ChatMessage(
                id,
                request.FromUserName,
                request.ToUserName,
                request.LocalTimestamp,
                DateTime.UtcNow,
                request.Content
            );

            // Add chat message to repository
            await repository.AddChatMessageAsync(chatMessageRequest);

            // Update the users last active time in the active user repository.
            await activeUserRepository.UpdateActiveUserAsync(
                new ActiveUser(request.FromUserName, 
                                fromUserAddress, 
                                DateTime.UtcNow,
                                request.UniqueId));
            return Ok();
        }




        else // no active user found
        {
            // Does the username exist
            bool doesUserNameExist = await activeUserRepository.DoesUserExistAsync(request.FromUserName);
            if (doesUserNameExist)
            {
                return Unauthorized("Username already registered. Please use another username.");
            }
            else
            {
                string uniqueId = Guid.NewGuid().ToString();

                await activeUserRepository.AddActiveUserAsync(
                    new ActiveUser(
                        request.FromUserName,
                        fromUserAddress,
                        DateTime.UtcNow,
                        uniqueId
                    )
                );

                var id = repository.GetNextId();

                var chatMessageRequest = new ChatMessage(
                    id,
                    request.FromUserName,
                    request.ToUserName,
                    request.LocalTimestamp,
                    DateTime.UtcNow,
                    request.Content
                );

                await repository.AddChatMessageAsync(chatMessageRequest);

                return Ok(uniqueId);
            }
        }
    }

    [HttpPut("/chat-messages/{id}")]
    public async Task<bool> UpdateChatMessage(UpdateChatMessageModelRequest request)
    {
        var chatMessageRequest = new ChatMessage(
            request.Id,
            request.FromUserName,
            request.ToUserName,
            request.LocalTimestamp,
            DateTime.UtcNow,
            request.Content
        );
        
        return await repository.UpdateChatMessageAsync(chatMessageRequest);
    }

    [HttpDelete("/chat-messages/{id}")]
    public async Task<bool> DeleteChatMessage(int id)
    {
        return await repository.DeleteChatMessageAsync(id);
    }
}