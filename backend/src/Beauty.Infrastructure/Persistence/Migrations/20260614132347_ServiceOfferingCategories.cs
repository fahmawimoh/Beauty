using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Beauty.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ServiceOfferingCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServiceOfferingCategories",
                columns: table => new
                {
                    ServiceOfferingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceOfferingCategories", x => new { x.ServiceOfferingId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_ServiceOfferingCategories_ServiceCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "ServiceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceOfferingCategories_ServiceOfferings_ServiceOfferingId",
                        column: x => x.ServiceOfferingId,
                        principalTable: "ServiceOfferings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOfferingCategories_CategoryId",
                table: "ServiceOfferingCategories",
                column: "CategoryId");

            migrationBuilder.Sql("""
                INSERT INTO "ServiceOfferingCategories" ("ServiceOfferingId", "CategoryId")
                SELECT "Id", "CategoryId"
                FROM "ServiceOfferings"
                WHERE "CategoryId" IS NOT NULL
                ON CONFLICT DO NOTHING
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "ServiceOfferings" DROP CONSTRAINT IF EXISTS "FK_ServiceOfferings_ServiceCategories_CategoryId";
                DROP INDEX IF EXISTS "IX_ServiceOfferings_CategoryId";
                ALTER TABLE "ServiceOfferings" DROP COLUMN IF EXISTS "CategoryId";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "ServiceOfferings",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "ServiceOfferings" AS so
                SET "CategoryId" = soc."CategoryId"
                FROM (
                    SELECT DISTINCT ON ("ServiceOfferingId") "ServiceOfferingId", "CategoryId"
                    FROM "ServiceOfferingCategories"
                    ORDER BY "ServiceOfferingId", "CategoryId"
                ) AS soc
                WHERE so."Id" = soc."ServiceOfferingId"
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOfferings_CategoryId",
                table: "ServiceOfferings",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOfferings_ServiceCategories_CategoryId",
                table: "ServiceOfferings",
                column: "CategoryId",
                principalTable: "ServiceCategories",
                principalColumn: "Id");

            migrationBuilder.DropTable(
                name: "ServiceOfferingCategories");
        }
    }
}
