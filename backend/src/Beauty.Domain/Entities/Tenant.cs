using Beauty.Domain.Common;
using Beauty.Domain.Enums;

namespace Beauty.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public BusinessType BusinessType { get; set; } = BusinessType.Salon;
    public bool IsActive { get; set; } = true;

    public ICollection<Branch> Branches { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<ServiceCategory> ServiceCategories { get; set; } = [];
    public ICollection<ServiceOffering> ServiceOfferings { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}
