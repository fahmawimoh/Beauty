using Beauty.Domain.Entities;

namespace Beauty.Application.Common;

public static class SalesTransactionFormatter
{
    public static string FormatItemNames(IEnumerable<InvoiceItem> items)
    {
        var names = items.Select(i => i.Name).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        return names.Count == 0 ? "—" : string.Join(", ", names);
    }

    public static string FormatItemTypes(IEnumerable<InvoiceItem> items)
    {
        var types = items.Select(i => i.ItemType.ToString()).Distinct().ToList();
        return types.Count == 0 ? "—" : string.Join(", ", types);
    }
}
