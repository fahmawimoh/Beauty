using Beauty.Domain.Enums;

namespace Beauty.Application.DTOs.Invoices;

public record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid BranchId,
    string BranchName,
    Guid? CustomerId,
    string? CustomerName,
    Guid CashierId,
    string CashierName,
    decimal SubTotal,
    string DiscountType,
    decimal DiscountValue,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    InvoiceStatus Status,
    PaymentMethod PaymentMethod,
    DateTime CreatedAt,
    DateTime? PaidAt,
    IReadOnlyList<InvoiceItemDto> Items
);

public record InvoiceItemDto(
    Guid Id,
    InvoiceItemType ItemType,
    Guid? ServiceOfferingId,
    Guid? ProductId,
    Guid? EmployeeId,
    string? EmployeeName,
    string Name,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountValue,
    decimal DiscountAmount,
    decimal LineTotal
);

public record CreateInvoiceItemRequest(
    InvoiceItemType ItemType,
    Guid? ServiceOfferingId,
    Guid? ProductId,
    Guid? EmployeeId,
    string Name,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountValue = 0
);

public record CreateInvoiceRequest(
    Guid BranchId,
    Guid? CustomerId,
    decimal DiscountValue = 0,
    decimal TaxAmount = 0,
    PaymentMethod PaymentMethod = PaymentMethod.Cash,
    string? Notes = null,
    IReadOnlyList<CreateInvoiceItemRequest>? Items = null
);

public record ReceiptDto(
    string InvoiceNumber,
    string BusinessName,
    string BranchName,
    string? CustomerName,
    string CashierName,
    DateTime Date,
    IReadOnlyList<ReceiptItemDto> Items,
    decimal SubTotal,
    string DiscountType,
    decimal DiscountValue,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal Total
);

public record ReceiptItemDto(string Name, int Quantity, decimal UnitPrice, decimal LineTotal);
