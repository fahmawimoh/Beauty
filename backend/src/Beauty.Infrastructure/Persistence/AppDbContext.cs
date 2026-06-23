using Beauty.Application.Interfaces;
using Beauty.Application.Common;
using Beauty.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserBranch> UserBranches => Set<UserBranch>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<ServiceOfferingCategory> ServiceOfferingCategories => Set<ServiceOfferingCategory>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<InventoryLog> InventoryLogs => Set<InventoryLog>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<WaitingListEntry> WaitingListEntries => Set<WaitingListEntry>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<BookingEmployee> BookingEmployees => Set<BookingEmployee>();
    public DbSet<EmployeeSchedule> EmployeeSchedules => Set<EmployeeSchedule>();
    public DbSet<EmployeeScheduleBreak> EmployeeScheduleBreaks => Set<EmployeeScheduleBreak>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserBranch>(entity =>
        {
            entity.HasKey(ub => new { ub.UserId, ub.BranchId });
            entity.HasOne(ub => ub.User).WithMany(u => u.UserBranches).HasForeignKey(ub => ub.UserId);
            entity.HasOne(ub => ub.Branch).WithMany(b => b.UserBranches).HasForeignKey(ub => ub.BranchId);
        });

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasIndex(t => t.Slug).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasOne(b => b.Tenant).WithMany(t => t.Branches).HasForeignKey(b => b.TenantId);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasIndex(c => new { c.TenantId, c.Phone })
                .IsUnique()
                .HasFilter("\"Phone\" IS NOT NULL");
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(i => new { i.TenantId, i.InvoiceNumber }).IsUnique();
            entity.HasOne(i => i.Branch).WithMany(b => b.Invoices).HasForeignKey(i => i.BranchId);
            entity.HasOne(i => i.Customer).WithMany(c => c.Invoices).HasForeignKey(i => i.CustomerId);
            entity.HasOne(i => i.Cashier).WithMany(u => u.Invoices).HasForeignKey(i => i.CashierId);
            entity.Property(i => i.DiscountType)
                .HasConversion(v => DiscountTypeMapper.ToApiValue(v), v => DiscountTypeMapper.FromApiValue(v))
                .HasMaxLength(20);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.HasOne(ii => ii.Invoice).WithMany(i => i.Items).HasForeignKey(ii => ii.InvoiceId);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(p => new { p.TenantId, p.Sku, p.BranchId });
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasOne(e => e.Branch).WithMany(b => b.Expenses).HasForeignKey(e => e.BranchId);
        });

        modelBuilder.Entity<ServiceOfferingCategory>(entity =>
        {
            entity.HasKey(soc => new { soc.ServiceOfferingId, soc.CategoryId });
            entity.HasOne(soc => soc.ServiceOffering)
                .WithMany(o => o.ServiceOfferingCategories)
                .HasForeignKey(soc => soc.ServiceOfferingId);
            entity.HasOne(soc => soc.Category)
                .WithMany(c => c.ServiceOfferingCategories)
                .HasForeignKey(soc => soc.CategoryId);
        });

        modelBuilder.Entity<TenantSettings>(entity =>
        {
            entity.HasOne(s => s.Tenant).WithMany().HasForeignKey(s => s.TenantId);
            entity.HasIndex(s => s.TenantId).IsUnique();
            entity.Property(s => s.DiscountType)
                .HasConversion(v => DiscountTypeMapper.ToApiValue(v), v => DiscountTypeMapper.FromApiValue(v))
                .HasMaxLength(20);
            entity.Property(s => s.MaxAppointmentsPerSlot).HasDefaultValue(1);
            entity.Property(s => s.AutoPromoteWaitingList).HasDefaultValue(true);
            entity.Property(s => s.AppointmentReminderHoursBefore).HasDefaultValue(24);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasOne(a => a.Tenant).WithMany().HasForeignKey(a => a.TenantId);
            entity.HasOne(a => a.Branch).WithMany().HasForeignKey(a => a.BranchId);
            entity.HasOne(a => a.Customer).WithMany().HasForeignKey(a => a.CustomerId);
            entity.HasOne(a => a.ServiceOffering).WithMany().HasForeignKey(a => a.ServiceOfferingId);
            entity.HasOne(a => a.AssignedUser).WithMany().HasForeignKey(a => a.AssignedUserId);
            entity.HasOne(a => a.BookingEmployee).WithMany(e => e.Appointments).HasForeignKey(a => a.BookingEmployeeId);
            entity.HasIndex(a => new { a.TenantId, a.AppointmentDate, a.StartTime });
            entity.HasIndex(a => new { a.BookingEmployeeId, a.AppointmentDate, a.StartTime });
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<WaitingListEntry>(entity =>
        {
            entity.HasOne(w => w.Tenant).WithMany().HasForeignKey(w => w.TenantId);
            entity.HasOne(w => w.Branch).WithMany().HasForeignKey(w => w.BranchId);
            entity.HasOne(w => w.Customer).WithMany().HasForeignKey(w => w.CustomerId);
            entity.HasOne(w => w.ServiceOffering).WithMany().HasForeignKey(w => w.ServiceOfferingId);
            entity.HasOne(w => w.PromotedAppointment).WithMany().HasForeignKey(w => w.PromotedAppointmentId);
            entity.HasOne(w => w.BookingEmployee).WithMany().HasForeignKey(w => w.BookingEmployeeId);
            entity.HasIndex(w => new { w.TenantId, w.PreferredDate, w.PreferredStartTime, w.Status });
            entity.Property(w => w.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<NotificationLog>(entity =>
        {
            entity.HasOne(n => n.Tenant).WithMany().HasForeignKey(n => n.TenantId);
            entity.HasOne(n => n.Appointment).WithMany(a => a.Notifications).HasForeignKey(n => n.AppointmentId);
            entity.HasIndex(n => new { n.Status, n.ScheduledFor });
            entity.Property(n => n.Channel).HasConversion<string>().HasMaxLength(20);
            entity.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<BookingEmployee>(entity =>
        {
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId);
            entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId);
            entity.HasIndex(e => new { e.TenantId, e.Name });
        });

        modelBuilder.Entity<EmployeeSchedule>(entity =>
        {
            entity.HasOne(s => s.BookingEmployee).WithMany(e => e.Schedules).HasForeignKey(s => s.BookingEmployeeId);
            entity.HasIndex(s => new { s.BookingEmployeeId, s.DayOfWeek }).IsUnique();
        });

        modelBuilder.Entity<EmployeeScheduleBreak>(entity =>
        {
            entity.HasOne(b => b.EmployeeSchedule).WithMany(s => s.Breaks).HasForeignKey(b => b.EmployeeScheduleId);
        });
    }
}
