using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.Filters;
using DevInbox.Web.Infrastructure.Persistence;

Banner.Print();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(opt => opt.Filters.Add<ApiExceptionFilter>());
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
builder.Services.Scan(scan => scan
     .FromAssemblyOf<Program>()
     .AddClasses(cl => cl.AssignableTo<IComponent>())
     .AsImplementedInterfaces()
     .AsSelf()
     .WithScopedLifetime());

// Add DbContext with PostgreSQL provider and connection string from configuration
builder.Services.AddDbContext<AppDbContext>(opt =>
     opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddGitHubOAuth(builder.Configuration);

var app = builder.Build();

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

app.Run();

public partial class Program;
