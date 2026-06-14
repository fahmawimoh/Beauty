using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Beauty.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UniqueCustomerPhonePerTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "Customers" AS c1
                USING "Customers" AS c2
                WHERE c1."TenantId" = c2."TenantId"
                  AND c1."Phone" IS NOT NULL
                  AND c1."Phone" = c2."Phone"
                  AND c1."CreatedAt" > c2."CreatedAt";
                """);

            migrationBuilder.DropIndex(
                name: "IX_Customers_TenantId",
                table: "Customers");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_TenantId_Phone",
                table: "Customers",
                columns: new[] { "TenantId", "Phone" },
                unique: true,
                filter: "\"Phone\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Customers_TenantId_Phone",
                table: "Customers");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_TenantId",
                table: "Customers",
                column: "TenantId");
        }
    }
}
