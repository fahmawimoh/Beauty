using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Beauty.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeBasedScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BookingEmployeeId",
                table: "WaitingListEntries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BookingEmployeeId",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "EndTime",
                table: "Appointments",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BookingEmployees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    DefaultSlotDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingEmployees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingEmployees_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BookingEmployees_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsWorkingDay = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeSchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeSchedules_BookingEmployees_BookingEmployeeId",
                        column: x => x.BookingEmployeeId,
                        principalTable: "BookingEmployees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeScheduleBreaks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeScheduleId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeScheduleBreaks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeScheduleBreaks_EmployeeSchedules_EmployeeScheduleId",
                        column: x => x.EmployeeScheduleId,
                        principalTable: "EmployeeSchedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WaitingListEntries_BookingEmployeeId",
                table: "WaitingListEntries",
                column: "BookingEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BookingEmployeeId_AppointmentDate_StartTime",
                table: "Appointments",
                columns: new[] { "BookingEmployeeId", "AppointmentDate", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_BookingEmployees_BranchId",
                table: "BookingEmployees",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingEmployees_TenantId_Name",
                table: "BookingEmployees",
                columns: new[] { "TenantId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeScheduleBreaks_EmployeeScheduleId",
                table: "EmployeeScheduleBreaks",
                column: "EmployeeScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeSchedules_BookingEmployeeId_DayOfWeek",
                table: "EmployeeSchedules",
                columns: new[] { "BookingEmployeeId", "DayOfWeek" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_BookingEmployees_BookingEmployeeId",
                table: "Appointments",
                column: "BookingEmployeeId",
                principalTable: "BookingEmployees",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WaitingListEntries_BookingEmployees_BookingEmployeeId",
                table: "WaitingListEntries",
                column: "BookingEmployeeId",
                principalTable: "BookingEmployees",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_BookingEmployees_BookingEmployeeId",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_WaitingListEntries_BookingEmployees_BookingEmployeeId",
                table: "WaitingListEntries");

            migrationBuilder.DropTable(
                name: "EmployeeScheduleBreaks");

            migrationBuilder.DropTable(
                name: "EmployeeSchedules");

            migrationBuilder.DropTable(
                name: "BookingEmployees");

            migrationBuilder.DropIndex(
                name: "IX_WaitingListEntries_BookingEmployeeId",
                table: "WaitingListEntries");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_BookingEmployeeId_AppointmentDate_StartTime",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "BookingEmployeeId",
                table: "WaitingListEntries");

            migrationBuilder.DropColumn(
                name: "BookingEmployeeId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "Appointments");
        }
    }
}
