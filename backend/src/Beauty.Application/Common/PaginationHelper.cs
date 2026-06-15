namespace Beauty.Application.Common;

public static class PaginationHelper
{
    public const int DefaultSalesPageSize = 10;
    public const int MaxPageSize = 100;

    public static (int Page, int PageSize, int Skip) Normalize(int page, int pageSize)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedSize = pageSize < 1 ? DefaultSalesPageSize : Math.Min(pageSize, MaxPageSize);
        return (normalizedPage, normalizedSize, (normalizedPage - 1) * normalizedSize);
    }

    public static int GetTotalPages(int totalCount, int pageSize)
        => pageSize <= 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);
}
