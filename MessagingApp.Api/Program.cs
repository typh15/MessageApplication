using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
var useForwardedHeaders = builder.Configuration.GetValue("BetaServer:UseForwardedHeaders", false);
var useHttpsRedirection = builder.Configuration.GetValue("BetaServer:UseHttpsRedirection", true);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

//builder.Services.AddOpenApi();
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

builder.Services.AddSqlDataStore(builder.Configuration, builder.Environment);
builder.Services.Configure<ImageStorageOptions>(
    builder.Configuration.GetSection(ImageStorageOptions.SectionName));
builder.Services.Configure<ChatbotOptions>(
    builder.Configuration.GetSection(ChatbotOptions.SectionName));
builder.Services.AddMessagingAppRepositories(builder.Configuration);

builder.Services.AddSingleton<IChatServices, ChatServices>();

builder.Services.AddSingleton<IAccountServices, AccountServices>();

builder.Services.AddSingleton<IImageServices, ImageServices>();

builder.Services.AddSingleton<HttpClient>();
builder.Services.AddSingleton<IExpoPushNotificationClient, ExpoPushNotificationClient>();
builder.Services.AddSingleton<IPushNotificationServices, PushNotificationServices>();
builder.Services.AddHttpClient<IChatbotClient, ChatbotClient>((serviceProvider, httpClient) =>
{
    var chatbotOptions = serviceProvider
        .GetRequiredService<IOptions<ChatbotOptions>>()
        .Value;

    if (Uri.TryCreate(chatbotOptions.BaseUrl, UriKind.Absolute, out var baseUri))
    {
        httpClient.BaseAddress = baseUri;
    }

    httpClient.Timeout = TimeSpan.FromSeconds(
        Math.Max(1, chatbotOptions.RequestTimeoutSeconds));
});
builder.Services.AddSingleton<IChatbotBotUserService, ChatbotBotUserService>();
builder.Services.AddSingleton<IChatbotResponseService, ChatbotResponseService>();
builder.Services.AddSingleton<ChatbotResponseQueue>();
builder.Services.AddSingleton<IChatbotResponseQueue>(serviceProvider =>
    serviceProvider.GetRequiredService<ChatbotResponseQueue>());
builder.Services.AddHostedService(serviceProvider =>
    serviceProvider.GetRequiredService<ChatbotResponseQueue>());

if (useForwardedHeaders)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

await app.Services.InitializeSqlDataStoreAsync();

var imageServices = app.Services.GetRequiredService<IImageServices>();
var imageStorageOptions = app.Services.GetRequiredService<IOptions<ImageStorageOptions>>().Value;
if (imageStorageOptions.ClearStoredImagesOnStartup)
{
    await imageServices.ClearStoredImagesAsync();
}

if (useForwardedHeaders)
{
    app.UseForwardedHeaders();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
//    app.MapOpenApi();
//    app.UseSwagger();
//    app.UseSwaggerUI();
}

if (useHttpsRedirection)
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "MessagingApp.Api",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTimeOffset.UtcNow
}));
app.MapControllers();

app.Run();
