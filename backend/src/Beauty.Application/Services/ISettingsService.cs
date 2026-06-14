using Beauty.Application.DTOs.Settings;

namespace Beauty.Application.Services;

public interface ISettingsService
{
    Task<SettingsDto> GetAsync(CancellationToken cancellationToken = default);
    Task<SettingsDto> UpdateDiscountTypeAsync(UpdateDiscountTypeRequest request, CancellationToken cancellationToken = default);
}
