using Beauty.Application.Interfaces;
using Beauty.Infrastructure.Persistence;
using Beauty.Infrastructure.Repositories;
using Beauty.Infrastructure.Services;
using Beauty.Infrastructure.WhatsApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace Beauty.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured. " +
                "Set ConnectionStrings__DefaultConnection for the Beauty PostgreSQL database.");

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name);
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                npgsql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
            });

            if (configuration.GetValue("Logging:LogLevel:Microsoft.EntityFrameworkCore.Database.Command", "Warning") == "Information")
                options.EnableSensitiveDataLogging();
        });

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddHttpContextAccessor();

        services.Configure<WhatsAppOptions>(configuration.GetSection(WhatsAppOptions.SectionName));

        var whatsAppProvider = configuration.GetSection(WhatsAppOptions.SectionName)["Provider"] ?? "Mock";
        if (whatsAppProvider.Equals("Twilio", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<TwilioWhatsAppProvider>();
            services.AddScoped<IWhatsAppProvider>(sp => sp.GetRequiredService<TwilioWhatsAppProvider>());
        }
        else
        {
            services.AddScoped<IWhatsAppProvider, MockWhatsAppProvider>();
        }

        services.AddHostedService<WhatsAppMessageProcessor>();

        return services;
    }
}
