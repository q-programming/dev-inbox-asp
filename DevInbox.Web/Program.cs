using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.Filters;
using DevInbox.Web.Infrastructure.Persistence;

Banner.Print();

var builder = WebApplication.CreateBuilder(args);

// NSwag emits a per-property [JsonConverter(typeof(JsonStringEnumConverter<T>))] attribute on every
// generated enum DTO property. Attribute-level converters always take priority over anything added to
// JsonSerializerOptions.Converters, so registering JsonStringEnumMemberConverter there alone is not enough —
// it never gets a chance to run. A JsonTypeInfo modifier runs after attribute resolution and can forcibly
// replace the converter for every enum property, which is the only way to make EnumMember.Value (e.g. "light",
// "super-tight") win over the attribute's default member-name serialization ("Light", "SuperTight").
builder.Services.AddControllers(opt => opt.Filters.Add<ApiExceptionFilter>())
    .AddJsonOptions(opt =>
    {
        var resolver = new DefaultJsonTypeInfoResolver();
        resolver.Modifiers.Add(typeInfo =>
        {
            foreach (var property in typeInfo.Properties)
            {
                var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
                if (propertyType.IsEnum)
                {
                    property.CustomConverter = new JsonStringEnumMemberConverter();
                }
            }
        });
        opt.JsonSerializerOptions.TypeInfoResolver = resolver;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();


// Search all services in the assembly and register those implementing IService or IComponent interfaces with scoped lifetime
builder.Services.Scan(scan => scan
     .FromAssemblyOf<Program>()
     .AddClasses(cl => cl.AssignableTo<IService>())
     .AsImplementedInterfaces()
     .AsSelf()
     .WithScopedLifetime());
// Search components     
builder.Services.Scan(scan => scan
     .FromAssemblyOf<Program>()
     .AddClasses(cl => cl.AssignableTo<IComponent>())
     .AsImplementedInterfaces()
     .AsSelf()
     .WithScopedLifetime());

// Search repositories (open generic base type requires typeof(), not the closed generic syntax)
builder.Services.Scan(scan => scan
     .FromAssemblyOf<Program>()
     .AddClasses(cl => cl.AssignableTo(typeof(Repository<>)))
     .AsImplementedInterfaces()
     .AsSelf()
     .WithScopedLifetime());

// Add DbContext with PostgreSQL provider and connection string from configuration
builder.Services.AddDbContext<AppDbContext>(opt =>
     opt.UseAppNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddGitHubOAuth(builder.Configuration);
builder.Services.AddEncryption(builder.Configuration);

// Event handling
builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(classes =>
        classes.AssignableTo(typeof(IEventHandler<>)))
    .AsImplementedInterfaces()
    .AsSelf()
    .WithScopedLifetime());

builder.Services.AddScoped<
    IPublisher,
    EventPublisher>();


var app = builder.Build();
//Middlewares

// Auto-migrate database schema on startup if enabled in configuration ( ussually on dev environment ) — ensures the database is created and up-to-date without manual intervention. In production, consider using proper migration tools instead.
if (builder.Configuration.GetValue<bool>("Database:AutoMigrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    _ = db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    _ = app.UseSwagger();
    _ = app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Serve React app for any non-API route (SPA fallback)
app.MapFallbackToFile("index.html");

// Publish an ApplicationStartedEvent to notify other components that the application has started
using (var scope = app.Services.CreateScope())
{
    var publisher = scope.ServiceProvider.GetRequiredService<IPublisher>();
    await publisher.Publish(new ApplicationStartedEvent());
}
app.Run();

public partial class Program;
