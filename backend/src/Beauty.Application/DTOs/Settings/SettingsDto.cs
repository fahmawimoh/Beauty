namespace Beauty.Application.DTOs.Settings;

public record SettingsDto(string DiscountType);

public record UpdateDiscountTypeRequest(string DiscountType);
