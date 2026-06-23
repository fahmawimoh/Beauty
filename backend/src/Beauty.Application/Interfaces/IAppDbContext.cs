using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<Branch> Branches { get; }
    DbSet<User> Users { get; }
    DbSet<UserBranch> UserBranches { get; }
    DbSet<Customer> Customers { get; }
    DbSet<ServiceCategory> ServiceCategories { get; }
    DbSet<ServiceOffering> ServiceOfferings { get; }
    DbSet<ServiceOfferingCategory> ServiceOfferingCategories { get; }
    DbSet<Product> Products { get; }
    DbSet<Supplier> Suppliers { get; }
    DbSet<Purchase> Purchases { get; }
    DbSet<InventoryLog> InventoryLogs { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<Expense> Expenses { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<TenantSettings> TenantSettings { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<WaitingListEntry> WaitingListEntries { get; }
    DbSet<NotificationLog> NotificationLogs { get; }
    DbSet<BookingEmployee> BookingEmployees { get; }
    DbSet<EmployeeSchedule> EmployeeSchedules { get; }
    DbSet<EmployeeScheduleBreak> EmployeeScheduleBreaks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
