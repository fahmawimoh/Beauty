using Beauty.Api.Authorization;
using Beauty.Application.DTOs.Common;
using Beauty.Application.DTOs.WhatsApp;
using Beauty.Application.Services;
using Beauty.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace Beauty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RoleAuthorize(UserRole.Admin, UserRole.Manager)]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsAppService;

    public WhatsAppController(IWhatsAppService whatsAppService) => _whatsAppService = whatsAppService;

    [HttpGet("templates")]
    public ActionResult<ApiResponse<IReadOnlyList<WhatsAppTemplateDto>>> GetTemplates()
        => Ok(ApiResponse<IReadOnlyList<WhatsAppTemplateDto>>.Ok(_whatsAppService.GetTemplates()));

    [HttpPost("recipients/preview")]
    public async Task<ActionResult<ApiResponse<RecipientPreviewDto>>> PreviewRecipients(
        [FromBody] RecipientPreviewRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<RecipientPreviewDto>.Ok(await _whatsAppService.PreviewRecipientsAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<RecipientPreviewDto>.Fail(ex.Message));
        }
    }

    [HttpPost("send")]
    [EnableRateLimiting("whatsapp-send")]
    public async Task<ActionResult<ApiResponse<WhatsAppCampaignDto>>> SendSingle(
        [FromBody] SendWhatsAppMessageRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<WhatsAppCampaignDto>.Ok(await _whatsAppService.SendSingleAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<WhatsAppCampaignDto>.Fail(ex.Message));
        }
    }

    [HttpPost("broadcast")]
    [EnableRateLimiting("whatsapp-send")]
    public async Task<ActionResult<ApiResponse<WhatsAppCampaignDto>>> Broadcast(
        [FromBody] BroadcastWhatsAppRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(ApiResponse<WhatsAppCampaignDto>.Ok(await _whatsAppService.BroadcastAsync(request, ct)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<WhatsAppCampaignDto>.Fail(ex.Message));
        }
    }

    [HttpGet("campaigns")]
    public async Task<ActionResult<ApiResponse<PagedResult<WhatsAppCampaignDto>>>> GetCampaigns(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(ApiResponse<PagedResult<WhatsAppCampaignDto>>.Ok(await _whatsAppService.GetCampaignsAsync(page, pageSize, ct)));

    [HttpGet("campaigns/{id:guid}")]
    public async Task<ActionResult<ApiResponse<WhatsAppCampaignDetailDto>>> GetCampaignById(Guid id, CancellationToken ct)
    {
        var campaign = await _whatsAppService.GetCampaignByIdAsync(id, ct);
        return campaign is null
            ? NotFound(ApiResponse<WhatsAppCampaignDetailDto>.Fail("Campaign not found"))
            : Ok(ApiResponse<WhatsAppCampaignDetailDto>.Ok(campaign));
    }
}
