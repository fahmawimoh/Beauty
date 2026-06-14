using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class InvoiceItem : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public InvoiceItemType ItemType { get; set; }
    public Guid? ServiceOfferingId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? EmployeeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }

    public Invoice Invoice { get; set; } = null!;
    public ServiceOffering? ServiceOffering { get; set; }
    public Product? Product { get; set; }
    public User? Employee { get; set; }
}
