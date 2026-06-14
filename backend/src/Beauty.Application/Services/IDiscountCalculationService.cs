using Beauty.Domain.Enums;

namespace Beauty.Application.Services;

public interface IDiscountCalculationService
{
    Task<DiscountType> GetDiscountTypeAsync(Guid tenantId, CancellationToken cancellationToken = default);
    decimal CalculateLineDiscount(DiscountType discountType, decimal lineSubtotal, decimal discountValue);
    decimal CalculateInvoiceDiscount(DiscountType discountType, decimal subtotal, decimal discountValue);
    void ValidateDiscountValue(DiscountType discountType, decimal discountValue, decimal subtotal, string fieldName);
}
