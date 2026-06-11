using Beauty.Domain.Enums;

namespace Beauty.Application.DTOs.Branches;

public record BranchDto(
    Guid Id,
    string Name,
    string? Address,
    string? Phone,
    string? Email,
    InventoryMode InventoryMode,
    bool IsActive
);

public record CreateBranchRequest(
    string Name,
    string? Address,
    string? Phone,
    string? Email,
    InventoryMode InventoryMode = InventoryMode.Separate
);

public record UpdateBranchRequest(
    string Name,
    string? Address,
    string? Phone,
    string? Email,
    InventoryMode InventoryMode,
    bool IsActive
);
