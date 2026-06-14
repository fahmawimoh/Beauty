using Beauty.Domain.Entities;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Beauty.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration)
    {
        var logger = services.GetRequiredService<ILogger<AppDbContext>>();
        var maxRetries = configuration.GetValue("Database:MaxRetryAttempts", 15);
        var delaySeconds = configuration.GetValue("Database:RetryDelaySeconds", 3);

        for (var attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var dbName = configuration["Database:Name"] ?? "Beauty";
                logger.LogInformation("Connecting to PostgreSQL database '{Database}' (attempt {Attempt}/{Max})...", dbName, attempt, maxRetries);

                var canConnect = await db.Database.CanConnectAsync();
                if (!canConnect)
                    throw new InvalidOperationException($"Cannot connect to PostgreSQL database '{dbName}'.");

                var pending = await db.Database.GetPendingMigrationsAsync();
                if (pending.Any())
                    logger.LogInformation("Applying {Count} pending migration(s) to Beauty database...", pending.Count());

                await db.Database.MigrateAsync();
                await SeedAsync(db, configuration, logger);

                var applied = await db.Database.GetAppliedMigrationsAsync();
                logger.LogInformation("Beauty database ready. {MigrationCount} migration(s) applied, Users table mapped.", applied.Count());
                return;
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                logger.LogWarning(ex,
                    "Beauty database not available yet. Retrying in {Delay}s ({Attempt}/{Max})...",
                    delaySeconds, attempt, maxRetries);
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
            }
        }

        throw new InvalidOperationException(
            $"Failed to connect to the Beauty PostgreSQL database after {maxRetries} attempts. " +
            "Ensure PostgreSQL is running: docker compose up -d");
    }

    private static async Task SeedAsync(AppDbContext db, IConfiguration configuration, ILogger logger)
    {
        if (!configuration.GetValue("Database:SeedDemoData", true))
            return;

        if (await db.Users.AnyAsync())
            return;

        var email = configuration["Database:DemoAdminEmail"] ?? "admin@beauty.com";
        var password = configuration["Database:DemoAdminPassword"] ?? "Admin@123";
        var businessName = configuration["Database:DemoBusinessName"] ?? "Beauty Demo Salon";

        logger.LogInformation("Seeding demo tenant and admin user ({Email})...", email);

        var tenant = new Tenant
        {
            Name = businessName,
            Slug = "beauty-demo",
            BusinessType = BusinessType.Salon,
            IsActive = true
        };

        var branch = new Branch
        {
            Tenant = tenant,
            Name = "Main Branch",
            Address = "123 Beauty Street",
            IsActive = true
        };

        var admin = new User
        {
            Tenant = tenant,
            Email = email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            FirstName = "System",
            LastName = "Admin",
            Role = UserRole.Admin,
            IsActive = true
        };

        db.Tenants.Add(tenant);
        db.Branches.Add(branch);
        db.Users.Add(admin);
        db.UserBranches.Add(new UserBranch { User = admin, Branch = branch, IsDefault = true });

        var categories = new[] { ("Hair", 0), ("Nails", 1), ("Skin Care", 2), ("Spa", 3) };
        foreach (var (name, order) in categories)
        {
            db.ServiceCategories.Add(new ServiceCategory
            {
                Tenant = tenant,
                Name = name,
                SortOrder = order,
                IsActive = true
            });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Demo admin seeded. Login with {Email}", email);
    }
}
