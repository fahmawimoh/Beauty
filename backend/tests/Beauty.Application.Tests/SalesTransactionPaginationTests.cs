using Beauty.Application.Common;

namespace Beauty.Application.Tests;

public class PaginationHelperTests
{
    [Theory]
    [InlineData(0, 0, 1, 10)]
    [InlineData(-1, 0, 1, 10)]
    [InlineData(1, 10, 1, 10)]
    [InlineData(3, 10, 3, 10)]
    public void Normalize_ClampsInvalidValues(int page, int pageSize, int expectedPage, int expectedSize)
    {
        var (normalizedPage, normalizedSize, skip) = PaginationHelper.Normalize(page, pageSize);

        Assert.Equal(expectedPage, normalizedPage);
        Assert.Equal(expectedSize, normalizedSize);
        Assert.Equal((expectedPage - 1) * expectedSize, skip);
    }

    [Theory]
    [InlineData(0, 10, 0)]
    [InlineData(5, 10, 1)]
    [InlineData(10, 10, 1)]
    [InlineData(11, 10, 2)]
    [InlineData(25, 10, 3)]
    public void GetTotalPages_ReturnsExpectedPages(int totalCount, int pageSize, int expectedPages)
    {
        Assert.Equal(expectedPages, PaginationHelper.GetTotalPages(totalCount, pageSize));
    }

    [Fact]
    public void Normalize_Page2_SkipsFirstPage()
    {
        var (_, size, skip) = PaginationHelper.Normalize(2, 10);
        Assert.Equal(10, skip);
        Assert.Equal(10, size);
    }
}

public class SalesTransactionFormatterTests
{
    [Fact]
    public void FormatItemNames_Empty_ReturnsDash()
    {
        Assert.Equal("—", SalesTransactionFormatter.FormatItemNames(Array.Empty<Beauty.Domain.Entities.InvoiceItem>()));
    }

    [Fact]
    public void FormatItemNames_MultipleItems_JoinsDistinctNames()
    {
        var items = new[]
        {
            new Beauty.Domain.Entities.InvoiceItem { Name = "Shampoo" },
            new Beauty.Domain.Entities.InvoiceItem { Name = "Haircut" },
            new Beauty.Domain.Entities.InvoiceItem { Name = "Shampoo" },
        };

        Assert.Equal("Shampoo, Haircut", SalesTransactionFormatter.FormatItemNames(items));
    }

    [Fact]
    public void FormatItemTypes_MultipleTypes_JoinsDistinctTypes()
    {
        var items = new[]
        {
            new Beauty.Domain.Entities.InvoiceItem { ItemType = Beauty.Domain.Enums.InvoiceItemType.Product },
            new Beauty.Domain.Entities.InvoiceItem { ItemType = Beauty.Domain.Enums.InvoiceItemType.Service },
        };

        Assert.Equal("Product, Service", SalesTransactionFormatter.FormatItemTypes(items));
    }
}
