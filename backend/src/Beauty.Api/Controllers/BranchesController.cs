using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Branches;
using Beauty.Application.DTOs.Common;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly IBranchService _branchService;

    public BranchesController(IBranchService branchService) => _branchService = branchService;

    [HttpGet]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BranchDto>>>> GetAll(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<BranchDto>>.Ok(await _branchService.GetAllAsync(ct)));

    [HttpGet("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BranchDto>>> GetById(Guid id, CancellationToken ct)
    {
        var branch = await _branchService.GetByIdAsync(id, ct);
        return branch is null ? NotFound(ApiResponse<BranchDto>.Fail("Branch not found")) : Ok(ApiResponse<BranchDto>.Ok(branch));
    }

    [HttpPost]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Create([FromBody] CreateBranchRequest request, CancellationToken ct)
        => Ok(ApiResponse<BranchDto>.Ok(await _branchService.CreateAsync(request, ct)));

    [HttpPut("{id:guid}")]
    [RoleAuthorize(UserRole.Admin, UserRole.Manager)]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Update(Guid id, [FromBody] UpdateBranchRequest request, CancellationToken ct)
    {
        var branch = await _branchService.UpdateAsync(id, request, ct);
        return branch is null ? NotFound(ApiResponse<BranchDto>.Fail("Branch not found")) : Ok(ApiResponse<BranchDto>.Ok(branch));
    }
}
