using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class Invoice : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public Guid CashierId { get; set; }
    public decimal SubTotal { get; set; }
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Completed;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Notes { get; set; }
    public DateTime? PaidAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Customer? Customer { get; set; }
    public User Cashier { get; set; } = null!;
    public ICollection<InvoiceItem> Items { get; set; } = [];
}
