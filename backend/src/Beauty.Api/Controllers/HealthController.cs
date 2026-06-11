using Beauty.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public HealthController(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpGet("database")]
    public async Task<IActionResult> GetDatabaseStatus(CancellationToken ct)
    {
        var databaseName = _configuration["Database:Name"] ?? "Beauty";

        try
        {
            var canConnect = await _db.Database.CanConnectAsync(ct);
            if (!canConnect)
                return StatusCode(503, new { status = "unhealthy", database = databaseName, message = "Cannot connect to PostgreSQL" });

            var appliedMigrations = await _db.Database.GetAppliedMigrationsAsync(ct);
            var pendingMigrations = await _db.Database.GetPendingMigrationsAsync(ct);
            var userCount = await _db.Users.CountAsync(ct);

            return Ok(new
            {
                status = "healthy",
                database = databaseName,
                provider = "PostgreSQL",
                orm = "Entity Framework Core",
                migrationsApplied = appliedMigrations.Count(),
                migrationsPending = pendingMigrations.Count(),
                tables = new
                {
                    users = userCount,
                    authentication = "Users table (BCrypt passwords, JWT tokens issued at login)"
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { status = "unhealthy", database = databaseName, message = ex.Message });
        }
    }
}
