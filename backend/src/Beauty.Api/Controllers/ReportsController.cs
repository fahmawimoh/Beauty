using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.Reports;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService) => _reportService = reportService;

    [HttpGet("dashboard")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetDashboard([FromQuery] Guid? branchId, CancellationToken ct)
        => Ok(ApiResponse<DashboardSummaryDto>.Ok(await _reportService.GetDashboardAsync(branchId, ct)));

    [HttpGet("period/{period}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<PeriodReportDto>>> GetPeriodReport(string period, [FromQuery] Guid? branchId, CancellationToken ct)
        => Ok(ApiResponse<PeriodReportDto>.Ok(await _reportService.GetPeriodReportAsync(period, branchId, ct)));

    [HttpGet("expenses")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ExpenseDto>>>> GetExpenses(
        [FromQuery] Guid? branchId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ExpenseDto>>.Ok(await _reportService.GetExpensesAsync(branchId, from, to, ct)));

    [HttpPost("expenses")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<ExpenseDto>>> CreateExpense([FromBody] CreateExpenseRequest request, CancellationToken ct)
        => Ok(ApiResponse<ExpenseDto>.Ok(await _reportService.CreateExpenseAsync(request, ct)));
}
