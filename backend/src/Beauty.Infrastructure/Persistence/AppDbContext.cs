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
        });
    }
}
