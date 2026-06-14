using Beauty.Application.Common;
using Beauty.Application.Interfaces;
using Beauty.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Services;

public class DiscountCalculationService : IDiscountCalculationService
{
    private readonly IAppDbContext _context;

    public DiscountCalculationService(IAppDbContext context) => _context = context;

    public async Task<DiscountType> GetDiscountTypeAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var settings = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);

        return settings?.DiscountType ?? DiscountType.Percentage;
    }

    public decimal CalculateLineDiscount(DiscountType discountType, decimal lineSubtotal, decimal discountValue)
    {
        if (discountValue <= 0 || lineSubtotal <= 0)
            return 0;

        return discountType switch
        {
            DiscountType.Percentage => RoundCurrency(lineSubtotal * (discountValue / 100m)),
            DiscountType.Fixed => RoundCurrency(Math.Min(discountValue, lineSubtotal)),
            _ => throw new InvalidOperationException($"Unsupported discount type: {discountType}")
        };
    }

    public decimal CalculateInvoiceDiscount(DiscountType discountType, decimal subtotal, decimal discountValue)
        => CalculateLineDiscount(discountType, subtotal, discountValue);

    public void ValidateDiscountValue(DiscountType discountType, decimal discountValue, decimal subtotal, string fieldName)
        => DiscountValidation.Validate(discountType, discountValue, subtotal);

    private static decimal RoundCurrency(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}