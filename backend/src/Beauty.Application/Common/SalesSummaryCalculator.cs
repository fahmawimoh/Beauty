using Beauty.Application.DTOs.Reports;

namespace Beauty.Application.Common;

public readonly record struct InvoiceTotals(decimal SubTotal, decimal DiscountAmount, decimal TotalAmount);

public static class SalesSummaryCalculator
{
    public static SalesPeriodSummaryDto Calculate(IEnumerable<InvoiceTotals> invoices)
    {
        var list = invoices as IReadOnlyList<InvoiceTotals> ?? invoices.ToList();
        if (list.Count == 0)
            return new SalesPeriodSummaryDto(0, 0, 0, 0);

        return new SalesPeriodSummaryDto(
            list.Sum(i => i.SubTotal),
            list.Sum(i => i.DiscountAmount),
            list.Sum(i => i.TotalAmount),
            list.Count);
    }
}
