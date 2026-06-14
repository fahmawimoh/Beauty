namespace Beauty.Domain.Entities;

public class ServiceOfferingCategory
{
    public Guid ServiceOfferingId { get; set; }
    public Guid CategoryId { get; set; }

    public ServiceOffering ServiceOffering { get; set; } = null!;
    public ServiceCategory Category { get; set; } = null!;
}
