var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

//builder.Services.AddOpenApi();
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

builder.Services.AddSingleton<IActiveUserRepository, ActiveUserRepository>();
builder.Services.AddSingleton<IMessageBoardRepository, MessageBoardRepository>();
builder.Services.AddSingleton<IChatServices, ChatServices>();

builder.Services.AddSingleton<IUserAccountRepository, UserAccountRepository>();
builder.Services.AddSingleton<IAccountServices, AccountServices>();

builder.Services.AddSingleton<IImageRepository, ImageRepository>();
builder.Services.AddSingleton<IImageServices, ImageServices>();

builder.Services.AddSingleton<HttpClient>();
builder.Services.AddSingleton<IPushNotificationRepository, PushNotificationRepository>();
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

var imageServices = app.Services.GetRequiredService<IImageServices>();
await imageServices.ClearStoredImagesAsync();

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
