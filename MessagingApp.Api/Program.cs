using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

//builder.Services.AddOpenApi();
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

builder.Services.AddSqlDataStore(builder.Configuration, builder.Environment);
builder.Services.Configure<ImageStorageOptions>(
    builder.Configuration.GetSection(ImageStorageOptions.SectionName));
builder.Services.AddMessagingAppRepositories(builder.Configuration);

builder.Services.AddSingleton<IChatServices, ChatServices>();

builder.Services.AddSingleton<IAccountServices, AccountServices>();

builder.Services.AddSingleton<IImageServices, ImageServices>();

builder.Services.AddSingleton<HttpClient>();
builder.Services.AddSingleton<IExpoPushNotificationClient, ExpoPushNotificationClient>();
builder.Services.AddSingleton<IPushNotificationServices, PushNotificationServices>();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
//    app.MapOpenApi();
//    app.UseSwagger();
//    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.MapControllers();

app.Run();
